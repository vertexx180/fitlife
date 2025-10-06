// db.js – wersja PostgreSQL / Neon
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // ważne dla Render / Neon
});

// Funkcja do wykonywania zapytań
const query = (text, params) => pool.query(text, params);

// Funkcja inicjalizująca bazę (tworzenie tabel i seed admina)
const initDB = async () => {
  try {
    // Tabele
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        login TEXT UNIQUE,
        password_hash TEXT,
        firstName TEXT,
        lastName TEXT,
        plan TEXT,
        role TEXT DEFAULT 'user',
        lastIP TEXT,
        geoLocation TEXT,
        lastLogin TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS workouts (
        id SERIAL PRIMARY KEY,
        userId INTEGER REFERENCES users(id),
        date DATE,
        level TEXT,
        duration INTEGER,
        hour TEXT,
        completed BOOLEAN DEFAULT FALSE
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS plans (
        id SERIAL PRIMARY KEY,
        name TEXT,
        isPaid BOOLEAN DEFAULT FALSE,
        price INTEGER DEFAULT 0,
        config TEXT
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS reset_tokens (
        id SERIAL PRIMARY KEY,
        userId INTEGER REFERENCES users(id),
        token TEXT,
        expiresAt TIMESTAMP
      );
    `);

    // Seed admina jeśli nie istnieje
    const existingAdmin = await query(
      "SELECT id FROM users WHERE role IN ('admin','owner')"
    );

    if (existingAdmin.rowCount === 0) {
      const hash = await bcrypt.hash('StrongAdminPass123!', 10);
      await query(
        `INSERT INTO users (login, password_hash, firstName, lastName, role, plan)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        ['admin', hash, 'Admin', 'Account', 'owner', 'Pro']
      );
      console.log('✅ Admin seeded: login=admin, pass=StrongAdminPass123!');
    }

    console.log('✅ Database initialized!');
  } catch (err) {
    console.error('❌ Error initializing database:', err);
  }
};

module.exports = { query, initDB, pool };
