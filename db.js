const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'db.sqlite');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    company TEXT,
    location TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER,
    name TEXT,
    email TEXT,
    resume TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(job_id) REFERENCES jobs(id)
  )`);
});

// Seed some example jobs if none exist
db.get('SELECT COUNT(*) as cnt FROM jobs', (err, row) => {
  if (!err && row && row.cnt === 0) {
    const sample = [
      ['Frontend Developer','Acme Co','Remote','Build beautiful UIs using modern JS frameworks.'],
      ['Backend Engineer','Globex','New York, NY','Design scalable APIs and services.'],
      ['Product Designer','Innotech','San Francisco, CA','Design user-centered product experiences.']
    ];
    const stmt = db.prepare('INSERT INTO jobs (title, company, location, description) VALUES (?, ?, ?, ?)');
    sample.forEach(s => stmt.run(s[0], s[1], s[2], s[3]));
    stmt.finalize();
  }
});

module.exports = db;
