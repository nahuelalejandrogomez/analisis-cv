import React, { useState } from 'react';

/**
 * OBJETIVO A: Panel informativo del Job seleccionado (solo lectura)
 * Muestra los datos exactos que se usan para evaluar CVs
 * NO modifica, NO transforma, NO agrega lógica de negocio
 */
export default function JobContextPanel({ job }) {
  const [expandedSection, setExpandedSection] = useState(null);

  if (!job) {
    console.log('[JobContextPanel] No job provided');
    return null;
  }

  console.log('[JobContextPanel] Job data:', {
    title: job.title,
    team: job.team,
    location: job.location,
    hasDescriptionPlain: !!job.descriptionPlain,
    hasRequirements: !!job.requirements,
    hasResponsibilities: !!job.responsibilities
  });

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
        {(job.descriptionPlain || job.description) && (
          <div className="collapsible-section">
            <button
              className="section-toggle"
              onClick={() => toggleSection('description')}
            >
              <span className="toggle-icon">
                {expandedSection === 'description' ? '▼' : '▶'}
              </span>
              Descripción del Puesto
            </button>
            {expandedSection === 'description' && (
              <div className="section-content">
                <pre>{job.descriptionPlain || job.description}</pre>
              </div>
            )}
          </div>
        )}

        {/* Lists - Todas las secciones del job */}
        {job.lists && (
          <div className="collapsible-section">
            <button
              className="section-toggle"
              onClick={() => toggleSection('lists')}
            >
              <span className="toggle-icon">
                {expandedSection === 'lists' ? '▼' : '▶'}
              </span>
              Requisitos y Responsabilidades (usado para evaluar)
            </button>
            {expandedSection === 'lists' && (
              <div className="section-content">
                <pre>{job.lists}</pre>
              </div>
            )}
          </div>
        )}

        {/* Texto adicional */}
        {job.additionalText && (
          <div className="collapsible-section">
            <button
              className="section-toggle"
              onClick={() => toggleSection('additional')}
            >
              <span className="toggle-icon">
                {expandedSection === 'additional' ? '▼' : '▶'}
              </span>
              Información Adicional
            </button>
            {expandedSection === 'additional' && (
              <div className="section-content">
                <pre>{job.additionalText}</pre>
              </div>
            )}
          </div>
        )}

        {/* Fallback: Requirements y Responsibilities (si existen por separado) */}
        {job.requirements && (
          <div className="collapsible-section">
            <button
              className="section-toggle"
              onClick={() => toggleSection('requirements')}
            >
              <span className="toggle-icon">
                {expandedSection === 'requirements' ? '▼' : '▶'}
              </span>
              Requisitos
            </button>
            {expandedSection === 'requirements' && (
              <div className="section-content">
                <pre>{job.requirements}</pre>
              </div>
            )}
          </div>
        )}

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
