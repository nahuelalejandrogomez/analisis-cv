import React from 'react';
import { logout } from '../api';

function Header({ onEvaluate, selectedCount, evaluating, user }) {
  const handleLogout = () => {
    if (window.confirm('Cerrar sesion?')) {
      logout();
    }
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <img
            src="/Logos/REDBEE-MARCA.png"
            alt="Redbee Logo"
            className="logo-image"
          />
          <div className="logo-text">
            <h1>CV Evaluator</h1>
            <span className="brand">by Redbee</span>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="btn btn-primary"
            onClick={onEvaluate}
            disabled={!selectedCount || selectedCount === 0 || evaluating}
          >
            {evaluating ? (
              <>
                <span className="spinner-small"></span>
                Evaluando...
              </>
            ) : (
              `Evaluar Seleccionados (${selectedCount || 0})`
            )}
          </button>

          {/* User info y logout */}
          {user && (
            <div className="user-menu">
              {user.picture && (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="user-avatar"
                />
              )}
              <span className="user-name">{user.name?.split(' ')[0]}</span>
              <button
                className="btn btn-logout"
                onClick={handleLogout}
                title="Cerrar sesion"
              >
                Salir
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
