const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Summary Report: total time grouped by project/client/tag
router.get('/summary', async (req, res) => {
  try {
    const { start_date, end_date, project_id, client_id, tag_id, billable } = req.query;

    let baseQuery = `
      SELECT ts.*, p.name as project_name, p.color as project_color, c.name as client_name
      FROM time_sessions ts
      LEFT JOIN projects p ON ts.project_id = p.id
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE ts.user_id = ? AND ts.status = 'stopped'
    `;
    const params = [req.user.id];

    if (start_date) { baseQuery += ' AND ts.started_at >= ?'; params.push(start_date); }
    if (end_date) { baseQuery += ' AND ts.started_at <= ?'; params.push(end_date + 'T23:59:59'); }
    if (project_id) { baseQuery += ' AND ts.project_id = ?'; params.push(project_id); }
    if (client_id) { baseQuery += ' AND p.client_id = ?'; params.push(client_id); }
    if (billable === '1') { baseQuery += ' AND ts.is_billable = 1'; }
    if (billable === '0') { baseQuery += ' AND ts.is_billable = 0'; }

    const entries = await db.all(baseQuery, ...params);

    // Filter by tag if specified
    let filteredEntries = entries;
    if (tag_id) {
      const taggedIds = await db.all(
        'SELECT time_entry_id FROM time_entry_tags WHERE tag_id = ?', tag_id
      );
      const taggedIdSet = new Set(taggedIds.map(r => r.time_entry_id));
      filteredEntries = entries.filter(e => taggedIdSet.has(e.id));
    }

    // Group by project
    const byProject = {};
    const byClient = {};
    let totalSeconds = 0;
    let billableSeconds = 0;

    for (const entry of filteredEntries) {
      const seconds = entry.total_elapsed || 0;
      totalSeconds += seconds;
      if (entry.is_billable) billableSeconds += seconds;

      const projectKey = entry.project_id || 'no-project';
      if (!byProject[projectKey]) {
        byProject[projectKey] = {
          project_id: entry.project_id,
          project_name: entry.project_name || 'No Project',
          project_color: entry.project_color || '#94a3b8',
          total_seconds: 0,
          entry_count: 0,
        };
      }
      byProject[projectKey].total_seconds += seconds;
      byProject[projectKey].entry_count += 1;

      const clientKey = entry.client_name || 'No Client';
      if (!byClient[clientKey]) {
        byClient[clientKey] = { client_name: clientKey, total_seconds: 0, entry_count: 0 };
      }
      byClient[clientKey].total_seconds += seconds;
      byClient[clientKey].entry_count += 1;
    }

    res.json({
      total_seconds: totalSeconds,
      billable_seconds: billableSeconds,
      entry_count: filteredEntries.length,
      by_project: Object.values(byProject).sort((a, b) => b.total_seconds - a.total_seconds),
      by_client: Object.values(byClient).sort((a, b) => b.total_seconds - a.total_seconds),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate summary report' });
  }
});

// Detailed Report: list of all time entries with filters
router.get('/detailed', async (req, res) => {
  try {
    const { start_date, end_date, project_id, client_id, tag_id, billable } = req.query;

    let baseQuery = `
      SELECT ts.*, p.name as project_name, p.color as project_color, c.name as client_name, t.title as task_title
      FROM time_sessions ts
      LEFT JOIN projects p ON ts.project_id = p.id
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN tasks t ON ts.task_id = t.id
      WHERE ts.user_id = ? AND ts.status = 'stopped'
    `;
    const params = [req.user.id];

    if (start_date) { baseQuery += ' AND ts.started_at >= ?'; params.push(start_date); }
    if (end_date) { baseQuery += ' AND ts.started_at <= ?'; params.push(end_date + 'T23:59:59'); }
    if (project_id) { baseQuery += ' AND ts.project_id = ?'; params.push(project_id); }
    if (client_id) { baseQuery += ' AND p.client_id = ?'; params.push(client_id); }
    if (billable === '1') { baseQuery += ' AND ts.is_billable = 1'; }
    if (billable === '0') { baseQuery += ' AND ts.is_billable = 0'; }

    baseQuery += ' ORDER BY ts.started_at DESC';

    const entries = await db.all(baseQuery, ...params);

    // Filter by tag and attach tags
    let result = entries;
    if (tag_id) {
      const taggedIds = await db.all(
        'SELECT time_entry_id FROM time_entry_tags WHERE tag_id = ?', tag_id
      );
      const taggedIdSet = new Set(taggedIds.map(r => r.time_entry_id));
      result = entries.filter(e => taggedIdSet.has(e.id));
    }

    // Attach tags to each entry
    for (const entry of result) {
      const tags = await db.all(
        'SELECT t.* FROM tags t JOIN time_entry_tags tet ON t.id = tet.tag_id WHERE tet.time_entry_id = ?',
        entry.id
      );
      entry.tags = tags;
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate detailed report' });
  }
});

// Weekly Report: grid showing hours per day per project
router.get('/weekly', async (req, res) => {
  try {
    const { start_date } = req.query;
    // start_date should be a Monday (or any week start)
    const startDay = start_date || new Date().toISOString().split('T')[0];
    const startDt = new Date(startDay);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDt);
      d.setDate(d.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }

    const entries = await db.all(
      `SELECT ts.*, p.name as project_name, p.color as project_color
       FROM time_sessions ts
       LEFT JOIN projects p ON ts.project_id = p.id
       WHERE ts.user_id = ? AND ts.status = 'stopped'
         AND ts.started_at >= ? AND ts.started_at <= ?`,
      req.user.id, days[0], days[6] + 'T23:59:59'
    );

    // Build grid: project -> day -> seconds
    const projectGrid = {};
    const dailyTotals = {};
    days.forEach(d => { dailyTotals[d] = 0; });

    for (const entry of entries) {
      const day = entry.started_at.split('T')[0];
      if (!days.includes(day)) continue;

      const projectKey = entry.project_id || 'no-project';
      if (!projectGrid[projectKey]) {
        projectGrid[projectKey] = {
          project_id: entry.project_id,
          project_name: entry.project_name || 'No Project',
          project_color: entry.project_color || '#94a3b8',
          days: {},
          total: 0,
        };
        days.forEach(d => { projectGrid[projectKey].days[d] = 0; });
      }

      const seconds = entry.total_elapsed || 0;
      projectGrid[projectKey].days[day] += seconds;
      projectGrid[projectKey].total += seconds;
      dailyTotals[day] += seconds;
    }

    res.json({
      days,
      projects: Object.values(projectGrid).sort((a, b) => b.total - a.total),
      daily_totals: dailyTotals,
      total: Object.values(dailyTotals).reduce((a, b) => a + b, 0),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate weekly report' });
  }
});

module.exports = router;
