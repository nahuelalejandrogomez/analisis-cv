import React, { useState } from 'react';

const PASSWORD_RULES = [
  { test: (p) => p.length >= 8, label: 'Mínimo 8 caracteres' },
  { test: (p) => /[A-Z]/.test(p), label: 'Al menos 1 mayúscula' },
  { test: (p) => /[a-z]/.test(p), label: 'Al menos 1 minúscula' },
  { test: (p) => /[0-9]/.test(p), label: 'Al menos 1 número' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), label: 'Al menos 1 símbolo' },
];

function ChangePasswordModal({ user, onSubmit, onClose }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordValid = PASSWORD_RULES.every((r) => r.test(password));
  const passwordsMatch = password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!passwordValid) {
      setError('La contraseña no cumple todos los requisitos.');
      return;
    }

    if (!passwordsMatch) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(password);
      setSuccess(true);
      setTimeout(onClose, 1500);
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
          <h3>Cambiar Contraseña</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <p className="modal-subtitle">
          Cambiando contraseña de <strong>{user.name}</strong> ({user.email})
        </p>

        {success ? (
          <div className="modal-success">
            Contraseña actualizada correctamente.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="modal-error">{error}</div>}

            <div className="form-group">
              <label htmlFor="new-password">Nueva Contraseña</label>
              <input
                id="new-password"
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

            <div className="form-group">
              <label htmlFor="confirm-password">Confirmar Contraseña</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repetir contraseña"
                required
              />
              {confirmPassword && !passwordsMatch && (
                <span className="field-error">Las contraseñas no coinciden</span>
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !passwordValid || !passwordsMatch}
              >
                {loading ? (
                  <>
                    <span className="spinner-small"></span>
                    Guardando...
                  </>
                ) : (
                  'Cambiar Contraseña'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ChangePasswordModal;
