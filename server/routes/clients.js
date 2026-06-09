const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Get all clients
router.get('/', async (req, res) => {
  try {
    const clients = await db.all(
      'SELECT * FROM clients WHERE user_id = ? ORDER BY name',
      req.user.id
    );
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get clients' });
  }
});

// Create client
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Client name is required' });

    const id = uuidv4();
    await db.run(
      'INSERT INTO clients (id, user_id, name) VALUES (?, ?, ?)',
      id, req.user.id, name.trim()
    );

    const client = await db.get('SELECT * FROM clients WHERE id = ?', id);
    res.status(201).json(client);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// Update client
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    const client = await db.get('SELECT * FROM clients WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    await db.run('UPDATE clients SET name = ? WHERE id = ?', name.trim(), req.params.id);
    const updated = await db.get('SELECT * FROM clients WHERE id = ?', req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// Delete client
router.delete('/:id', async (req, res) => {
  try {
    const client = await db.get('SELECT * FROM clients WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    await db.run('UPDATE projects SET client_id = NULL WHERE client_id = ?', req.params.id);
    await db.run('DELETE FROM clients WHERE id = ?', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

module.exports = router;
