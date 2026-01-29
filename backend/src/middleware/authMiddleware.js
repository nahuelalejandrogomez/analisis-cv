const { jwtService } = require('../services/jwtService');

/**
 * Middleware de autenticación
 * Verifica que el request tenga un token JWT válido
 */
function authMiddleware(req, res, next) {
  try {
    // Obtener token del header Authorization: Bearer <token>
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      console.log('[Auth] No se encontró token en el request');
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    // Verificar token
    const decoded = jwtService.verifyToken(token);
    if (!decoded) {
      console.log('[Auth] Token inválido o expirado');
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    // Adjuntar usuario al request para uso en controladores
    req.user = decoded;
    next();
  } catch (error) {
    console.error('[Auth] Error en middleware:', error.message);
    return res.status(500).json({ error: 'Error verificando autenticación' });
  }
}

/**
 * Middleware opcional de autenticación
 * Adjunta usuario si hay token válido, pero no bloquea si no hay
 */
function optionalAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (token) {
      const decoded = jwtService.verifyToken(token);
      if (decoded) {
        req.user = decoded;
      }
    }

    next();
  } catch (error) {
    // Ignorar errores, continuar sin usuario
    next();
  }
}

module.exports = { authMiddleware, optionalAuthMiddleware };
