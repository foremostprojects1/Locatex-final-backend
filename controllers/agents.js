const Agent = require('../models/Agent');
const Property = require('../models/Property');
const User = require('../models/User');

// @desc    Get all agents with filtering and pagination
// @route   GET /api/agents
// @access  Public
const getAgents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};

    // Verified filter (string 'true'/'false')
    if (req.query.verified !== undefined) {
      filter.isVerified = req.query.verified === 'true';
    }

    // Active filter handling
    // If explicit active provided, honor it. Otherwise, default to active=true
    // EXCEPT when requesting verified=false (pending), in which case do not force active=true
    if (req.query.active !== undefined) {
      filter.isActive = req.query.active === 'true';
    } else if (!(req.query.verified === 'false')) {
      filter.isActive = true;
    }

    if (req.query.city) {
      filter['company.address'] = new RegExp(req.query.city, 'i');
    }


    if (req.query.specialty) {
      filter.specialties = new RegExp(req.query.specialty, 'i');
    }

    if (req.query.district) {
      filter['company.district'] = new RegExp(req.query.district, 'i');
    }

    if (req.query.village) {
      filter['company.village'] = new RegExp(req.query.village, 'i');
    }

    // Build sort object
    let sort = { 'ratings.average': -1, createdAt: -1 };
    if (req.query.sort) {
      switch (req.query.sort) {
        case 'rating':
          sort = { 'ratings.average': -1 };
          break;
        case 'experience':
          sort = { experience: -1 };
          break;
        case 'properties':
          sort = { propertiesSold: -1 };
          break;
        case 'newest':
          sort = { createdAt: -1 };
          break;
      }
    }

    const agents = await Agent.find(filter)
      .populate('user', 'name email phone avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Agent.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: {
        agents,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

// @desc    Get single agent
// @route   GET /api/agents/:id
// @access  Public
const getAgent = async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id)
      .populate('user', 'name email phone avatar')
      .populate('reviews.user', 'name avatar');

    if (!agent) {
      return res.status(404).json({
        status: 'error',
        message: 'Agent not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        agent
      }
    });
  } catch (error) {
    console.error('Get agent error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

// @desc    Create new agent profile
// @route   POST /api/agents
// @access  Private (User with agent role)
const createAgent = async (req, res) => {
  try {
    // Check if agent profile already exists
    const existingAgent = await Agent.findOne({ user: req.user.id });
    if (existingAgent) {
      return res.status(400).json({
        status: 'error',
        message: 'Agent profile already exists'
      });
    }

    const agentData = {
      user: req.user.id,
      ...req.body
    };

    const agent = await Agent.create(agentData);
    await agent.populate('user', 'name email phone avatar');

    res.status(201).json({
      status: 'success',
      data: {
        agent
      }
    });
  } catch (error) {
    console.error('Create agent error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during agent creation'
    });
  }
};

// @desc    Update agent profile
// @route   PUT /api/agents/:id
// @access  Private (Owner/Admin)
const updateAgent = async (req, res) => {
  try {
    let agent = await Agent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({
        status: 'error',
        message: 'Agent not found'
      });
    }

    // Check if user is owner or admin
    if (agent.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this agent profile'
      });
    }

    const wasVerified = !!agent.isVerified;

    agent = await Agent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('user', 'name email phone avatar');

    // If agent got verified in this update, set the linked user's role to 'agent'
    if (!wasVerified && agent && agent.isVerified === true) {
      try {
        await User.findByIdAndUpdate(agent.user._id || agent.user, { role: 'agent' });
      } catch (e) {
        console.error('Failed to set user role to agent:', e);
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        agent
      }
    });
  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during agent update'
    });
  }
};

// @desc    Delete agent profile
// @route   DELETE /api/agents/:id
// @access  Private (Owner/Admin)
const deleteAgent = async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({
        status: 'error',
        message: 'Agent not found'
      });
    }

    // Check if user is owner or admin
    if (agent.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to delete this agent profile'
      });
    }

    await Agent.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Agent profile deleted successfully'
    });
  } catch (error) {
    console.error('Delete agent error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during agent deletion'
    });
  }
};

// @desc    Get top agents
// @route   GET /api/agents/top
// @access  Public
const getTopAgents = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;

    const agents = await Agent.find({ 
      isActive: true,
      isVerified: true 
    })
      .populate('user', 'name email phone avatar')
      .sort({ 'ratings.average': -1, propertiesSold: -1 })
      .limit(limit);

    res.status(200).json({
      status: 'success',
      data: {
        agents
      }
    });
  } catch (error) {
    console.error('Get top agents error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

// @desc    Get agent's properties
// @route   GET /api/agents/:id/properties
// @access  Public
const getAgentProperties = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const properties = await Property.find({ 
      agent: req.params.id,
      isPublished: true 
    })
      .populate('agent', 'user bio specialties ratings')
      .populate('agent.user', 'name email phone avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Property.countDocuments({ 
      agent: req.params.id,
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
    console.error('Get agent properties error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

// @desc    Get agent reviews
// @route   GET /api/agents/:id/reviews
// @access  Public
const getAgentReviews = async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id)
      .populate('reviews.user', 'name avatar')
      .select('reviews ratings');

    if (!agent) {
      return res.status(404).json({
        status: 'error',
        message: 'Agent not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        reviews: agent.reviews,
        ratings: agent.ratings
      }
    });
  } catch (error) {
    console.error('Get agent reviews error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

// @desc    Add review to agent
// @route   POST /api/agents/:id/reviews
// @access  Private
const addAgentReview = async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({
        status: 'error',
        message: 'Agent not found'
      });
    }

    // Check if user already reviewed this agent
    const existingReview = agent.reviews.find(
      review => review.user.toString() === req.user.id
    );

    if (existingReview) {
      return res.status(400).json({
        status: 'error',
        message: 'You have already reviewed this agent'
      });
    }

    const review = {
      user: req.user.id,
      rating: req.body.rating,
      comment: req.body.comment
    };

    agent.reviews.push(review);
    await agent.save();

    await agent.populate('reviews.user', 'name avatar');

    res.status(201).json({
      status: 'success',
      data: {
        review: agent.reviews[agent.reviews.length - 1]
      }
    });
  } catch (error) {
    console.error('Add agent review error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during review creation'
    });
  }
};

// @desc    Update agent review
// @route   PUT /api/agents/:id/reviews/:reviewId
// @access  Private
const updateAgentReview = async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({
        status: 'error',
        message: 'Agent not found'
      });
    }

    const review = agent.reviews.id(req.params.reviewId);

    if (!review) {
      return res.status(404).json({
        status: 'error',
        message: 'Review not found'
      });
    }

    // Check if user is the review author
    if (review.user.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this review'
      });
    }

    if (req.body.rating) review.rating = req.body.rating;
    if (req.body.comment) review.comment = req.body.comment;

    await agent.save();
    await agent.populate('reviews.user', 'name avatar');

    res.status(200).json({
      status: 'success',
      data: {
        review
      }
    });
  } catch (error) {
    console.error('Update agent review error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during review update'
    });
  }
};

// @desc    Delete agent review
// @route   DELETE /api/agents/:id/reviews/:reviewId
// @access  Private
const deleteAgentReview = async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({
        status: 'error',
        message: 'Agent not found'
      });
    }

    const review = agent.reviews.id(req.params.reviewId);

    if (!review) {
      return res.status(404).json({
        status: 'error',
        message: 'Review not found'
      });
    }

    // Check if user is the review author or admin
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to delete this review'
      });
    }

    review.remove();
    await agent.save();

    res.status(200).json({
      status: 'success',
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Delete agent review error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during review deletion'
    });
  }
};

// @desc    Request agent registration (for users who want to become agents)
// @route   POST /api/agents/registration-request
// @access  Private
const requestAgentRegistration = async (req, res) => {
  try {
    // Check if user already has an agent profile or pending request
    const existingAgent = await Agent.findOne({ user: req.user.id });
    if (existingAgent) {
      return res.status(400).json({
        status: 'error',
        message: 'You already have an agent profile'
      });
    }

    // Check if there's already a pending request
    const pendingRequest = await Agent.findOne({
      user: req.user.id,
      isVerified: false
    });

    if (pendingRequest) {
      return res.status(400).json({
        status: 'error',
        message: 'You already have a pending agent registration request'
      });
    }

    // Normalize specialties and languages (may arrive as comma-separated string or JSON string or array)
    const toArray = (val) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        const s = val.trim();
        if (!s) return [];
        // try JSON parse for ["a","b"]
        if (s.startsWith('[') && s.endsWith(']')) {
          try { const parsed = JSON.parse(s); return Array.isArray(parsed) ? parsed : []; } catch { /* ignore */ }
        }
        return s.split(',').map(x => x.trim()).filter(Boolean);
      }
      return [];
    };

    // Parse social media if sent as JSON string via multipart
    let social = { facebook: '', twitter: '', instagram: '', linkedin: '', youtube: '' };
    if (typeof req.body.socialMedia === 'string') {
      try {
        const obj = JSON.parse(req.body.socialMedia);
        social.facebook = obj.facebook || '';
        social.twitter = obj.twitter || '';
        social.instagram = obj.instagram || '';
        social.linkedin = obj.linkedin || '';
        social.youtube = obj.youtube || '';
      } catch (e) {
        // fall back to individual fields if present
        social.facebook = req.body.facebook || '';
        social.twitter = req.body.twitter || '';
        social.instagram = req.body.instagram || '';
        social.linkedin = req.body.linkedin || '';
        social.youtube = req.body.youtube || '';
      }
    } else {
      // or individual fields
      social.facebook = req.body.facebook || '';
      social.twitter = req.body.twitter || '';
      social.instagram = req.body.instagram || '';
      social.linkedin = req.body.linkedin || '';
      social.youtube = req.body.youtube || '';
    }

    // Create agent profile with pending status
    const agentData = {
      user: req.user.id,
      bio: (req.body.bio || '').toString(),
      specialties: toArray(req.body.specialties),
      languages: toArray(req.body.languages),
      experience: parseInt(req.body.experience || '0', 10) || 0,
      company: {
        name: req.body.companyName || '',
        address: req.body.companyAddress || '',
        phone: req.body.companyPhone || '',
        website: req.body.companyWebsite || '',
        district: req.body.district || '',
        taluka: req.body.taluka || '',
        village: req.body.village || ''
      },
      socialMedia: social,
      responseTime: req.body.responseTime || 'within 24 hours',
      isVerified: false, // Admin needs to approve
      isActive: false // Not active until approved
    };

    // Only set licenseNumber if provided and non-empty after trim
    if (typeof req.body.licenseNumber === 'string' && req.body.licenseNumber.trim().length > 0) {
      agentData.licenseNumber = req.body.licenseNumber.trim();
    }

    const agent = await Agent.create(agentData);
    await agent.populate('user', 'name email phone avatar');

    // TODO: Send notification to admin about new agent registration request

    res.status(201).json({
      status: 'success',
      message: 'Agent registration request submitted successfully. Admin will review your request.',
      data: {
        agent
      }
    });
  } catch (error) {
    console.error('Agent registration request error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during agent registration request'
    });
  }
};

// @desc    Get current logged in user's agent profile
// @route   GET /api/agents/me
// @access  Private
const getAgentMe = async (req, res) => {
  try {
    const agent = await Agent.findOne({ user: req.user.id })
      .populate('user', 'name email phone avatar');

    if (!agent) {
      return res.status(404).json({
        status: 'error',
        message: 'Agent profile not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        agent
      }
    });
  } catch (error) {
    console.error('Get agent me error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

module.exports = {
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
};
