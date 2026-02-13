import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Header({ onEvaluate, selectedCount, evaluating }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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
          {/* Navigation menu */}
          <nav className="header-nav">
            <button 
              className="btn btn-link" 
              onClick={() => navigate('/')}
            >
              Análisis
            </button>
            {user?.role === 'administrator' && (
              <button 
                className="btn btn-link" 
                onClick={() => navigate('/admin')}
              >
                Usuarios
              </button>
            )}
          </nav>

          {/* Evaluate button */}
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

          {/* User info and logout */}
          <div className="header-user-section">
            <span className="user-name">{user?.name}</span>
            <button className="btn btn-secondary btn-sm" onClick={logout}>
              Salir
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
