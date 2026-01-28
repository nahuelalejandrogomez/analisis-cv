import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import JobSelector from './components/JobSelector';
import EvaluationDashboard from './components/EvaluationDashboard';
import CandidateTable from './components/CandidateTable';
import EvaluationResult from './components/EvaluationResult';
import * as api from './api';
import './styles/components.css';
import './styles/responsive.css';

function App() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationResults, setEvaluationResults] = useState([]);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);

  // Load jobs on mount
  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async (refresh = false) => {
    setLoadingJobs(true);
    setError(null);
    try {
      const response = refresh ? await api.refreshJobs() : await api.getJobs();
      setJobs(response.jobs);
    } catch (err) {
      setError(`Error cargando jobs: ${err.message}`);
    } finally {
      setLoadingJobs(false);
    }
  };

  const loadCandidates = useCallback(async (jobId) => {
    setLoadingCandidates(true);
    setError(null);
    try {
      const response = await api.getCandidates(jobId);
      setCandidates(response.candidates);
    } catch (err) {
      setError(`Error cargando candidatos: ${err.message}`);
      setCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  }, []);

  const handleJobSelect = (job) => {
    setSelectedJob(job);
    setEvaluationResults([]);
    setStatusFilter(null); // Reset filter when changing job
    if (job) {
      loadCandidates(job.id);
    } else {
      setCandidates([]);
    }
  };

  const handleEvaluate = async (selectedCandidates) => {
    if (!selectedJob || selectedCandidates.length === 0) return;

    setEvaluating(true);
    setError(null);
    setEvaluationResults([]);

    try {
      // Evaluate one by one to show progress
      for (const candidate of selectedCandidates) {
        try {
          const result = await api.evaluateCandidate(selectedJob.id, candidate);
          setEvaluationResults(prev => [...prev, result]);

          // Update candidate in list
          setCandidates(prev =>
            prev.map(c =>
              c.id === candidate.id
                ? {
                    ...c,
                    evaluated: true,
                    evaluation: {
                      status: result.status,
                      reasoning: result.reasoning,
                      evaluatedAt: new Date().toISOString()
                    }
                  }
                : c
            )
          );
        } catch (err) {
          setEvaluationResults(prev => [
            ...prev,
            {
              candidateId: candidate.id,
              candidateName: candidate.name,
              status: 'ERROR',
              reasoning: err.message
            }
          ]);
        }
      }
    } finally {
      setEvaluating(false);
    }
  };

  const handleRefresh = () => {
    loadJobs(true);
    if (selectedJob) {
      loadCandidates(selectedJob.id);
    }
  };

  const handleFilterChange = (filter) => {
    setStatusFilter(filter);
  };

  // Filter candidates based on status filter
  const filteredCandidates = statusFilter
    ? candidates.filter(candidate => {
        if (statusFilter === 'PENDING') {
          return !candidate.evaluated;
        }
        return candidate.evaluated && candidate.evaluation?.status === statusFilter;
      })
    : candidates;

  return (
    <div className="app">
      <Header onRefresh={handleRefresh} />

      <main className="main-content">
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError(null)}>Cerrar</button>
          </div>
        )}

        <JobSelector
          jobs={jobs}
          selectedJob={selectedJob}
          onSelectJob={handleJobSelect}
          loading={loadingJobs}
        />

        {selectedJob && (
          <>
            <EvaluationDashboard 
              jobId={selectedJob.id}
              onFilterChange={handleFilterChange}
            />

            <CandidateTable
              candidates={filteredCandidates}
              loading={loadingCandidates}
              evaluating={evaluating}
              onEvaluate={handleEvaluate}
            />

            {evaluationResults.length > 0 && (
              <EvaluationResult results={evaluationResults} />
            )}
          </>
        )}

        {!selectedJob && !loadingJobs && (
          <div className="empty-state">
            <h2>Selecciona un Job</h2>
            <p>Elige un puesto de trabajo del selector para ver y evaluar candidatos.</p>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>CV Evaluator by Redbee - Powered by Claude AI</p>
      </footer>
    </div>
  );
}

export default App;
