const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const db = require('./db');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

function generateToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
}

app.post('/api/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  try {
    const hash = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash], function (err) {
      if (err) return res.status(400).json({ error: 'username taken' });
      const user = { id: this.lastID, username };
      res.json({ user, token: generateToken(user) });
    });
  } catch (e) {
    res.status(500).json({ error: 'server error' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, row) => {
    if (err) return res.status(500).json({ error: 'server' });
    if (!row) return res.status(400).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, row.password);
    if (!ok) return res.status(400).json({ error: 'invalid credentials' });
    const user = { id: row.id, username: row.username };
    res.json({ user, token: generateToken(user) });
  });
});

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'missing token' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'invalid auth' });
  const token = parts[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'invalid token' });
    req.user = decoded;
    next();
  });
}

app.get('/api/jobs', (req, res) => {
  const q = req.query.q || '';
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  let sql = 'SELECT * FROM jobs';
  const params = [];
  if (q) {
    sql += ' WHERE title LIKE ? OR company LIKE ? OR description LIKE ?';
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'db' });
    res.json(rows);
  });
});

app.post('/api/jobs', authMiddleware, (req, res) => {
  const { title, company, location, description } = req.body;
  if (!title || !company) return res.status(400).json({ error: 'title and company required' });
  db.run('INSERT INTO jobs (title, company, location, description) VALUES (?, ?, ?, ?)', [title, company, location || '', description || ''], function (err) {
    if (err) return res.status(500).json({ error: 'db' });
    db.get('SELECT * FROM jobs WHERE id = ?', [this.lastID], (e, row) => res.json(row));
  });
});

app.post('/api/jobs/:id/apply', (req, res) => {
  const jobId = req.params.id;
  const { name, email, resume } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email required' });
  db.run('INSERT INTO applications (job_id, name, email, resume) VALUES (?, ?, ?, ?)', [jobId, name, email, resume || ''], function (err) {
    if (err) return res.status(500).json({ error: 'db' });
    res.json({ id: this.lastID });
  });
});

app.get('/api/jobs/:id', (req, res) => {
  db.get('SELECT * FROM jobs WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'db' });
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json(row);
  });
});

app.get('/api/me', authMiddleware, (req, res) => {
  db.get('SELECT id, username FROM users WHERE id = ?', [req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'db' });
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json(row);
  });
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Job board API is running' });
});

// Only listen on localhost for development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
}

module.exports = app;
