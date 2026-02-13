const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Public
router.post('/login', authController.login);

// Protected
router.get('/me', authenticate, authController.getMe);

module.exports = router;
