import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import JobSelector from '../components/JobSelector';
import EvaluationDashboard from '../components/EvaluationDashboard';
import JobContextPanel from '../components/JobContextPanel';
import CandidateTable from '../components/CandidateTable';
import CvArtifactModal from '../components/CvArtifactModal';
import EvaluationResult from '../components/EvaluationResult';
import * as api from '../api';
import '../styles/components.css';
import '../styles/responsive.css';

function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationResults, setEvaluationResults] = useState([]);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [cvModalCandidate, setCvModalCandidate] = useState(null);
  const [summaryRefreshTrigger, setSummaryRefreshTrigger] = useState(0);
  const [selectedCandidates, setSelectedCandidates] = useState([]);

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

  const handleJobSelect = async (job) => {
    setEvaluationResults([]);
    setStatusFilter(null);

    if (job) {
      try {
        const response = await api.getJob(job.id);
        const fullJob = response.job;
        setSelectedJob(fullJob);
        loadCandidates(job.id);
      } catch {
        setSelectedJob(job);
        loadCandidates(job.id);
      }
    } else {
      setSelectedJob(null);
      setCandidates([]);
    }
  };

  // Reset selection when job changes
  useEffect(() => {
    setSelectedCandidates([]);
  }, [selectedJob?.id]);

  const handleEvaluate = async () => {
    const toEvaluate = selectedCandidates.filter(c => !c.evaluated);
    if (!selectedJob || toEvaluate.length === 0) return;

    setEvaluating(true);
    setError(null);
    setEvaluationResults([]);

    try {
      for (const candidate of toEvaluate) {
        try {
          const result = await api.evaluateCandidate(selectedJob.id, candidate);
          setEvaluationResults(prev => [...prev, result]);

          setCandidates(prev =>
            prev.map(c =>
              c.id === candidate.id
                ? {
                    ...c,
                    evaluated: true,
                    evaluation: {
                      status: result.status,
                      reasoning: result.reasoning,
                      cv_text: result.cv_text || result.cvText,
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
      setSelectedCandidates([]);
      setSummaryRefreshTrigger(prev => prev + 1);
    }
  };

  const handleBulkDelete = async () => {
    const toDelete = selectedCandidates.filter(c => c.evaluated && c.evaluation?.id);
    if (toDelete.length === 0) return;

    const names = toDelete.map(c => c.name).join(', ');
    const confirmDelete = window.confirm(
      `Eliminar ${toDelete.length} evaluacion(es)?\n\n${names}\n\nEsto permitira volver a evaluar estos candidatos.`
    );

    if (!confirmDelete) return;

    try {
      const ids = toDelete.map(c => c.evaluation.id);
      await api.deleteEvaluationsBatch(ids);

      // Update local state
      const deletedIds = new Set(toDelete.map(c => c.id));
      setCandidates(prev =>
        prev.map(c =>
          deletedIds.has(c.id)
            ? { ...c, evaluated: false, evaluation: null }
            : c
        )
      );

      setSelectedCandidates([]);
      setSummaryRefreshTrigger(prev => prev + 1);
    } catch (err) {
      setError(`Error al eliminar evaluaciones: ${err.message}`);
    }
  };

  const handleFilterChange = (filter) => {
    setStatusFilter(filter);
  };

  const handleDeleteEvaluation = async (candidate) => {
    if (!candidate.evaluation) {
      alert('No se encontro evaluacion para este candidato');
      return;
    }

    const evaluationId = candidate.evaluation.id;

    if (!evaluationId) {
      alert('Error: ID de evaluacion no disponible.\n\nEsta evaluacion puede ser de una version anterior. Recarga la pagina e intenta nuevamente.');
      return;
    }

    const confirmDelete = window.confirm(
      `Eliminar la evaluacion de ${candidate.name}?\n\nEsto permitira volver a evaluar al candidato con la ultima version de su CV.`
    );

    if (!confirmDelete) return;

    try {
      await api.deleteEvaluation(evaluationId);
      loadCandidates(selectedJob.id);
      setSummaryRefreshTrigger(prev => prev + 1);
      alert(`Evaluacion de ${candidate.name} eliminada correctamente.\n\nYa puedes volver a evaluar con el CV actualizado.`);
    } catch (err) {
      alert(`Error al eliminar la evaluacion: ${err.message}`);
    }
  };

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
      <Header
        onEvaluate={handleEvaluate}
        onBulkDelete={handleBulkDelete}
        evaluateCount={selectedCandidates.filter(c => !c.evaluated).length}
        deleteCount={selectedCandidates.filter(c => c.evaluated && c.evaluation?.id).length}
        evaluating={evaluating}
      />

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
              refreshTrigger={summaryRefreshTrigger}
            />

            <JobContextPanel job={selectedJob} />

            <CandidateTable
              candidates={filteredCandidates}
              loading={loadingCandidates}
              evaluating={evaluating}
              onViewCV={setCvModalCandidate}
              onDeleteEvaluation={handleDeleteEvaluation}
              selectedCandidates={selectedCandidates}
              onSelectionChange={setSelectedCandidates}
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

      {cvModalCandidate && (
        <CvArtifactModal
          candidate={cvModalCandidate}
          onClose={() => setCvModalCandidate(null)}
        />
      )}
    </div>
  );
}

export default Dashboard;
