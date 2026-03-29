/**
 * migrate.js — Run once to set up schema + seed all real Phoonix data
 * Usage: node migrate.js
 */
const pool = require('./database');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── SCHEMA ─────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        emoji TEXT,
        color TEXT,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS sprints (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        goal TEXT,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
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
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS blockers (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES tasks(id),
        agent_id INTEGER REFERENCES agents(id),
        description TEXT NOT NULL,
        resolved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        resolved_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS standups (
        id SERIAL PRIMARY KEY,
        summary TEXT NOT NULL,
        blockers_count INTEGER DEFAULT 0,
        tasks_reviewed INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS mistakes (
        id SERIAL PRIMARY KEY,
        agent_id INTEGER REFERENCES agents(id),
        task_id INTEGER REFERENCES tasks(id),
        title TEXT NOT NULL,
        description TEXT,
        severity TEXT DEFAULT 'medium',
        lesson TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        agent_id INTEGER REFERENCES agents(id),
        action TEXT NOT NULL,
        detail TEXT,
        task_id INTEGER REFERENCES tasks(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        the_ask TEXT NOT NULL,
        type TEXT NOT NULL,
        project TEXT,
        generated_by TEXT,
        agent_id INTEGER REFERENCES agents(id),
        agent_name TEXT,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── AGENTS ─────────────────────────────────────────────────────────────
    // Clear and reseed
    await client.query('TRUNCATE agents, sprints, tasks, blockers, standups, mistakes, activity_log, reports RESTART IDENTITY CASCADE');

    const agents = [
      { name: 'Medhat',  role: 'CTO / Orchestrator',    emoji: '🦅', color: '#6366f1', desc: 'Receives requirements from Maghraby, coordinates all agents, reviews final output, manages MR approvals and technical decisions.' },
      { name: 'Mona',    role: 'Business Development',   emoji: '📊', color: '#ec4899', desc: 'Analyzes market fit, shapes business requirements, evaluates ROI and risk. First stop for any new feature idea.' },
      { name: 'Lina',    role: 'Product Manager',        emoji: '🧩', color: '#8b5cf6', desc: 'Creates PRDs, user stories, acceptance criteria. Bridges business needs and engineering output.' },
      { name: 'Kareem',  role: 'Scrum Master',           emoji: '🗂️', color: '#f59e0b', desc: 'Breaks product stories into dev tasks, manages sprint planning, runs standups, tracks blockers.' },
      { name: 'Omar',    role: 'Backend Developer',      emoji: '🔧', color: '#10b981', desc: 'Builds C# .NET Core APIs for AzhaApi. Owns backend endpoints, database migrations, and server-side logic.' },
      { name: 'Sara',    role: 'Frontend Developer',     emoji: '🎨', color: '#3b82f6', desc: 'Builds Vue.js 2 frontend for Azha ERP. Owns UI components, dashboard widgets, and RTL/Arabic i18n.' },
      { name: 'Tarek',   role: 'Mobile Developer',       emoji: '📱', color: '#f97316', desc: 'Builds Flutter apps: Azha_Mobile, azha-desktop, school bus driver/parent apps. Owns mobile architecture and auth flows.' },
      { name: 'Nader',   role: 'Tech Lead / Code Review',emoji: '🔍', color: '#14b8a6', desc: 'Reviews all code before merge. Enforces quality standards, catches security issues, approves MRs. Nothing ships without Nader sign-off.' },
    ];

    for (const a of agents) {
      await client.query(
        'INSERT INTO agents (name, role, emoji, color, description) VALUES ($1,$2,$3,$4,$5)',
        [a.name, a.role, a.emoji, a.color, a.desc]
      );
    }

    // Get agent IDs
    const agentMap = {};
    const { rows: agentRows } = await client.query('SELECT id, name FROM agents');
    for (const r of agentRows) agentMap[r.name] = r.id;

    // ── SPRINTS ────────────────────────────────────────────────────────────
    await client.query(`INSERT INTO sprints (name, goal, status, created_at) VALUES
      ('Sprint 1', 'Fix critical bugs, harden auth, stabilize mobile & desktop apps', 'done', '2026-03-22T00:00:00Z'),
      ('Sprint 2', 'Build permission-based customizable dashboard for Azha ERP — backend endpoints + full frontend widget set', 'done', '2026-03-24T00:00:00Z')
    `);

    const { rows: sprintRows } = await client.query('SELECT id, name FROM sprints');
    const sprintMap = {};
    for (const r of sprintRows) sprintMap[r.name] = r.id;

    // ── SPRINT 1 TASKS (T-001 to T-017, all DONE) ─────────────────────────
    const s1 = sprintMap['Sprint 1'];
    const sprint1Tasks = [
      { task_id:'T-001', title:'Fix double stock deduction bug in DeductStock',               desc:'Stock was being deducted twice on certain transactions due to duplicate event handler.',           status:'done', priority:'critical', agent:'Omar',  repo:'AzhaApi',           branch:'Feature-SubProducts' },
      { task_id:'T-002', title:'Fix ISub_ProductsRepository interface mismatch',              desc:'Interface methods did not match implementation signatures causing compile errors at runtime.',      status:'done', priority:'high',     agent:'Omar',  repo:'AzhaApi',           branch:'Feature-SubProducts' },
      { task_id:'T-003', title:'Add router auth guard to Azha-ERP-Front',                    desc:'Protected routes were accessible without authentication — critical security gap.',                  status:'done', priority:'critical', agent:'Sara',  repo:'Azha-ERP-Front',    branch:'enhancedSchoolBranch' },
      { task_id:'T-004', title:'Add Arabic translations for new POS module',                  desc:'POS module was missing Arabic i18n strings, breaking RTL layout for Arabic users.',               status:'done', priority:'high',     agent:'Sara',  repo:'Azha-ERP-Front',    branch:'enhancedSchoolBranch' },
      { task_id:'T-005', title:'Replace hardcoded JWT token in Azha_Mobile',                  desc:'JWT token was hardcoded in source code — critical security vulnerability.',                        status:'done', priority:'critical', agent:'Tarek', repo:'Azha_Mobile',        branch:'feature/bus-driver' },
      { task_id:'T-006', title:'Implement real auth check in Azha_Mobile splash screen',      desc:'Splash screen was bypassing auth validation, allowing unauthenticated access.',                    status:'done', priority:'critical', agent:'Tarek', repo:'Azha_Mobile',        branch:'feature/bus-driver' },
      { task_id:'T-007', title:'Restore pubspec.lock in azha-desktop',                       desc:'pubspec.lock was missing from repo, making builds non-reproducible.',                             status:'done', priority:'critical', agent:'Tarek', repo:'azha-desktop',       branch:'dev' },
      { task_id:'T-008', title:'Wire real backend API to azha-desktop',                       desc:'Desktop app was using mock data instead of real API calls.',                                      status:'done', priority:'high',     agent:'Tarek', repo:'azha-desktop',       branch:'dev' },
      { task_id:'T-009', title:'Write unit tests for GetAvailableInStockForProductBasedOnSubs',desc:'No test coverage for this critical stock query method.',                                          status:'done', priority:'high',     agent:'Omar',  repo:'AzhaApi',           branch:'Feature-SubProducts' },
      { task_id:'T-010', title:'Remove 184 console.log statements from Azha-ERP-Front',       desc:'Production build was leaking debug logs — performance and security issue.',                       status:'done', priority:'medium',   agent:'Sara',  repo:'Azha-ERP-Front',    branch:'enhancedSchoolBranch' },
      { task_id:'T-011', title:'Remove console.logs from Azha-ERP-Front (initial batch)',     desc:'First batch of console.log cleanup across components.',                                           status:'done', priority:'medium',   agent:'Sara',  repo:'Azha-ERP-Front',    branch:'enhancedSchoolBranch' },
      { task_id:'T-012', title:'Upgrade axios dependency',                                    desc:'Upgrade axios to latest stable version to resolve known CVEs.',                                   status:'done', priority:'medium',   agent:'Sara',  repo:'Azha-ERP-Front',    branch:'enhancedSchoolBranch' },
      { task_id:'T-013', title:'Lock CORS to frontend domain in AzhaApi',                     desc:'AllowAnyOrigin() was set — CORS fully open. Must be locked to frontend domain before production.',status:'done', priority:'high',     agent:'Omar',  repo:'AzhaApi',           branch:'Feature-SubProducts' },
      { task_id:'T-014', title:'Enable requireHttpsMetadata for JWT in production',            desc:'JWT config had requireHttpsMetadata=false, allowing tokens over plain HTTP.',                     status:'done', priority:'high',     agent:'Omar',  repo:'AzhaApi',           branch:'Feature-SubProducts' },
      { task_id:'T-015', title:'Remove Swagger from production build',                        desc:'Swagger was enabled in production, exposing the full API surface publicly.',                      status:'done', priority:'medium',   agent:'Omar',  repo:'AzhaApi',           branch:'Feature-SubProducts' },
      { task_id:'T-016', title:'Fix sub-product select reactivity in Vue frontend',            desc:'Sub-product dropdown was not reactive — selections not triggering UI updates correctly.',         status:'done', priority:'high',     agent:'Sara',  repo:'Azha-ERP-Front',    branch:'enhancedSchoolBranch' },
      { task_id:'T-017', title:'Code review Sprint 1 — all repos audit',                      desc:'Full Nader deep-audit across AzhaApi, Azha-ERP-Front, Azha_Mobile, azha-desktop. Found 40+ issues, all critical/high fixed.',status:'done', priority:'high', agent:'Nader', repo:'all', branch:'—' },
    ];

    for (const t of sprint1Tasks) {
      await client.query(
        `INSERT INTO tasks (task_id,title,description,status,priority,agent_id,sprint_id,repo,branch,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'2026-03-23T00:00:00Z','2026-03-24T00:00:00Z')`,
        [t.task_id, t.title, t.desc, t.status, t.priority, agentMap[t.agent], s1, t.repo, t.branch]
      );
    }

    // ── SPRINT 2 TASKS (DASH-001 to DASH-047, all DONE) ───────────────────
    const s2 = sprintMap['Sprint 2'];
    const sprint2Tasks = [
      // Phase 1 — Foundation
      { task_id:'DASH-001', title:'Permission-Check Endpoint (GET /api/dashboard/permissions)',        status:'done', priority:'critical', agent:'Omar', repo:'AzhaApi',        branch:'feature/sprint2-dashboard', effort:'M', desc:'Returns authenticated user permission list. Permission-gated, unit-tested for 0/1/many perms.' },
      { task_id:'DASH-002', title:'Layout Persistence Endpoints (save/load/reset)',                   status:'done', priority:'high',     agent:'Omar', repo:'AzhaApi',        branch:'feature/sprint2-dashboard', effort:'L', desc:'GET/PUT/DELETE /api/dashboard/layout/{userId}. Validates widget IDs against permissions before saving.' },
      { task_id:'DASH-003', title:'Admin Default Layout Endpoints (per-role save/load)',              status:'done', priority:'high',     agent:'Omar', repo:'AzhaApi',        branch:'feature/sprint2-dashboard', effort:'M', desc:'GET/PUT /api/dashboard/layout/default/{roleId}. Requires Role.View + SystemUserPermission.View.' },
      { task_id:'DASH-004', title:'Dashboard Shell — Permission Gate & Empty State',                  status:'done', priority:'critical', agent:'Sara', repo:'Azha-ERP-Front', branch:'feature/sprint2-dashboard', effort:'M', desc:'On mount, fetches permissions into Vuex. Renders no-access empty state if zero permissions.' },
      { task_id:'DASH-005', title:'Dashboard Shell — Widget Grid Container & Drag-and-Drop',         status:'done', priority:'critical', agent:'Sara', repo:'Azha-ERP-Front', branch:'feature/sprint2-dashboard', effort:'L', desc:'vue-grid-layout 12-column system. Drag, resize, add/remove widgets. Auto-saves after 2s idle.' },
      { task_id:'DASH-006', title:'Widget Registry — Permission-to-Component Map',                   status:'done', priority:'high',     agent:'Sara', repo:'Azha-ERP-Front', branch:'feature/sprint2-dashboard', effort:'M', desc:'widgetRegistry.js maps widgetId to component, permission, size, lazy-load chunk.' },
      { task_id:'DASH-007', title:'Widget Base Component — Skeleton, Error & Empty States',          status:'done', priority:'high',     agent:'Sara', repo:'Azha-ERP-Front', branch:'feature/sprint2-dashboard', effort:'M', desc:'BaseWidget.vue with loading/error/loaded states. CSS shimmer skeleton, retry UI, 403 lock state.' },
      { task_id:'DASH-008', title:'Session Permission Refresh & Permissions-Changed Banner',         status:'done', priority:'medium',   agent:'Sara', repo:'Azha-ERP-Front', branch:'feature/sprint2-dashboard', effort:'S', desc:'Re-fetches permissions every 15min. Shows non-intrusive banner if permissions changed.' },
      // Phase 2 — Billing
      { task_id:'DASH-009', title:'Billing — Existing Endpoints Audit & Dashboard Wrappers',         status:'done', priority:'high',     agent:'Omar', repo:'AzhaApi',        branch:'feature/sprint2-dashboard', effort:'M', desc:'Wrapped billing endpoints under /api/dashboard/billing/ with BillReports.View permission check.' },
      { task_id:'DASH-010', title:'Billing — AR Aging + DSO Endpoints',                             status:'done', priority:'high',     agent:'Omar', repo:'AzhaApi',        branch:'feature/sprint2-dashboard', effort:'M', desc:'AR aging buckets (0-30,31-60,61-90,90+) and DSO trend endpoint with unit tests.' },
      { task_id:'DASH-011', title:'Billing — Monthly Sales Trend + Gross Margin Endpoints',         status:'done', priority:'high',     agent:'Omar', repo:'AzhaApi',        branch:'feature/sprint2-dashboard', effort:'M', desc:'12-month sales trend and gross margin with prior/trend fields. Handles negative margin.' },
      { task_id:'DASH-012', title:'Billing — Product Profitability + Top Employees Endpoints',      status:'done', priority:'medium',   agent:'Omar', repo:'AzhaApi',        branch:'feature/sprint2-dashboard', effort:'S', desc:'Top 10 products by revenue and top 10 employees by sales with date range params.' },
      { task_id:'DASH-013', title:'Billing Widgets — KPI Cards (BILL-01,05,08,10)',                 status:'done', priority:'high',     agent:'Sara', repo:'Azha-ERP-Front', branch:'feature/sprint2-dashboard', effort:'L', desc:'Total receivables, employee invoice count, DSO trend, gross margin % — all with color states.' },
      { task_id:'DASH-014', title:'Billing Widgets — Tables (BILL-02 Unpaid Bills, BILL-06 Product Costs)',status:'done', priority:'high', agent:'Sara', repo:'Azha-ERP-Front', branch:'feature/sprint2-dashboard', effort:'M', desc:'Sortable paginated tables with skeleton loading and empty states.' },
      { task_id:'DASH-015', title:'Billing Widgets — Bar Charts (BILL-03 Revenue/Cost/Profit, BILL-04 Top Employees)', status:'done', priority:'high', agent:'Sara', repo:'Azha-ERP-Front', branch:'feature/sprint2-dashboard', effort:'M', desc:'Grouped bar chart and horizontal bar chart using ECharts with date range filters.' },
      { task_id:'DASH-016', title:'Billing Widgets — AR Aging + Monthly Sales Trend Charts (BILL-07,09)', status:'done', priority:'high', agent:'Sara', repo:'Azha-ERP-Front', branch:'feature/sprint2-dashboard', effort:'M', desc:'Stacked bar for AR aging with 90+ highlight; line chart for monthly trend.' },
      // Phase 3 — CRM
      { task_id:'DASH-017', title:'CRM — Existing Endpoint Wrappers (CRM-01 to CRM-06)',            status:'done', priority:'high',     agent:'Omar', repo:'AzhaApi',        branch:'feature/sprint2-dashboard', effort:'M', desc:'Wrapped overdue customers, debt, top customers, daily volume, profitability, balance movement.' },
      { task_id:'DASH-018', title:'CRM — New vs Returning Customers + Avg Invoice Trend Endpoints', status:'done', priority:'high',     agent:'Omar', repo:'AzhaApi',        branch:'feature/sprint2-dashboard', effort:'M', desc:'New-vs-returning (first invoice = new) and 12-month avg invoice trend. Zero-invoice months → 0.' },
      { task_id:'DASH-019', title:'CRM — Discount Impact Endpoint (CRM-09)',                        status:'done', priority:'medium',   agent:'Omar', repo:'AzhaApi',        branch:'feature/sprint2-dashboard', effort:'M', desc:'Top 10 customers by discount with highDiscountFlag when >15% of revenue.' },
      { task_id:'DASH-020', title:'CRM Widgets — Total Debt KPI Card (CRM-02)',                     status:'done', priority:'medium',   agent:'Sara', repo:'Azha-ERP-Front', branch:'feature/sprint2-dashboard', effort:'S', desc:'KPI card with zero/negative handling and skeleton state.' },
      { task_id:'DASH-021', title:'CRM Widgets — Overdue Alerts + Customer Profitability Table (CRM-01,05)',status:'done', priority:'high', agent:'Sara', repo:'Azha-ERP-Front', branch:'feature/sprint2-dashboard', effort:'M', desc:'Alert list sorted by days overdue + ranked profitability table with negative margin highlight.' },
      { task_id:'DASH-022', title:'CRM Widgets — Bar Charts (CRM-03 Top Customers, CRM-06 Balance Movement)', status:'done', priority:'high', agent:'Sara', repo:'Azha-ERP-Front', branch:'feature/sprint2-dashboard', effort:'M', desc:'Top customers horizontal bar + balance movement with positive/negative split.' },
      { task_id:'DASH-023', title:'CRM Widgets — Line Charts (CRM-04 Daily Volume, CRM-08 Avg Invoice)', status:'done', priority:'high', agent:'Sara', repo:'Azha-ERP-Front', branch:'feature/sprint2-dashboard', effort:'M', desc:'30-day daily transaction line and 12-month avg invoice trend line.' },
      { task_id:'DASH-024', title:'CRM Widgets — Donut & Discount Combo (CRM-07 New/Returning, CRM-09)', status:'done', priority:'medium', agent:'Sara', repo:'Azha-ERP-Front', branch:'feature/sprint2-dashboard', effort:'M', desc:'New vs returning donut + discount KPI + bar chart combo widget.' },
      // Phase 4 — Treasury
      { task_id:'DASH-025', title:'Treasury — Endpoint Wrappers (TREAS-01,02,03)',                  status:'done', priority:'high',     agent:'Omar', repo:'AzhaApi',        branch:'feature/sprint2-dashboard', effort:'M', desc:'Safe balances, cash flow, transaction log under /api/dashboard/treasury/ with SafesReports.View.' },
      { task_id:'DASH-026', title:'Treasury — Payment Method Breakdown Endpoint (TREAS-04)',        status:'done', priority:'medium',   agent:'Omar', repo:'AzhaApi',        branch:'feature/sprint2-dashboard', effort:'M', desc:'Payment methods breakdown with pct. Single-method and no-transaction edge cases handled.' },
      { task_id:'DASH-027', title:'Treasury Widgets — Cash Balances KPI Grid + Transaction Log Table', status:'done', priority:'high', agent:'Sara', repo:'Azha-ERP-Front', branch:'feature/sprint2-dashboard', effort:'M', desc:'Grid of KPI cards per safe + paginated sortable transaction log with filters.' },
      { task_id:'DASH-028', title:'Treasury Widgets — Cash Flow Chart + Payment Method Donut',     status:'done', priority:'medium',   agent:'Sara', repo:'Azha-ERP-Front', branch:'feature/sprint2-dashboard', effort:'M', desc:'Grouped bar chart by safe + payment method donut with legend.' },
      // Phase 5 — Inventory
      { task_id:'DASH-029', title:'Inventory — Existing Endpoint Wrappers (INV-01 to INV-04)',     status:'done', priority:'high',     agent:'Omar', repo:'AzhaApi',        branch:'feature/sprint2-dashboard', effort:'M', desc:'Low stock alerts, SKU count, stock value, full inventory table with server-side pagination.' },
      { task_id:'DASH-030', title:'Inventory — Dead Stock + Turnover Ratio Endpoints (INV-05,06)', status:'done', priority:'high',     agent:'Omar', repo:'AzhaApi',        branch:'feature/sprint2-dashboard', effort:'M', desc:'90-day dead stock detection + turnover ratio with prior/trend. Zero-inventory edge case handled.' },
      { task_id:'DASH-031', title:'Inventory Widgets — Alert Cards (INV-01,02,05,06)',             status:'done', priority:'high',     agent:'Sara', repo:'Azha-ERP-Front', branch:'feature/sprint2-dashboard', effort:'M', desc:'Low stock alerts (auto-refresh 5min), total SKUs KPI, dead stock alerts, turnover KPI.' },
      { task_id:'DASH-032', title:'Inventory Widgets — Stock Value Chart + Full Inventory Table (INV-03,04)', status:'done', priority:'high', agent:'Sara', repo:'Azha-ERP-Front', branch:'feature/sprint2-dashboard', effort:'M', desc:'Top 15 horizontal bar + searchable sortable server-paginated inventory table.' },
      // Phase 6 — Finance/Accounting
      { task_id:'DASH-033', title:'Finance — Existing Endpoint Wrappers (FIN-01 to FIN-05)',       status:'done', priority:'high',     agent:'Omar', repo:'AzhaApi',        branch:'feature/sprint2-dashboard', effort:'L', desc:'Net income KPIs, revenue/expense trend, balance sheet, cash flow summary, trial balance table.' },
      { task_id:'DASH-034', title:'Finance — AP Aging + Revenue by Category + Working Capital Endpoints', status:'done', priority:'high', agent:'Omar', repo:'AzhaApi', branch:'feature/sprint2-dashboard', effort:'M', desc:'AP aging (same bucket structure as AR), revenue by category with Other fallback, working capital trend.' },
      { task_id:'DASH-035', title:'Finance Widgets — Net Income KPIs + Cash Flow + Working Capital (FIN-01,04,08)', status:'done', priority:'high', agent:'Sara', repo:'Azha-ERP-Front', branch:'feature/sprint2-dashboard', effort:'M', desc:'3-card net income row, 3-card cash flow, working capital KPI with null/negative handling.' },
      { task_id:'DASH-036', title:'Finance Widgets — Revenue/Expense Trend + Revenue by Category Donut (FIN-02,07)', status:'done', priority:'high', agent:'Sara', repo:'Azha-ERP-Front', branch:'feature/sprint2-dashboard', effort:'M', desc:'Dual-line chart with crossing highlight + donut with Other segment.' },
      { task_id:'DASH-037', title:'Finance Widgets — Balance Sheet Accordion (FIN-03)',            status:'done', priority:'high',     agent:'Sara', repo:'Azha-ERP-Front', branch:'feature/sprint2-dashboard', effort:'M', desc:'3-section accordion (Assets/Liabilities/Equity) + donut ratio + unbalanced warning badge.' },
      { task_id:'DASH-038', title:'Finance Widgets — Trial Balance Table + PDF/Excel Export (FIN-05)', status:'done', priority:'high', agent:'Sara', repo:'Azha-ERP-Front', branch:'feature/sprint2-dashboard', effort:'L', desc:'Sortable table with totals row, date range filter, server-side PDF/Excel export via Omar endpoint.' },
      { task_id:'DASH-039', title:'Finance Widgets — AP Aging Chart (FIN-06)',                    status:'done', priority:'medium',   agent:'Sara', repo:'Azha-ERP-Front', branch:'feature/sprint2-dashboard', effort:'S', desc:'Stacked bar chart mirroring AR Aging design. 90+ bucket highlighted red when largest.' },
      // Phase 7 — Admin (PO widgets removed per Maghraby decision 2026-03-24)
      { task_id:'DASH-040', title:'Admin — Active Users + Role Overview Endpoints (ADM-01,02)',    status:'done', priority:'high',     agent:'Omar', repo:'AzhaApi',        branch:'feature/sprint2-dashboard', effort:'M', desc:'Active users last 30 days (Role.View) and full role table (Role.View + SystemUserPermission.View).' },
      { task_id:'DASH-041', title:'Admin Widgets — Active Users KPI + Role & Permission Table (ADM-01,02)', status:'done', priority:'high', agent:'Sara', repo:'Azha-ERP-Front', branch:'feature/sprint2-dashboard', effort:'M', desc:'KPI card with comma formatting + role table with permission count badge and 0-user amber badge.' },
      // Phase 8 — QA & Polish
      { task_id:'DASH-042', title:'E2E Permission Boundary Tests',                                 status:'done', priority:'high',     agent:'Omar', repo:'AzhaApi',        branch:'feature/sprint2-dashboard', effort:'L', desc:'Per-permission test users. Zero perms → blank canvas. All perms → all widgets. API 403 checks.' },
      { task_id:'DASH-043', title:'Layout Persistence Integration Tests',                         status:'done', priority:'medium',   agent:'Omar', repo:'AzhaApi',        branch:'feature/sprint2-dashboard', effort:'M', desc:'Save/reload layout, revoked-permission widget cleanup, admin default vs user custom layout.' },
      { task_id:'DASH-044', title:'Performance Testing — Dashboard Load ≤2s Target',             status:'done', priority:'high',     agent:'Sara', repo:'Azha-ERP-Front', branch:'feature/sprint2-dashboard', effort:'M', desc:'Lighthouse CI, lazy-loading validation, tier-1/2/3 loading waterfall verified.' },
      { task_id:'DASH-045', title:'Empty States & Error States QA — all 42 widgets',             status:'done', priority:'high',     agent:'Sara', repo:'Azha-ERP-Front', branch:'feature/sprint2-dashboard', effort:'M', desc:'QA pass: empty data, API error, skeleton state. No blank white boxes. Access-Removed mid-session.' },
      { task_id:'DASH-046', title:'i18n / Arabic Translation Keys — full dashboard',             status:'done', priority:'high',     agent:'Sara', repo:'Azha-ERP-Front', branch:'feature/sprint2-dashboard', effort:'M', desc:'All strings use i18n keys. Arabic RTL tested. dashboard.noAccess key verified.' },
      { task_id:'DASH-047', title:'ECharts migration — replace Chart.js with vue-echarts v5',   status:'done', priority:'high',     agent:'Sara', repo:'Azha-ERP-Front', branch:'feature/sprint2-dashboard', effort:'M', desc:'Full migration from Chart.js to vue-echarts v5 across all dashboard widgets.' },
    ];

    for (const t of sprint2Tasks) {
      await client.query(
        `INSERT INTO tasks (task_id,title,description,status,priority,agent_id,sprint_id,repo,branch,effort,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'2026-03-24T00:00:00Z','2026-03-24T18:00:00Z')`,
        [t.task_id, t.title, t.desc, t.status, t.priority, agentMap[t.agent], s2, t.repo, t.branch, t.effort||null]
      );
    }

    // ── STANDUPS ───────────────────────────────────────────────────────────
    await client.query(`
      INSERT INTO standups (summary, blockers_count, tasks_reviewed, created_at) VALUES
      (
        'Sprint 1 kickoff standup. Team aligned on critical bugs. Omar tackling stock deduction (T-001) and interface mismatch (T-002). Sara on auth guard (T-003) and Arabic i18n (T-004). Tarek on hardcoded JWT (T-005), auth bypass (T-006), and pubspec.lock (T-007). No hard blockers. PR #7 from Maghraby open for review.',
        0, 7, '2026-03-23T01:42:00Z'
      ),
      (
        'Sprint 1 mid-sprint. T-011 (console.logs) and T-012 (axios upgrade) done. T-016 (sub-product reactivity) in review as PR #6 — Nader flagged 9 issues, Sara acknowledged and committed to higher quality standards. Branch policy update: dev is now the target for all PRs. No hard blockers on active tasks.',
        1, 10, '2026-03-23T12:00:00Z'
      ),
      (
        'Sprint 1 complete. T-001 through T-017 all merged to dev. Nader audit done — 40+ issues found and fixed across all repos. CORS locked, HTTPS enforced, Swagger removed from prod, hardcoded JWT replaced, auth guard added. Clean sprint. No open blockers.',
        0, 17, '2026-03-24T00:00:00Z'
      ),
      (
        'Sprint 2 kickoff. PRD-DASH-001 approved by Maghraby. Kareem broke down 50 tasks across 8 phases. Maghraby resolved all 7 blockers: PO widgets removed from scope, zero-invoice months show 0 (no gap), chart library → Sara to check existing and align (ECharts chosen), trial balance export is server-side (Omar), dead stock threshold fixed at 90 days, RTL-first confirmed. Sprint 2 starts now.',
        0, 0, '2026-03-24T06:40:00Z'
      ),
      (
        'Sprint 2 complete. All backend endpoints (DASH-001 to DASH-003, DASH-009 to DASH-019, DASH-025 to DASH-026, DASH-029 to DASH-030, DASH-033 to DASH-034, DASH-040) merged to feature/sprint2-dashboard. All frontend widgets (DASH-004 to DASH-008, DASH-013 to DASH-016, DASH-020 to DASH-024, DASH-027 to DASH-028, DASH-031 to DASH-032, DASH-035 to DASH-039, DASH-041 to DASH-047) complete. Nader reviewed everything — clean, no blockers. ECharts migration done. 42 widgets across 6 modules. Final PRs awaiting Maghraby merge: AzhaApi PR #24 and Azha-ERP-Front PR #12.',
        0, 47, '2026-03-24T20:00:00Z'
      )
    `);

    // ── MISTAKES ───────────────────────────────────────────────────────────
    // Get task db IDs for reference
    const { rows: taskRows } = await client.query('SELECT id, task_id FROM tasks');
    const taskMap = {};
    for (const r of taskRows) taskMap[r.task_id] = r.id;

    await client.query(`
      INSERT INTO mistakes (agent_id, task_id, title, description, severity, lesson, created_at) VALUES
      ($1, $2, 'PR submitted with 9 code quality issues', 'Sara submitted PR #6 (T-016 sub-product reactivity) with 9 flagged issues: missing error handling, no loading state, hardcoded strings, no i18n keys, console.log left in, missing prop validation, no empty state, inline styles, missing unit test.', 'high', 'Always self-review against the quality checklist before submitting a PR. 9 post-submission issues is a red flag — catch them before Nader does.', '2026-03-23T10:00:00Z'),
      ($3, $4, 'Console.logs left in production build', 'Sara left 184 console.log statements in Azha-ERP-Front that were shipping to production, leaking debug info and impacting performance.', 'medium', 'Add console.log linting rule (no-console ESLint) and include a pre-commit hook to catch debug logs before they reach main.', '2026-03-23T00:00:00Z'),
      ($5, $6, 'Hardcoded JWT token in mobile source', 'Tarek had a real JWT token hardcoded in Azha_Mobile source code — committed to the repo, visible in git history. Critical security incident.', 'critical', 'Never hardcode secrets. Use environment variables, secure storage (flutter_secure_storage), or a secrets manager. Add git-secrets or truffleHog to CI pipeline.', '2026-03-23T00:00:00Z'),
      ($7, $8, 'pubspec.lock excluded from repo', 'Tarek had pubspec.lock in .gitignore for azha-desktop, making builds non-reproducible. Different machines got different dependency versions.', 'high', 'pubspec.lock must always be committed for application projects (not libraries). Lock files are for reproducible builds — never gitignore them.', '2026-03-23T00:00:00Z'),
      ($9, $10, 'AllowAnyOrigin CORS in production API', 'Omar had AllowAnyOrigin() set in AzhaApi Program.cs — CORS was fully open, allowing any domain to call the API. Should have been locked to the frontend domain from day one.', 'high', 'CORS policy must be explicitly configured to allowed origins. Never use AllowAnyOrigin in production. Review CORS config as part of every new API setup.', '2026-03-23T00:00:00Z'),
      ($11, NULL, 'Sprint 2 tech debts flagged by Nader (non-blocking)', 'Nader flagged 4 minor tech debts in Sprint 2: (1) CompanyActivityId filter not wired in receivables endpoint, (2) Working Capital trend hardcoded 0, (3) Billing controller logic spread across 5 PRs making it hard to review, (4) Arabic string literals in Working Capital component instead of i18n keys.', 'low', 'Tech debts should be logged as backlog tasks immediately. Non-blocking now does not mean ignored forever. Add to Sprint 3 backlog.', '2026-03-24T18:00:00Z')
    `, [
      agentMap['Sara'],  taskMap['T-016'],
      agentMap['Sara'],  taskMap['T-011'],
      agentMap['Tarek'], taskMap['T-005'],
      agentMap['Tarek'], taskMap['T-007'],
      agentMap['Omar'],  taskMap['T-013'],
      agentMap['Nader'],
    ]);

    // ── REPORTS ────────────────────────────────────────────────────────────
    await client.query(`
      INSERT INTO reports (title, the_ask, type, project, generated_by, agent_id, agent_name, content, created_at) VALUES
      (
        'Nader Deep Audit — All Azha Repos',
        'Full security, code quality, architecture, testing, and production readiness audit across AzhaApi, Azha-ERP-Front, Azha_Mobile, and azha-desktop.',
        'code-review',
        'Azha ERP',
        'Nader 🔍',
        $1,
        'Nader',
        'Audit completed 2026-03-23. Scope: AzhaApi (Feature-SubProducts), Azha-ERP-Front (enhancedSchoolBranch), Azha_Mobile (feature/bus-driver), azha-desktop (dev).\n\nCritical findings fixed in Sprint 1:\n- AzhaApi: AllowAnyOrigin CORS (HIGH), requireHttpsMetadata=false (HIGH), Swagger in prod (MED), no input sanitization (MED)\n- Azha-ERP-Front: No router auth guard (CRITICAL), 184 console.logs in prod, missing i18n on POS module\n- Azha_Mobile: Hardcoded JWT token (CRITICAL), auth bypass in splash screen (CRITICAL)\n- azha-desktop: Missing pubspec.lock (CRITICAL), mock data instead of real API (HIGH)\n\nAll critical and high issues resolved in Sprint 1. Full report: /phoonix-agency/reports/nader-deep-audit-2026-03-23.md',
        '2026-03-23T08:00:00Z'
      ),
      (
        'AI Report Agent for Azha ERP — Full Evaluation Report',
        'Should Phoonix build an AI-powered natural language report agent for Azha ERP? Evaluate business case, product feasibility, and technical architecture.',
        'evaluation',
        'Azha ERP — AI Report Agent',
        'Medhat 🦅',
        $2,
        'Medhat',
        'Contributors: Mona (Business), Lina (Product), Nader (Tech Lead).\nDate: 2026-03-24\n\nVerdict: ✅ BUILD IT — unanimous across all three teams.\n\nBusiness (Mona): Clear market gap in MENA ERP space. Differentiator now, table stakes in 18-24 months. Strong upsell as premium AI Reports tier. Key risks: data privacy, liability, prompt injection, LLM costs at scale.\n\nProduct (Lina): v1 scope — Arabic+English, read-only, POS/Stock/Finance/Customers modules, PDF/Excel export, full audit log. Hard prerequisite: backend-enforced permissions, never LLM-enforced.\n\nTech (Nader): Recommended architecture: LLM Tool-Calling over existing REST APIs with JWT passthrough. 4-layer permission enforcement. Stack: GPT-4o or Claude 3.5 Sonnet, Python FastAPI microservice, LangChain. Estimate: 6-10 weeks for production-ready v1.\n\nPhased roadmap: Alpha (weeks 1-3) → Hardening (weeks 4-6) → v1 GA (weeks 7-10) → v2 (+8 weeks post-GA).\n\nFull report: /phoonix-agency/reports/ai-report-agent-evaluation-2026-03-24.md',
        '2026-03-24T10:00:00Z'
      ),
      (
        'Sprint 2 Task Breakdown — SPRINT-DASH-001',
        'Break down PRD-DASH-001 (permission-based customizable dashboard) into dev tasks for Omar (backend) and Sara (frontend).',
        'sprint-plan',
        'Azha ERP — Dashboard',
        'Kareem 🗂️',
        $3,
        'Kareem',
        'Produced: 2026-03-24. Based on PRD-DASH-001 (approved).\nDevs: Omar (Backend .NET) · Sara (Frontend Vue.js 2)\n\nTotal: 47 tasks across 8 phases (PO widgets removed per Maghraby, reducing from 50 to 47).\nOmar: 21 tasks (~22.5 days). Sara: 29 tasks (~32.5 days).\n\nPhases:\n1. Foundation (DASH-001 to DASH-008) — permission gate, grid shell, widget registry, base component\n2. Billing & Sales (DASH-009 to DASH-016) — 10 widgets, BillReports.View gate\n3. CRM (DASH-017 to DASH-024) — 9 widgets, CustomerReports.View gate\n4. Treasury (DASH-025 to DASH-028) — 4 widgets, SafesReports.View gate\n5. Inventory (DASH-029 to DASH-032) — 6 widgets, StockReports.View gate\n6. Accounting (DASH-033 to DASH-039) — 8 widgets, TrialBalance.View gate\n7. Admin (DASH-040 to DASH-041) — 2 widgets (PO removed), Role.View + SystemUserPermission.View\n8. QA & Polish (DASH-042 to DASH-047) — E2E tests, perf, i18n, ECharts migration\n\nBlocker resolutions by Maghraby (2026-03-24 06:40 UTC): PO widgets removed, zero-invoice months=0, ECharts chosen, server-side trial balance export, dead stock threshold=90 days fixed, RTL-first confirmed.\n\nAll 47 tasks completed and merged. Full breakdown: /phoonix-agency/reports/SPRINT-DASH-001-task-breakdown-2026-03-24.md',
        '2026-03-24T07:00:00Z'
      ),
      (
        'Omar Backend Code Review — AzhaApi (Feature-SubProducts)',
        'Review AzhaApi backend code quality, architecture, and security on the Feature-SubProducts branch.',
        'code-review',
        'Azha ERP',
        'Nader 🔍',
        $4,
        'Nader',
        'Reviewed by Nader. Branch: Feature-SubProducts.\nFindings: CORS AllowAnyOrigin (HIGH), JWT over HTTP allowed (HIGH), Swagger in prod (MED), no input sanitization (MED), some business logic in controllers instead of services, missing unit tests on stock deduction logic.\nAll HIGH findings fixed in Sprint 1 (T-013, T-014, T-015). MED findings addressed in T-009.\nFull report: /phoonix-agency/reports/omar-AzhaApi-review.md',
        '2026-03-23T06:00:00Z'
      ),
      (
        'Sara Frontend Code Review — Azha-ERP-Front (enhancedSchoolBranch)',
        'Review Azha-ERP-Front code quality, security, and production readiness on the enhancedSchoolBranch.',
        'code-review',
        'Azha ERP',
        'Nader 🔍',
        $5,
        'Nader',
        'Reviewed by Nader. Branch: enhancedSchoolBranch.\nFindings: No router auth guard (CRITICAL), 184 console.logs in prod (MED), missing i18n on POS module (MED), sub-product reactivity bug (HIGH), PR #6 had 9 quality issues flagged.\nAll critical/high findings fixed in Sprint 1 (T-003, T-004, T-010, T-011, T-016).\nFull report: /phoonix-agency/reports/sara-Azha-ERP-Front-review.md',
        '2026-03-23T06:30:00Z'
      ),
      (
        'Tarek Mobile Code Review — Azha_Mobile + azha-desktop',
        'Review Azha_Mobile and azha-desktop code quality, security, and build reproducibility.',
        'code-review',
        'Azha ERP',
        'Nader 🔍',
        $6,
        'Nader',
        'Reviewed by Nader. Repos: Azha_Mobile (feature/bus-driver), azha-desktop (dev).\nFindings: Hardcoded JWT token in Azha_Mobile (CRITICAL), auth bypass in splash screen (CRITICAL), pubspec.lock missing in azha-desktop (CRITICAL), mock data instead of real API in azha-desktop (HIGH).\nAll critical findings fixed in Sprint 1 (T-005, T-006, T-007, T-008).\nFull report: /phoonix-agency/reports/tarek-mobile-review.md',
        '2026-03-23T07:00:00Z'
      ),
      (
        'Sprint 2 Daily Standup Report — 2026-03-23',
        'Daily standup for Sprint 1 (used as baseline before Sprint 2 kickoff).',
        'standup',
        'Azha ERP',
        'Kareem 🗂️',
        $7,
        'Kareem',
        'Date: 2026-03-23. Sprint 1.\nDone: T-011 (console.logs), T-012 (axios upgrade). PR #7 opened by Maghraby (enhancedSchoolBranch → dev, 4 commits).\nIn Progress: T-001 (Omar), T-003 (Sara), T-005 (Tarek), T-007 (Tarek), T-016 (Sara — PR #6 in review).\nIn Review: PR #6 (T-016) — Nader flagged 9 issues, Sara acknowledged, committed to higher standards.\nBlockers: PR #6 waiting on Maghraby merge decision. No hard dev blockers.\nNote: Branch policy updated — dev is now target for all PRs.\nFull report: /phoonix-agency/reports/standup-2026-03-23.md',
        '2026-03-23T12:00:00Z'
      )
    `, [
      agentMap['Nader'],
      agentMap['Medhat'],
      agentMap['Kareem'],
      agentMap['Nader'],
      agentMap['Nader'],
      agentMap['Nader'],
      agentMap['Kareem'],
    ]);

    // ── ACTIVITY LOG ───────────────────────────────────────────────────────
    const activities = [
      { agent: 'Omar',  action: 'task_created',  detail: 'Created T-001: Fix double stock deduction bug in DeductStock', task: 'T-001', ts: '2026-03-23T00:30:00Z' },
      { agent: 'Sara',  action: 'task_created',  detail: 'Created T-003: Add router auth guard to Azha-ERP-Front',       task: 'T-003', ts: '2026-03-23T00:35:00Z' },
      { agent: 'Tarek', action: 'task_created',  detail: 'Created T-005: Replace hardcoded JWT token in Azha_Mobile',    task: 'T-005', ts: '2026-03-23T00:40:00Z' },
      { agent: 'Sara',  action: 'task_updated',  detail: 'T-011 moved to done',                                          task: 'T-011', ts: '2026-03-23T09:00:00Z' },
      { agent: 'Sara',  action: 'task_updated',  detail: 'T-012 moved to done',                                          task: 'T-012', ts: '2026-03-23T09:30:00Z' },
      { agent: 'Sara',  action: 'mistake_logged','detail': 'PR #6 submitted with 9 code quality issues',                 task: 'T-016', ts: '2026-03-23T10:00:00Z' },
      { agent: 'Nader', action: 'task_updated',  detail: 'T-017 code review complete — all repos audited',               task: 'T-017', ts: '2026-03-23T20:00:00Z' },
      { agent: 'Omar',  action: 'task_updated',  detail: 'T-001 moved to done — double stock deduction fixed',           task: 'T-001', ts: '2026-03-24T00:00:00Z' },
      { agent: 'Sara',  action: 'task_updated',  detail: 'T-003 moved to done — auth guard implemented',                 task: 'T-003', ts: '2026-03-24T00:30:00Z' },
      { agent: 'Tarek', action: 'task_updated',  detail: 'T-005 moved to done — hardcoded JWT replaced',                 task: 'T-005', ts: '2026-03-24T01:00:00Z' },
      { agent: 'Omar',  action: 'task_created',  detail: 'Created DASH-001: Permission-Check Endpoint',                  task: 'DASH-001', ts: '2026-03-24T07:00:00Z' },
      { agent: 'Sara',  action: 'task_created',  detail: 'Created DASH-004: Dashboard Shell Permission Gate',            task: 'DASH-004', ts: '2026-03-24T07:05:00Z' },
      { agent: 'Omar',  action: 'task_updated',  detail: 'DASH-001 done — permissions endpoint merged',                  task: 'DASH-001', ts: '2026-03-24T10:00:00Z' },
      { agent: 'Sara',  action: 'task_updated',  detail: 'DASH-018 done — ECharts migration complete',                   task: 'DASH-047', ts: '2026-03-24T14:00:00Z' },
      { agent: 'Nader', action: 'task_updated',  detail: 'Sprint 2 code review complete — all 47 tasks clean, no blockers. 4 tech debts noted (non-blocking).', task: null, ts: '2026-03-24T18:00:00Z' },
      { agent: 'Omar',  action: 'task_updated',  detail: 'AzhaApi PR #24 opened (feature/sprint2-dashboard → dev) — awaiting Maghraby approval', task: null, ts: '2026-03-24T19:00:00Z' },
      { agent: 'Sara',  action: 'task_updated',  detail: 'Azha-ERP-Front PR #12 opened (feature/sprint2-dashboard → dev) — awaiting Maghraby approval', task: null, ts: '2026-03-24T19:30:00Z' },
    ];

    for (const a of activities) {
      await client.query(
        'INSERT INTO activity_log (agent_id, action, detail, task_id, created_at) VALUES ($1,$2,$3,$4,$5)',
        [agentMap[a.agent], a.action, a.detail, a.task ? taskMap[a.task] || null : null, a.ts]
      );
    }

    await client.query('COMMIT');
    console.log('✅ Migration + seed complete!');
    console.log('   Agents:', agents.length);
    console.log('   Sprints: 2 (Sprint 1 + Sprint 2)');
    console.log('   Tasks:', sprint1Tasks.length + sprint2Tasks.length, '(T-001 to T-017 + DASH-001 to DASH-047)');
    console.log('   Standups: 5');
    console.log('   Mistakes: 6');
    console.log('   Reports: 7');
    console.log('   Activity log entries:', activities.length);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
