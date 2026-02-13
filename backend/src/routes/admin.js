const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, requireRole } = require('../middleware/auth');

// All admin routes require authentication + administrator role
router.use(authenticate);
router.use(requireRole('administrator'));

router.get('/users', userController.getUsers);
router.post('/users', userController.createUser);
router.put('/users/:id', userController.updateUser);
router.put('/users/:id/password', userController.changePassword);
router.patch('/users/:id/toggle-active', userController.toggleActive);
router.delete('/users/:id', userController.deleteUser);

module.exports = router;
