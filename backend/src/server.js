require('dotenv').config();

const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 5000;

// Run migrations on startup
async function runMigrations() {
  console.log('[Server] Checking and running migrations...');
  try {
    const { stdout, stderr } = await execAsync('node src/migrations/run.js', {
      cwd: __dirname + '/..',
      env: process.env
    });
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    console.log('[Server] Migrations completed successfully');
  } catch (error) {
    console.error('[Server] Migration error:', error.message);
    // Don't exit, let the server start anyway
  }
}

// CORS configuration - Allow Railway domains
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    // Allow localhost
    if (origin.includes('localhost')) return callback(null, true);
    
    // Allow any Railway subdomain
    if (origin.endsWith('.railway.app')) return callback(null, true);
    
    // Allow specific FRONTEND_URL if set
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }
    
    console.warn(`[CORS] Blocked origin: ${origin}`);
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

// Handle OPTIONS preflight explicitly
app.options('*', (req, res) => {
  res.status(200).end();
});

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('[Server] Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Run migrations before starting server
runMigrations().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Running on port ${PORT}`);
  });
}).catch(err => {
  console.error('[Server] Failed to run migrations:', err);
  // Start server anyway
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Running on port ${PORT} (migrations may have failed)`);
  });
});
