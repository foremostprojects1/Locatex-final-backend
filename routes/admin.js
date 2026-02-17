const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getPendingProperties,
  approveProperty,
  rejectProperty,
  getAllProperties,
  getPropertyStats,
  getUsers,
  updateUserStatus,
  deleteUser
} = require('../controllers/admin');

// All admin routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// Property management routes
router.get('/properties/pending', getPendingProperties);
router.get('/properties', getAllProperties);
router.get('/properties/stats', getPropertyStats);
router.put('/properties/:id/approve', approveProperty);
router.put('/properties/:id/reject', rejectProperty);

// User management routes
router.get('/users', getUsers);
router.put('/users/:id/status', updateUserStatus);
router.delete('/users/:id', deleteUser);

module.exports = router;
