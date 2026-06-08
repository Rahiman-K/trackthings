const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/trackthings.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT DEFAULT '',
    google_access_token TEXT,
    google_refresh_token TEXT,
    google_token_expiry TEXT,
    google_calendar_enabled INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    planned_duration INTEGER DEFAULT 0,
    scheduled_date TEXT,
    scheduled_time TEXT,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    google_event_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    rolled_over_from TEXT,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS checklist_items (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    title TEXT NOT NULL,
    is_completed INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS time_sessions (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    started_at TEXT NOT NULL,
    paused_at TEXT,
    resumed_at TEXT,
    ended_at TEXT,
    total_elapsed INTEGER DEFAULT 0,
    status TEXT DEFAULT 'running',
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS daily_reviews (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    tasks_completed INTEGER DEFAULT 0,
    tasks_rolled_over INTEGER DEFAULT 0,
    total_time_tracked INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Add user_id column to existing tasks if not exists (migration)
try {
  db.exec(`ALTER TABLE tasks ADD COLUMN user_id TEXT DEFAULT 'default'`);
} catch (e) {
  // Column already exists
}

// Add google_event_id if not exists
try {
  db.exec(`ALTER TABLE tasks ADD COLUMN google_event_id TEXT`);
} catch (e) {}

module.exports = db;
