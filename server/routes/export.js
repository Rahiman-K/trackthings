const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Export all data as JSON
router.get('/json', async (req, res) => {
  try {
    const userId = req.user.id;
    const tasks = await db.all('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC', userId);

    let checklist_items = [];
    let time_sessions = [];
    for (const task of tasks) {
      const items = await db.all('SELECT * FROM checklist_items WHERE task_id = ?', task.id);
      checklist_items.push(...items);
      const sessions = await db.all('SELECT * FROM time_sessions WHERE task_id = ?', task.id);
      time_sessions.push(...sessions);
    }

    const daily_reviews = await db.all('SELECT * FROM daily_reviews WHERE user_id = ? ORDER BY date DESC', userId);

    const exportData = {
      exported_at: new Date().toISOString(),
      version: '1.0.0',
      data: { tasks, checklist_items, time_sessions, daily_reviews }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=trackthings-export-${new Date().toISOString().split('T')[0]}.json`);
    res.json(exportData);
  } catch (err) {
    res.status(500).json({ error: 'Export failed' });
  }
});

// Import data from JSON
router.post('/import', async (req, res) => {
  try {
    const { data } = req.body;
    const userId = req.user.id;

    if (!data || !data.tasks) {
      return res.status(400).json({ error: 'Invalid import data' });
    }

    for (const t of data.tasks) {
      await db.run(
        'INSERT OR REPLACE INTO tasks (id, user_id, title, description, planned_duration, scheduled_date, scheduled_time, status, priority, created_at, completed_at, rolled_over_from, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        t.id, userId, t.title, t.description, t.planned_duration, t.scheduled_date, t.scheduled_time, t.status, t.priority, t.created_at, t.completed_at, t.rolled_over_from, t.sort_order
      );
    }
    for (const c of (data.checklist_items || [])) {
      await db.run(
        'INSERT OR REPLACE INTO checklist_items (id, task_id, title, is_completed, sort_order) VALUES (?, ?, ?, ?, ?)',
        c.id, c.task_id, c.title, c.is_completed, c.sort_order
      );
    }
    for (const s of (data.time_sessions || [])) {
      await db.run(
        'INSERT OR REPLACE INTO time_sessions (id, task_id, started_at, paused_at, resumed_at, ended_at, total_elapsed, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        s.id, s.task_id, s.started_at, s.paused_at, s.resumed_at, s.ended_at, s.total_elapsed, s.status
      );
    }

    res.json({ success: true, imported: { tasks: data.tasks.length } });
  } catch (err) {
    res.status(500).json({ error: 'Import failed: ' + err.message });
  }
});

module.exports = router;
