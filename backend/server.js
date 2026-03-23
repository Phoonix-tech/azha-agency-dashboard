const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ── STATS ──────────────────────────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  const tasks = {
    total:   db.prepare("SELECT COUNT(*) as c FROM tasks").get().c,
    backlog: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status='backlog'").get().c,
    active:  db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status='active'").get().c,
    review:  db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status='review'").get().c,
    done:    db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status='done'").get().c,
  };
  const blockers = {
    total:     db.prepare("SELECT COUNT(*) as c FROM blockers").get().c,
    unresolved: db.prepare("SELECT COUNT(*) as c FROM blockers WHERE resolved=0").get().c,
  };
  const agents  = { total: db.prepare("SELECT COUNT(*) as c FROM agents").get().c };
  const sprints = { active: db.prepare("SELECT COUNT(*) as c FROM sprints WHERE status='active'").get().c };
  const recentActivity = db.prepare(`
    SELECT al.*, a.name as agent_name, a.emoji as agent_emoji
    FROM activity_log al
    LEFT JOIN agents a ON al.agent_id = a.id
    ORDER BY al.created_at DESC LIMIT 10
  `).all();

  res.json({ tasks, blockers, agents, sprints, recentActivity });
});

// ── AGENTS ─────────────────────────────────────────────────────────────────
app.get('/api/agents', (req, res) => {
  const agents = db.prepare(`
    SELECT a.*,
      COUNT(t.id) as task_count,
      SUM(CASE WHEN t.status='active' THEN 1 ELSE 0 END) as active_tasks,
      SUM(CASE WHEN t.status='done' THEN 1 ELSE 0 END) as done_tasks
    FROM agents a
    LEFT JOIN tasks t ON t.agent_id = a.id
    GROUP BY a.id
  `).all();
  res.json(agents);
});

app.get('/api/agents/:id', (req, res) => {
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const tasks = db.prepare('SELECT * FROM tasks WHERE agent_id = ? ORDER BY created_at DESC').all(req.params.id);
  const mistakes = db.prepare('SELECT * FROM mistakes WHERE agent_id = ? ORDER BY created_at DESC').all(req.params.id);

  res.json({ ...agent, tasks, mistakes });
});

// ── TASKS ──────────────────────────────────────────────────────────────────
app.get('/api/tasks', (req, res) => {
  let query = `
    SELECT t.*, a.name as agent_name, a.emoji as agent_emoji, a.color as agent_color
    FROM tasks t
    LEFT JOIN agents a ON t.agent_id = a.id
    WHERE 1=1
  `;
  const params = [];
  if (req.query.status)    { query += ' AND t.status = ?';    params.push(req.query.status); }
  if (req.query.agent_id)  { query += ' AND t.agent_id = ?';  params.push(req.query.agent_id); }
  if (req.query.sprint_id) { query += ' AND t.sprint_id = ?'; params.push(req.query.sprint_id); }
  query += ' ORDER BY t.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

app.post('/api/tasks', (req, res) => {
  const { task_id, title, description, status, priority, agent_id, sprint_id, repo, branch, effort } = req.body;
  if (!task_id || !title) return res.status(400).json({ error: 'task_id and title required' });

  const result = db.prepare(`
    INSERT INTO tasks (task_id, title, description, status, priority, agent_id, sprint_id, repo, branch, effort)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(task_id, title, description, status || 'backlog', priority || 'medium', agent_id, sprint_id, repo, branch, effort);

  // Log activity
  if (agent_id) {
    db.prepare('INSERT INTO activity_log (agent_id, action, detail, task_id) VALUES (?, ?, ?, ?)').run(
      agent_id, 'task_created', `Created ${task_id}: ${title}`, result.lastInsertRowid
    );
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(task);
});

app.put('/api/tasks/:id', (req, res) => {
  const { title, description, status, priority, agent_id, sprint_id, repo, branch, effort } = req.body;
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  db.prepare(`
    UPDATE tasks SET
      title=?, description=?, status=?, priority=?, agent_id=?, sprint_id=?, repo=?, branch=?, effort=?,
      updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(
    title ?? existing.title,
    description ?? existing.description,
    status ?? existing.status,
    priority ?? existing.priority,
    agent_id ?? existing.agent_id,
    sprint_id ?? existing.sprint_id,
    repo ?? existing.repo,
    branch ?? existing.branch,
    effort ?? existing.effort,
    req.params.id
  );

  // Log status change
  if (status && status !== existing.status) {
    const actAgentId = agent_id ?? existing.agent_id;
    if (actAgentId) {
      db.prepare('INSERT INTO activity_log (agent_id, action, detail, task_id) VALUES (?, ?, ?, ?)').run(
        actAgentId, 'task_updated', `${existing.task_id} moved to ${status}`, existing.id
      );
    }
  }

  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id));
});

app.delete('/api/tasks/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── SPRINTS ────────────────────────────────────────────────────────────────
app.get('/api/sprints', (req, res) => {
  res.json(db.prepare('SELECT * FROM sprints ORDER BY created_at DESC').all());
});

app.post('/api/sprints', (req, res) => {
  const { name, goal, status } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const result = db.prepare('INSERT INTO sprints (name, goal, status) VALUES (?, ?, ?)').run(name, goal, status || 'active');
  res.status(201).json(db.prepare('SELECT * FROM sprints WHERE id = ?').get(result.lastInsertRowid));
});

// ── BLOCKERS ───────────────────────────────────────────────────────────────
app.get('/api/blockers', (req, res) => {
  res.json(db.prepare(`
    SELECT b.*, a.name as agent_name, a.emoji as agent_emoji, t.task_id as task_code, t.title as task_title
    FROM blockers b
    LEFT JOIN agents a ON b.agent_id = a.id
    LEFT JOIN tasks t ON b.task_id = t.id
    ORDER BY b.created_at DESC
  `).all());
});

app.post('/api/blockers', (req, res) => {
  const { task_id, agent_id, description } = req.body;
  if (!description) return res.status(400).json({ error: 'description required' });
  const result = db.prepare('INSERT INTO blockers (task_id, agent_id, description) VALUES (?, ?, ?)').run(task_id, agent_id, description);
  if (agent_id) {
    db.prepare('INSERT INTO activity_log (agent_id, action, detail, task_id) VALUES (?, ?, ?, ?)').run(agent_id, 'blocker_added', description, task_id || null);
  }
  res.status(201).json(db.prepare('SELECT * FROM blockers WHERE id = ?').get(result.lastInsertRowid));
});

app.put('/api/blockers/:id/resolve', (req, res) => {
  const b = db.prepare('SELECT * FROM blockers WHERE id = ?').get(req.params.id);
  if (!b) return res.status(404).json({ error: 'Blocker not found' });
  db.prepare("UPDATE blockers SET resolved=1, resolved_at=CURRENT_TIMESTAMP WHERE id=?").run(req.params.id);
  if (b.agent_id) {
    db.prepare('INSERT INTO activity_log (agent_id, action, detail, task_id) VALUES (?, ?, ?, ?)').run(b.agent_id, 'blocker_resolved', b.description, b.task_id || null);
  }
  res.json(db.prepare('SELECT * FROM blockers WHERE id = ?').get(req.params.id));
});

// ── STANDUPS ───────────────────────────────────────────────────────────────
app.get('/api/standups', (req, res) => {
  res.json(db.prepare('SELECT * FROM standups ORDER BY created_at DESC').all());
});

app.post('/api/standups', (req, res) => {
  const { summary, blockers_count, tasks_reviewed } = req.body;
  if (!summary) return res.status(400).json({ error: 'summary required' });
  const result = db.prepare('INSERT INTO standups (summary, blockers_count, tasks_reviewed) VALUES (?, ?, ?)').run(
    summary, blockers_count || 0, tasks_reviewed || 0
  );
  res.status(201).json(db.prepare('SELECT * FROM standups WHERE id = ?').get(result.lastInsertRowid));
});

// ── MISTAKES ───────────────────────────────────────────────────────────────
app.get('/api/mistakes', (req, res) => {
  let query = `
    SELECT m.*, a.name as agent_name, a.emoji as agent_emoji, t.task_id as task_code
    FROM mistakes m
    LEFT JOIN agents a ON m.agent_id = a.id
    LEFT JOIN tasks t ON m.task_id = t.id
    WHERE 1=1
  `;
  const params = [];
  if (req.query.agent_id) { query += ' AND m.agent_id = ?'; params.push(req.query.agent_id); }
  query += ' ORDER BY m.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

app.post('/api/mistakes', (req, res) => {
  const { agent_id, task_id, title, description, severity, lesson } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const result = db.prepare(`
    INSERT INTO mistakes (agent_id, task_id, title, description, severity, lesson)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(agent_id, task_id, title, description, severity || 'medium', lesson);
  if (agent_id) {
    db.prepare('INSERT INTO activity_log (agent_id, action, detail, task_id) VALUES (?, ?, ?, ?)').run(agent_id, 'mistake_logged', title, task_id || null);
  }
  res.status(201).json(db.prepare('SELECT * FROM mistakes WHERE id = ?').get(result.lastInsertRowid));
});

// ── ACTIVITY ───────────────────────────────────────────────────────────────
app.get('/api/activity', (req, res) => {
  const rows = db.prepare(`
    SELECT al.*,
           a.name  as agent_name,
           a.emoji as agent_emoji,
           t.id       as linked_task_db_id,
           t.task_id  as linked_task_id,
           t.title    as linked_task_title,
           t.status   as linked_task_status,
           t.priority as linked_task_priority
    FROM activity_log al
    LEFT JOIN agents a ON al.agent_id = a.id
    LEFT JOIN tasks t  ON al.task_id  = t.id
    ORDER BY al.created_at DESC LIMIT 50
  `).all();

  // For rows without a task_id FK, try to resolve via task ID pattern in detail text
  const allTasks = db.prepare('SELECT id, task_id, title, status, priority FROM tasks').all();
  const resolved = rows.map(row => {
    if (row.linked_task_db_id) return row;
    if (!row.detail) return row;
    const match = allTasks.find(t => row.detail.includes(t.task_id));
    if (!match) return row;
    return {
      ...row,
      linked_task_db_id: match.id,
      linked_task_id: match.task_id,
      linked_task_title: match.title,
      linked_task_status: match.status,
      linked_task_priority: match.priority,
    };
  });

  res.json(resolved);
});

app.post('/api/activity', (req, res) => {
  const { agent_id, action, detail, task_id } = req.body;
  if (!action) return res.status(400).json({ error: 'action required' });
  const result = db.prepare('INSERT INTO activity_log (agent_id, action, detail, task_id) VALUES (?, ?, ?, ?)').run(agent_id, action, detail, task_id || null);
  res.status(201).json(db.prepare('SELECT * FROM activity_log WHERE id = ?').get(result.lastInsertRowid));
});

app.listen(PORT, () => {
  console.log(`🚀 Azha Agency Dashboard API running on port ${PORT}`);
});
