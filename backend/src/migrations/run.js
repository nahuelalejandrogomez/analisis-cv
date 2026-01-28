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
    // Run all migrations in order
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

    console.log('All migrations completed!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
