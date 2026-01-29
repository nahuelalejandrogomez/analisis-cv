import React from 'react';

/**
 * Vista de auditoría del CV evaluado (solo lectura)
 * Muestra el texto EXACTO que fue enviado al LLM
 * NO procesa, NO limpia, NO modifica el texto
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
                {candidate.evaluation.cv_extraction_method && (
                  <small style={{ marginLeft: '15px' }}>
                    🔧 Método: {candidate.evaluation.cv_extraction_method}
                  </small>
                )}
              </div>
            </div>
          ) : (
            <div className="no-data-message">
              <p>⚠️ No hay texto de CV guardado para este candidato.</p>
              <small>
                <strong>Método de extracción intentado:</strong> {candidate.evaluation.cv_extraction_method || 'no_extraction'}<br/><br/>
                <strong>¿Qué significa cada método?</strong><br/>
                • <strong>no_extraction</strong>: Lever no tenía el CV disponible<br/>
                • <strong>download_failed</strong>: Error al descargar el PDF de Lever<br/>
                • <strong>extraction_failed</strong>: PDF descargado pero no se pudo extraer texto (puede ser imagen escaneada)<br/>
                • <strong>insufficient_content</strong>: CV con menos de 50 caracteres extraídos<br/>
              </small>
              <div style={{ marginTop: '16px', padding: '12px', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
                <strong>💡 Solución:</strong> Elimina esta evaluación y vuelve a evaluar al candidato para intentar capturar el CV nuevamente.
              </div>
            </div>
          )}
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
