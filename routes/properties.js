const express = require('express');
const { body, query } = require('express-validator');
const {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  getMyProperties,
  getFeaturedProperties,
  getPropertiesByAgent,
  getPropertiesByType,
  searchProperties,
  addToFavorites,
  removeFromFavorites,
  getFavoriteProperties,
  incrementViews,
  uploadImages,
  getCategoryCounts,
  getUniqueLocations
} = require('../controllers/properties');
const { protect, authorize } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// @desc    Get all properties with filtering and pagination
// @route   GET /api/properties
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('Min price must be a positive number'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max price must be a positive number'),
  query('propertyType').optional().isIn(['apartment', 'house', 'villa', 'condo', 'commercial', 'land', 'garage']),
  query('status').optional().isIn(['available', 'sold', 'rented', 'pending']),
  query('city').optional().trim(),
  query('bedrooms').optional().isInt({ min: 0 }),
  query('bathrooms').optional().isInt({ min: 0 }),
  query('minArea').optional().isFloat({ min: 0 }),
  query('maxArea').optional().isFloat({ min: 0 })
], getProperties);

// @desc    Get featured properties
// @route   GET /api/properties/featured
// @access  Public
router.get('/featured', getFeaturedProperties);

// @desc    Get properties for current user
// @route   GET /api/properties/my
// @access  Private
router.get('/my', protect, getMyProperties);

// @desc    Search properties
// @route   GET /api/properties/search
// @access  Public
router.get('/search', [
  query('q').notEmpty().withMessage('Search query is required'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], searchProperties);

// @desc    Get properties by type
// @route   GET /api/properties/type/:type
// @access  Public
router.get('/type/:type', getPropertiesByType);

// @desc    Get properties by agent
// @route   GET /api/properties/agent/:agentId
// @access  Public
router.get('/agent/:agentId', getPropertiesByAgent);

// @desc    Get single property
// @route   GET /api/properties/:id
// @access  Public
router.get('/:id', incrementViews, getProperty);

// @desc    Get category counts
// @route   GET /api/properties/category-counts
// @access  Public
router.get('/category-counts', getCategoryCounts);

// @desc    Get unique locations (districts, villages)
// @route   GET /api/properties/locations
// @access  Public
router.get('/locations', getUniqueLocations);

// @desc    Upload property images
// @route   POST /api/properties/upload-images
// @access  Private
router.post('/upload-images', protect, upload.array('images', 10), handleUploadError, uploadImages);

// @desc    Create new property
// @route   POST /api/properties
// @access  Private (All authenticated users)
router.post('/', protect, upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'document712', maxCount: 1 },
  { name: 'document8A', maxCount: 1 },
  { name: 'documentUtarotar', maxCount: 1 },
  { name: 'otherDocuments', maxCount: 5 }
]), [
  body('title').trim().isLength({ min: 5, max: 100 }).withMessage('Title must be between 5 and 100 characters'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('status').isIn(['for-sale', 'for-rent']).withMessage('Invalid status'),
  body('type').isIn(['apartment', 'house', 'commercial', 'industrial', 'land']).withMessage('Invalid property type'),
  body('totalArea').isFloat({ min: 0 }).withMessage('Total area must be a positive number'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('latitude').isFloat().withMessage('Valid latitude is required'),
  body('longitude').isFloat().withMessage('Valid longitude is required'),
  body('contactName').trim().notEmpty().withMessage('Contact name is required'),
  body('contactEmail').isEmail().withMessage('Valid contact email is required'),
  body('contactPhone').trim().notEmpty().withMessage('Contact phone is required')
], handleUploadError, createProperty);

// @desc    Update property
// @route   PUT /api/properties/:id
// @access  Private (Owner/Admin)
router.put('/:id', protect, upload.array('images', 10), [
  body('title').optional().trim().isLength({ min: 5, max: 100 }),
  body('description').optional().trim().isLength({ min: 20, max: 2000 }),
  body('price').optional().isFloat({ min: 0 }),
  body('priceType').optional().isIn(['sale', 'rent', 'lease']),
  body('propertyType').optional().isIn(['apartment', 'house', 'villa', 'condo', 'commercial', 'land', 'garage']),
  body('status').optional().isIn(['available', 'sold', 'rented', 'pending'])
], handleUploadError, updateProperty);

// @desc    Delete property
// @route   DELETE /api/properties/:id
// @access  Private (Owner/Admin)
router.delete('/:id', protect, deleteProperty);

// @desc    Add property to favorites
// @route   POST /api/properties/:id/favorite
// @access  Private
router.post('/:id/favorite', protect, addToFavorites);

// @desc    Remove property from favorites
// @route   DELETE /api/properties/:id/favorite
// @access  Private
router.delete('/:id/favorite', protect, removeFromFavorites);

// @desc    Get user's favorite properties
// @route   GET /api/properties/favorites/my
// @access  Private
router.get('/favorites/my', protect, getFavoriteProperties);

module.exports = router;
