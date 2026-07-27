const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { verifyToken, isAdmin, isSuperAdmin } = require('../middleware/auth');

// Public routes
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);

// Protected routes
router.get('/me', verifyToken, AuthController.getMe);
router.post('/change-password', verifyToken, AuthController.changePassword);

// Admin only routes
router.post('/register', verifyToken, isAdmin, AuthController.register);
router.get('/users', verifyToken, isAdmin, AuthController.getAllUsers);
router.put('/users/:id', verifyToken, isAdmin, AuthController.updateUser);

// SuperAdmin only routes
router.delete('/users/:id', verifyToken, isSuperAdmin, AuthController.deleteUser);

module.exports = router;