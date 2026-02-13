const db = require('../config/database');
const passwordService = require('../services/passwordService');
const { validateRedbeeEmail } = require('../middleware/auth');

async function getUsers(req, res) {
  try {
    const result = await db.query(
      'SELECT id, email, name, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error('[Users] GetUsers error:', err.message);
    res.status(500).json({ error: 'Error al obtener usuarios.' });
  }
}

async function createUser(req, res) {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, nombre y contraseña son requeridos.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!validateRedbeeEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Solo se permiten emails con dominio @redb.ee.' });
    }

    const validRole = role === 'administrator' ? 'administrator' : 'recruiter';

    const passwordValidation = passwordService.validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'La contraseña no cumple los requisitos.',
        details: passwordValidation.errors,
      });
    }

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Ya existe un usuario con este email.' });
    }

    const passwordHash = await passwordService.hashPassword(password);

    const result = await db.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, is_active, created_at`,
      [normalizedEmail, passwordHash, name.trim(), validRole]
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    console.error('[Users] CreateUser error:', err.message);
    res.status(500).json({ error: 'Error al crear usuario.' });
  }
}

async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { email, name, role } = req.body;

    if (!email && !name && !role) {
      return res.status(400).json({ error: 'Debe proporcionar al menos un campo para actualizar.' });
    }

    const existing = await db.query('SELECT id, email FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      if (!validateRedbeeEmail(normalizedEmail)) {
        return res.status(400).json({ error: 'Solo se permiten emails con dominio @redb.ee.' });
      }
      const duplicate = await db.query('SELECT id FROM users WHERE email = $1 AND id != $2', [normalizedEmail, id]);
      if (duplicate.rows.length > 0) {
        return res.status(409).json({ error: 'Ya existe otro usuario con este email.' });
      }
      updates.push(`email = $${paramIndex++}`);
      values.push(normalizedEmail);
    }

    if (name) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name.trim());
    }

    if (role) {
      const validRole = role === 'administrator' ? 'administrator' : 'recruiter';
      updates.push(`role = $${paramIndex++}`);
      values.push(validRole);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, email, name, role, is_active, created_at, updated_at`,
      values
    );

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('[Users] UpdateUser error:', err.message);
    res.status(500).json({ error: 'Error al actualizar usuario.' });
  }
}

async function changePassword(req, res) {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'La nueva contraseña es requerida.' });
    }

    const existing = await db.query('SELECT id FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const passwordValidation = passwordService.validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'La contraseña no cumple los requisitos.',
        details: passwordValidation.errors,
      });
    }

    const passwordHash = await passwordService.hashPassword(password);

    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, id]
    );

    res.json({ message: 'Contraseña actualizada correctamente.' });
  } catch (err) {
    console.error('[Users] ChangePassword error:', err.message);
    res.status(500).json({ error: 'Error al cambiar contraseña.' });
  }
}

async function toggleActive(req, res) {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta.' });
    }

    const existing = await db.query('SELECT id, is_active FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const newStatus = !existing.rows[0].is_active;

    const result = await db.query(
      `UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, email, name, role, is_active`,
      [newStatus, id]
    );

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('[Users] ToggleActive error:', err.message);
    res.status(500).json({ error: 'Error al cambiar estado del usuario.' });
  }
}

async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta.' });
    }

    const existing = await db.query('SELECT id, email FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    await db.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ message: 'Usuario eliminado correctamente.' });
  } catch (err) {
    console.error('[Users] DeleteUser error:', err.message);
    res.status(500).json({ error: 'Error al eliminar usuario.' });
  }
}

module.exports = {
  getUsers,
  createUser,
  updateUser,
  changePassword,
  toggleActive,
  deleteUser,
};
