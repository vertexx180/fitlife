const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const fetch = require('node-fetch');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

const db = new sqlite3.Database('./data/db.sqlite');
const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin_secret';

// Helpery
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'no_token' });
  try {
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await get('SELECT * FROM users WHERE id = ?', [payload.id]);
    if (!user) return res.status(401).json({ error: 'invalid_user' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'invalid_token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role === 'admin' || req.user?.role === 'owner') return next();
  return res.status(403).json({ error: 'admin_only' });
}

// --- AUTH
app.post('/api/auth/register', async (req, res) => {
  const { login, password, firstName, lastName } = req.body;
  if (!login || !password) return res.status(400).json({ error: 'missing_data' });
  const existing = await get('SELECT * FROM users WHERE login = ?', [login]);
  if (existing) return res.status(400).json({ error: 'user_exists' });

  const hash = await bcrypt.hash(password, 10);
  await run(
    'INSERT INTO users (login, password_hash, firstName, lastName, plan) VALUES (?, ?, ?, ?, ?)',
    [login, hash, firstName || '', lastName || '', 'Starter']
  );
  const user = await get('SELECT * FROM users WHERE login = ?', [login]);
  const token = signToken(user);
  res.json({ user, token });
});

app.post('/api/auth/login', async (req, res) => {
  const { login, password } = req.body;
  const user = await get('SELECT * FROM users WHERE login = ?', [login]);
  if (!user) return res.status(401).json({ error: 'invalid' });
  const ok = await bcrypt.compare(password, user.password_hash || '');
  if (!ok) return res.status(401).json({ error: 'invalid' });

  await run('UPDATE users SET lastLogin = ? WHERE id = ?', [new Date().toISOString(), user.id]);
  const token = signToken(user);
  res.json({ user, token });
});

// RESET HASŁA
app.post('/api/auth/reset-request', async (req, res) => {
  const { login } = req.body;
  const user = await get('SELECT * FROM users WHERE login = ?', [login]);
  if (!user) return res.json({ ok: true });

  const token = uuidv4();
  const expiresAt = Date.now() + 3600000;
  await run('INSERT INTO reset_tokens (userId, token, expiresAt) VALUES (?, ?, ?)', [
    user.id,
    token,
    expiresAt,
  ]);
  res.json({ ok: true, token });
});

app.post('/api/auth/reset-confirm', async (req, res) => {
  const { token, newPassword } = req.body;
  const reset = await get('SELECT * FROM reset_tokens WHERE token = ?', [token]);
  if (!reset) return res.status(400).json({ error: 'bad_token' });
  if (Date.now() > reset.expiresAt) return res.status(400).json({ error: 'expired' });

  const hash = await bcrypt.hash(newPassword, 10);
  await run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, reset.userId]);
  await run('DELETE FROM reset_tokens WHERE token = ?', [token]);
  res.json({ ok: true });
});

// --- ADMIN
app.put('/api/admin/users/:id/set-password', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  const hash = await bcrypt.hash(newPassword, 10);
  await run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
  res.json({ ok: true });
});

app.post('/api/admin/users/:id/impersonate', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  const user = await get('SELECT * FROM users WHERE id = ?', [id]);
  if (!user) return res.status(404).json({ error: 'not_found' });
  const token = signToken(user);
  res.json({ ok: true, token, user });
});

app.get('/api/users', authMiddleware, adminOnly, async (req, res) => {
  const users = await all(
    'SELECT id, login, firstName, lastName, plan, role, lastIP, geoLocation, lastLogin FROM users'
  );
  res.json(users);
});

app.put('/api/users/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const actor = req.user;
  if (!(actor.role === 'admin' || actor.role === 'owner' || actor.id == id))
    return res.status(403).json({ error: 'forbidden' });

  const { firstName, lastName, plan, role } = req.body;
  await run(
    'UPDATE users SET firstName=?, lastName=?, plan=?, role=? WHERE id=?',
    [firstName, lastName, plan, role, id]
  );
  res.json({ ok: true });
});

// WORKOUTY
app.post('/api/workouts', authMiddleware, async (req, res) => {
  const { date, level, duration, hour, completed } = req.body;
  await run(
    'INSERT INTO workouts (userId, date, level, duration, hour, completed) VALUES (?, ?, ?, ?, ?, ?)',
    [req.user.id, date, level, duration, hour, completed ? 1 : 0]
  );
  res.json({ ok: true });
});

app.get('/api/workouts', authMiddleware, async (req, res) => {
  const { date } = req.query;
  const workout = await get('SELECT * FROM workouts WHERE userId = ? AND date = ?', [
    req.user.id,
    date,
  ]);
  res.json(workout || { message: 'brak treningu' });
});

// GEOLOKALIZACJA
app.get('/api/geo', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const r = await fetch(`https://ipapi.co/${ip}/json/`);
    const j = await r.json();
    res.json(j);
  } catch (e) {
    res.status(500).json({ error: 'geo_failed' });
  }
});

// STATY
app.get('/api/stats', authMiddleware, adminOnly, async (req, res) => {
  const users = await get('SELECT COUNT(*) as c FROM users');
  const admins = await get("SELECT COUNT(*) as c FROM users WHERE role IN ('admin','owner')");
  res.json({ users: users.c, admins: admins.c });
});

// ===========================================================
// TYMCZASOWY ENDPOINT – STWORZENIE KONTA ADMINA
// ===========================================================
app.get('/api/create-admin', async (req, res) => {
  try {
    const login = 'admin';
    const password = 'StrongAdminPass123!'; // <-- tu możesz zmienić hasło
    const role = 'owner';
    const bcrypt = require('bcrypt');

    // hashowanie hasła
    const hash = await bcrypt.hash(password, 10);

    // sprawdzenie czy admin już istnieje
    const existing = await db.query('SELECT id FROM users WHERE login=$1', [login]);
    if (existing.rowCount) {
      await db.query('UPDATE users SET password_hash=$1, role=$2 WHERE login=$3', [hash, role, login]);
      return res.send('Admin zaktualizowany.');
    }

    // wstawienie nowego admina
    await db.query('INSERT INTO users (login, password_hash, role) VALUES ($1,$2,$3)', [login, hash, role]);
    return res.send('Admin stworzony.');
  } catch (err) {
    console.error(err);
    return res.status(500).send('Błąd serwera.');
  }
});


app.get('/', (_, res) => res.send('✅ Backend działa'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('🚀 Server działa na porcie', PORT));
