import React, { useState } from 'react';

/**
 * Dashboard with KPI cards computed directly from the candidates array.
 * This ensures counts always match what's shown in the table.
 */
export default function EvaluationDashboard({ candidates = [], onFilterChange }) {
  const [activeFilter, setActiveFilter] = useState(null);

  // Compute summary from the live candidates array
  const total = candidates.length;
  const verde    = candidates.filter(c => c.evaluated && c.evaluation?.status === 'VERDE').length;
  const amarillo = candidates.filter(c => c.evaluated && c.evaluation?.status === 'AMARILLO').length;
  const rojo     = candidates.filter(c => c.evaluated && c.evaluation?.status === 'ROJO').length;
  const evaluated = candidates.filter(c => c.evaluated).length;
  const pending  = total - evaluated;

  const lastEvaluatedAt = candidates
    .filter(c => c.evaluated && c.evaluation?.evaluatedAt)
    .map(c => new Date(c.evaluation.evaluatedAt))
    .sort((a, b) => b - a)[0] || null;

  const evaluatedPercentage = total > 0 ? Math.round((evaluated / total) * 100) : 0;

  function handleCardClick(status) {
    const newFilter = activeFilter === status ? null : status;
    setActiveFilter(newFilter);
    onFilterChange(newFilter);
  }

  function handleResetFilter() {
    setActiveFilter(null);
    onFilterChange(null);
  }

  if (total === 0) return null;

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
          <div className="kpi-value">{total}</div>
          <div className="kpi-detail">{evaluatedPercentage}% evaluado</div>
        </div>

        {/* VERDE */}
        <div
          className={`kpi-card kpi-verde ${activeFilter === 'VERDE' ? 'active' : ''}`}
          onClick={() => handleCardClick('VERDE')}
        >
          <div className="kpi-label">VERDE</div>
          <div className="kpi-value">{verde}</div>
          <div className="kpi-detail">
            {total > 0 ? Math.round((verde / total) * 100) : 0}% del total
          </div>
        </div>

        {/* AMARILLO */}
        <div
          className={`kpi-card kpi-amarillo ${activeFilter === 'AMARILLO' ? 'active' : ''}`}
          onClick={() => handleCardClick('AMARILLO')}
        >
          <div className="kpi-label">AMARILLO</div>
          <div className="kpi-value">{amarillo}</div>
          <div className="kpi-detail">
            {total > 0 ? Math.round((amarillo / total) * 100) : 0}% del total
          </div>
        </div>

        {/* ROJO */}
        <div
          className={`kpi-card kpi-rojo ${activeFilter === 'ROJO' ? 'active' : ''}`}
          onClick={() => handleCardClick('ROJO')}
        >
          <div className="kpi-label">ROJO</div>
          <div className="kpi-value">{rojo}</div>
          <div className="kpi-detail">
            {total > 0 ? Math.round((rojo / total) * 100) : 0}% del total
          </div>
        </div>

        {/* SIN EVALUAR */}
        <div
          className={`kpi-card kpi-pending ${activeFilter === 'PENDING' ? 'active' : ''}`}
          onClick={() => handleCardClick('PENDING')}
        >
          <div className="kpi-label">SIN EVALUAR</div>
          <div className="kpi-value">{pending}</div>
          <div className="kpi-detail">
            {total > 0 ? Math.round((pending / total) * 100) : 0}% del total
          </div>
        </div>
      </div>

      {lastEvaluatedAt && (
        <div className="dashboard-footer">
          <span className="last-evaluation">
            Última evaluación: {lastEvaluatedAt.toLocaleString('es-AR')}
          </span>
        </div>
      )}
    </div>
  );
}
