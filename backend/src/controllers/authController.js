const db = require('../config/database');
const authService = require('../services/authService');
const passwordService = require('../services/passwordService');
const { validateRedbeeEmail } = require('../middleware/auth');

async function login(req, res) {
  try {
    const { email, password, rememberMe } = req.body;

    // Validation
    if (!email || !password) {
      console.log('[Auth] Login validation failed: missing credentials');
      return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`[Auth] Login attempt for: ${normalizedEmail.replace(/(.{2}).*(@.*)/, '$1***$2')}`);

    if (!validateRedbeeEmail(normalizedEmail)) {
      console.log('[Auth] Login rejected: invalid domain');
      return res.status(400).json({ error: 'Solo se permiten emails con dominio @redb.ee.' });
    }

    // Database lookup
    let result;
    try {
      result = await db.query(
        'SELECT id, email, password_hash, name, role, is_active FROM users WHERE email = $1',
        [normalizedEmail]
      );
      console.log(`[Auth] DB query completed, found ${result.rows.length} users`);
    } catch (dbErr) {
      console.error('[Auth] DB query error:', dbErr.message);
      throw dbErr;
    }

    if (result.rows.length === 0) {
      console.log('[Auth] Login failed: user not found');
      return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      console.log(`[Auth] Login rejected: user inactive (id: ${user.id})`);
      return res.status(403).json({ error: 'Tu cuenta está desactivada. Contacta al administrador.' });
    }

    // Password verification
    let validPassword;
    try {
      validPassword = await passwordService.comparePassword(password, user.password_hash);
      console.log(`[Auth] Password verification completed: ${validPassword ? 'valid' : 'invalid'}`);
    } catch (bcryptErr) {
      console.error('[Auth] Password comparison error:', bcryptErr.message);
      throw bcryptErr;
    }

    if (!validPassword) {
      console.log('[Auth] Login failed: invalid password');
      return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
    }

    // Token generation
    let token;
    try {
      token = authService.generateToken(user, rememberMe === true);
      console.log(`[Auth] Token generated successfully for user id: ${user.id}`);
    } catch (tokenErr) {
      console.error('[Auth] Token generation error:', tokenErr.message);
      throw tokenErr;
    }

    console.log(`[Auth] Login successful for user: ${user.email}`);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    console.error('[Auth] Stack:', err.stack);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

async function getMe(req, res) {
  try {
    const result = await db.query(
      'SELECT id, email, name, role, is_active FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Tu cuenta está desactivada.' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('[Auth] GetMe error:', err.message);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

module.exports = {
  login,
  getMe,
};
