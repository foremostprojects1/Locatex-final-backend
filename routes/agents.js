const express = require('express');
const { body, query } = require('express-validator');
const {
  getAgents,
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent,
  getTopAgents,
  getAgentProperties,
  addAgentReview,
  updateAgentReview,
  deleteAgentReview,
  getAgentReviews,
  requestAgentRegistration,
  getAgentMe
} = require('../controllers/agents');
const { protect, authorize } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// @desc    Get all agents with filtering and pagination
// @route   GET /api/agents
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('verified').optional().isBoolean().withMessage('Verified must be a boolean'),
  query('city').optional().trim(),
  query('specialty').optional().trim()
], getAgents);

// @desc    Get current user's agent profile
// @route   GET /api/agents/me
// @access  Private
router.get('/me', protect, getAgentMe);

// @desc    Get top agents
// @route   GET /api/agents/top
// @access  Public
router.get('/top', getTopAgents);

// @desc    Get single agent
// @route   GET /api/agents/:id
// @access  Public
router.get('/:id', getAgent);

// @desc    Get agent's properties
// @route   GET /api/agents/:id/properties
// @access  Public
router.get('/:id/properties', getAgentProperties);

// @desc    Get agent reviews
// @route   GET /api/agents/:id/reviews
// @access  Public
router.get('/:id/reviews', getAgentReviews);

// @desc    Create new agent profile
// @route   POST /api/agents
// @access  Private (User with agent role)
router.post('/', protect, authorize('agent'), [
  body('bio').optional().trim().isLength({ max: 1000 }).withMessage('Bio cannot be more than 1000 characters'),
  body('experience').optional().isInt({ min: 0 }).withMessage('Experience must be a non-negative integer'),
  body('company.name').optional().trim(),
  body('company.address').optional().trim(),
  body('company.phone').optional().trim(),
  body('company.website').optional().trim(),
  body('specialties').optional().isArray().withMessage('Specialties must be an array'),
  body('languages').optional().isArray().withMessage('Languages must be an array'),
  body('socialMedia.facebook').optional().trim(),
  body('socialMedia.twitter').optional().trim(),
  body('socialMedia.instagram').optional().trim(),
  body('socialMedia.linkedin').optional().trim(),
  body('socialMedia.youtube').optional().trim()
], createAgent);

// @desc    Update agent profile
// @route   PUT /api/agents/:id
// @access  Private (Owner/Admin)
router.put('/:id', protect, [
  body('bio').optional().trim().isLength({ max: 1000 }),
  body('experience').optional().isInt({ min: 0 }),
  body('company.name').optional().trim(),
  body('company.address').optional().trim(),
  body('company.phone').optional().trim(),
  body('company.website').optional().trim(),
  body('specialties').optional().isArray(),
  body('languages').optional().isArray(),
  body('socialMedia.facebook').optional().trim(),
  body('socialMedia.twitter').optional().trim(),
  body('socialMedia.instagram').optional().trim(),
  body('socialMedia.linkedin').optional().trim(),
  body('socialMedia.youtube').optional().trim(),
  body('responseTime').optional().isIn(['within 1 hour', 'within 2 hours', 'within 4 hours', 'within 24 hours'])
], updateAgent);

// @desc    Delete agent profile
// @route   DELETE /api/agents/:id
// @access  Private (Owner/Admin)
router.delete('/:id', protect, deleteAgent);

// @desc    Add review to agent
// @route   POST /api/agents/:id/reviews
// @access  Private
router.post('/:id/reviews', protect, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim().isLength({ max: 500 }).withMessage('Comment cannot be more than 500 characters')
], addAgentReview);

// @desc    Update agent review
// @route   PUT /api/agents/:id/reviews/:reviewId
// @access  Private
router.put('/:id/reviews/:reviewId', protect, [
  body('rating').optional().isInt({ min: 1, max: 5 }),
  body('comment').optional().trim().isLength({ max: 500 })
], updateAgentReview);



// @desc    Request agent registration (for users who want to become agents)
// @route   POST /api/agents/registration-request
// @access  Private
router.post('/registration-request', protect, upload.single('avatar'), [
  body('bio').optional().trim().isLength({ max: 1000 }).withMessage('Bio cannot be more than 1000 characters'),
  body('experience').optional().isInt({ min: 0 }).withMessage('Experience must be a non-negative integer'),
  body('companyName').optional().trim(),
  body('companyAddress').optional().trim(),
  body('companyPhone').optional().trim(),
  body('companyWebsite').optional().trim(),
  body('specialties').optional().isArray().withMessage('Specialties must be an array'),
  body('languages').optional().isArray().withMessage('Languages must be an array'),
  body('socialMedia.facebook').optional().trim(),
  body('socialMedia.twitter').optional().trim(),
  body('socialMedia.instagram').optional().trim(),
  body('socialMedia.linkedin').optional().trim(),
  body('socialMedia.youtube').optional().trim(),
  body('responseTime').optional().isIn(['within 1 hour', 'within 2 hours', 'within 4 hours', 'within 24 hours'])
], requestAgentRegistration);

module.exports = router;
