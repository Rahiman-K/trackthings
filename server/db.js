const { createClient } = require('@libsql/client');

// Use Turso (cloud SQLite) if configured, otherwise fall back to local SQLite file
const isTurso = process.env.TURSO_DATABASE_URL;

let db;

if (isTurso) {
  db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  console.log('Connected to Turso (cloud database)');
} else {
  // Local fallback using libsql local file
  db = createClient({
    url: 'file:./data/trackthings.db',
  });
  console.log('Using local SQLite database');
}

// Wrapper to make libsql work like better-sqlite3 (sync-style API)
// libsql is async, so we need a wrapper
class DatabaseWrapper {
  constructor(client) {
    this.client = client;
    this.ready = this.initialize();
  }

  async initialize() {
    await this.client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT DEFAULT '',
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
        sort_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS checklist_items (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        title TEXT NOT NULL,
        is_completed INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS time_sessions (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        started_at TEXT NOT NULL,
        paused_at TEXT,
        resumed_at TEXT,
        ended_at TEXT,
        total_elapsed INTEGER DEFAULT 0,
        status TEXT DEFAULT 'running'
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
        UNIQUE(user_id, date)
      );
    `);
  }

  // Execute a query and return all rows
  async all(sql, ...params) {
    await this.ready;
    const result = await this.client.execute({ sql, args: params });
    return result.rows;
  }

  // Execute a query and return first row
  async get(sql, ...params) {
    await this.ready;
    const result = await this.client.execute({ sql, args: params });
    return result.rows[0] || null;
  }

  // Execute a query (INSERT/UPDATE/DELETE)
  async run(sql, ...params) {
    await this.ready;
    const result = await this.client.execute({ sql, args: params });
    return result;
  }
}

module.exports = new DatabaseWrapper(db);
