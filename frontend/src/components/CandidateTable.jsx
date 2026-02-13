import React, { useState, useEffect } from 'react';
import * as api from '../api';

function CandidateTable({ candidates, loading, evaluating, onViewCV, onDeleteEvaluation, selectedCandidates, onSelectionChange }) {
  const [selected, setSelected] = useState([]);

  // Sincronizar selección interna con prop externa
  useEffect(() => {
    setSelected(selectedCandidates.map(c => c.id));
  }, [selectedCandidates]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Select only candidates not yet evaluated
      const newSelected = candidates.filter(c => !c.evaluated);
      setSelected(newSelected.map(c => c.id));
      onSelectionChange(newSelected);
    } else {
      setSelected([]);
      onSelectionChange([]);
    }
  };

  const handleSelect = (candidateId) => {
    const newSelected = selected.includes(candidateId)
      ? selected.filter(id => id !== candidateId)
      : [...selected, candidateId];
    
    setSelected(newSelected);
    
    // Convertir IDs a objetos candidatos
    const selectedCandidatesObjects = candidates.filter(c => newSelected.includes(c.id));
    onSelectionChange(selectedCandidatesObjects);
  };

  const handleDownloadCV = async (candidate) => {
    try {
      console.log('[Download CV] Obteniendo metadata para:', candidate.name, candidate.id);
      
      // Obtener metadata del CV desde Lever en tiempo real
      const metadata = await api.getCVMetadata(candidate.id);
      
      console.log('[Download CV] Metadata recibida:', metadata);
      
      if (metadata && metadata.hasCV && metadata.fileId) {
        console.log('[Download CV] Descargando vía proxy del backend...');
        
        // Usar endpoint del backend que actúa como proxy autenticado
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const downloadUrl = `${API_URL}/candidates/${candidate.id}/resume/download?resumeId=${metadata.fileId}&source=${metadata.source || 'resumes'}&name=${encodeURIComponent(candidate.name)}`;
        
        console.log('[Download CV] URL de descarga:', downloadUrl);
        window.open(downloadUrl, '_blank');
      } else {
        console.warn('[Download CV] No se encontró CV. Metadata:', metadata);
        alert(`No se encontró CV disponible para ${candidate.name} en Lever`);
      }
    } catch (error) {
      console.error('[Download CV] Error:', error);
      alert(`Error al obtener el CV de ${candidate.name}. Por favor intenta nuevamente.\n\nError: ${error.message}`);
    }
  };

  const getStatusBadge = (evaluation) => {
    if (!evaluation) return null;

    const statusClasses = {
      VERDE: 'status-verde',
      AMARILLO: 'status-amarillo',
      ROJO: 'status-rojo',
      ERROR: 'status-error'
    };

    return (
      <span className={`status-badge ${statusClasses[evaluation.status] || 'status-error'}`}>
        {evaluation.status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando candidatos...</p>
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="empty-state">
        <h3>Sin candidatos</h3>
        <p>No hay candidatos para este puesto.</p>
      </div>
    );
  }

  const unevaluatedCount = candidates.filter(c => !c.evaluated).length;
  const selectedCount = selected.length;

  return (
    <div className="candidate-table-container">
      <div className="table-header">
        <h2>Candidatos ({candidates.length})</h2>
        <div className="table-actions">
          {unevaluatedCount > 0 && (
            <span className="unevaluated-count">
              {unevaluatedCount} sin evaluar
            </span>
          )}
          {selectedCount > 0 && (
            <span className="selected-count">
              {selectedCount} seleccionados
            </span>
          )}
        </div>
      </div>

      <div className="table-wrapper">
        <table className="candidate-table">
          <thead>
            <tr>
              <th className="th-checkbox">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={selected.length === unevaluatedCount && unevaluatedCount > 0}
                  disabled={unevaluatedCount === 0}
                />
              </th>
              <th>Nombre</th>
              <th>Email</th>
              <th>LinkedIn</th>
              <th>CV</th>
              <th>Estado</th>
              <th>Evaluacion</th>
              <th className="th-audit">Auditoría</th>
              <th className="th-actions">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map(candidate => (
              <tr
                key={candidate.id}
                className={selected.includes(candidate.id) ? 'row-selected' : ''}
              >
                <td className="td-checkbox">
                  <input
                    type="checkbox"
                    checked={selected.includes(candidate.id)}
                    onChange={() => handleSelect(candidate.id)}
                    disabled={candidate.evaluated}
                  />
                </td>
                <td className="td-name">
                  <strong>{candidate.name}</strong>
                  <span className="stage-badge">{candidate.stage}</span>
                </td>
                <td className="td-email">{candidate.email || '-'}</td>
                <td className="td-linkedin">
                  {candidate.linkedinUrl ? (
                    <a
                      href={candidate.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="linkedin-link"
                      title="Ver perfil de LinkedIn"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                      </svg>
                    </a>
                  ) : (
                    <span className="no-linkedin">-</span>
                  )}
                </td>
                <td className="td-cv">
                  {candidate.hasResume ? (
                    <button
                      className="download-btn"
                      onClick={() => handleDownloadCV(candidate)}
                      title="Descargar CV"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </button>
                  ) : (
                    <span className="cv-unavailable">-</span>
                  )}
                </td>
                <td className="td-status">
                  {getStatusBadge(candidate.evaluation)}
                </td>
                <td className="td-reasoning">
                  {candidate.evaluation?.reasoning || '-'}
                </td>
                <td className="td-audit">
                  {candidate.evaluated ? (
                    <button
                      className="audit-btn"
                      onClick={() => onViewCV(candidate)}
                      title="Ver CV evaluado (auditoría)"
                    >
                      👁️
                    </button>
                  ) : (
                    <span className="audit-empty">-</span>
                  )}
                </td>
                <td className="td-actions">
                  {candidate.evaluated ? (
                    <button
                      className="delete-btn"
                      onClick={() => onDeleteEvaluation(candidate)}
                      title="Eliminar evaluación"
                    >
                      🗑️
                    </button>
                  ) : (
                    <span className="action-empty">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CandidateTable;
