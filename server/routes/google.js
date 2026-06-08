const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Generate ICS calendar feed for a user (public URL - no auth needed)
router.get('/feed/:userId.ics', (req, res) => {
  const userId = req.params.userId;
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).send('Calendar not found');

  // Get all non-completed tasks with a scheduled date
  const tasks = db.prepare(`
    SELECT * FROM tasks WHERE user_id = ? AND status != 'completed' AND scheduled_date IS NOT NULL
    ORDER BY scheduled_date ASC, scheduled_time ASC
  `).all(userId);

  // Get completed tasks from last 7 days for history
  const recentCompleted = db.prepare(`
    SELECT * FROM tasks WHERE user_id = ? AND status = 'completed' AND completed_at > datetime('now', '-7 days')
    ORDER BY completed_at DESC
  `).all(userId);

  const allTasks = [...tasks, ...recentCompleted];

  // Build ICS content
  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TrackThings//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:TrackThings - ${user.name || user.email}`,
    'X-WR-TIMEZONE:UTC',
  ];

  for (const task of allTasks) {
    const startDate = task.scheduled_date.replace(/-/g, '');
    const startTime = task.scheduled_time ? task.scheduled_time.replace(':', '') + '00' : '090000';
    const durationMinutes = Math.max(Math.ceil((task.planned_duration || 1800) / 60), 15);

    // Calculate end time
    const startHour = parseInt(startTime.slice(0, 2));
    const startMin = parseInt(startTime.slice(2, 4));
    const totalMinutes = startHour * 60 + startMin + durationMinutes;
    const endHour = Math.floor(totalMinutes / 60) % 24;
    const endMin = totalMinutes % 60;
    const endTime = `${endHour.toString().padStart(2, '0')}${endMin.toString().padStart(2, '0')}00`;

    const status = task.status === 'completed' ? '✅ ' : task.status === 'in_progress' ? '🔄 ' : '';
    const priority = task.priority === 'high' ? '🔴 ' : task.priority === 'low' ? '🟢 ' : '';

    ics.push('BEGIN:VEVENT');
    ics.push(`UID:${task.id}@trackthings`);
    ics.push(`DTSTART:${startDate}T${startTime}Z`);
    ics.push(`DTEND:${startDate}T${endTime}Z`);
    ics.push(`SUMMARY:${priority}${status}${task.title}`);
    if (task.description) {
      ics.push(`DESCRIPTION:${task.description.replace(/\n/g, '\\n')}`);
    }
    ics.push(`STATUS:${task.status === 'completed' ? 'COMPLETED' : 'CONFIRMED'}`);
    ics.push('END:VEVENT');
  }

  ics.push('END:VCALENDAR');

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline; filename=trackthings.ics');
  res.send(ics.join('\r\n'));
});

// Get the calendar feed URL for the current user
router.get('/feed-url', authenticateToken, (req, res) => {
  const baseUrl = process.env.FRONTEND_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3001';
  const feedUrl = `${baseUrl}/api/google/feed/${req.user.id}.ics`;
  res.json({ url: feedUrl });
});

// Status endpoint (simplified - just returns feed info)
router.get('/status', authenticateToken, (req, res) => {
  const baseUrl = process.env.FRONTEND_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3001';
  const feedUrl = `${baseUrl}/api/google/feed/${req.user.id}.ics`;
  res.json({ connected: true, feedUrl });
});

module.exports = router;
