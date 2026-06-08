const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { generateToken, authenticateToken, JWT_SECRET } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// Register
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const existing = await db.get('SELECT id FROM users WHERE email = ?', email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const id = uuidv4();
    const password_hash = await bcrypt.hash(password, 10);

    await db.run(
      'INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
      id, email.toLowerCase(), password_hash, name || ''
    );

    const user = await db.get('SELECT id, email, name, created_at FROM users WHERE id = ?', id);
    const token = generateToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await db.get('SELECT * FROM users WHERE email = ?', email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);
    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.get(
      'SELECT id, email, name, google_calendar_enabled, created_at FROM users WHERE id = ?',
      req.user.id
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update profile
router.put('/me', authenticateToken, async (req, res) => {
  const { name, currentPassword, newPassword } = req.body;

  try {
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password required to change password' });
      }
      const user = await db.get('SELECT password_hash FROM users WHERE id = ?', req.user.id);
      const valid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      const newHash = await bcrypt.hash(newPassword, 10);
      await db.run('UPDATE users SET password_hash = ? WHERE id = ?', newHash, req.user.id);
    }

    if (name !== undefined) {
      await db.run('UPDATE users SET name = ? WHERE id = ?', name, req.user.id);
    }

    const updated = await db.get(
      'SELECT id, email, name, google_calendar_enabled, created_at FROM users WHERE id = ?',
      req.user.id
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user = await db.get('SELECT id, email FROM users WHERE email = ?', email.toLowerCase());
    if (!user) {
      return res.json({ message: 'If that email exists, a reset link has been generated.' });
    }

    const resetToken = jwt.sign(
      { id: user.id, purpose: 'reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      message: 'If that email exists, a reset link has been generated.',
      resetToken
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.purpose !== 'reset') {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.run('UPDATE users SET password_hash = ? WHERE id = ?', newHash, decoded.id);
    res.json({ message: 'Password reset successful. You can now sign in.' });
  } catch (err) {
    res.status(400).json({ error: 'Invalid or expired reset token' });
  }
});

module.exports = router;
