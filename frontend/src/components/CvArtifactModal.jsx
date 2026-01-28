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
              <p>⚠️ No hay texto de CV guardado para este candidato.</p>
              <small>
                Esto puede ocurrir si:<br/>
                • El CV fue evaluado antes de implementar la auditoría<br/>
                • Lever no tenía el CV disponible en el momento de la evaluación<br/>
                • El PDF no pudo ser parseado correctamente
              </small>
              <div style={{ marginTop: '16px', padding: '12px', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
                <strong>💡 Solución:</strong> Elimina esta evaluación y vuelve a evaluar al candidato para capturar el CV actualizado.
              </div>
            </div>
          )}
        </div>

        {/* Metadata (si existe en el futuro) */}
        <div className="artifact-metadata">
          <details>
            <summary>Metadata del archivo CV</summary>
            <div className="metadata-content">
              <div className="metadata-item">
                <strong>Nombre del archivo:</strong> 
                <span>{candidate.evaluation.cv_file_name || <em>No disponible</em>}</span>
              </div>
              <div className="metadata-item">
                <strong>Tamaño:</strong> 
                <span>
                  {candidate.evaluation.cv_file_size 
                    ? `${Math.round(candidate.evaluation.cv_file_size / 1024)} KB` 
                    : <em>No disponible</em>}
                </span>
              </div>
              <div className="metadata-item">
                <strong>Método de extracción:</strong> 
                <span className="code">
                  {candidate.evaluation.cv_extraction_method || 'No disponible'}
                </span>
              </div>
              <div className="metadata-item">
                <strong>extractedCharCount:</strong> {cvText?.length || 0}
              </div>
              {candidate.evaluation.cv_file_url && (
                <div className="metadata-item" style={{ marginTop: '12px' }}>
                  <a 
                    href={candidate.evaluation.cv_file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    📥 Descargar CV original desde Lever
                  </a>
                </div>
              )}
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
