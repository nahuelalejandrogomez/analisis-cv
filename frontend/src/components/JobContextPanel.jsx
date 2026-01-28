import React, { useState } from 'react';

/**
 * OBJETIVO A: Panel informativo del Job seleccionado (solo lectura)
 * Muestra los datos exactos que se usan para evaluar CVs
 * NO modifica, NO transforma, NO agrega lógica de negocio
 */
export default function JobContextPanel({ job }) {
  const [expandedSection, setExpandedSection] = useState(null);

  if (!job) return null;

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="job-context-panel">
      {/* Header compacto */}
      <div className="job-context-header">
        <h3>{job.title}</h3>
        <div className="job-context-meta">
          {job.team && <span className="meta-badge">📋 {job.team}</span>}
          {job.location && <span className="meta-badge">📍 {job.location}</span>}
        </div>
      </div>

      {/* Secciones colapsables */}
      <div className="job-context-sections">
        {/* Descripción */}
        {job.descriptionPlain && (
          <div className="collapsible-section">
            <button
              className="section-toggle"
              onClick={() => toggleSection('description')}
            >
              <span className="toggle-icon">
                {expandedSection === 'description' ? '▼' : '▶'}
              </span>
              Descripción
            </button>
            {expandedSection === 'description' && (
              <div className="section-content">
                <pre>{job.descriptionPlain}</pre>
              </div>
            )}
          </div>
        )}

        {/* Requisitos */}
        {job.requirements && (
          <div className="collapsible-section">
            <button
              className="section-toggle"
              onClick={() => toggleSection('requirements')}
            >
              <span className="toggle-icon">
                {expandedSection === 'requirements' ? '▼' : '▶'}
              </span>
              Requisitos (usados para evaluar)
            </button>
            {expandedSection === 'requirements' && (
              <div className="section-content">
                <pre>{job.requirements}</pre>
              </div>
            )}
          </div>
        )}

        {/* Responsabilidades */}
        {job.responsibilities && (
          <div className="collapsible-section">
            <button
              className="section-toggle"
              onClick={() => toggleSection('responsibilities')}
            >
              <span className="toggle-icon">
                {expandedSection === 'responsibilities' ? '▼' : '▶'}
              </span>
              Responsabilidades
            </button>
            {expandedSection === 'responsibilities' && (
              <div className="section-content">
                <pre>{job.responsibilities}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
