// db.js - uruchom `npm run migrate` raz przed startem
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const db = new Database('./data/db.sqlite');

// users
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

// workouts
db.prepare(`CREATE TABLE IF NOT EXISTS workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER,
  date TEXT,
  level TEXT,
  duration INTEGER,
  hour TEXT,
  completed INTEGER DEFAULT 0
)`).run();

// plans
db.prepare(`CREATE TABLE IF NOT EXISTS plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  isPaid INTEGER DEFAULT 0,
  price INTEGER DEFAULT 0,
  config TEXT
)`).run();

// password reset tokens
db.prepare(`CREATE TABLE IF NOT EXISTS reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER,
  token TEXT,
  expiresAt INTEGER
)`).run();

// seed admin if none
const adminCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE role IN ('admin','owner')").get().c;
if (adminCount === 0) {
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync('StrongAdminPass123!', salt); // change after deploy
  db.prepare('INSERT INTO users (login,password_hash,firstName,lastName,role,plan) VALUES (?,?,?,?,?,?)')
    .run('admin','' + hash, 'Admin','Account','owner','Pro');
  console.log('Seeded admin user login=admin password=StrongAdminPass123! — change it immediately!');
}

console.log('DB migrated.');
process.exit(0);
