const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { generateToken, authenticateToken } = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // Check if user already exists
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const id = uuidv4();
  const password_hash = await bcrypt.hash(password, 10);

  db.prepare(
    'INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)'
  ).run(id, email.toLowerCase(), password_hash, name || '');

  const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(id);
  const token = generateToken(user);

  res.status(201).json({ user, token });
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = generateToken(user);
  const { password_hash, google_access_token, google_refresh_token, ...safeUser } = user;

  res.json({ user: safeUser, token });
});

// Get current user profile
router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare(
    'SELECT id, email, name, google_calendar_enabled, created_at FROM users WHERE id = ?'
  ).get(req.user.id);

  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// Update profile
router.put('/me', authenticateToken, async (req, res) => {
  const { name, currentPassword, newPassword } = req.body;

  if (newPassword) {
    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password required to change password' });
    }
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    const newHash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.id);
  }

  if (name !== undefined) {
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, req.user.id);
  }

  const updated = db.prepare(
    'SELECT id, email, name, google_calendar_enabled, created_at FROM users WHERE id = ?'
  ).get(req.user.id);

  res.json(updated);
});

module.exports = router;
