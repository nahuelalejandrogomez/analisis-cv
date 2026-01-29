const express = require('express');
const router = express.Router();

const jobController = require('../controllers/jobController');
const candidateController = require('../controllers/candidateController');
const evaluationController = require('../controllers/evaluationController');
const migrationController = require('../controllers/migrationController');
const { authMiddleware } = require('../middleware/authMiddleware');

// ============================================================================
// PROTECTED ROUTES (requieren autenticación)
// Nota: Las rutas de auth están en /auth (no /api/auth) - ver authRoutes.js
// ============================================================================

// Jobs routes
router.get('/jobs', authMiddleware, jobController.getJobs);
router.get('/jobs/:jobId', authMiddleware, jobController.getJob);
router.post('/jobs/refresh', authMiddleware, jobController.refreshJobs);

// Candidates routes
router.get('/jobs/:jobId/candidates', authMiddleware, candidateController.getCandidates);
router.get('/candidates/:candidateId/cv', authMiddleware, candidateController.getCVText);
router.get('/candidates/:candidateId/cv-metadata', authMiddleware, candidateController.getCVMetadata);
router.get('/candidates/:candidateId/resume/download', authMiddleware, candidateController.downloadResume);

// Evaluation routes
router.post('/evaluate', authMiddleware, evaluationController.evaluateCandidate);
router.post('/evaluate/batch', authMiddleware, evaluationController.evaluateBatch);
router.get('/evaluations', authMiddleware, evaluationController.getEvaluations);
router.get('/evaluations/stats/:jobId', authMiddleware, evaluationController.getStats);
router.get('/jobs/:jobId/evaluations/summary', authMiddleware, evaluationController.getSummary);
// Clear routes ANTES de la ruta dinámica :id
router.delete('/evaluations/clear/:status', authMiddleware, evaluationController.clearEvaluationsByStatus);
router.delete('/evaluations/clear', authMiddleware, evaluationController.clearEvaluations);
// Ruta dinámica al final
router.delete('/evaluations/:id', authMiddleware, evaluationController.deleteEvaluation);

// ============================================================================
// ADMIN ROUTES
// ============================================================================
// TEMPORARY: Migration endpoint (remove after use)
router.post('/migrations/run', authMiddleware, migrationController.runMigrations);

module.exports = router;
