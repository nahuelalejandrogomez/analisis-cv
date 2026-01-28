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
  }, [candidate?.id, candidate?.name]);

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
                  {cvMetadata.fileId && (
                    <div className="metadata-item" style={{ marginTop: '16px' }}>
                      <button
                        onClick={() => {
                          const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
                          const downloadUrl = `${API_URL}/candidates/${candidate.id}/resume/download?resumeId=${cvMetadata.fileId}&source=${cvMetadata.source || 'resumes'}&name=${encodeURIComponent(candidate.name)}`;
                          window.open(downloadUrl, '_blank');
                        }}
                        className="btn btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                      >
                        📥 Descargar CV desde Lever
                      </button>
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
