const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'agency.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
CREATE TABLE IF NOT EXISTS agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  emoji TEXT,
  color TEXT
);

CREATE TABLE IF NOT EXISTS sprints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  goal TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'backlog',
  priority TEXT DEFAULT 'medium',
  agent_id INTEGER REFERENCES agents(id),
  sprint_id INTEGER REFERENCES sprints(id),
  repo TEXT,
  branch TEXT,
  effort TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blockers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER REFERENCES tasks(id),
  agent_id INTEGER REFERENCES agents(id),
  description TEXT NOT NULL,
  resolved INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME
);

CREATE TABLE IF NOT EXISTS standups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  summary TEXT NOT NULL,
  blockers_count INTEGER DEFAULT 0,
  tasks_reviewed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mistakes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id INTEGER REFERENCES agents(id),
  task_id INTEGER REFERENCES tasks(id),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'medium',
  lesson TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id INTEGER REFERENCES agents(id),
  action TEXT NOT NULL,
  detail TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// Seed data if empty
const agentCount = db.prepare('SELECT COUNT(*) as c FROM agents').get().c;

if (agentCount === 0) {
  const agents = [
    { name: 'Medhat', role: 'CTO / Orchestrator', emoji: '🦅', color: '#6366f1' },
    { name: 'Zara',   role: 'Business Development', emoji: '📊', color: '#ec4899' },
    { name: 'Lina',   role: 'Product Manager', emoji: '🧩', color: '#8b5cf6' },
    { name: 'Kareem', role: 'Scrum Master', emoji: '🗂️', color: '#f59e0b' },
    { name: 'Omar',   role: 'Backend Developer', emoji: '🔧', color: '#10b981' },
    { name: 'Sara',   role: 'Frontend Developer', emoji: '🎨', color: '#3b82f6' },
    { name: 'Tarek',  role: 'Mobile Developer', emoji: '📱', color: '#f97316' },
    { name: 'Nader',  role: 'Tech Lead', emoji: '🔍', color: '#14b8a6' },
  ];

  const insertAgent = db.prepare('INSERT INTO agents (name, role, emoji, color) VALUES (?, ?, ?, ?)');
  for (const a of agents) {
    insertAgent.run(a.name, a.role, a.emoji, a.color);
  }

  // Sprint 1
  db.prepare(`INSERT INTO sprints (name, goal, status) VALUES (?, ?, ?)`).run(
    'Sprint 1',
    'Fix critical bugs, harden auth, and stabilize mobile & desktop apps',
    'active'
  );

  // Get agent IDs
  const getAgent = db.prepare('SELECT id FROM agents WHERE name = ?');
  const omarId  = getAgent.get('Omar').id;
  const saraId  = getAgent.get('Sara').id;
  const tarekId = getAgent.get('Tarek').id;
  const sprintId = db.prepare('SELECT id FROM sprints WHERE name = ?').get('Sprint 1').id;

  const insertTask = db.prepare(`
    INSERT INTO tasks (task_id, title, description, status, priority, agent_id, sprint_id, repo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tasks = [
    ['T-001', 'Fix double stock deduction bug in DeductStock', 'Stock is being deducted twice on certain transactions', 'active', 'critical', omarId, sprintId, 'Azha-ERP-Backend'],
    ['T-002', 'Fix ISub_ProductsRepository interface mismatch', 'Interface methods dont match implementation signature', 'active', 'high', omarId, sprintId, 'Azha-ERP-Backend'],
    ['T-003', 'Add router auth guard to Azha-ERP-Front', 'Protected routes accessible without authentication', 'active', 'critical', saraId, sprintId, 'Azha-ERP-Front'],
    ['T-004', 'Add Arabic translations for new POS module', 'POS module missing Arabic i18n strings', 'active', 'high', saraId, sprintId, 'Azha-ERP-Front'],
    ['T-005', 'Replace hardcoded JWT token in Azha_Mobile', 'JWT token is hardcoded in source, major security risk', 'active', 'critical', tarekId, sprintId, 'Azha_Mobile'],
    ['T-006', 'Implement real auth check in Azha_Mobile splash', 'Splash screen bypasses auth validation', 'active', 'high', tarekId, sprintId, 'Azha_Mobile'],
    ['T-007', 'Restore pubspec.lock in azha-desktop', 'pubspec.lock missing, builds are non-reproducible', 'active', 'critical', tarekId, sprintId, 'azha-desktop'],
    ['T-008', 'Wire real backend API to azha-desktop', 'Desktop app using mock data instead of real API', 'backlog', 'high', tarekId, sprintId, 'azha-desktop'],
    ['T-009', 'Write unit tests for GetAvailableInStockForProductBasedOnSubs', 'No test coverage for this critical stock query', 'backlog', 'high', omarId, sprintId, 'Azha-ERP-Backend'],
    ['T-010', 'Remove 184 console.log from Azha-ERP-Front', 'Production build leaking debug logs', 'backlog', 'medium', saraId, sprintId, 'Azha-ERP-Front'],
  ];

  for (const t of tasks) {
    insertTask.run(...t);
  }

  // Seed activity log
  const insertActivity = db.prepare('INSERT INTO activity_log (agent_id, action, detail) VALUES (?, ?, ?)');
  insertActivity.run(omarId, 'task_created', 'Created T-001: Fix double stock deduction bug');
  insertActivity.run(saraId, 'task_created', 'Created T-003: Add router auth guard');
  insertActivity.run(tarekId, 'task_created', 'Created T-005: Replace hardcoded JWT token');
  insertActivity.run(omarId, 'task_updated', 'Started work on T-002');
  insertActivity.run(saraId, 'task_updated', 'Started work on T-004');

  // Seed a standup
  db.prepare(`INSERT INTO standups (summary, blockers_count, tasks_reviewed) VALUES (?, ?, ?)`).run(
    'Sprint 1 kickoff standup. Team aligned on critical bugs. Omar tackling stock deduction, Sara on auth guard, Tarek on mobile security. No blockers yet.',
    0, 10
  );

  console.log('✅ Database seeded successfully');
}

module.exports = db;
