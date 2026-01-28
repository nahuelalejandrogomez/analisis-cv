const db = require('../config/database');

/**
 * POST /api/migrations/run
 * Run pending database migrations
 * TEMPORARY ENDPOINT - Remove after use
 */
async function runMigrations(req, res, next) {
  try {
    console.log('Running database migrations...');

    // Migration 002: Add CV metadata columns
    const migration002 = `
      ALTER TABLE evaluations 
        ADD COLUMN IF NOT EXISTS cv_file_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS cv_file_url TEXT,
        ADD COLUMN IF NOT EXISTS cv_file_size INTEGER,
        ADD COLUMN IF NOT EXISTS cv_extraction_method VARCHAR(50);
    `;

    await db.query(migration002);
    console.log('✓ Migration 002: CV metadata columns added');

    res.json({
      success: true,
      message: 'Migrations completed successfully',
      migrations: ['002_add_cv_metadata']
    });
  } catch (error) {
    console.error('Migration error:', error.message);
    
    // If columns already exist, it's ok
    if (error.message.includes('already exists')) {
      return res.json({
        success: true,
        message: 'Migrations already applied',
        note: 'Columns already exist'
      });
    }

    next(error);
  }
}

module.exports = {
  runMigrations
};
