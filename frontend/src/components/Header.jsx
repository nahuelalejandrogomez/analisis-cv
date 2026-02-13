import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Header({ onEvaluate, onBulkDelete, evaluateCount, deleteCount, evaluating }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
          {deleteCount > 0 && (
            <button
              className="btn btn-danger"
              onClick={onBulkDelete}
              disabled={evaluating}
            >
              Borrar Seleccionados ({deleteCount})
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={onEvaluate}
            disabled={!evaluateCount || evaluateCount === 0 || evaluating}
          >
            {evaluating ? (
              <>
                <span className="spinner-small"></span>
                Evaluando...
              </>
            ) : (
              `Evaluar Seleccionados (${evaluateCount || 0})`
            )}
          </button>

          <div className="header-user-section">
            {user?.role === 'administrator' && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => navigate('/admin')}
              >
                Panel Admin
              </button>
            )}
            <div className="user-info">
              <span className="user-name">{user?.name}</span>
            </div>
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
