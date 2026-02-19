import React from 'react';

function StageFilter({ candidates, selectedStages, onChange }) {
  const stageCounts = candidates.reduce((acc, c) => {
    if (c.stage) acc[c.stage] = (acc[c.stage] || 0) + 1;
    return acc;
  }, {});

  const allStages = Object.keys(stageCounts).sort();

  const handleToggle = (stage) => {
    if (selectedStages.includes(stage)) {
      onChange(selectedStages.filter(s => s !== stage));
    } else {
      onChange([...selectedStages, stage]);
    }
  };

  if (allStages.length === 0) return null;

  return (
    <div className="stage-filter">
      <span className="stage-filter-label">Etapa:</span>
      <div className="stage-filter-options">
        {allStages.map(stage => {
          const isSelected = selectedStages.includes(stage);
          return (
            <label
              key={stage}
              className={`stage-filter-option${isSelected ? ' active' : ''}`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggle(stage)}
              />
              <span className="stage-filter-name">{stage}</span>
              <span className="stage-filter-count">({stageCounts[stage]})</span>
            </label>
          );
        })}
      </div>
      {selectedStages.length > 0 && (
        <button className="stage-filter-clear" onClick={() => onChange([])}>
          Limpiar
        </button>
      )}
    </div>
  );
}

export default StageFilter;
