import React from 'react';

function Header({ onRefresh }) {
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
          <button className="btn btn-secondary" onClick={onRefresh}>
            Actualizar Datos
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
