import React, { useState } from 'react';

function CandidateTable({ candidates, loading, evaluating, onEvaluate }) {
  const [selected, setSelected] = useState([]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Select only candidates not yet evaluated
      setSelected(candidates.filter(c => !c.evaluated).map(c => c.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelect = (candidateId) => {
    setSelected(prev =>
      prev.includes(candidateId)
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const handleEvaluate = () => {
    const selectedCandidates = candidates.filter(c => selected.includes(c.id));
    onEvaluate(selectedCandidates);
    setSelected([]);
  };

  const getStatusBadge = (evaluation) => {
    if (!evaluation) return null;

    const statusClasses = {
      VERDE: 'status-verde',
      AMARILLO: 'status-amarillo',
      ROJO: 'status-rojo'
    };

    const statusEmoji = {
      VERDE: '',
      AMARILLO: '',
      ROJO: ''
    };

    return (
      <span className={`status-badge ${statusClasses[evaluation.status]}`}>
        {statusEmoji[evaluation.status]} {evaluation.status}
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
          <button
            className="btn btn-primary"
            onClick={handleEvaluate}
            disabled={selectedCount === 0 || evaluating}
          >
            {evaluating ? (
              <>
                <span className="spinner-small"></span>
                Evaluando...
              </>
            ) : (
              `Evaluar Seleccionados (${selectedCount})`
            )}
          </button>
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
              <th>CV</th>
              <th>Estado</th>
              <th>Evaluacion</th>
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
                <td className="td-cv">
                  {candidate.hasResume ? (
                    <span className="cv-available">CV disponible</span>
                  ) : (
                    <span className="cv-unavailable">Sin CV</span>
                  )}
                </td>
                <td className="td-status">
                  {getStatusBadge(candidate.evaluation)}
                </td>
                <td className="td-reasoning">
                  {candidate.evaluation?.reasoning || '-'}
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
