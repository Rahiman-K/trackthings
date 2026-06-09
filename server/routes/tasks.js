const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Get all tasks for a specific date
router.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    const userId = req.user.id;
    let tasks;

    if (date) {
      tasks = await db.all(
        'SELECT * FROM tasks WHERE user_id = ? AND scheduled_date = ? ORDER BY sort_order ASC, created_at ASC',
        userId, date
      );
    } else {
      tasks = await db.all(
        "SELECT * FROM tasks WHERE user_id = ? AND status != 'completed' ORDER BY sort_order ASC, created_at ASC",
        userId
      );
    }

    const enrichedTasks = [];
    for (const task of tasks) {
      const checklist = await db.all(
        'SELECT * FROM checklist_items WHERE task_id = ? ORDER BY sort_order ASC', task.id
      );
      const sessions = await db.all(
        'SELECT * FROM time_sessions WHERE task_id = ? ORDER BY started_at DESC', task.id
      );
      const totalTracked = sessions.reduce((sum, s) => sum + (s.total_elapsed || 0), 0);
      enrichedTasks.push({ ...task, checklist, sessions, total_tracked: totalTracked });
    }

    res.json(enrichedTasks);
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

// Get single task
router.get('/:id', async (req, res) => {
  try {
    const task = await db.get('SELECT * FROM tasks WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const checklist = await db.all(
      'SELECT * FROM checklist_items WHERE task_id = ? ORDER BY sort_order ASC', task.id
    );
    const sessions = await db.all(
      'SELECT * FROM time_sessions WHERE task_id = ? ORDER BY started_at DESC', task.id
    );
    const totalTracked = sessions.reduce((sum, s) => sum + (s.total_elapsed || 0), 0);
    res.json({ ...task, checklist, sessions, total_tracked: totalTracked });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get task' });
  }
});

// Create a new task
router.post('/', async (req, res) => {
  try {
    const { title, description, planned_duration, scheduled_date, scheduled_time, priority, checklist, project_id } = req.body;
    const id = uuidv4();
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    await db.run(
      'INSERT INTO tasks (id, user_id, title, description, planned_duration, scheduled_date, scheduled_time, priority, project_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      id, userId, title, description || '', planned_duration || 0, scheduled_date || today, scheduled_time || null, priority || 'medium', project_id || null
    );

    if (checklist && checklist.length > 0) {
      for (let i = 0; i < checklist.length; i++) {
        await db.run(
          'INSERT INTO checklist_items (id, task_id, title, sort_order) VALUES (?, ?, ?, ?)',
          uuidv4(), id, checklist[i].title, i
        );
      }
    }

    const task = await db.get('SELECT * FROM tasks WHERE id = ?', id);
    const checklistItems = await db.all('SELECT * FROM checklist_items WHERE task_id = ?', id);
    res.status(201).json({ ...task, checklist: checklistItems, sessions: [], total_tracked: 0 });
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update a task
router.put('/:id', async (req, res) => {
  try {
    const { title, description, planned_duration, scheduled_date, scheduled_time, status, priority, sort_order, project_id } = req.body;
    const task = await db.get('SELECT * FROM tasks WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const newTitle = title !== undefined ? title : task.title;
    const newDescription = description !== undefined ? description : task.description;
    const newPlannedDuration = planned_duration !== undefined ? planned_duration : task.planned_duration;
    const newScheduledDate = scheduled_date !== undefined ? scheduled_date : task.scheduled_date;
    const newScheduledTime = scheduled_time !== undefined ? scheduled_time : task.scheduled_time;
    const newStatus = status !== undefined ? status : task.status;
    const newPriority = priority !== undefined ? priority : task.priority;
    const newSortOrder = sort_order !== undefined ? sort_order : task.sort_order;
    const newCompletedAt = status === 'completed' ? new Date().toISOString() : task.completed_at;
    const newProjectId = project_id !== undefined ? project_id : task.project_id;

    await db.run(
      `UPDATE tasks SET
        title = ?,
        description = ?,
        planned_duration = ?,
        scheduled_date = ?,
        scheduled_time = ?,
        status = ?,
        priority = ?,
        sort_order = ?,
        completed_at = ?,
        project_id = ?
      WHERE id = ? AND user_id = ?`,
      newTitle, newDescription, newPlannedDuration, newScheduledDate, newScheduledTime, newStatus, newPriority, newSortOrder, newCompletedAt, newProjectId, req.params.id, req.user.id
    );

    const updated = await db.get('SELECT * FROM tasks WHERE id = ?', req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete a task
router.delete('/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM checklist_items WHERE task_id = ?', req.params.id);
    await db.run('DELETE FROM time_sessions WHERE task_id = ?', req.params.id);
    await db.run('DELETE FROM tasks WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Rollover incomplete tasks to today
router.post('/rollover', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const userId = req.user.id;

    const incompleteTasks = await db.all(
      "SELECT * FROM tasks WHERE user_id = ? AND scheduled_date < ? AND status != 'completed'",
      userId, today
    );

    for (const task of incompleteTasks) {
      await db.run(
        'UPDATE tasks SET scheduled_date = ?, rolled_over_from = ? WHERE id = ?',
        today, task.scheduled_date, task.id
      );
    }

    res.json({ rolled_over: incompleteTasks.length, tasks: incompleteTasks.map(t => t.id) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to rollover tasks' });
  }
});

// Checklist operations
router.post('/:id/checklist', async (req, res) => {
  try {
    const { title } = req.body;
    const task = await db.get('SELECT id FROM tasks WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const itemId = uuidv4();
    const maxOrder = await db.get('SELECT MAX(sort_order) as max FROM checklist_items WHERE task_id = ?', req.params.id);

    await db.run(
      'INSERT INTO checklist_items (id, task_id, title, sort_order) VALUES (?, ?, ?, ?)',
      itemId, req.params.id, title, (maxOrder?.max || 0) + 1
    );

    const item = await db.get('SELECT * FROM checklist_items WHERE id = ?', itemId);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add checklist item' });
  }
});

router.put('/checklist/:itemId', async (req, res) => {
  try {
    const { is_completed, title } = req.body;
    await db.run(
      'UPDATE checklist_items SET is_completed = COALESCE(?, is_completed), title = COALESCE(?, title) WHERE id = ?',
      is_completed, title, req.params.itemId
    );
    const item = await db.get('SELECT * FROM checklist_items WHERE id = ?', req.params.itemId);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update checklist item' });
  }
});

router.delete('/checklist/:itemId', async (req, res) => {
  try {
    await db.run('DELETE FROM checklist_items WHERE id = ?', req.params.itemId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete checklist item' });
  }
});

module.exports = router;
