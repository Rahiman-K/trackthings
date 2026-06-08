const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

// Get all tasks for a specific date
router.get('/', (req, res) => {
  const { date } = req.query;
  let tasks;

  if (date) {
    tasks = db.prepare(`
      SELECT * FROM tasks WHERE scheduled_date = ? ORDER BY sort_order ASC, created_at ASC
    `).all(date);
  } else {
    tasks = db.prepare(`
      SELECT * FROM tasks WHERE status != 'completed' ORDER BY sort_order ASC, created_at ASC
    `).all();
  }

  // Attach checklist items and time sessions to each task
  const enrichedTasks = tasks.map(task => {
    const checklist = db.prepare(
      'SELECT * FROM checklist_items WHERE task_id = ? ORDER BY sort_order ASC'
    ).all(task.id);

    const sessions = db.prepare(
      'SELECT * FROM time_sessions WHERE task_id = ? ORDER BY started_at DESC'
    ).all(task.id);

    const totalTracked = sessions.reduce((sum, s) => sum + (s.total_elapsed || 0), 0);

    return { ...task, checklist, sessions, total_tracked: totalTracked };
  });

  res.json(enrichedTasks);
});

// Get single task
router.get('/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const checklist = db.prepare(
    'SELECT * FROM checklist_items WHERE task_id = ? ORDER BY sort_order ASC'
  ).all(task.id);

  const sessions = db.prepare(
    'SELECT * FROM time_sessions WHERE task_id = ? ORDER BY started_at DESC'
  ).all(task.id);

  const totalTracked = sessions.reduce((sum, s) => sum + (s.total_elapsed || 0), 0);

  res.json({ ...task, checklist, sessions, total_tracked: totalTracked });
});

// Create a new task
router.post('/', (req, res) => {
  const { title, description, planned_duration, scheduled_date, scheduled_time, priority, checklist } = req.body;
  const id = uuidv4();
  const today = new Date().toISOString().split('T')[0];

  db.prepare(`
    INSERT INTO tasks (id, title, description, planned_duration, scheduled_date, scheduled_time, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, description || '', planned_duration || 0, scheduled_date || today, scheduled_time || null, priority || 'medium');

  // Add checklist items if provided
  if (checklist && checklist.length > 0) {
    const insertChecklist = db.prepare(
      'INSERT INTO checklist_items (id, task_id, title, sort_order) VALUES (?, ?, ?, ?)'
    );
    checklist.forEach((item, index) => {
      insertChecklist.run(uuidv4(), id, item.title, index);
    });
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  const checklistItems = db.prepare('SELECT * FROM checklist_items WHERE task_id = ?').all(id);

  res.status(201).json({ ...task, checklist: checklistItems, sessions: [], total_tracked: 0 });
});

// Update a task
router.put('/:id', (req, res) => {
  const { title, description, planned_duration, scheduled_date, scheduled_time, status, priority, sort_order } = req.body;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const completed_at = status === 'completed' ? new Date().toISOString() : task.completed_at;

  db.prepare(`
    UPDATE tasks SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      planned_duration = COALESCE(?, planned_duration),
      scheduled_date = COALESCE(?, scheduled_date),
      scheduled_time = COALESCE(?, scheduled_time),
      status = COALESCE(?, status),
      priority = COALESCE(?, priority),
      sort_order = COALESCE(?, sort_order),
      completed_at = ?
    WHERE id = ?
  `).run(title, description, planned_duration, scheduled_date, scheduled_time, status, priority, sort_order, completed_at, req.params.id);

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Delete a task
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Rollover incomplete tasks to today
router.post('/rollover', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const incompleteTasks = db.prepare(`
    SELECT * FROM tasks WHERE scheduled_date < ? AND status != 'completed'
  `).all(today);

  const rollover = db.prepare(`
    UPDATE tasks SET scheduled_date = ?, rolled_over_from = scheduled_date WHERE id = ?
  `);

  incompleteTasks.forEach(task => {
    rollover.run(today, task.id);
  });

  res.json({ rolled_over: incompleteTasks.length, tasks: incompleteTasks.map(t => t.id) });
});

// Checklist operations
router.post('/:id/checklist', (req, res) => {
  const { title } = req.body;
  const itemId = uuidv4();
  const maxOrder = db.prepare(
    'SELECT MAX(sort_order) as max FROM checklist_items WHERE task_id = ?'
  ).get(req.params.id);

  db.prepare(
    'INSERT INTO checklist_items (id, task_id, title, sort_order) VALUES (?, ?, ?, ?)'
  ).run(itemId, req.params.id, title, (maxOrder?.max || 0) + 1);

  const item = db.prepare('SELECT * FROM checklist_items WHERE id = ?').get(itemId);
  res.status(201).json(item);
});

router.put('/checklist/:itemId', (req, res) => {
  const { is_completed, title } = req.body;
  db.prepare(`
    UPDATE checklist_items SET
      is_completed = COALESCE(?, is_completed),
      title = COALESCE(?, title)
    WHERE id = ?
  `).run(is_completed, title, req.params.itemId);

  const item = db.prepare('SELECT * FROM checklist_items WHERE id = ?').get(req.params.itemId);
  res.json(item);
});

router.delete('/checklist/:itemId', (req, res) => {
  db.prepare('DELETE FROM checklist_items WHERE id = ?').run(req.params.itemId);
  res.json({ success: true });
});

module.exports = router;
