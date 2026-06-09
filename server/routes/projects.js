const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Get all projects
router.get('/', async (req, res) => {
  try {
    const projects = await db.all(
      'SELECT p.*, c.name as client_name FROM projects p LEFT JOIN clients c ON p.client_id = c.id WHERE p.user_id = ? ORDER BY p.name',
      req.user.id
    );
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get projects' });
  }
});

// Create project
router.post('/', async (req, res) => {
  try {
    const { name, color, client_id, billable_rate, is_billable } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Project name is required' });

    const id = uuidv4();
    await db.run(
      'INSERT INTO projects (id, user_id, name, color, client_id, billable_rate, is_billable) VALUES (?, ?, ?, ?, ?, ?, ?)',
      id, req.user.id, name.trim(), color || '#3b82f6', client_id || null, billable_rate || 0, is_billable ? 1 : 0
    );

    const project = await db.get('SELECT * FROM projects WHERE id = ?', id);
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project
router.put('/:id', async (req, res) => {
  try {
    const { name, color, client_id, billable_rate, is_billable } = req.body;
    const project = await db.get('SELECT * FROM projects WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    await db.run(
      'UPDATE projects SET name = ?, color = ?, client_id = ?, billable_rate = ?, is_billable = ? WHERE id = ?',
      name || project.name, color || project.color, client_id !== undefined ? client_id : project.client_id,
      billable_rate !== undefined ? billable_rate : project.billable_rate,
      is_billable !== undefined ? (is_billable ? 1 : 0) : project.is_billable,
      req.params.id
    );

    const updated = await db.get('SELECT * FROM projects WHERE id = ?', req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const project = await db.get('SELECT * FROM projects WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    await db.run('UPDATE tasks SET project_id = NULL WHERE project_id = ?', req.params.id);
    await db.run('UPDATE time_sessions SET project_id = NULL WHERE project_id = ?', req.params.id);
    await db.run('DELETE FROM projects WHERE id = ?', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;
