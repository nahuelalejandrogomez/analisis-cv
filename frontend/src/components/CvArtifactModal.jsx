import React, { useState, useEffect } from 'react';
import * as api from '../api';

/**
 * OBJETIVO B: Vista de auditoría del CV evaluado (solo lectura)
 * Muestra el texto EXACTO que fue enviado al LLM
 * NO procesa, NO limpia, NO modifica el texto
 * 
 * CV Metadata: Siempre se obtiene desde Lever API en tiempo real (no de BD)
 * para asegurar que tengamos la versión más actualizada del CV
 */
export default function CvArtifactModal({ candidate, onClose }) {
  const [cvMetadata, setCvMetadata] = useState(null);
  const [loadingMetadata, setLoadingMetadata] = useState(true);

  useEffect(() => {
    if (candidate?.id) {
      console.log('[CV Metadata Modal] Obteniendo metadata para:', candidate.name, candidate.id);
      setLoadingMetadata(true);
      
      // Obtener metadata del CV desde Lever API (siempre fresco)
      api.getCVMetadata(candidate.id)
        .then(data => {
          console.log('[CV Metadata Modal] Metadata recibida:', data);
          setCvMetadata(data);
          setLoadingMetadata(false);
        })
        .catch(err => {
          console.error('[CV Metadata Modal] Error obteniendo CV metadata:', err);
          setLoadingMetadata(false);
        });
    }
  }, [candidate?.id]);

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

        {/* Metadata del CV desde Lever (siempre actualizado) */}
        <div className="artifact-metadata">
          <details open>
            <summary>📄 Archivo CV en Lever (actualizado en tiempo real)</summary>
            <div className="metadata-content">
              {loadingMetadata ? (
                <div style={{ padding: '12px', textAlign: 'center' }}>
                  <em>Obteniendo información del CV desde Lever...</em>
                </div>
              ) : cvMetadata?.hasCV ? (
                <>
                  <div className="metadata-item">
                    <strong>Nombre del archivo:</strong> 
                    <span>{cvMetadata.fileName}</span>
                  </div>
                  <div className="metadata-item">
                    <strong>Fuente:</strong> 
                    <span className="code">{cvMetadata.source}</span>
                    <small style={{ marginLeft: '8px', color: '#666' }}>
                      ({cvMetadata.source === 'resumes' ? 'Endpoint /resumes' : 'Endpoint /files'})
                    </small>
                  </div>
                  <div className="metadata-item">
                    <strong>Caracteres extraídos:</strong> {cvText?.length || 0}
                  </div>
                  <div className="metadata-item">
                    <strong>Método de extracción:</strong> 
                    <span className="code">
                      {candidate.evaluation.cv_extraction_method || 'No disponible'}
                    </span>
                  </div>
                  {cvMetadata.downloadUrl && (
                    <div className="metadata-item" style={{ marginTop: '16px' }}>
                      <a 
                        href={cvMetadata.downloadUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                      >
                        📥 Descargar CV desde Lever
                      </a>
                      <small style={{ display: 'block', marginTop: '8px', color: '#666' }}>
                        ✅ Siempre obtiene la versión más actualizada desde Lever API
                      </small>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ padding: '12px' }}>
                  <p>⚠️ No se encontró archivo CV en Lever para este candidato.</p>
                  <small style={{ color: '#666' }}>
                    El candidato puede no haber subido un CV o fue eliminado de Lever.
                  </small>
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
