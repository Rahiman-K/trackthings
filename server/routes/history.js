const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Get history/stats for a date range
router.get('/stats', (req, res) => {
  const { start_date, end_date } = req.query;
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0];
  const startDate = start_date || today;
  const endDate = end_date || today;

  const completedTasks = db.prepare(`
    SELECT COUNT(*) as count FROM tasks
    WHERE user_id = ? AND completed_at IS NOT NULL
    AND date(completed_at) BETWEEN ? AND ?
  `).get(userId, startDate, endDate);

  const totalTimeTracked = db.prepare(`
    SELECT COALESCE(SUM(ts.total_elapsed), 0) as total FROM time_sessions ts
    JOIN tasks t ON ts.task_id = t.id
    WHERE t.user_id = ? AND date(ts.started_at) BETWEEN ? AND ?
    AND ts.status = 'stopped'
  `).get(userId, startDate, endDate);

  const tasksByStatus = db.prepare(`
    SELECT status, COUNT(*) as count FROM tasks
    WHERE user_id = ? AND scheduled_date BETWEEN ? AND ?
    GROUP BY status
  `).all(userId, startDate, endDate);

  const dailyBreakdown = db.prepare(`
    SELECT
      t.scheduled_date as date,
      COUNT(DISTINCT t.id) as total_tasks,
      COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed,
      COALESCE(SUM(ts.total_elapsed), 0) as time_tracked
    FROM tasks t
    LEFT JOIN time_sessions ts ON t.id = ts.task_id AND ts.status = 'stopped'
    WHERE t.user_id = ? AND t.scheduled_date BETWEEN ? AND ?
    GROUP BY t.scheduled_date
    ORDER BY t.scheduled_date DESC
  `).all(userId, startDate, endDate);

  res.json({
    completed_tasks: completedTasks.count,
    total_time_tracked: totalTimeTracked.total,
    tasks_by_status: tasksByStatus,
    daily_breakdown: dailyBreakdown
  });
});

// Get task history
router.get('/tasks', (req, res) => {
  const { start_date, end_date, status } = req.query;
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0];
  const startDate = start_date || new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const endDate = end_date || today;

  let query = `
    SELECT t.*,
      COALESCE(SUM(ts.total_elapsed), 0) as total_tracked,
      COUNT(ts.id) as session_count
    FROM tasks t
    LEFT JOIN time_sessions ts ON t.id = ts.task_id AND ts.status = 'stopped'
    WHERE t.user_id = ? AND t.scheduled_date BETWEEN ? AND ?
  `;
  const params = [userId, startDate, endDate];

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
  const userId = req.user.id;
  const today = date || new Date().toISOString().split('T')[0];

  const completedCount = db.prepare(
    "SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND scheduled_date = ? AND status = 'completed'"
  ).get(userId, today);

  const rolledOverCount = db.prepare(
    "SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND rolled_over_from IS NOT NULL AND scheduled_date = ?"
  ).get(userId, today);

  const totalTime = db.prepare(`
    SELECT COALESCE(SUM(ts.total_elapsed), 0) as total FROM time_sessions ts
    JOIN tasks t ON ts.task_id = t.id
    WHERE t.user_id = ? AND t.scheduled_date = ? AND ts.status = 'stopped'
  `).get(userId, today);

  const id = uuidv4();

  db.prepare(`
    INSERT OR REPLACE INTO daily_reviews (id, user_id, date, tasks_completed, tasks_rolled_over, total_time_tracked, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, today, completedCount.count, rolledOverCount.count, totalTime.total, notes || '');

  const review = db.prepare('SELECT * FROM daily_reviews WHERE id = ?').get(id);
  res.json(review);
});

// Get daily review
router.get('/review/:date', (req, res) => {
  const review = db.prepare('SELECT * FROM daily_reviews WHERE user_id = ? AND date = ?').get(req.user.id, req.params.date);
  res.json(review || null);
});

module.exports = router;
