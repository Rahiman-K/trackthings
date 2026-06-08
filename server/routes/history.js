const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

// Get history/stats for a date range
router.get('/stats', (req, res) => {
  const { start_date, end_date } = req.query;
  const today = new Date().toISOString().split('T')[0];
  const startDate = start_date || today;
  const endDate = end_date || today;

  const completedTasks = db.prepare(`
    SELECT COUNT(*) as count FROM tasks
    WHERE completed_at IS NOT NULL
    AND date(completed_at) BETWEEN ? AND ?
  `).get(startDate, endDate);

  const totalTimeTracked = db.prepare(`
    SELECT COALESCE(SUM(total_elapsed), 0) as total FROM time_sessions
    WHERE date(started_at) BETWEEN ? AND ?
    AND status = 'stopped'
  `).get(startDate, endDate);

  const tasksByStatus = db.prepare(`
    SELECT status, COUNT(*) as count FROM tasks
    WHERE scheduled_date BETWEEN ? AND ?
    GROUP BY status
  `).all(startDate, endDate);

  const dailyBreakdown = db.prepare(`
    SELECT
      t.scheduled_date as date,
      COUNT(DISTINCT t.id) as total_tasks,
      COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed,
      COALESCE(SUM(ts.total_elapsed), 0) as time_tracked
    FROM tasks t
    LEFT JOIN time_sessions ts ON t.id = ts.task_id AND ts.status = 'stopped'
    WHERE t.scheduled_date BETWEEN ? AND ?
    GROUP BY t.scheduled_date
    ORDER BY t.scheduled_date DESC
  `).all(startDate, endDate);

  res.json({
    completed_tasks: completedTasks.count,
    total_time_tracked: totalTimeTracked.total,
    tasks_by_status: tasksByStatus,
    daily_breakdown: dailyBreakdown
  });
});

// Get task history with time details
router.get('/tasks', (req, res) => {
  const { start_date, end_date, status } = req.query;
  const today = new Date().toISOString().split('T')[0];
  const startDate = start_date || new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const endDate = end_date || today;

  let query = `
    SELECT t.*,
      COALESCE(SUM(ts.total_elapsed), 0) as total_tracked,
      COUNT(ts.id) as session_count
    FROM tasks t
    LEFT JOIN time_sessions ts ON t.id = ts.task_id AND ts.status = 'stopped'
    WHERE t.scheduled_date BETWEEN ? AND ?
  `;
  const params = [startDate, endDate];

  if (status) {
    query += ' AND t.status = ?';
    params.push(status);
  }

  query += ' GROUP BY t.id ORDER BY t.scheduled_date DESC, t.completed_at DESC';

  const tasks = db.prepare(query).all(...params);
  res.json(tasks);
});

// Save daily review
router.post('/review', (req, res) => {
  const { date, notes } = req.body;
  const today = date || new Date().toISOString().split('T')[0];

  const completedCount = db.prepare(
    "SELECT COUNT(*) as count FROM tasks WHERE scheduled_date = ? AND status = 'completed'"
  ).get(today);

  const rolledOverCount = db.prepare(
    "SELECT COUNT(*) as count FROM tasks WHERE rolled_over_from IS NOT NULL AND scheduled_date = ?"
  ).get(today);

  const totalTime = db.prepare(`
    SELECT COALESCE(SUM(total_elapsed), 0) as total FROM time_sessions ts
    JOIN tasks t ON ts.task_id = t.id
    WHERE t.scheduled_date = ? AND ts.status = 'stopped'
  `).get(today);

  const id = uuidv4();

  db.prepare(`
    INSERT OR REPLACE INTO daily_reviews (id, date, tasks_completed, tasks_rolled_over, total_time_tracked, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, today, completedCount.count, rolledOverCount.count, totalTime.total, notes || '');

  const review = db.prepare('SELECT * FROM daily_reviews WHERE id = ?').get(id);
  res.json(review);
});

// Get daily review
router.get('/review/:date', (req, res) => {
  const review = db.prepare('SELECT * FROM daily_reviews WHERE date = ?').get(req.params.date);
  res.json(review || null);
});

module.exports = router;
