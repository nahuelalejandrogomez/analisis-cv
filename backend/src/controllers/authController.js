const db = require('../config/database');
const authService = require('../services/authService');
const passwordService = require('../services/passwordService');
const { validateRedbeeEmail } = require('../middleware/auth');

async function login(req, res) {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!validateRedbeeEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Solo se permiten emails con dominio @redb.ee.' });
    }

    const result = await db.query(
      'SELECT id, email, password_hash, name, role, is_active FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Tu cuenta está desactivada. Contacta al administrador.' });
    }

    const validPassword = await passwordService.comparePassword(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
    }

    const token = authService.generateToken(user, rememberMe === true);

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
