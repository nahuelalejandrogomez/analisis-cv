require('dotenv').config();

const db = require('../config/database');
const bcrypt = require('bcryptjs');

const migrations = [
  require('./004_create_users'),
];

async function seedAdmin() {
  const existing = await db.query(
    "SELECT id FROM users WHERE role = 'administrator' LIMIT 1"
  );

  if (existing.rows.length > 0) {
    console.log('[Seed] Administrator already exists, skipping seed.');
    return;
  }

  const email = (process.env.ADMIN_EMAIL || 'admin@redb.ee').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    console.warn('[Seed] ADMIN_PASSWORD not set. Skipping admin seed.');
    console.warn('[Seed] Set ADMIN_PASSWORD in .env to create the first administrator.');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.query(
    `INSERT INTO users (email, password_hash, name, role, is_active)
     VALUES ($1, $2, $3, 'administrator', true)
     ON CONFLICT (email) DO NOTHING`,
    [email, passwordHash, 'Administrador']
  );

  console.log(`[Seed] Administrator created: ${email}`);
}

async function runMigrations() {
  console.log('[Migrations] Starting...');

  // Ensure evaluations table exists (original schema)
  await db.query(`
    CREATE TABLE IF NOT EXISTS evaluations (
      id SERIAL PRIMARY KEY,
      job_id VARCHAR(255) NOT NULL,
      job_title VARCHAR(500),
      candidate_id VARCHAR(255) NOT NULL,
      candidate_name VARCHAR(500),
      candidate_email VARCHAR(255),
      evaluation_status VARCHAR(20) NOT NULL,
      reasoning TEXT,
      cv_text TEXT,
      cv_file_name VARCHAR(500),
      cv_file_url TEXT,
      cv_file_size INTEGER,
      cv_extraction_method VARCHAR(50),
      evaluated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(job_id, candidate_id)
    );
  `);
  console.log('[Migrations] Evaluations table ensured.');

  for (const migration of migrations) {
    await migration.run();
  }

  await seedAdmin();

  console.log('[Migrations] All migrations completed.');
}

runMigrations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[Migrations] Error:', err.message);
    process.exit(1);
  });
