import React from 'react';

/**
 * OBJETIVO B: Vista de auditoría del CV evaluado (solo lectura)
 * Muestra el texto EXACTO que fue enviado al LLM
 * NO procesa, NO limpia, NO modifica el texto
 * 
 * TODO auth: Agregar validación de permisos cuando se implementen roles
 */
export default function CvArtifactModal({ candidate, onClose }) {
  if (!candidate || !candidate.evaluation) return null;

  const cvText = candidate.evaluation.cv_text || candidate.evaluation.cvText;
  const hasCV = !!cvText;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content cv-artifact-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h3>🔍 CV Evaluado - Auditoría</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Candidate Info */}
        <div className="artifact-info">
          <div className="info-row">
            <strong>Candidato:</strong> {candidate.name}
          </div>
          <div className="info-row">
            <strong>Email:</strong> {candidate.email || 'N/A'}
          </div>
          <div className="info-row">
            <strong>Estado:</strong> 
            <span className={`status-badge status-${candidate.evaluation.status?.toLowerCase()}`}>
              {candidate.evaluation.status}
            </span>
          </div>
        </div>

        {/* CV Text */}
        <div className="artifact-section">
          <h4>Texto evaluado por el LLM:</h4>
          {hasCV ? (
            <div className="cv-text-container">
              <pre className="cv-text-content">{cvText}</pre>
              <div className="cv-stats">
                <small>📊 {cvText.length} caracteres</small>
              </div>
            </div>
          ) : (
            <div className="no-data-message">
              <p>⚠️ No hay texto de CV auditado guardado para este candidato.</p>
              <small>El CV puede haber sido evaluado antes de que se implementara la auditoría.</small>
            </div>
          )}
        </div>

        {/* Metadata (si existe en el futuro) */}
        <div className="artifact-metadata">
          <details>
            <summary>Metadata (diagnóstico)</summary>
            <div className="metadata-content">
              <div className="metadata-item">
                <strong>extractedCharCount:</strong> {cvText?.length || 0}
              </div>
              <div className="metadata-item">
                <strong>extractionMethod:</strong> <span className="code">pdf-parse</span>
              </div>
              <div className="metadata-item">
                <strong>originalFileName:</strong> <em>No disponible (campo futuro)</em>
              </div>
              <div className="metadata-item">
                <strong>originalFileUrl:</strong> <em>No disponible (campo futuro)</em>
              </div>
              <div className="metadata-item">
                <strong>parseWarnings:</strong> <em>No implementado</em>
              </div>
            </div>
          </details>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
