// db.js – wersja pod sqlite3 (Render + Node 24)
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const db = new sqlite3.Database(path.join(dataDir, 'db.sqlite'));

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
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
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    date TEXT,
    level TEXT,
    duration INTEGER,
    hour TEXT,
    completed INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    isPaid INTEGER DEFAULT 0,
    price INTEGER DEFAULT 0,
    config TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    token TEXT,
    expiresAt INTEGER
  )`);

  db.get("SELECT COUNT(*) as c FROM users WHERE role IN ('admin','owner')", (err, row) => {
    if (err) return console.error(err);
    if (row.c === 0) {
      const hash = bcrypt.hashSync('StrongAdminPass123!', 10);
      db.run(
        'INSERT INTO users (login, password_hash, firstName, lastName, role, plan) VALUES (?, ?, ?, ?, ?, ?)',
        ['admin', hash, 'Admin', 'Account', 'owner', 'Pro'],
        (err2) => {
          if (err2) console.error(err2);
          else console.log('✅ Admin seeded: login=admin, pass=StrongAdminPass123!');
        }
      );
    }
  });
});

db.close(() => {
  console.log('✅ Database migrated!');
  process.exit(0);
});
