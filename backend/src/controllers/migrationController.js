const db = require('../config/database');

/**
 * POST /api/migrations/run
 * Run pending database migrations
 * TEMPORARY ENDPOINT - Remove after use
 */
async function runMigrations(req, res, next) {
  try {
    console.log('Running database migrations...');
    const results = [];

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
    results.push('002_add_cv_metadata');

    // Migration 003: Fix evaluations without CV (update to ERROR status)
    const migration003 = `
      UPDATE evaluations
      SET 
        evaluation_status = 'ERROR',
        reasoning = 'CV no disponible o contenido insuficiente para evaluar'
      WHERE 
        (cv_extraction_method IN ('no_extraction', 'extraction_failed', 'insufficient_content', 'error')
        OR cv_text IS NULL 
        OR LENGTH(TRIM(cv_text)) < 100)
        AND evaluation_status != 'ERROR';
    `;

    const result003 = await db.query(migration003);
    console.log(`✓ Migration 003: Fixed ${result003.rowCount} evaluations without CV`);
    results.push(`003_fix_no_cv_evaluations (${result003.rowCount} rows updated)`);

    res.json({
      success: true,
      message: 'Migrations completed successfully',
      migrations: results
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
