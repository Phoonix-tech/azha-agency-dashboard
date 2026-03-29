const express = require('express');
const cors = require('cors');
const pool = require('./database');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ── STATS ──────────────────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const [tasks, blockers, agents, sprints, activity] = await Promise.all([
      pool.query(`SELECT
        COUNT(*) FILTER (WHERE TRUE) as total,
        COUNT(*) FILTER (WHERE status='backlog') as backlog,
        COUNT(*) FILTER (WHERE status='active') as active,
        COUNT(*) FILTER (WHERE status='review') as review,
        COUNT(*) FILTER (WHERE status='done') as done
        FROM tasks`),
      pool.query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE resolved=false) as unresolved
        FROM blockers`),
      pool.query(`SELECT COUNT(*) as total FROM agents`),
      pool.query(`SELECT COUNT(*) FILTER (WHERE status='active') as active FROM sprints`),
      pool.query(`
        SELECT al.*, a.name as agent_name, a.emoji as agent_emoji
        FROM activity_log al
        LEFT JOIN agents a ON al.agent_id = a.id
        ORDER BY al.created_at DESC LIMIT 10
      `),
    ]);
    res.json({
      tasks:          { total: +tasks.rows[0].total, backlog: +tasks.rows[0].backlog, active: +tasks.rows[0].active, review: +tasks.rows[0].review, done: +tasks.rows[0].done },
      blockers:       { total: +blockers.rows[0].total, unresolved: +blockers.rows[0].unresolved },
      agents:         { total: +agents.rows[0].total },
      sprints:        { active: +sprints.rows[0].active },
      recentActivity: activity.rows,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── AGENTS ─────────────────────────────────────────────────────────────────
app.get('/api/agents', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.*,
        COUNT(t.id) as task_count,
        COUNT(t.id) FILTER (WHERE t.status='active') as active_tasks,
        COUNT(t.id) FILTER (WHERE t.status='done') as done_tasks
      FROM agents a
      LEFT JOIN tasks t ON t.agent_id = a.id
      GROUP BY a.id ORDER BY a.id
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/agents/:id', async (req, res) => {
  try {
    const { rows: [agent] } = await pool.query('SELECT * FROM agents WHERE id=$1', [req.params.id]);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    const [tasks, mistakes] = await Promise.all([
      pool.query('SELECT * FROM tasks WHERE agent_id=$1 ORDER BY created_at DESC', [req.params.id]),
      pool.query('SELECT * FROM mistakes WHERE agent_id=$1 ORDER BY created_at DESC', [req.params.id]),
    ]);
    res.json({ ...agent, tasks: tasks.rows, mistakes: mistakes.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── TASKS ──────────────────────────────────────────────────────────────────
app.get('/api/tasks', async (req, res) => {
  try {
    let query = `
      SELECT t.*, a.name as agent_name, a.emoji as agent_emoji, a.color as agent_color
      FROM tasks t LEFT JOIN agents a ON t.agent_id = a.id WHERE 1=1
    `;
    const params = [];
    if (req.query.status)    { params.push(req.query.status);    query += ` AND t.status=$${params.length}`; }
    if (req.query.agent_id)  { params.push(req.query.agent_id);  query += ` AND t.agent_id=$${params.length}`; }
    if (req.query.sprint_id) { params.push(req.query.sprint_id); query += ` AND t.sprint_id=$${params.length}`; }
    query += ' ORDER BY t.created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const { task_id, title, description, status, priority, agent_id, sprint_id, repo, branch, effort } = req.body;
    if (!task_id || !title) return res.status(400).json({ error: 'task_id and title required' });
    const { rows: [task] } = await pool.query(`
      INSERT INTO tasks (task_id,title,description,status,priority,agent_id,sprint_id,repo,branch,effort)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    `, [task_id, title, description, status||'backlog', priority||'medium', agent_id||null, sprint_id||null, repo||null, branch||null, effort||null]);
    if (agent_id) {
      await pool.query('INSERT INTO activity_log (agent_id,action,detail,task_id) VALUES ($1,$2,$3,$4)', [agent_id, 'task_created', `Created ${task_id}: ${title}`, task.id]);
    }
    res.status(201).json(task);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { rows: [existing] } = await pool.query('SELECT * FROM tasks WHERE id=$1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Task not found' });
    const { title, description, status, priority, agent_id, sprint_id, repo, branch, effort } = req.body;
    const { rows: [updated] } = await pool.query(`
      UPDATE tasks SET
        title=$1, description=$2, status=$3, priority=$4, agent_id=$5,
        sprint_id=$6, repo=$7, branch=$8, effort=$9, updated_at=NOW()
      WHERE id=$10 RETURNING *
    `, [
      title??existing.title, description??existing.description, status??existing.status,
      priority??existing.priority, agent_id??existing.agent_id, sprint_id??existing.sprint_id,
      repo??existing.repo, branch??existing.branch, effort??existing.effort, req.params.id
    ]);
    if (status && status !== existing.status) {
      const actAgent = agent_id ?? existing.agent_id;
      if (actAgent) await pool.query('INSERT INTO activity_log (agent_id,action,detail,task_id) VALUES ($1,$2,$3,$4)', [actAgent, 'task_updated', `${existing.task_id} moved to ${status}`, existing.id]);
    }
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { rows: [existing] } = await pool.query('SELECT id FROM tasks WHERE id=$1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Task not found' });
    await pool.query('DELETE FROM tasks WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── SPRINTS ────────────────────────────────────────────────────────────────
app.get('/api/sprints', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM sprints ORDER BY created_at DESC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/sprints', async (req, res) => {
  try {
    const { name, goal, status } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const { rows: [sprint] } = await pool.query('INSERT INTO sprints (name,goal,status) VALUES ($1,$2,$3) RETURNING *', [name, goal, status||'active']);
    res.status(201).json(sprint);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── BLOCKERS ───────────────────────────────────────────────────────────────
app.get('/api/blockers', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT b.*, a.name as agent_name, a.emoji as agent_emoji, t.task_id as task_code, t.title as task_title
      FROM blockers b
      LEFT JOIN agents a ON b.agent_id = a.id
      LEFT JOIN tasks t ON b.task_id = t.id
      ORDER BY b.created_at DESC
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/blockers', async (req, res) => {
  try {
    const { task_id, agent_id, description } = req.body;
    if (!description) return res.status(400).json({ error: 'description required' });
    const { rows: [blocker] } = await pool.query('INSERT INTO blockers (task_id,agent_id,description) VALUES ($1,$2,$3) RETURNING *', [task_id||null, agent_id||null, description]);
    if (agent_id) await pool.query('INSERT INTO activity_log (agent_id,action,detail,task_id) VALUES ($1,$2,$3,$4)', [agent_id, 'blocker_added', description, task_id||null]);
    res.status(201).json(blocker);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/blockers/:id/resolve', async (req, res) => {
  try {
    const { rows: [b] } = await pool.query('SELECT * FROM blockers WHERE id=$1', [req.params.id]);
    if (!b) return res.status(404).json({ error: 'Blocker not found' });
    const { rows: [updated] } = await pool.query('UPDATE blockers SET resolved=true, resolved_at=NOW() WHERE id=$1 RETURNING *', [req.params.id]);
    if (b.agent_id) await pool.query('INSERT INTO activity_log (agent_id,action,detail,task_id) VALUES ($1,$2,$3,$4)', [b.agent_id, 'blocker_resolved', b.description, b.task_id||null]);
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── STANDUPS ───────────────────────────────────────────────────────────────
app.get('/api/standups', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM standups ORDER BY created_at DESC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/standups', async (req, res) => {
  try {
    const { summary, blockers_count, tasks_reviewed } = req.body;
    if (!summary) return res.status(400).json({ error: 'summary required' });
    const { rows: [standup] } = await pool.query('INSERT INTO standups (summary,blockers_count,tasks_reviewed) VALUES ($1,$2,$3) RETURNING *', [summary, blockers_count||0, tasks_reviewed||0]);
    res.status(201).json(standup);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── MISTAKES ───────────────────────────────────────────────────────────────
app.get('/api/mistakes', async (req, res) => {
  try {
    let query = `
      SELECT m.*, a.name as agent_name, a.emoji as agent_emoji, t.task_id as task_code
      FROM mistakes m
      LEFT JOIN agents a ON m.agent_id = a.id
      LEFT JOIN tasks t ON m.task_id = t.id WHERE 1=1
    `;
    const params = [];
    if (req.query.agent_id) { params.push(req.query.agent_id); query += ` AND m.agent_id=$${params.length}`; }
    query += ' ORDER BY m.created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/mistakes', async (req, res) => {
  try {
    const { agent_id, task_id, title, description, severity, lesson } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    const { rows: [mistake] } = await pool.query(`
      INSERT INTO mistakes (agent_id,task_id,title,description,severity,lesson) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [agent_id||null, task_id||null, title, description||null, severity||'medium', lesson||null]);
    if (agent_id) await pool.query('INSERT INTO activity_log (agent_id,action,detail,task_id) VALUES ($1,$2,$3,$4)', [agent_id, 'mistake_logged', title, task_id||null]);
    res.status(201).json(mistake);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── REPORTS ────────────────────────────────────────────────────────────────
app.get('/api/reports', async (req, res) => {
  try {
    let query = `
      SELECT r.*, a.name as agent_name, a.emoji as agent_emoji
      FROM reports r LEFT JOIN agents a ON r.agent_id = a.id WHERE 1=1
    `;
    const params = [];
    if (req.query.type)    { params.push(req.query.type);    query += ` AND r.type=$${params.length}`; }
    if (req.query.project) { params.push(req.query.project); query += ` AND r.project=$${params.length}`; }
    if (req.query.search)  {
      params.push(`%${req.query.search}%`);
      query += ` AND (r.title ILIKE $${params.length} OR r.the_ask ILIKE $${params.length} OR r.content ILIKE $${params.length})`;
    }
    query += ' ORDER BY r.created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/reports/:id', async (req, res) => {
  try {
    const { rows: [report] } = await pool.query(`
      SELECT r.*, a.name as agent_name, a.emoji as agent_emoji
      FROM reports r LEFT JOIN agents a ON r.agent_id = a.id WHERE r.id=$1
    `, [req.params.id]);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/reports', async (req, res) => {
  try {
    const { title, the_ask, type, project, generated_by, agent_id, content } = req.body;
    if (!title || !the_ask || !type || !content) return res.status(400).json({ error: 'title, the_ask, type, content required' });
    const { rows: [report] } = await pool.query(`
      INSERT INTO reports (title,the_ask,type,project,generated_by,agent_id,content) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [title, the_ask, type, project||null, generated_by||null, agent_id||null, content]);
    res.status(201).json(report);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/reports/:id', async (req, res) => {
  try {
    const { rows: [existing] } = await pool.query('SELECT id FROM reports WHERE id=$1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Report not found' });
    await pool.query('DELETE FROM reports WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── ACTIVITY ───────────────────────────────────────────────────────────────
app.get('/api/activity', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT al.*,
             a.name  as agent_name, a.emoji as agent_emoji,
             t.id       as linked_task_db_id,
             t.task_id  as linked_task_id,
             t.title    as linked_task_title,
             t.status   as linked_task_status,
             t.priority as linked_task_priority
      FROM activity_log al
      LEFT JOIN agents a ON al.agent_id = a.id
      LEFT JOIN tasks t  ON al.task_id  = t.id
      ORDER BY al.created_at DESC LIMIT 50
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/activity', async (req, res) => {
  try {
    const { agent_id, action, detail, task_id } = req.body;
    if (!action) return res.status(400).json({ error: 'action required' });
    const { rows: [entry] } = await pool.query('INSERT INTO activity_log (agent_id,action,detail,task_id) VALUES ($1,$2,$3,$4) RETURNING *', [agent_id||null, action, detail||null, task_id||null]);
    res.status(201).json(entry);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => {
  console.log(`🚀 Azha Agency Dashboard API running on port ${PORT} (PostgreSQL)`);
});
