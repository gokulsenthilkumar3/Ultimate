const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'tracker.db'));

// Generic Initialization Script
// Data is now managed via the Application UI and API.
// This script only ensures the schema is ready.

db.exec(`
  CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'system',
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified_by TEXT DEFAULT 'system'
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    priority TEXT,
    tag TEXT,
    dueDate TEXT,
    done INTEGER DEFAULT 0,
    recurring INTEGER DEFAULT 0,
    frequency TEXT,
    lastDone TEXT,
    completedAt TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'user',
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified_by TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS shopping (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    priority TEXT,
    estimatedCost REAL,
    purchased INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'user',
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified_by TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS timesheet (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task TEXT,
    duration INTEGER,
    date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'user',
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified_by TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT,
    table_name TEXT,
    item_id INTEGER,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    actor TEXT DEFAULT 'system'
  );
`);

console.log('Database initialized successfully. No hardcoded data remains in the seed script.');
