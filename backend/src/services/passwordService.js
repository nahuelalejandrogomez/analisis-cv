const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

// Common passwords blocklist
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password!', 'pass1234', 'passw0rd',
  'qwerty12', 'qwerty123', '12345678', '123456789', '1234567890',
  'admin123', 'welcome1', 'letmein1', 'changeme', 'master12',
  'dragon12', 'monkey12', 'shadow12', 'sunshine', 'princess',
  'football', 'charlie1', 'access12', 'trustno1', 'iloveyou',
  'batman12', 'starwars', 'abc12345', '1q2w3e4r', 'qwertyui',
  'asdfghjk', 'zxcvbnm1', 'administrator',
]);

function validatePasswordStrength(password) {
  const errors = [];

  if (!password || password.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres.');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Debe contener al menos 1 letra mayúscula.');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Debe contener al menos 1 letra minúscula.');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Debe contener al menos 1 número.');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Debe contener al menos 1 símbolo especial.');
  }

  if (password && COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('Esta contraseña es demasiado común. Elige otra.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

module.exports = {
  validatePasswordStrength,
  hashPassword,
  comparePassword,
};
