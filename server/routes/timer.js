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
      "INSERT INTO time_sessions (id, task_id, user_id, started_at, status, description, project_id, is_billable) VALUES (?, ?, ?, ?, 'running', ?, ?, ?)",
      id, taskId, req.user.id, now, req.body.description || '', task.project_id || null, 0
    );
    await db.run("UPDATE tasks SET status = 'in_progress' WHERE id = ?", taskId);

    const session = await db.get('SELECT * FROM time_sessions WHERE id = ?', id);
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ error: 'Failed to start timer' });
  }
});

// Quick start timer (no task required - like Toggl)
router.post('/quick-start', async (req, res) => {
  try {
    const { description, project_id, is_billable } = req.body;

    // Stop any currently running timer for this user
    const running = await db.get(
      "SELECT * FROM time_sessions WHERE user_id = ? AND status = 'running'", req.user.id
    );
    if (running) {
      const now = new Date().toISOString();
      let totalElapsed = running.total_elapsed || 0;
      const startTime = new Date(running.resumed_at || running.started_at).getTime();
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      totalElapsed += elapsed;
      await db.run(
        "UPDATE time_sessions SET ended_at = ?, total_elapsed = ?, status = 'stopped' WHERE id = ?",
        now, totalElapsed, running.id
      );
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      "INSERT INTO time_sessions (id, task_id, user_id, started_at, status, description, project_id, is_billable) VALUES (?, ?, ?, ?, 'running', ?, ?, ?)",
      id, null, req.user.id, now, description || '', project_id || null, is_billable ? 1 : 0
    );

    const session = await db.get('SELECT * FROM time_sessions WHERE id = ?', id);
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ error: 'Failed to start quick timer' });
  }
});

// Manual time entry (add time after the fact)
router.post('/manual', async (req, res) => {
  try {
    const { description, project_id, is_billable, started_at, ended_at, task_id, tag_ids } = req.body;

    if (!started_at || !ended_at) {
      return res.status(400).json({ error: 'Start and end time are required' });
    }

    const start = new Date(started_at);
    const end = new Date(ended_at);
    const totalElapsed = Math.floor((end.getTime() - start.getTime()) / 1000);

    if (totalElapsed <= 0) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const id = uuidv4();
    await db.run(
      "INSERT INTO time_sessions (id, task_id, user_id, started_at, ended_at, total_elapsed, status, description, project_id, is_billable) VALUES (?, ?, ?, ?, ?, ?, 'stopped', ?, ?, ?)",
      id, task_id || null, req.user.id, started_at, ended_at, totalElapsed, description || '', project_id || null, is_billable ? 1 : 0
    );

    // Set tags if provided
    if (tag_ids && tag_ids.length > 0) {
      for (const tagId of tag_ids) {
        await db.run('INSERT INTO time_entry_tags (time_entry_id, tag_id) VALUES (?, ?)', id, tagId);
      }
    }

    const session = await db.get('SELECT * FROM time_sessions WHERE id = ?', id);
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create manual entry' });
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

// Update time entry (edit inline)
router.put('/entry/:id', async (req, res) => {
  try {
    const entry = await db.get('SELECT * FROM time_sessions WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
    if (!entry) return res.status(404).json({ error: 'Time entry not found' });

    const { description, project_id, is_billable, started_at, ended_at, tag_ids } = req.body;

    let totalElapsed = entry.total_elapsed;
    let newStartedAt = started_at || entry.started_at;
    let newEndedAt = ended_at !== undefined ? ended_at : entry.ended_at;

    // Recalculate elapsed if times changed and entry is stopped
    if (entry.status === 'stopped' && (started_at || ended_at)) {
      if (newStartedAt && newEndedAt) {
        const start = new Date(newStartedAt);
        const end = new Date(newEndedAt);
        totalElapsed = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
      }
    }

    await db.run(
      `UPDATE time_sessions SET description = ?, project_id = ?, is_billable = ?, started_at = ?, ended_at = ?, total_elapsed = ? WHERE id = ?`,
      description !== undefined ? description : entry.description,
      project_id !== undefined ? project_id : entry.project_id,
      is_billable !== undefined ? (is_billable ? 1 : 0) : entry.is_billable,
      newStartedAt,
      newEndedAt,
      totalElapsed,
      req.params.id
    );

    // Update tags if provided
    if (tag_ids !== undefined) {
      await db.run('DELETE FROM time_entry_tags WHERE time_entry_id = ?', req.params.id);
      if (tag_ids && tag_ids.length > 0) {
        for (const tagId of tag_ids) {
          await db.run('INSERT INTO time_entry_tags (time_entry_id, tag_id) VALUES (?, ?)', req.params.id, tagId);
        }
      }
    }

    const updated = await db.get('SELECT * FROM time_sessions WHERE id = ?', req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update time entry' });
  }
});

// Duplicate a time entry
router.post('/entry/:id/duplicate', async (req, res) => {
  try {
    const entry = await db.get('SELECT * FROM time_sessions WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
    if (!entry) return res.status(404).json({ error: 'Time entry not found' });

    const id = uuidv4();
    const now = new Date().toISOString();
    await db.run(
      "INSERT INTO time_sessions (id, task_id, user_id, started_at, ended_at, total_elapsed, status, description, project_id, is_billable) VALUES (?, ?, ?, ?, ?, ?, 'stopped', ?, ?, ?)",
      id, entry.task_id, req.user.id, now, now, entry.total_elapsed, entry.description, entry.project_id, entry.is_billable
    );

    // Copy tags
    const tags = await db.all('SELECT tag_id FROM time_entry_tags WHERE time_entry_id = ?', entry.id);
    for (const tag of tags) {
      await db.run('INSERT INTO time_entry_tags (time_entry_id, tag_id) VALUES (?, ?)', id, tag.tag_id);
    }

    const newEntry = await db.get('SELECT * FROM time_sessions WHERE id = ?', id);
    res.status(201).json(newEntry);
  } catch (err) {
    res.status(500).json({ error: 'Failed to duplicate time entry' });
  }
});

// Delete a time entry
router.delete('/entry/:id', async (req, res) => {
  try {
    const entry = await db.get('SELECT * FROM time_sessions WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
    if (!entry) return res.status(404).json({ error: 'Time entry not found' });

    await db.run('DELETE FROM time_entry_tags WHERE time_entry_id = ?', req.params.id);
    await db.run('DELETE FROM time_sessions WHERE id = ?', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete time entry' });
  }
});

// Get active session
router.get('/active', async (req, res) => {
  try {
    // First check for user_id based sessions (quick start)
    let session = await db.get(
      `SELECT ts.*, t.title as task_title, p.name as project_name, p.color as project_color
       FROM time_sessions ts
       LEFT JOIN tasks t ON ts.task_id = t.id
       LEFT JOIN projects p ON ts.project_id = p.id
       WHERE ts.user_id = ? AND ts.status IN ('running', 'paused')
       ORDER BY ts.started_at DESC LIMIT 1`,
      req.user.id
    );

    if (!session) {
      // Fallback: check task-based sessions for backwards compat
      const tasks = await db.all('SELECT id FROM tasks WHERE user_id = ?', req.user.id);
      if (tasks.length > 0) {
        const taskIds = tasks.map(t => t.id);
        const placeholders = taskIds.map(() => '?').join(',');
        session = await db.get(
          `SELECT ts.*, t.title as task_title, p.name as project_name, p.color as project_color
           FROM time_sessions ts
           JOIN tasks t ON ts.task_id = t.id
           LEFT JOIN projects p ON ts.project_id = p.id
           WHERE ts.task_id IN (${placeholders}) AND ts.status IN ('running', 'paused')
           ORDER BY ts.started_at DESC LIMIT 1`,
          ...taskIds
        );
      }
    }

    res.json(session || null);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get active session' });
  }
});

// Get recent time entries (for time entry list view)
router.get('/entries', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const entries = await db.all(
      `SELECT ts.*, t.title as task_title, p.name as project_name, p.color as project_color
       FROM time_sessions ts
       LEFT JOIN tasks t ON ts.task_id = t.id
       LEFT JOIN projects p ON ts.project_id = p.id
       WHERE ts.user_id = ? AND ts.status = 'stopped' AND ts.started_at >= ?
       ORDER BY ts.started_at DESC`,
      req.user.id, startDate.toISOString()
    );

    // Attach tags
    for (const entry of entries) {
      const tags = await db.all(
        'SELECT t.* FROM tags t JOIN time_entry_tags tet ON t.id = tet.tag_id WHERE tet.time_entry_id = ?',
        entry.id
      );
      entry.tags = tags;
    }

    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get entries' });
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
