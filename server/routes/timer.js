const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Start timer for a task
router.post('/start/:taskId', (req, res) => {
  const taskId = req.params.taskId;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(taskId, req.user.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const runningSession = db.prepare(
    "SELECT * FROM time_sessions WHERE task_id = ? AND status = 'running'"
  ).get(taskId);

  if (runningSession) {
    return res.status(400).json({ error: 'Timer already running for this task', session: runningSession });
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO time_sessions (id, task_id, started_at, status)
    VALUES (?, ?, ?, 'running')
  `).run(id, taskId, now);

  db.prepare("UPDATE tasks SET status = 'in_progress' WHERE id = ?").run(taskId);

  const session = db.prepare('SELECT * FROM time_sessions WHERE id = ?').get(id);
  res.status(201).json(session);
});

// Pause timer
router.post('/pause/:sessionId', (req, res) => {
  const session = db.prepare('SELECT * FROM time_sessions WHERE id = ?').get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (session.status !== 'running') return res.status(400).json({ error: 'Session is not running' });

  const now = new Date().toISOString();
  const startTime = new Date(session.resumed_at || session.started_at).getTime();
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const totalElapsed = (session.total_elapsed || 0) + elapsed;

  db.prepare(`
    UPDATE time_sessions SET paused_at = ?, total_elapsed = ?, status = 'paused'
    WHERE id = ?
  `).run(now, totalElapsed, req.params.sessionId);

  const updated = db.prepare('SELECT * FROM time_sessions WHERE id = ?').get(req.params.sessionId);
  res.json(updated);
});

// Resume timer
router.post('/resume/:sessionId', (req, res) => {
  const session = db.prepare('SELECT * FROM time_sessions WHERE id = ?').get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (session.status !== 'paused') return res.status(400).json({ error: 'Session is not paused' });

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE time_sessions SET resumed_at = ?, paused_at = NULL, status = 'running'
    WHERE id = ?
  `).run(now, req.params.sessionId);

  const updated = db.prepare('SELECT * FROM time_sessions WHERE id = ?').get(req.params.sessionId);
  res.json(updated);
});

// Stop timer
router.post('/stop/:sessionId', (req, res) => {
  const session = db.prepare('SELECT * FROM time_sessions WHERE id = ?').get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const now = new Date().toISOString();
  let totalElapsed = session.total_elapsed || 0;

  if (session.status === 'running') {
    const startTime = new Date(session.resumed_at || session.started_at).getTime();
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    totalElapsed += elapsed;
  }

  db.prepare(`
    UPDATE time_sessions SET ended_at = ?, total_elapsed = ?, status = 'stopped'
    WHERE id = ?
  `).run(now, totalElapsed, req.params.sessionId);

  const updated = db.prepare('SELECT * FROM time_sessions WHERE id = ?').get(req.params.sessionId);
  res.json(updated);
});

// Get active session
router.get('/active', (req, res) => {
  const tasks = db.prepare('SELECT id FROM tasks WHERE user_id = ?').all(req.user.id);
  const taskIds = tasks.map(t => t.id);

  if (taskIds.length === 0) return res.json(null);

  const placeholders = taskIds.map(() => '?').join(',');
  const session = db.prepare(`
    SELECT ts.*, t.title as task_title FROM time_sessions ts
    JOIN tasks t ON ts.task_id = t.id
    WHERE ts.task_id IN (${placeholders}) AND ts.status IN ('running', 'paused')
    ORDER BY ts.started_at DESC LIMIT 1
  `).get(...taskIds);

  res.json(session || null);
});

// Get all sessions for a task
router.get('/sessions/:taskId', (req, res) => {
  const sessions = db.prepare(
    'SELECT * FROM time_sessions WHERE task_id = ? ORDER BY started_at DESC'
  ).all(req.params.taskId);

  res.json(sessions);
});

module.exports = router;
