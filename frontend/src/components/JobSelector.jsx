import React from 'react';

function JobSelector({ jobs, selectedJob, onSelectJob, loading }) {
  const handleChange = (e) => {
    const jobId = e.target.value;
    if (jobId) {
      const job = jobs.find(j => j.id === jobId);
      onSelectJob(job);
    } else {
      onSelectJob(null);
    }
  };

  return (
    <div className="job-selector">
      <label htmlFor="job-select">Seleccionar Puesto:</label>

      {loading ? (
        <div className="loading-inline">
          <span className="spinner-small"></span>
          <span>Cargando puestos...</span>
        </div>
      ) : (
        <select
          id="job-select"
          value={selectedJob?.id || ''}
          onChange={handleChange}
          className="job-select"
        >
          <option value="">-- Selecciona un puesto --</option>
          {jobs.map(job => (
            <option key={job.id} value={job.id}>
              {job.title} - {job.team} ({job.location})
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export default JobSelector;
