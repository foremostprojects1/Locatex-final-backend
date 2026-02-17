const express = require('express');
const { body, query } = require('express-validator');
const {
  createContact,
  getContacts,
  getContact,
  updateContact,
  deleteContact,
  replyToContact,
  markAsRead,
  getContactStats,
  getUserMessages
} = require('../controllers/contact');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Create contact message
// @route   POST /api/contact
// @access  Public
router.post('/', [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('phone').optional().trim().isLength({ max: 20 }).withMessage('Phone number cannot be more than 20 characters'),
  body('subject').trim().isLength({ min: 5, max: 100 }).withMessage('Subject must be between 5 and 100 characters'),
  body('message').trim().isLength({ min: 10, max: 1000 }).withMessage('Message must be between 10 and 1000 characters'),
  body('type').optional().isIn(['general', 'property_inquiry', 'agent_contact', 'support']).withMessage('Invalid contact type'),
  body('property').optional().isMongoId().withMessage('Invalid property ID'),
  body('agent').optional().isMongoId().withMessage('Invalid agent ID')
], createContact);

// @desc    Get user's own messages
// @route   GET /api/contact/my-messages
// @access  Private (User)
router.get('/my-messages', protect, getUserMessages);

// @desc    Get all contacts (Admin/Staff)
// @route   GET /api/contact
// @access  Private (Admin/Staff)
router.get('/', protect, authorize('admin'), [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['new', 'read', 'replied', 'closed']).withMessage('Invalid status'),
  query('type').optional().isIn(['general', 'property_inquiry', 'agent_contact', 'support']).withMessage('Invalid type'),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  query('assignedTo').optional().isMongoId().withMessage('Invalid assigned user ID')
], getContacts);

// @desc    Get contact statistics
// @route   GET /api/contact/stats
// @access  Private (Admin)
router.get('/stats', protect, authorize('admin'), getContactStats);

// @desc    Get single contact
// @route   GET /api/contact/:id
// @access  Private (Admin/Staff)
router.get('/:id', protect, authorize('admin'), getContact);

// @desc    Update contact
// @route   PUT /api/contact/:id
// @access  Private (Admin/Staff)
router.put('/:id', protect, authorize('admin'), [
  body('status').optional().isIn(['new', 'read', 'replied', 'closed']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('assignedTo').optional().isMongoId().withMessage('Invalid assigned user ID')
], updateContact);

// @desc    Reply to contact
// @route   POST /api/contact/:id/reply
// @access  Private (Admin/Staff)
router.post('/:id/reply', protect, authorize('admin'), [
  body('message').trim().isLength({ min: 10, max: 1000 }).withMessage('Reply message must be between 10 and 1000 characters')
], replyToContact);

// @desc    Mark contact as read
// @route   PUT /api/contact/:id/read
// @access  Private (Admin/Staff)
router.put('/:id/read', protect, authorize('admin'), markAsRead);

// @desc    Delete contact
// @route   DELETE /api/contact/:id
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), deleteContact);

module.exports = router;
