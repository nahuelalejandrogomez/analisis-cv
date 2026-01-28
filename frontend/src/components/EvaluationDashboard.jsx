import React, { useEffect, useState } from 'react';

// Use the same API_URL as api.js
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Dashboard with KPI cards for evaluation summary
 * Cards are clickable to filter candidates by status
 */
export default function EvaluationDashboard({ jobId, onFilterChange, refreshTrigger }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);

  async function loadSummary() {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/jobs/${jobId}/evaluations/summary`);
      if (!response.ok) throw new Error('Error loading summary');
      
      const data = await response.json();
      setSummary(data);
    } catch (err) {
      console.error('Error loading evaluation summary:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!jobId) {
      setSummary(null);
      setLoading(false);
      return;
    }

    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, refreshTrigger]); // CAMBIO: Agregado refreshTrigger

  function handleCardClick(status) {
    // Toggle filter: if already active, reset; otherwise set new filter
    const newFilter = activeFilter === status ? null : status;
    setActiveFilter(newFilter);
    onFilterChange(newFilter);
  }

  function handleResetFilter() {
    setActiveFilter(null);
    onFilterChange(null);
  }

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-loading">Cargando estadísticas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="dashboard-error">Error: {error}</div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const evaluatedPercentage = summary.total > 0 
    ? Math.round((summary.evaluated / summary.total) * 100) 
    : 0;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Resumen de Evaluaciones</h2>
        {activeFilter && (
          <button onClick={handleResetFilter} className="reset-filter-btn">
            Ver todos
          </button>
        )}
      </div>

      <div className="kpi-grid">
        {/* Total Candidates */}
        <div 
          className={`kpi-card ${activeFilter === null ? 'active' : ''}`}
          onClick={() => handleCardClick(null)}
        >
          <div className="kpi-label">Total Candidatos</div>
          <div className="kpi-value">{summary.total}</div>
          <div className="kpi-detail">{evaluatedPercentage}% evaluado</div>
        </div>

        {/* VERDE */}
        <div 
          className={`kpi-card kpi-verde ${activeFilter === 'VERDE' ? 'active' : ''}`}
          onClick={() => handleCardClick('VERDE')}
        >
          <div className="kpi-label">VERDE</div>
          <div className="kpi-value">{summary.verde}</div>
          <div className="kpi-detail">
            {summary.total > 0 ? Math.round((summary.verde / summary.total) * 100) : 0}% del total
          </div>
        </div>

        {/* AMARILLO */}
        <div 
          className={`kpi-card kpi-amarillo ${activeFilter === 'AMARILLO' ? 'active' : ''}`}
          onClick={() => handleCardClick('AMARILLO')}
        >
          <div className="kpi-label">AMARILLO</div>
          <div className="kpi-value">{summary.amarillo}</div>
          <div className="kpi-detail">
            {summary.total > 0 ? Math.round((summary.amarillo / summary.total) * 100) : 0}% del total
          </div>
        </div>

        {/* ROJO */}
        <div 
          className={`kpi-card kpi-rojo ${activeFilter === 'ROJO' ? 'active' : ''}`}
          onClick={() => handleCardClick('ROJO')}
        >
          <div className="kpi-label">ROJO</div>
          <div className="kpi-value">{summary.rojo}</div>
          <div className="kpi-detail">
            {summary.total > 0 ? Math.round((summary.rojo / summary.total) * 100) : 0}% del total
          </div>
        </div>

        {/* SIN EVALUAR */}
        <div 
          className={`kpi-card kpi-pending ${activeFilter === 'PENDING' ? 'active' : ''}`}
          onClick={() => handleCardClick('PENDING')}
        >
          <div className="kpi-label">SIN EVALUAR</div>
          <div className="kpi-value">{summary.pending}</div>
          <div className="kpi-detail">
            {summary.total > 0 ? Math.round((summary.pending / summary.total) * 100) : 0}% del total
          </div>
        </div>
      </div>

      {summary.lastEvaluatedAt && (
        <div className="dashboard-footer">
          <span className="last-evaluation">
            Última evaluación: {new Date(summary.lastEvaluatedAt).toLocaleString('es-AR')}
          </span>
        </div>
      )}
    </div>
  );
}
