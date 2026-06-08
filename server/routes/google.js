const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/google/callback';

function getOAuth2Client() {
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

// Get Google OAuth URL
router.get('/auth-url', authenticateToken, (req, res) => {
  if (!GOOGLE_CLIENT_ID) {
    return res.status(500).json({ error: 'Google Calendar not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' });
  }

  const oauth2Client = getOAuth2Client();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
    ],
    state: req.user.id, // Pass user ID through OAuth flow
  });

  res.json({ url });
});

// OAuth callback
router.get('/callback', async (req, res) => {
  const { code, state: userId } = req.query;

  if (!code || !userId) {
    return res.status(400).send('Missing authorization code');
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    db.prepare(`
      UPDATE users SET
        google_access_token = ?,
        google_refresh_token = ?,
        google_token_expiry = ?,
        google_calendar_enabled = 1
      WHERE id = ?
    `).run(tokens.access_token, tokens.refresh_token, tokens.expiry_date?.toString(), userId);

    // Redirect to app with success
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}?google=connected`);
  } catch (err) {
    console.error('Google OAuth error:', err);
    res.status(500).send('Failed to connect Google Calendar. ' + err.message);
  }
});

// Disconnect Google Calendar
router.post('/disconnect', authenticateToken, (req, res) => {
  db.prepare(`
    UPDATE users SET
      google_access_token = NULL,
      google_refresh_token = NULL,
      google_token_expiry = NULL,
      google_calendar_enabled = 0
    WHERE id = ?
  `).run(req.user.id);

  res.json({ success: true });
});

// Sync a task to Google Calendar
router.post('/sync-task/:taskId', authenticateToken, async (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user || !user.google_calendar_enabled) {
    return res.status(400).json({ error: 'Google Calendar not connected' });
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(req.params.taskId, req.user.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: user.google_access_token,
      refresh_token: user.google_refresh_token,
    });

    // Refresh token if expired
    if (user.google_token_expiry && Date.now() > parseInt(user.google_token_expiry)) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      db.prepare(`
        UPDATE users SET google_access_token = ?, google_token_expiry = ? WHERE id = ?
      `).run(credentials.access_token, credentials.expiry_date?.toString(), req.user.id);
      oauth2Client.setCredentials(credentials);
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Build event
    const startDate = task.scheduled_date || new Date().toISOString().split('T')[0];
    const startTime = task.scheduled_time || '09:00';
    const durationMinutes = Math.max(Math.ceil((task.planned_duration || 1800) / 60), 15);
    const startDateTime = new Date(`${startDate}T${startTime}:00`);
    const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

    const event = {
      summary: task.title,
      description: task.description || `TrackThings task • Planned: ${durationMinutes}min`,
      start: { dateTime: startDateTime.toISOString(), timeZone: 'UTC' },
      end: { dateTime: endDateTime.toISOString(), timeZone: 'UTC' },
      colorId: task.priority === 'high' ? '11' : task.priority === 'low' ? '2' : '5',
    };

    let result;
    if (task.google_event_id) {
      // Update existing event
      result = await calendar.events.update({
        calendarId: 'primary',
        eventId: task.google_event_id,
        requestBody: event,
      });
    } else {
      // Create new event
      result = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });
      // Save event ID
      db.prepare('UPDATE tasks SET google_event_id = ? WHERE id = ?').run(result.data.id, task.id);
    }

    res.json({ success: true, eventId: result.data.id, eventLink: result.data.htmlLink });
  } catch (err) {
    console.error('Google Calendar sync error:', err.message);
    if (err.code === 401) {
      db.prepare('UPDATE users SET google_calendar_enabled = 0 WHERE id = ?').run(req.user.id);
      return res.status(401).json({ error: 'Google token expired. Please reconnect.' });
    }
    res.status(500).json({ error: 'Failed to sync: ' + err.message });
  }
});

// Sync all tasks for a date to Google Calendar
router.post('/sync-day', authenticateToken, async (req, res) => {
  const { date } = req.body;
  const targetDate = date || new Date().toISOString().split('T')[0];

  const tasks = db.prepare(
    "SELECT * FROM tasks WHERE user_id = ? AND scheduled_date = ? AND status != 'completed'"
  ).all(req.user.id, targetDate);

  const results = [];
  for (const task of tasks) {
    try {
      // Reuse the sync-task logic internally
      const fakeReq = { user: req.user, params: { taskId: task.id } };
      const fakeRes = {
        json: (data) => results.push({ taskId: task.id, ...data }),
        status: () => ({ json: (err) => results.push({ taskId: task.id, error: err.error }) })
      };
      // Simple inline sync
      await syncSingleTask(task, req.user.id);
      results.push({ taskId: task.id, success: true });
    } catch (err) {
      results.push({ taskId: task.id, error: err.message });
    }
  }

  res.json({ synced: results.length, results });
});

// Helper to sync a single task
async function syncSingleTask(task, userId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user || !user.google_calendar_enabled) return;

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: user.google_access_token,
    refresh_token: user.google_refresh_token,
  });

  if (user.google_token_expiry && Date.now() > parseInt(user.google_token_expiry)) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    db.prepare('UPDATE users SET google_access_token = ?, google_token_expiry = ? WHERE id = ?')
      .run(credentials.access_token, credentials.expiry_date?.toString(), userId);
    oauth2Client.setCredentials(credentials);
  }

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const startDate = task.scheduled_date || new Date().toISOString().split('T')[0];
  const startTime = task.scheduled_time || '09:00';
  const durationMinutes = Math.max(Math.ceil((task.planned_duration || 1800) / 60), 15);
  const startDateTime = new Date(`${startDate}T${startTime}:00`);
  const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

  const event = {
    summary: task.title,
    description: task.description || `TrackThings task • Planned: ${durationMinutes}min`,
    start: { dateTime: startDateTime.toISOString(), timeZone: 'UTC' },
    end: { dateTime: endDateTime.toISOString(), timeZone: 'UTC' },
  };

  if (task.google_event_id) {
    await calendar.events.update({ calendarId: 'primary', eventId: task.google_event_id, requestBody: event });
  } else {
    const result = await calendar.events.insert({ calendarId: 'primary', requestBody: event });
    db.prepare('UPDATE tasks SET google_event_id = ? WHERE id = ?').run(result.data.id, task.id);
  }
}

// Get connection status
router.get('/status', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT google_calendar_enabled FROM users WHERE id = ?').get(req.user.id);
  res.json({ connected: !!user?.google_calendar_enabled });
});

module.exports = router;
