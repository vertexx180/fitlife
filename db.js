const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const db = new Database('./data/db.sqlite');

db.prepare(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  login TEXT UNIQUE,
  password_hash TEXT,
  firstName TEXT,
  lastName TEXT,
  plan TEXT,
  role TEXT DEFAULT 'user',
  lastIP TEXT,
  geoLocation TEXT,
  lastLogin TEXT
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER,
  date TEXT,
  level TEXT,
  duration INTEGER,
  hour TEXT,
  completed INTEGER DEFAULT 0
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  isPaid INTEGER DEFAULT 0,
  price INTEGER DEFAULT 0,
  config TEXT
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER,
  token TEXT,
  expiresAt INTEGER
)`).run();

const adminCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE role IN ('admin','owner')").get().c;
if (adminCount === 0) {
  const hash = bcrypt.hashSync('StrongAdminPass123!', 10);
  db.prepare('INSERT INTO users (login,password_hash,firstName,lastName,role,plan) VALUES (?,?,?,?,?,?)')
    .run('admin', hash, 'Admin', 'Account', 'owner', 'Pro');
  console.log('✅ Admin seeded: login=admin, pass=StrongAdminPass123!');
}

console.log('✅ Database migrated!');
process.exit(0);
