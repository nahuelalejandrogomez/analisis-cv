import React from 'react';

function Header({ onRefresh }) {
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <div className="logo-icon">
            <span className="logo-r">R</span>
          </div>
          <div className="logo-text">
            <h1>CV Evaluator</h1>
            <span className="brand">by Redbee</span>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn btn-secondary" onClick={onRefresh}>
            Actualizar Datos
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
