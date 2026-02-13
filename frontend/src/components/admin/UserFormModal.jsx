import React, { useState } from 'react';

const PASSWORD_RULES = [
  { test: (p) => p.length >= 8, label: 'Mínimo 8 caracteres' },
  { test: (p) => /[A-Z]/.test(p), label: 'Al menos 1 mayúscula' },
  { test: (p) => /[a-z]/.test(p), label: 'Al menos 1 minúscula' },
  { test: (p) => /[0-9]/.test(p), label: 'Al menos 1 número' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), label: 'Al menos 1 símbolo' },
];

function UserFormModal({ user, onSubmit, onClose }) {
  const isEditing = !!user;
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState(user?.role || 'recruiter');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordValid = isEditing || PASSWORD_RULES.every((r) => r.test(password));
  const emailValid = email.toLowerCase().trim().endsWith('@redb.ee');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!emailValid) {
      setError('Solo se permiten emails con dominio @redb.ee.');
      return;
    }

    if (!isEditing && !passwordValid) {
      setError('La contraseña no cumple todos los requisitos.');
      return;
    }

    setLoading(true);
    try {
      const data = { name: name.trim(), email: email.toLowerCase().trim(), role };
      if (!isEditing) {
        data.password = password;
      }
      await onSubmit(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="modal-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="user-name">Nombre</label>
            <input
              id="user-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre completo"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="user-email">Email</label>
            <input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@redb.ee"
              required
            />
            {email && !emailValid && (
              <span className="field-error">Solo emails @redb.ee</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="user-role">Rol</label>
            <select
              id="user-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="recruiter">Recruiter</option>
              <option value="administrator">Administrator</option>
            </select>
          </div>

          {!isEditing && (
            <div className="form-group">
              <label htmlFor="user-password">Contraseña</label>
              <input
                id="user-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
              />
              {password && (
                <div className="password-requirements">
                  {PASSWORD_RULES.map((rule, i) => (
                    <div
                      key={i}
                      className={`requirement ${rule.test(password) ? 'met' : 'unmet'}`}
                    >
                      <span className="requirement-icon">
                        {rule.test(password) ? '✓' : '✗'}
                      </span>
                      {rule.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || (!isEditing && !passwordValid) || !emailValid || !name.trim()}
            >
              {loading ? (
                <>
                  <span className="spinner-small"></span>
                  Guardando...
                </>
              ) : isEditing ? (
                'Guardar Cambios'
              ) : (
                'Crear Usuario'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserFormModal;
