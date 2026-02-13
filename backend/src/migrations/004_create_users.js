const { Pool } = require('pg');

const UP = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'recruiter'
      CHECK (role IN ('administrator', 'recruiter')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
`;

async function run(pool) {
  console.log('[Migration 004] Creating users table...');
  
  // If pool is not provided, create a temporary one
  let tempPool = null;
  if (!pool) {
    tempPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    pool = tempPool;
  }

  await pool.query(UP);
  console.log('[Migration 004] Users table created successfully.');

  if (tempPool) {
    await tempPool.end();
  }
}

module.exports = { run };
