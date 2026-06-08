const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Get history/stats for a date range
router.get('/stats', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    const startDate = start_date || today;
    const endDate = end_date || today;

    const completedTasks = await db.get(
      "SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND completed_at IS NOT NULL AND date(completed_at) BETWEEN ? AND ?",
      userId, startDate, endDate
    );

    const totalTimeTracked = await db.get(
      "SELECT COALESCE(SUM(ts.total_elapsed), 0) as total FROM time_sessions ts JOIN tasks t ON ts.task_id = t.id WHERE t.user_id = ? AND date(ts.started_at) BETWEEN ? AND ? AND ts.status = 'stopped'",
      userId, startDate, endDate
    );

    const tasksByStatus = await db.all(
      "SELECT status, COUNT(*) as count FROM tasks WHERE user_id = ? AND scheduled_date BETWEEN ? AND ? GROUP BY status",
      userId, startDate, endDate
    );

    const dailyBreakdown = await db.all(
      `SELECT t.scheduled_date as date,
        COUNT(DISTINCT t.id) as total_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed,
        COALESCE(SUM(ts.total_elapsed), 0) as time_tracked
      FROM tasks t
      LEFT JOIN time_sessions ts ON t.id = ts.task_id AND ts.status = 'stopped'
      WHERE t.user_id = ? AND t.scheduled_date BETWEEN ? AND ?
      GROUP BY t.scheduled_date
      ORDER BY t.scheduled_date DESC`,
      userId, startDate, endDate
    );

    res.json({
      completed_tasks: completedTasks?.count || 0,
      total_time_tracked: totalTimeTracked?.total || 0,
      tasks_by_status: tasksByStatus,
      daily_breakdown: dailyBreakdown
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get task history
router.get('/tasks', async (req, res) => {
  try {
    const { start_date, end_date, status } = req.query;
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    const startDate = start_date || new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const endDate = end_date || today;

    let query = `SELECT t.*, COALESCE(SUM(ts.total_elapsed), 0) as total_tracked, COUNT(ts.id) as session_count
      FROM tasks t LEFT JOIN time_sessions ts ON t.id = ts.task_id AND ts.status = 'stopped'
      WHERE t.user_id = ? AND t.scheduled_date BETWEEN ? AND ?`;
    const params = [userId, startDate, endDate];

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    query += ' GROUP BY t.id ORDER BY t.scheduled_date DESC, t.completed_at DESC';
    const tasks = await db.all(query, ...params);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// Save daily review
router.post('/review', async (req, res) => {
  try {
    const { date, notes } = req.body;
    const userId = req.user.id;
    const today = date || new Date().toISOString().split('T')[0];

    const completedCount = await db.get(
      "SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND scheduled_date = ? AND status = 'completed'",
      userId, today
    );
    const totalTime = await db.get(
      "SELECT COALESCE(SUM(ts.total_elapsed), 0) as total FROM time_sessions ts JOIN tasks t ON ts.task_id = t.id WHERE t.user_id = ? AND t.scheduled_date = ? AND ts.status = 'stopped'",
      userId, today
    );

    const id = uuidv4();
    await db.run(
      'INSERT OR REPLACE INTO daily_reviews (id, user_id, date, tasks_completed, total_time_tracked, notes) VALUES (?, ?, ?, ?, ?, ?)',
      id, userId, today, completedCount?.count || 0, totalTime?.total || 0, notes || ''
    );

    const review = await db.get('SELECT * FROM daily_reviews WHERE id = ?', id);
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save review' });
  }
});

// Get daily review
router.get('/review/:date', async (req, res) => {
  try {
    const review = await db.get(
      'SELECT * FROM daily_reviews WHERE user_id = ? AND date = ?',
      req.user.id, req.params.date
    );
    res.json(review || null);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get review' });
  }
});

module.exports = router;
