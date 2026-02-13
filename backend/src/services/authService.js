const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY = '8h';
const TOKEN_EXPIRY_REMEMBER = '30d';

function getSecret() {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return JWT_SECRET;
}

function generateToken(user, rememberMe = false) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, getSecret(), {
    expiresIn: rememberMe ? TOKEN_EXPIRY_REMEMBER : TOKEN_EXPIRY,
  });
}

function verifyToken(token) {
  return jwt.verify(token, getSecret());
}

module.exports = {
  generateToken,
  verifyToken,
};
