const express = require('express');
const router = express.Router();

const jobController = require('../controllers/jobController');
const candidateController = require('../controllers/candidateController');
const evaluationController = require('../controllers/evaluationController');

// Jobs routes
router.get('/jobs', jobController.getJobs);
router.get('/jobs/:jobId', jobController.getJob);
router.post('/jobs/refresh', jobController.refreshJobs);

// Candidates routes
router.get('/jobs/:jobId/candidates', candidateController.getCandidates);
router.get('/candidates/:candidateId/cv', candidateController.getCVText);
router.get('/candidates/:candidateId/resume/download', candidateController.downloadResume);

// Evaluation routes
router.post('/evaluate', evaluationController.evaluateCandidate);
router.post('/evaluate/batch', evaluationController.evaluateBatch);
router.get('/evaluations', evaluationController.getEvaluations);
router.get('/evaluations/stats/:jobId', evaluationController.getStats);
// Clear routes ANTES de la ruta dinámica :id
router.delete('/evaluations/clear/:status', evaluationController.clearEvaluationsByStatus);
router.delete('/evaluations/clear', evaluationController.clearEvaluations);
// Ruta dinámica al final
router.delete('/evaluations/:id', evaluationController.deleteEvaluation);

module.exports = router;
