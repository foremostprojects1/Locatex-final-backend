const express = require('express');
const { body, query } = require('express-validator');
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  updateUserRole,
  getUserStats,
  getUsersByRole
} = require('../controllers/users');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private (Admin)
router.get('/', protect, authorize('admin'), [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('role').optional().isIn(['user', 'agent', 'admin']).withMessage('Invalid role'),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
], getUsers);

// @desc    Get users by role
// @route   GET /api/users/role/:role
// @access  Private (Admin)
router.get('/role/:role', protect, authorize('admin'), getUsersByRole);

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private (Admin)
router.get('/stats', protect, authorize('admin'), getUserStats);

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Admin/Owner)
router.get('/:id', protect, getUser);

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin/Owner)
router.put('/:id', protect, [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('phone').optional().trim().isLength({ max: 20 }).withMessage('Phone number cannot be more than 20 characters'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
], updateUser);

// @desc    Update user role
// @route   PUT /api/users/:id/role
// @access  Private (Admin)
router.put('/:id/role', protect, authorize('admin'), [
  body('role').isIn(['user', 'agent', 'admin']).withMessage('Invalid role')
], updateUserRole);

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), deleteUser);

module.exports = router;
