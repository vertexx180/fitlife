// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

const db = new Database('./data/db.sqlite');
const app = express();
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
const limiter = rateLimit({ windowMs: 60*1000, max: 100 });
app.use(limiter);

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin_secret_change';

// helpers
const findUserByLogin = (login) => db.prepare('SELECT * FROM users WHERE login = ?').get(login);
const findUserById = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id);
const omit = (u) => {
  if (!u) return null;
  const { password_hash, ...rest } = u;
  return rest;
};
function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'no_auth' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'bad_auth' });
  try {
    const payload = jwt.verify(parts[1], JWT_SECRET);
    req.user = findUserById(payload.id);
    next();
  } catch (e) { return res.status(401).json({ error: 'invalid_token' }); }
}
function adminOnly(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'no_auth' });
  if (req.user.role === 'admin' || req.user.role === 'owner') return next();
  return res.status(403).json({ error: 'admin_only' });
}

// --- AUTH
app.post('/api/auth/register', async (req, res) => {
  const { login, password, firstName, lastName } = req.body;
  if (!login || !password) return res.status(400).json({ error: 'login+password required' });
  const exists = findUserByLogin(login);
  if (exists) return res.status(400).json({ error: 'user_exists' });
  const hash = await bcrypt.hash(password, 10);
  const info = db.prepare('INSERT INTO users (login,password_hash,firstName,lastName,plan) VALUES (?,?,?,?,?)')
    .run(login, hash, firstName||'', lastName||'', 'Starter');
  const user = findUserById(info.lastInsertRowid);
  const token = signToken(user);
  res.json({ user: omit(user), token });
});

app.post('/api/auth/login', async (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) return res.status(400).json({ error: 'login+password required' });
  const user = findUserByLogin(login);
  if (!user) return res.status(401).json({ error: 'invalid' });
  const ok = await bcrypt.compare(password, user.password_hash || '');
  if (!ok) return res.status(401).json({ error: 'invalid' });

  // update lastLogin
  db.prepare('UPDATE users SET lastLogin = ? WHERE id = ?').run(new Date().toISOString(), user.id);

  const token = signToken(user);
  res.json({ user: omit(user), token });
});

// request password reset => creates token and (demo) returns token
app.post('/api/auth/reset-request', (req, res) => {
  const { login } = req.body;
  if (!login) return res.status(400).json({ error: 'login required' });
  const user = findUserByLogin(login);
  if (!user) return res.json({ ok: true, message: 'If account exists, reset token issued' });
  const token = uuidv4();
  const expiresAt = Date.now() + 1000*60*60; // 1h
  db.prepare('INSERT INTO reset_tokens (userId,token,expiresAt) VALUES (?,?,?)').run(user.id, token, expiresAt);
  // In prod: send token by email. For demo we return it.
  return res.json({ ok: true, token, expiresAt });
});

// confirm reset
app.post('/api/auth/reset-confirm', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'token+newPassword required' });
  const row = db.prepare('SELECT * FROM reset_tokens WHERE token = ?').get(token);
  if (!row) return res.status(400).json({ error: 'invalid_token' });
  if (Date.now() > row.expiresAt) {
    db.prepare('DELETE FROM reset_tokens WHERE id = ?').run(row.id);
    return res.status(400).json({ error: 'token_expired' });
  }
  const hash = await bcrypt.hash(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, row.userId);
  db.prepare('DELETE FROM reset_tokens WHERE id = ?').run(row.id);
  return res.json({ ok: true });
});

// Admin: set password directly (does NOT reveal current password) - protected by adminOnly
app.put('/api/admin/users/:id/set-password', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  if (!newPassword) return res.status(400).json({ error: 'newPassword required' });
  const hash = await bcrypt.hash(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);
  return res.json({ ok: true });
});

// Admin: impersonate user (gives a JWT for that user)
app.post('/api/admin/users/:id/impersonate', authMiddleware, adminOnly, (req, res) => {
  const { id } = req.params;
  const user = findUserById(id);
  if (!user) return res.status(404).json({ error: 'user_not_found' });
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
  return res.json({ ok: true, token, user: omit(user) });
});

// GET /api/plans
app.get('/api/plans', (req, res) => {
  const rows = db.prepare('SELECT id,name,isPaid,price,config FROM plans').all();
  const parsed = rows.map(r => ({ ...r, isPaid: !!r.isPaid, config: JSON.parse(r.config || '{}') }));
  res.json(parsed);
});

// Admin: list users (no passwords)
app.get('/api/users', authMiddleware, adminOnly, (req, res) => {
  const rows = db.prepare('SELECT id,login,firstName,lastName,plan,role,lastIP,geoLocation,lastLogin FROM users').all();
  res.json(rows);
});

// PUT /api/users/:id update profile (admin or owner or same user)
app.put('/api/users/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const actor = req.user;
  if (!actor) return res.status(401).json({ error: 'no_auth' });
  if (!(actor.role === 'admin' || actor.role === 'owner' || actor.id === id)) return res.status(403).json({ error: 'forbidden' });
  const { firstName, lastName, login, plan, role } = req.body;
  db.prepare('UPDATE users SET firstName = ?, lastName = ?, login = ?, plan = ?, role = ? WHERE id = ?')
    .run(firstName, lastName, login, plan, role, id);
  res.json({ ok: true });
});

// workouts
app.post('/api/workouts', authMiddleware, (req, res) => {
  const { workout } = req.body;
  if (!workout) return res.status(400).json({ error: 'workout required' });
  db.prepare('INSERT INTO workouts (userId,date,level,duration,hour,completed) VALUES (?,?,?,?,?,?)')
    .run(req.user.id, workout.date, workout.level, workout.duration, workout.hour, workout.completed ? 1 : 0);
  res.json({ ok: true });
});

app.get('/api/workouts', authMiddleware, (req, res) => {
  const { userId, date } = req.query;
  if (!userId || !date) return res.json(null);
  const row = db.prepare('SELECT * FROM workouts WHERE userId = ? AND date = ?').get(userId, date);
  if (!row) return res.json(null);
  res.json({ id: row.id, userId: row.userId, date: row.date, level: row.level, duration: row.duration, hour: row.hour, completed: !!row.completed });
});

// stats
app.get('/api/stats', authMiddleware, adminOnly, (req, res) => {
  const usersCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const admins = db.prepare("SELECT COUNT(*) as c FROM users WHERE role IN ('admin','owner')").get().c;
  res.json({ users: usersCount, admins });
});

// geo
app.get('/api/geo', async (req, res) => {
  const ip = req.query.ip;
  try {
    if (ip) {
      const r = await fetch(`https://ipapi.co/${ip}/json/`);
      const j = await r.json();
      return res.json({ ip: j.ip, city: j.city, region: j.region, country: j.country_name });
    }
    const r = await fetch('https://ipapi.co/json/');
    const j = await r.json();
    return res.json({ ip: j.ip, city: j.city, region: j.region, country: j.country_name });
  } catch (e) { return res.status(500).json({ error: 'geo_failed' }); }
});

app.get('/', (req, res) => res.send('OK'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log('Server listening on', PORT));
