const Property = require('../models/Property');
const User = require('../models/User');
const Agent = require('../models/Agent');

// @desc    Get properties for the logged-in user
// @route   GET /api/properties/my
// @access  Private
const getMyProperties = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { owner: req.user.id };

    const properties = await Property.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('title price status type images location createdAt approvalStatus views');

    const total = await Property.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        properties,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get my properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching your properties'
    });
  }
};

// @desc    Get all properties with filtering and pagination
// @route   GET /api/properties
// @access  Public
const getProperties = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object: show publicly visible properties
    // Return properties that are published OR have been approved.
    // This allows approved items to appear even if isPublished wasn't toggled yet.
    const filter = { $or: [{ isPublished: true }, { approvalStatus: 'approved' }] };

    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) filter.price.$lte = parseFloat(req.query.maxPrice);
    }

    if (req.query.propertyType) filter.propertyType = req.query.propertyType;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.city) filter['location.city'] = new RegExp(req.query.city, 'i');
    if (req.query.district) filter['location.district'] = new RegExp(req.query.district, 'i');
    if (req.query.village) filter['location.village'] = new RegExp(req.query.village, 'i');
    if (req.query.bedrooms) filter['specifications.bedrooms'] = parseInt(req.query.bedrooms);
    if (req.query.bathrooms) filter['specifications.bathrooms'] = parseInt(req.query.bathrooms);

    if (req.query.minArea || req.query.maxArea) {
      filter['specifications.area'] = {};
      if (req.query.minArea) filter['specifications.area'].$gte = parseFloat(req.query.minArea);
      if (req.query.maxArea) filter['specifications.area'].$lte = parseFloat(req.query.maxArea);
    }

    // Build sort object
    let sort = { createdAt: -1 };
    if (req.query.sort) {
      switch (req.query.sort) {
        case 'price-asc':
          sort = { price: 1 };
          break;
        case 'price-desc':
          sort = { price: -1 };
          break;
        case 'newest':
          sort = { createdAt: -1 };
          break;
        case 'oldest':
          sort = { createdAt: 1 };
          break;
        case 'area-asc':
          sort = { 'specifications.area': 1 };
          break;
        case 'area-desc':
          sort = { 'specifications.area': -1 };
          break;
      }
    }

    const properties = await Property.find(filter)
      .populate('agent', 'user bio specialties ratings')
      .populate('agent.user', 'name email phone avatar')
      .populate('owner', 'name email phone')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Property.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: {
        properties,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

// @desc    Get single property
// @route   GET /api/properties/:id
// @access  Public
const getProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('agent', 'user bio specialties ratings experience')
      .populate('agent.user', 'name email phone avatar')
      .populate('owner', 'name email phone');

    if (!property) {
      return res.status(404).json({
        status: 'error',
        message: 'Property not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        property
      }
    });
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

// @desc    Create new property
// @route   POST /api/properties
// @access  Private (Agent/Admin)
const createProperty = async (req, res) => {
  try {
    console.log('Creating property with data:', req.body);
    console.log('Files received:', req.files);

    const propertyData = { ...req.body };

    // Handle uploaded images
    if (req.files && req.files.images && req.files.images.length > 0) {
      propertyData.images = req.files.images.map((file, index) => ({
        url: file.path,
        alt: file.originalname,
        isPrimary: index === 0
      }));
    } else {
      propertyData.images = [];
    }

    // Handle document uploads
    if (req.files) {
      propertyData.documents = {};

      // Handle specific document types
      if (req.files.document712 && req.files.document712.length > 0) {
        propertyData.documents.document712 = req.files.document712[0].path;
      }
      if (req.files.document8A && req.files.document8A.length > 0) {
        propertyData.documents.document8A = req.files.document8A[0].path;
      }
      if (req.files.documentUtarotar && req.files.documentUtarotar.length > 0) {
        propertyData.documents.documentUtarotar = req.files.documentUtarotar[0].path;
      }
      if (req.files.otherDocuments && req.files.otherDocuments.length > 0) {
        propertyData.documents.otherDocuments = req.files.otherDocuments.map(file => file.path);
      }
    } else {
      propertyData.documents = {};
    }

    // Handle land information
    if (propertyData.type === 'land') {
      propertyData.landInfo = {
        fencing: propertyData.fencing,
        borewell: propertyData.borewell,
        houseOnLand: propertyData.houseOnLand,
        electricity: propertyData.electricity,
        expectedPricePerUnit: propertyData.expectedPricePerUnit ? parseFloat(propertyData.expectedPricePerUnit) : undefined,
        paymentTerms: propertyData.paymentTerms,
        legacyLand: propertyData.legacyLand
      };
    }

    // Handle contact information
    propertyData.contactInfo = {
      name: propertyData.contactName,
      email: propertyData.contactEmail,
      phone: propertyData.contactPhone,
      whatsappNumber: propertyData.whatsappNumber,
      preferredContact: propertyData.preferredContact
    };

    // Handle location coordinates - build complete location object
    propertyData.location = {
      address: propertyData.address || `${propertyData.village || ''}, ${propertyData.taluka || ''}, ${propertyData.district || ''}, ${propertyData.state || ''}`,
      city: propertyData.city || propertyData.taluka || propertyData.district || '',
      state: propertyData.state,
      district: propertyData.district,
      taluka: propertyData.taluka,
      village: propertyData.village,
      zipCode: propertyData.zipCode || propertyData.pincode || '',
      country: propertyData.country || 'India',
      coordinates: {
        latitude: parseFloat(propertyData.latitude) || 0,
        longitude: parseFloat(propertyData.longitude) || 0
      }
    };

    // Handle amenities array
    if (propertyData.amenities) {
      try {
        propertyData.amenities = JSON.parse(propertyData.amenities);
      } catch (e) {
        propertyData.amenities = [];
      }
    } else {
      propertyData.amenities = [];
    }

    // Handle disadvantages array
    if (propertyData.disadvantages) {
      try {
        // Check if it's already an array or a JSON string
        if (typeof propertyData.disadvantages === 'string') {
           // Try parsing if it looks like JSON array
           if (propertyData.disadvantages.trim().startsWith('[')) {
               propertyData.disadvantages = JSON.parse(propertyData.disadvantages);
           } else {
               // If it's a single string value, make it an array
               propertyData.disadvantages = [propertyData.disadvantages];
           }
        }
      } catch (e) {
        propertyData.disadvantages = [];
      }
    } else {
      propertyData.disadvantages = [];
    }

    // Handle Government Details
    propertyData.govDetails = {
        khaataNumber: propertyData.khaataNumber,
        surveyNumber: propertyData.surveyNumber,
        area: propertyData.govArea // Mapping from frontend 'govArea' to model 'area' inside govDetails
    };

    // Handle insertedBy
    propertyData.insertedBy = propertyData.insertedBy || 'Owner';

    // Set owner to current user
    propertyData.owner = req.user.id;

    // If user is an agent, link their agent profile
    if (req.user.role === 'agent') {
      const agentProfile = await Agent.findOne({ user: req.user.id });
      if (agentProfile) {
        propertyData.agent = agentProfile._id;
      }
    }

    // Set default values
    propertyData.isPublished = false; // Require approval
    propertyData.isActive = true;
    propertyData.approvalStatus = 'pending'; // Default status

    // Normalize numeric optional fields
    if (propertyData.bathrooms !== undefined && propertyData.bathrooms !== '') {
      propertyData.bathrooms = parseInt(propertyData.bathrooms, 10);
    }
    if (propertyData.balconies !== undefined && propertyData.balconies !== '') {
      propertyData.balconies = parseInt(propertyData.balconies, 10);
    }

    // Clean up the data - remove fields that shouldn't be in the model
    delete propertyData.contactName;
    delete propertyData.contactEmail;
    delete propertyData.contactPhone;
    delete propertyData.whatsappNumber;
    delete propertyData.preferredContact;
    delete propertyData.latitude;
    delete propertyData.longitude;
    delete propertyData.address;
    delete propertyData.city;
    delete propertyData.state;
    delete propertyData.zipCode;
    delete propertyData.country;
    delete propertyData.khaataNumber;
    delete propertyData.govArea;
    // surveyNumber might be used in documents too, but if it matches, fine. 
    // If it was in root, remove it after mapping to govDetails
    if (propertyData.govDetails.surveyNumber) delete propertyData.surveyNumber;

    console.log('Final property data:', propertyData);

    const property = await Property.create(propertyData);

    // Populate the created property
    await property.populate([
      { path: 'agent', select: 'user bio specialties ratings' },
      { path: 'agent.user', select: 'name email phone avatar' },
      { path: 'owner', select: 'name email phone' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Property submitted successfully and is pending approval',
      data: {
        property
      }
    });
  } catch (error) {
    console.error('Create property error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate entry error',
        error: 'A property with this information already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during property creation',
      error: error.message
    });
  }
};

// @desc    Update property
// @route   PUT /api/properties/:id
// @access  Private (Owner/Admin)
const updateProperty = async (req, res) => {
  try {
    let property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        status: 'error',
        message: 'Property not found'
      });
    }

    // Check if user is owner or admin
    if (property.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this property'
      });
    }

    // Handle uploaded images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file, index) => ({
        url: file.path,
        alt: file.originalname,
        isPrimary: index === 0 && property.images.length === 0
      }));

      req.body.images = [...property.images, ...newImages];
    }

    property = await Property.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate([
      { path: 'agent', select: 'user bio specialties ratings' },
      { path: 'agent.user', select: 'name email phone avatar' },
      { path: 'owner', select: 'name email phone' }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        property
      }
    });
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during property update'
    });
  }
};

// @desc    Delete property
// @route   DELETE /api/properties/:id
// @access  Private (Owner/Admin)
const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        status: 'error',
        message: 'Property not found'
      });
    }

    // Check if user is owner or admin
    if (property.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to delete this property'
      });
    }

    await Property.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Property deleted successfully'
    });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during property deletion'
    });
  }
};

// @desc    Get featured properties
// @route   GET /api/properties/featured
// @access  Public
const getFeaturedProperties = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;

    const properties = await Property.find({
      isFeatured: true,
      isPublished: true
    })
      .populate('agent', 'user bio specialties ratings')
      .populate('agent.user', 'name email phone avatar')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json({
      status: 'success',
      data: {
        properties
      }
    });
  } catch (error) {
    console.error('Get featured properties error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

// @desc    Get properties by agent
// @route   GET /api/properties/agent/:agentId
// @access  Public
const getPropertiesByAgent = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const properties = await Property.find({
      agent: req.params.agentId,
      isPublished: true
    })
      .populate('agent', 'user bio specialties ratings')
      .populate('agent.user', 'name email phone avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Property.countDocuments({
      agent: req.params.agentId,
      isPublished: true
    });

    res.status(200).json({
      status: 'success',
      data: {
        properties,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get properties by agent error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

// @desc    Get properties by type
// @route   GET /api/properties/type/:type
// @access  Public
const getPropertiesByType = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const properties = await Property.find({
      propertyType: req.params.type,
      isPublished: true
    })
      .populate('agent', 'user bio specialties ratings')
      .populate('agent.user', 'name email phone avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Property.countDocuments({
      propertyType: req.params.type,
      isPublished: true
    });

    res.status(200).json({
      status: 'success',
      data: {
        properties,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get properties by type error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

// @desc    Search properties
// @route   GET /api/properties/search
// @access  Public
const searchProperties = async (req, res) => {
  try {
    const { q } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const properties = await Property.find({
      $text: { $search: q },
      isPublished: true
    })
      .populate('agent', 'user bio specialties ratings')
      .populate('agent.user', 'name email phone avatar')
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(limit);

    const total = await Property.countDocuments({
      $text: { $search: q },
      isPublished: true
    });

    res.status(200).json({
      status: 'success',
      data: {
        properties,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Search properties error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

// @desc    Add property to favorites
// @route   POST /api/properties/:id/favorite
// @access  Private
const addToFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const propertyId = req.params.id;

    if (user.favorites.includes(propertyId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Property already in favorites'
      });
    }

    user.favorites.push(propertyId);
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Property added to favorites'
    });
  } catch (error) {
    console.error('Add to favorites error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

// @desc    Remove property from favorites
// @route   DELETE /api/properties/:id/favorite
// @access  Private
const removeFromFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const propertyId = req.params.id;

    user.favorites = user.favorites.filter(
      fav => fav.toString() !== propertyId
    );
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Property removed from favorites'
    });
  } catch (error) {
    console.error('Remove from favorites error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

// @desc    Get user's favorite properties
// @route   GET /api/properties/favorites/my
// @access  Private
const getFavoriteProperties = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'favorites',
      populate: [
        { path: 'agent', select: 'user bio specialties ratings' },
        { path: 'agent.user', select: 'name email phone avatar' }
      ]
    });

    res.status(200).json({
      status: 'success',
      data: {
        properties: user.favorites
      }
    });
  } catch (error) {
    console.error('Get favorite properties error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

// @desc    Increment property views
// @route   GET /api/properties/:id
// @access  Public
const incrementViews = async (req, res, next) => {
  try {
    await Property.findByIdAndUpdate(req.params.id, {
      $inc: { views: 1 }
    });
    next();
  } catch (error) {
    console.error('Increment views error:', error);
    next();
  }
};

// @desc    Upload property images
// @route   POST /api/properties/upload-images
// @access  Private
const uploadImages = async (req, res) => {
  try {
    console.log('Upload images - Files received:', req.files);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images uploaded'
      });
    }

    const uploadedImages = req.files.map((file, index) => ({
      id: `img_${Date.now()}_${index}`,
      url: file.path,
      alt: file.originalname,
      isPrimary: index === 0
    }));

    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      id: uploadedImages[0].id, // Return the first image ID for Dropzone
      data: {
        images: uploadedImages
      }
    });
  } catch (error) {
    console.error('Upload images error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during image upload',
      error: error.message
    });
  }
};

// @desc    Get category counts
// @route   GET /api/properties/category-counts
// @access  Public
const getCategoryCounts = async (req, res) => {
  try {
    console.log('🔍 Starting category count calculation...');

    // Initialize counters for each property type
    let houseCount = 0;
    let apartmentCount = 0;
    let commercialCount = 0;
    let landCount = 0;
    let industrialCount = 0;

    console.log('📊 Initial counts:', {
      house: houseCount,
      apartment: apartmentCount,
      commercial: commercialCount,
      land: landCount,
      industrial: industrialCount
    });

    // Fetch all published/approved properties
    const properties = await Property.find({
      $or: [
        { isPublished: true },
        { approvalStatus: 'approved' }
      ]
    }).select('type'); // Only select the type field for efficiency

    console.log('📋 Found', properties.length, 'properties to process');

    // Count properties by type
    properties.forEach(property => {
      const propertyType = property.type;
      console.log('🔍 Processing property type:', propertyType);

      switch (propertyType) {
        case 'house':
          houseCount++;
          break;
        case 'apartment':
          apartmentCount++;
          break;
        case 'commercial':
          commercialCount++;
          break;
        case 'land':
          landCount++;
          break;
        case 'industrial':
          industrialCount++;
          break;
        default:
          console.log('⚠️ Unknown property type:', propertyType);
      }
    });

    // Create the final counts object
    const categoryCounts = {
      'house': houseCount,
      'apartment': apartmentCount,
      'commercial': commercialCount,
      'land': landCount,
      'industrial': industrialCount
    };

    console.log('✅ Final category counts:', categoryCounts);

    res.status(200).json({
      status: 'success',
      data: categoryCounts
    });
  } catch (error) {
    console.error('Get category counts error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

// @desc    Get unique locations (districts, villages)
// @route   GET /api/properties/locations
// @access  Public
const getUniqueLocations = async (req, res) => {
  try {
    const districts = await Property.distinct('location.district', { isPublished: true });
    const villages = await Property.distinct('location.village', { isPublished: true });

    res.status(200).json({
      status: 'success',
      data: {
        districts: districts.filter(Boolean).sort(),
        villages: villages.filter(Boolean).sort()
      }
    });
  } catch (error) {
    console.error('Get unique locations error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

module.exports = {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  getFeaturedProperties,
  getPropertiesByAgent,
  getPropertiesByType,
  searchProperties,
  addToFavorites,
  removeFromFavorites,
  getFavoriteProperties,
  incrementViews,
  uploadImages,
  getMyProperties,
  getCategoryCounts,
  getUniqueLocations
};
