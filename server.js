const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const db = require('./db'); // nowy db.js dla PostgreSQL

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin_secret';

// ===========================================================
// HELPERY
// ===========================================================
function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'no_token' });
  try {
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET);
    const userRes = await db.query('SELECT * FROM users WHERE id=$1', [payload.id]);
    const user = userRes.rows[0];
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

// ===========================================================
// INIT DB
// ===========================================================
db.initDB().then(() => console.log('✅ DB ready')).catch(console.error);

// ===========================================================
// AUTH
// ===========================================================
app.post('/api/auth/register', async (req, res) => {
  const { login, password, firstName, lastName } = req.body;
  if (!login || !password) return res.status(400).json({ error: 'missing_data' });

  const existingRes = await db.query('SELECT * FROM users WHERE login=$1', [login]);
  if (existingRes.rowCount) return res.status(400).json({ error: 'user_exists' });

  const hash = await bcrypt.hash(password, 10);
  await db.query(
    'INSERT INTO users (login, password_hash, firstName, lastName, plan) VALUES ($1,$2,$3,$4,$5)',
    [login, hash, firstName || '', lastName || '', 'Starter']
  );

  const userRes = await db.query('SELECT * FROM users WHERE login=$1', [login]);
  const user = userRes.rows[0];
  const token = signToken(user);
  res.json({ user, token });
});

app.post('/api/auth/login', async (req, res) => {
  const { login, password } = req.body;
  const userRes = await db.query('SELECT * FROM users WHERE login=$1', [login]);
  const user = userRes.rows[0];
  if (!user) return res.status(401).json({ error: 'invalid' });

  const ok = await bcrypt.compare(password, user.password_hash || '');
  if (!ok) return res.status(401).json({ error: 'invalid' });

  await db.query('UPDATE users SET lastLogin=$1 WHERE id=$2', [new Date().toISOString(), user.id]);
  const token = signToken(user);
  res.json({ user, token });
});

// ===========================================================
// RESET HASŁA
// ===========================================================
app.post('/api/auth/reset-request', async (req, res) => {
  const { login } = req.body;
  const userRes = await db.query('SELECT * FROM users WHERE login=$1', [login]);
  const user = userRes.rows[0];
  if (!user) return res.json({ ok: true });

  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 3600000).toISOString();
  await db.query('INSERT INTO reset_tokens (userId, token, expiresAt) VALUES ($1,$2,$3)', [
    user.id,
    token,
    expiresAt,
  ]);
  res.json({ ok: true, token });
});

app.post('/api/auth/reset-confirm', async (req, res) => {
  const { token, newPassword } = req.body;
  const resetRes = await db.query('SELECT * FROM reset_tokens WHERE token=$1', [token]);
  const reset = resetRes.rows[0];
  if (!reset) return res.status(400).json({ error: 'bad_token' });
  if (new Date() > new Date(reset.expiresAt)) return res.status(400).json({ error: 'expired' });

  const hash = await bcrypt.hash(newPassword, 10);
  await db.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, reset.userId]);
  await db.query('DELETE FROM reset_tokens WHERE token=$1', [token]);
  res.json({ ok: true });
});

// ===========================================================
// ADMIN
// ===========================================================

// ===========================================================
// WORKOUTY
// ===========================================================
app.post('/api/workouts', authMiddleware, async (req, res) => {
  const { date, level, duration, hour, completed } = req.body;
  await db.query(
    'INSERT INTO workouts (userId, date, level, duration, hour, completed) VALUES ($1,$2,$3,$4,$5,$6)',
    [req.user.id, date, level, duration, hour, completed || false]
  );
  res.json({ ok: true });
});

app.get('/api/workouts', authMiddleware, async (req, res) => {
  const { date } = req.query;
  const workoutRes = await db.query(
    'SELECT * FROM workouts WHERE userId=$1 AND date=$2',
    [req.user.id, date]
  );
  const workout = workoutRes.rows[0];
  res.json(workout || { message: 'brak treningu' });
});

// ===========================================================
// GEOLOKALIZACJA
// ===========================================================
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

// ===========================================================
// STATY
// ===========================================================
app.get('/api/stats', authMiddleware, adminOnly, async (req, res) => {
  const usersRes = await db.query('SELECT COUNT(*) as c FROM users');
  const adminsRes = await db.query("SELECT COUNT(*) as c FROM users WHERE role IN ('admin','owner')");
  res.json({ users: parseInt(usersRes.rows[0].c), admins: parseInt(adminsRes.rows[0].c) });
});

// ===========================================================
// TYMCZASOWY ENDPOINT – STWORZENIE KONTA ADMINA
// ===========================================================
app.get('/api/create-admin', async (req, res) => {
  try {
    const login = 'admin';
    const password = 'StrongAdminPass123!';
    const role = 'owner';
    const hash = await bcrypt.hash(password, 10);

    const existingRes = await db.query('SELECT id FROM users WHERE login=$1', [login]);
    if (existingRes.rowCount) {
      await db.query('UPDATE users SET password_hash=$1, role=$2 WHERE login=$3', [hash, role, login]);
      return res.send('Admin zaktualizowany.');
    }

    await db.query('INSERT INTO users (login, password_hash, role) VALUES ($1,$2,$3)', [login, hash, role]);
    return res.send('Admin stworzony.');
  } catch (err) {
    console.error(err);
    return res.status(500).send('Błąd serwera.');
  }
});

// ===========================================================
app.get('/', (_, res) => res.send('✅ Backend działa'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('🚀 Server działa na porcie', PORT));
