const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');

// AUTH ROUTES (montadas en /auth, no en /api)
router.get('/google/login-url', authController.googleLoginUrl);
router.get('/google/callback', authController.googleCallback);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, authController.getCurrentUser);

module.exports = router;
