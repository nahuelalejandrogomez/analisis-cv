import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../styles/login.css';

export default function LoginCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      // Guardar token en localStorage
      localStorage.setItem('authToken', token);
      console.log('[Auth] Token guardado en localStorage');

      // Redirigir al dashboard
      navigate('/dashboard', { replace: true });
    } else {
      setError('No se recibio token de autenticacion');
      // Redirigir a login despues de 3 segundos
      setTimeout(() => navigate('/', { replace: true }), 3000);
    }
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="login-container">
        <div className="login-background"></div>
        <div className="login-box">
          <div className="error-message">{error}</div>
          <p className="login-subtitle">Redirigiendo al login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-background"></div>
      <div className="login-box">
        <div className="login-content" style={{ textAlign: 'center' }}>
          <span className="spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }}></span>
          <p className="login-subtitle" style={{ marginTop: '1rem' }}>
            Completando login...
          </p>
        </div>
      </div>
    </div>
  );
}
