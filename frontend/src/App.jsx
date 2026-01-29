import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import LoginCallback from './pages/LoginCallback';
import Dashboard from './pages/Dashboard';
import * as api from './api';

/**
 * Componente para rutas protegidas
 */
function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');

    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    // Verificar token con el backend
    api.getCurrentUser()
      .then(data => {
        setUser(data.user);
        setIsAuthenticated(true);
      })
      .catch(() => {
        // Token invalido, limpiar
        localStorage.removeItem('authToken');
        setIsAuthenticated(false);
      });
  }, []);

  // Mientras verifica
  if (isAuthenticated === null) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div className="spinner" style={{
          width: '32px',
          height: '32px',
          border: '3px solid #FF0000',
          borderTop: '3px solid transparent',
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite'
        }}></div>
        <p>Verificando sesion...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // No autenticado
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Autenticado: pasar usuario al children
  return React.cloneElement(children, { user });
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Ruta de login */}
        <Route
          path="/"
          element={<PublicRoute><Login /></PublicRoute>}
        />

        {/* Callback de Google OAuth */}
        <Route path="/callback" element={<LoginCallback />} />

        {/* Dashboard protegido */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Redirect cualquier otra ruta */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

/**
 * Componente para rutas publicas (redirige si ya esta autenticado)
 */
function PublicRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');

    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    // Verificar si el token es valido
    api.getCurrentUser()
      .then(() => setIsAuthenticated(true))
      .catch(() => {
        localStorage.removeItem('authToken');
        setIsAuthenticated(false);
      });
  }, []);

  // Mientras verifica
  if (isAuthenticated === null) {
    return null; // O un loading spinner
  }

  // Si ya esta autenticado, redirigir a dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
