const express = require('express');
const router = express.Router();
const db = require('../db');

// Export all data as JSON
router.get('/json', (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
  const checklist_items = db.prepare('SELECT * FROM checklist_items ORDER BY sort_order ASC').all();
  const time_sessions = db.prepare('SELECT * FROM time_sessions ORDER BY started_at DESC').all();
  const daily_reviews = db.prepare('SELECT * FROM daily_reviews ORDER BY date DESC').all();

  const exportData = {
    exported_at: new Date().toISOString(),
    version: '1.0.0',
    data: {
      tasks,
      checklist_items,
      time_sessions,
      daily_reviews
    }
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=trackthings-export-${new Date().toISOString().split('T')[0]}.json`);
  res.json(exportData);
});

// Import data from JSON
router.post('/import', (req, res) => {
  const { data } = req.body;
  if (!data || !data.tasks) {
    return res.status(400).json({ error: 'Invalid import data' });
  }

  const insertTask = db.prepare(`
    INSERT OR REPLACE INTO tasks (id, title, description, planned_duration, scheduled_date, scheduled_time, status, priority, created_at, completed_at, rolled_over_from, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertChecklist = db.prepare(`
    INSERT OR REPLACE INTO checklist_items (id, task_id, title, is_completed, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertSession = db.prepare(`
    INSERT OR REPLACE INTO time_sessions (id, task_id, started_at, paused_at, resumed_at, ended_at, total_elapsed, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    for (const t of data.tasks) {
      insertTask.run(t.id, t.title, t.description, t.planned_duration, t.scheduled_date, t.scheduled_time, t.status, t.priority, t.created_at, t.completed_at, t.rolled_over_from, t.sort_order);
    }
    for (const c of (data.checklist_items || [])) {
      insertChecklist.run(c.id, c.task_id, c.title, c.is_completed, c.sort_order);
    }
    for (const s of (data.time_sessions || [])) {
      insertSession.run(s.id, s.task_id, s.started_at, s.paused_at, s.resumed_at, s.ended_at, s.total_elapsed, s.status);
    }
  });

  try {
    transaction();
    res.json({ success: true, imported: { tasks: data.tasks.length } });
  } catch (err) {
    res.status(500).json({ error: 'Import failed: ' + err.message });
  }
});

module.exports = router;
