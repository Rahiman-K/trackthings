const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Start timer for a task
router.post('/start/:taskId', async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const task = await db.get('SELECT * FROM tasks WHERE id = ? AND user_id = ?', taskId, req.user.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const runningSession = await db.get(
      "SELECT * FROM time_sessions WHERE task_id = ? AND status = 'running'", taskId
    );
    if (runningSession) {
      return res.status(400).json({ error: 'Timer already running for this task', session: runningSession });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      "INSERT INTO time_sessions (id, task_id, started_at, status) VALUES (?, ?, ?, 'running')",
      id, taskId, now
    );
    await db.run("UPDATE tasks SET status = 'in_progress' WHERE id = ?", taskId);

    const session = await db.get('SELECT * FROM time_sessions WHERE id = ?', id);
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ error: 'Failed to start timer' });
  }
});

// Pause timer
router.post('/pause/:sessionId', async (req, res) => {
  try {
    const session = await db.get('SELECT * FROM time_sessions WHERE id = ?', req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status !== 'running') return res.status(400).json({ error: 'Session is not running' });

    const now = new Date().toISOString();
    const startTime = new Date(session.resumed_at || session.started_at).getTime();
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const totalElapsed = (session.total_elapsed || 0) + elapsed;

    await db.run(
      "UPDATE time_sessions SET paused_at = ?, total_elapsed = ?, status = 'paused' WHERE id = ?",
      now, totalElapsed, req.params.sessionId
    );

    const updated = await db.get('SELECT * FROM time_sessions WHERE id = ?', req.params.sessionId);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to pause timer' });
  }
});

// Resume timer
router.post('/resume/:sessionId', async (req, res) => {
  try {
    const session = await db.get('SELECT * FROM time_sessions WHERE id = ?', req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status !== 'paused') return res.status(400).json({ error: 'Session is not paused' });

    const now = new Date().toISOString();
    await db.run(
      "UPDATE time_sessions SET resumed_at = ?, paused_at = NULL, status = 'running' WHERE id = ?",
      now, req.params.sessionId
    );

    const updated = await db.get('SELECT * FROM time_sessions WHERE id = ?', req.params.sessionId);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to resume timer' });
  }
});

// Stop timer
router.post('/stop/:sessionId', async (req, res) => {
  try {
    const session = await db.get('SELECT * FROM time_sessions WHERE id = ?', req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const now = new Date().toISOString();
    let totalElapsed = session.total_elapsed || 0;

    if (session.status === 'running') {
      const startTime = new Date(session.resumed_at || session.started_at).getTime();
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      totalElapsed += elapsed;
    }

    await db.run(
      "UPDATE time_sessions SET ended_at = ?, total_elapsed = ?, status = 'stopped' WHERE id = ?",
      now, totalElapsed, req.params.sessionId
    );

    const updated = await db.get('SELECT * FROM time_sessions WHERE id = ?', req.params.sessionId);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to stop timer' });
  }
});

// Get active session
router.get('/active', async (req, res) => {
  try {
    const tasks = await db.all('SELECT id FROM tasks WHERE user_id = ?', req.user.id);
    if (tasks.length === 0) return res.json(null);

    const taskIds = tasks.map(t => t.id);
    const placeholders = taskIds.map(() => '?').join(',');
    const session = await db.get(
      `SELECT ts.*, t.title as task_title FROM time_sessions ts
       JOIN tasks t ON ts.task_id = t.id
       WHERE ts.task_id IN (${placeholders}) AND ts.status IN ('running', 'paused')
       ORDER BY ts.started_at DESC LIMIT 1`,
      ...taskIds
    );

    res.json(session || null);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get active session' });
  }
});

// Get all sessions for a task
router.get('/sessions/:taskId', async (req, res) => {
  try {
    const sessions = await db.all(
      'SELECT * FROM time_sessions WHERE task_id = ? ORDER BY started_at DESC',
      req.params.taskId
    );
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

module.exports = router;
