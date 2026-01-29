const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRY = '7d'; // Token válido por 7 días

const jwtService = {
  /**
   * Genera un JWT token para el usuario
   */
  generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    console.log(`[JWT] Token generado para: ${user.email}`);

    return token;
  },

  /**
   * Verifica y decodifica un token JWT
   * Retorna el payload si es válido, null si no
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        console.log('[JWT] Token expirado');
      } else if (error.name === 'JsonWebTokenError') {
        console.log('[JWT] Token inválido:', error.message);
      }
      return null;
    }
  },

  /**
   * Decodifica un token sin verificar (solo para debug)
   */
  decodeToken(token) {
    return jwt.decode(token);
  },
};

module.exports = { jwtService };
