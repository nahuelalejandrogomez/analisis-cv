import React from 'react';

function EvaluationResult({ results }) {
  if (!results || results.length === 0) return null;

  const statusConfig = {
    VERDE: {
      emoji: '',
      className: 'result-verde',
      label: 'Aprobado'
    },
    AMARILLO: {
      emoji: '',
      className: 'result-amarillo',
      label: 'Revisar'
    },
    ROJO: {
      emoji: '',
      className: 'result-rojo',
      label: 'No Aplica'
    },
    ERROR: {
      emoji: '',
      className: 'result-error',
      label: 'Error'
    }
  };

  const stats = {
    VERDE: results.filter(r => r.status === 'VERDE').length,
    AMARILLO: results.filter(r => r.status === 'AMARILLO').length,
    ROJO: results.filter(r => r.status === 'ROJO').length,
    ERROR: results.filter(r => r.status === 'ERROR').length
  };

  return (
    <div className="evaluation-results">
      <h2>Resultados de Evaluacion</h2>

      <div className="results-summary">
        <div className="stat stat-verde">
          <span className="stat-number">{stats.VERDE}</span>
          <span className="stat-label">Aprobados</span>
        </div>
        <div className="stat stat-amarillo">
          <span className="stat-number">{stats.AMARILLO}</span>
          <span className="stat-label">A Revisar</span>
        </div>
        <div className="stat stat-rojo">
          <span className="stat-number">{stats.ROJO}</span>
          <span className="stat-label">No Aplican</span>
        </div>
        {stats.ERROR > 0 && (
          <div className="stat stat-error">
            <span className="stat-number">{stats.ERROR}</span>
            <span className="stat-label">Errores</span>
          </div>
        )}
      </div>

      <div className="results-list">
        {results.map((result, index) => {
          const config = statusConfig[result.status] || statusConfig.ERROR;
          return (
            <div key={index} className={`result-card ${config.className}`}>
              <div className="result-header">
                <span className="result-emoji">{config.emoji}</span>
                <span className="result-name">{result.candidateName}</span>
                <span className={`result-status status-${result.status?.toLowerCase()}`}>
                  {config.label}
                </span>
              </div>
              <div className="result-body">
                <p className="result-reasoning">{result.reasoning}</p>
                {result.alreadyEvaluated && (
                  <span className="already-evaluated">Ya evaluado anteriormente</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default EvaluationResult;
