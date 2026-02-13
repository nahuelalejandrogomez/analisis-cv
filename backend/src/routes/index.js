const express = require('express');
const router = express.Router();

const jobController = require('../controllers/jobController');
const candidateController = require('../controllers/candidateController');
const evaluationController = require('../controllers/evaluationController');
const authRoutes = require('./auth');
const adminRoutes = require('./admin');
const { authenticate } = require('../middleware/auth');

// Auth routes (login is public, /me is protected inside)
router.use('/auth', authRoutes);

// Admin routes (protected inside)
router.use('/admin', adminRoutes);

// All routes below require authentication
router.use(authenticate);

// Jobs
router.get('/jobs', jobController.getJobs);
router.get('/jobs/:jobId', jobController.getJob);
router.post('/jobs/refresh', jobController.refreshJobs);

// Candidates
router.get('/jobs/:jobId/candidates', candidateController.getCandidates);
router.get('/candidates/:candidateId/cv', candidateController.getCVText);
router.get('/candidates/:candidateId/cv-metadata', candidateController.getCVMetadata);
router.get('/candidates/:candidateId/resume/download', candidateController.downloadResume);

// Evaluations
router.post('/evaluate', evaluationController.evaluateCandidate);
router.post('/evaluate/batch', evaluationController.evaluateBatch);
router.get('/evaluations', evaluationController.getEvaluations);
router.get('/evaluations/stats/:jobId', evaluationController.getStats);
router.get('/jobs/:jobId/evaluations/summary', evaluationController.getSummary);
router.post('/evaluations/delete-batch', evaluationController.deleteEvaluationsBatch);
router.delete('/evaluations/clear/:status', evaluationController.clearEvaluationsByStatus);
router.delete('/evaluations/clear', evaluationController.clearEvaluations);
router.delete('/evaluations/:id', evaluationController.deleteEvaluation);

module.exports = router;
