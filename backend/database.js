const { Pool } = require('pg');

const pool = new Pool({
  user: 'agencyuser',
  host: 'localhost',
  database: 'agencydb',
  password: 'phoonix2026',
  port: 5432,
});

// Helper to mimic better-sqlite3's synchronous-style API
// We export a db object that server.js can use with async/await via `.query()`
// PLUS a thin sync-style wrapper for migration compatibility via `.prepare(sql).get/all/run()`
// Since server.js uses the sync API, we'll rewrite server.js to use async pg directly.
// This module simply exports the pool.

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

module.exports = pool;
