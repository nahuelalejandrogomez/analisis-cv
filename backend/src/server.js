require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const routes = require('./routes');
const authRoutes = require('./routes/authRoutes');
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Run migrations on startup
async function runMigrations() {
  try {
    console.log('Running database migrations...');
    const migrationPath = path.join(__dirname, 'migrations', '001_create_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    await db.query(migrationSQL);
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error.message);
    // Don't exit - table might already exist
  }
}

runMigrations();

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  /\.railway\.app$/  // Allow all Railway subdomains
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);

    // Check if origin matches allowed origins
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now in production
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/auth', authRoutes);  // Auth routes en /auth (no /api/auth)
app.use('/api', routes);        // API routes en /api

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
