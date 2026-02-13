const authService = require('../services/authService');
const db = require('../config/database');

function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticación requerido.' });
  }

  const token = header.slice(7);

  try {
    const decoded = authService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Sesión expirada. Inicia sesión nuevamente.' });
    }
    return res.status(401).json({ error: 'Token inválido.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción.' });
    }

    next();
  };
}

function validateRedbeeEmail(email) {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return normalized.endsWith('@redb.ee');
}

module.exports = {
  authenticate,
  requireRole,
  validateRedbeeEmail,
};
