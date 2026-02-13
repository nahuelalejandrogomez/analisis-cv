require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigrations() {
  console.log('Starting database migrations...');

  try {
    // Run all SQL migrations in order
    const migrations = [
      '001_create_tables.sql',
      '002_add_cv_metadata.sql',
      '002_fix_no_cv_evaluations.sql'
    ];

    for (const migrationFile of migrations) {
      const migrationPath = path.join(__dirname, migrationFile);
      
      // Skip if file doesn't exist
      if (!fs.existsSync(migrationPath)) {
        console.log(`Skipping ${migrationFile} - file not found`);
        continue;
      }

      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      try {
        await pool.query(migrationSQL);
        console.log(`✓ Migration ${migrationFile} completed successfully`);
      } catch (error) {
        // If error is "column already exists", it's safe to continue
        if (error.message.includes('already exists')) {
          console.log(`⚠ Migration ${migrationFile} - columns already exist, skipping`);
        } else {
          throw error;
        }
      }
    }

    // Run users table migration
    console.log('[Migration] Creating users table...');
    const usersModule = require('./004_create_users.js');
    await usersModule.run(pool);

    // Seed admin user
    await seedAdminUser();

    console.log('All migrations completed!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function seedAdminUser() {
  console.log('[Seed] Checking admin user...');

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.warn('[Seed] WARNING: ADMIN_EMAIL or ADMIN_PASSWORD not set. Skipping admin seed.');
    console.warn('[Seed] Set these environment variables to create the admin user.');
    return;
  }

  const normalizedEmail = adminEmail.toLowerCase().trim();

  // Check if admin exists
  const checkResult = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [normalizedEmail]
  );

  if (checkResult.rows.length > 0) {
    console.log(`[Seed] Admin user already exists: ${normalizedEmail}`);
    return;
  }

  // Create admin user
  const bcrypt = require('bcryptjs');
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await pool.query(
    `INSERT INTO users (email, password_hash, name, role, is_active)
     VALUES ($1, $2, $3, $4, $5)`,
    [normalizedEmail, passwordHash, 'Administrator', 'administrator', true]
  );

  console.log(`[Seed] ✓ Admin user created: ${normalizedEmail}`);
}

runMigrations();
