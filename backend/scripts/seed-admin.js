require('dotenv').config();

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function seedAdmin() {
  console.log('========================================');
  console.log('  Admin User Seed Script');
  console.log('========================================');
  console.log('');

  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error('❌ ERROR: ADMIN_EMAIL or ADMIN_PASSWORD not set in environment variables.');
      console.error('');
      console.error('Set them in Railway:');
      console.error('  ADMIN_EMAIL=admin@redb.ee');
      console.error('  ADMIN_PASSWORD=your_secure_password');
      process.exit(1);
    }

    const normalizedEmail = adminEmail.toLowerCase().trim();
    console.log(`📧 Admin email: ${normalizedEmail}`);
    console.log('');

    // Check if users table exists
    console.log('[1/4] Checking users table...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.error('❌ ERROR: users table does not exist!');
      console.error('Run migrations first: npm run migrate');
      process.exit(1);
    }
    console.log('✓ Users table exists');
    console.log('');

    // Check if admin exists
    console.log('[2/4] Checking if admin user exists...');
    const checkResult = await pool.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (checkResult.rows.length > 0) {
      console.log('⚠️  Admin user already exists:');
      console.log(`   ID: ${checkResult.rows[0].id}`);
      console.log(`   Email: ${checkResult.rows[0].email}`);
      console.log(`   Role: ${checkResult.rows[0].role}`);
      console.log('');
      console.log('If you need to reset the password, delete the user first:');
      console.log(`   DELETE FROM users WHERE email = '${normalizedEmail}';`);
      process.exit(0);
    }
    console.log('✓ Admin user does not exist, will create');
    console.log('');

    // Hash password
    console.log('[3/4] Hashing password...');
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    console.log('✓ Password hashed with bcrypt (12 rounds)');
    console.log('');

    // Create admin user
    console.log('[4/4] Creating admin user...');
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, role`,
      [normalizedEmail, passwordHash, 'Administrator', 'administrator', true]
    );

    console.log('✓ Admin user created successfully!');
    console.log('');
    console.log('User details:');
    console.log(`   ID: ${result.rows[0].id}`);
    console.log(`   Email: ${result.rows[0].email}`);
    console.log(`   Name: ${result.rows[0].name}`);
    console.log(`   Role: ${result.rows[0].role}`);
    console.log('');
    console.log('========================================');
    console.log('You can now login with these credentials!');
    console.log('========================================');

  } catch (error) {
    console.error('');
    console.error('❌ ERROR:', error.message);
    console.error('');
    console.error('Stack trace:');
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedAdmin();
