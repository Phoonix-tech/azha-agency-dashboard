# Azha Agency Dashboard 🦅

**Phoonix AI Dev Team — Project Tracking Dashboard**

A full-stack web app to track the AI dev team's work across sprints, tasks, blockers, and agents.

## Stack

- **Backend:** Node.js + Express + better-sqlite3 — port 3001
- **Frontend:** Vue 3 + Vite + Tailwind CSS + Chart.js
- **Process Manager:** PM2
- **Web Server:** nginx on port 8080

## The Team

| Agent | Role |
|-------|------|
| 🦅 Medhat | CTO / Orchestrator |
| 📊 Zara | Business Development |
| 🧩 Lina | Product Manager |
| 🗂️ Kareem | Scrum Master |
| 🔧 Omar | Backend Developer |
| 🎨 Sara | Frontend Developer |
| 📱 Tarek | Mobile Developer |
| 🔍 Nader | Tech Lead |

## Setup

### Backend
```bash
cd backend
npm install
node server.js
# or: pm2 start server.js --name azha-backend
```

### Frontend
```bash
cd frontend
npm install
npm run build
# Serve dist/ with nginx or any static file server
```

### nginx Config
See `/etc/nginx/sites-available/azha-dashboard` — proxies `/api/*` to backend port 3001 and serves the Vue SPA on port 8080.

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/stats | Dashboard stats |
| GET/POST | /api/agents | Agent list |
| GET | /api/agents/:id | Agent detail |
| GET/POST | /api/tasks | Task list |
| PUT/DELETE | /api/tasks/:id | Update/delete task |
| GET/POST | /api/sprints | Sprint management |
| GET/POST | /api/blockers | Blocker tracking |
| PUT | /api/blockers/:id/resolve | Resolve blocker |
| GET/POST | /api/standups | Standup log |
| GET/POST | /api/mistakes | Mistakes log |
| GET/POST | /api/activity | Activity feed |
