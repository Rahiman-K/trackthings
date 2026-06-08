const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Generate ICS calendar feed for a user (public URL - no auth needed)
router.get('/feed/:userId.ics', async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await db.get('SELECT id, name, email FROM users WHERE id = ?', userId);
    if (!user) return res.status(404).send('Calendar not found');

    const tasks = await db.all(
      "SELECT * FROM tasks WHERE user_id = ? AND scheduled_date IS NOT NULL AND (status != 'completed' OR completed_at > datetime('now', '-7 days')) ORDER BY scheduled_date ASC",
      userId
    );

    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    let ics = [];
    ics.push('BEGIN:VCALENDAR');
    ics.push('VERSION:2.0');
    ics.push('PRODID:-//TrackThings//EN');
    ics.push('CALSCALE:GREGORIAN');
    ics.push('METHOD:PUBLISH');
    ics.push('X-WR-CALNAME:TrackThings - ' + (user.name || user.email));
    ics.push('X-WR-TIMEZONE:UTC');

    for (const task of tasks) {
      if (!task.scheduled_date) continue;

      const dateStr = task.scheduled_date.replace(/-/g, '');
      const durationSeconds = task.planned_duration || 1800;
      const durationMinutes = Math.max(Math.ceil(durationSeconds / 60), 15);

      if (task.scheduled_time) {
        const timeParts = task.scheduled_time.split(':');
        const startHour = parseInt(timeParts[0]);
        const startMin = parseInt(timeParts[1]);
        const startTimeStr = startHour.toString().padStart(2, '0') + startMin.toString().padStart(2, '0') + '00';

        const totalMinutes = startHour * 60 + startMin + durationMinutes;
        const endHour = Math.floor(totalMinutes / 60) % 24;
        const endMin = totalMinutes % 60;
        const endTimeStr = endHour.toString().padStart(2, '0') + endMin.toString().padStart(2, '0') + '00';

        ics.push('BEGIN:VEVENT');
        ics.push('UID:' + task.id + '@trackthings.app');
        ics.push('DTSTAMP:' + now);
        // Use floating time (no Z suffix) so it shows in the user's local timezone
        ics.push('DTSTART:' + dateStr + 'T' + startTimeStr);
        ics.push('DTEND:' + dateStr + 'T' + endTimeStr);
      } else {
        ics.push('BEGIN:VEVENT');
        ics.push('UID:' + task.id + '@trackthings.app');
        ics.push('DTSTAMP:' + now);
        ics.push('DTSTART;VALUE=DATE:' + dateStr);
        ics.push('DTEND;VALUE=DATE:' + dateStr);
      }

      let summary = '';
      if (task.priority === 'high') summary += '[HIGH] ';
      if (task.status === 'completed') summary += '✓ ';
      summary += task.title;
      if (task.planned_duration) {
        const h = Math.floor(durationMinutes / 60);
        const m = durationMinutes % 60;
        summary += h > 0 ? ` (${h}h${m > 0 ? m + 'm' : ''})` : ` (${m}m)`;
      }

      ics.push('SUMMARY:' + summary);

      let desc = task.description || '';
      desc += (desc ? '\\n' : '') + 'Status: ' + task.status;
      desc += '\\nPriority: ' + task.priority;
      ics.push('DESCRIPTION:' + desc);
      ics.push('STATUS:' + (task.status === 'completed' ? 'COMPLETED' : 'CONFIRMED'));
      ics.push('END:VEVENT');
    }

    ics.push('END:VCALENDAR');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename=trackthings.ics');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(ics.join('\r\n'));
  } catch (err) {
    console.error('ICS feed error:', err);
    res.status(500).send('Failed to generate calendar feed');
  }
});

// Get the calendar feed URL for the current user
router.get('/feed-url', authenticateToken, (req, res) => {
  const baseUrl = process.env.FRONTEND_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3001';
  const feedUrl = `${baseUrl}/api/google/feed/${req.user.id}.ics`;
  res.json({ url: feedUrl });
});

// Status endpoint
router.get('/status', authenticateToken, (req, res) => {
  const baseUrl = process.env.FRONTEND_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3001';
  const feedUrl = `${baseUrl}/api/google/feed/${req.user.id}.ics`;
  res.json({ connected: true, feedUrl });
});

module.exports = router;
