const Property = require('../models/Property');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// @desc    Get all pending properties
// @route   GET /api/admin/properties/pending
// @access  Private (Admin only)
const getPendingProperties = async (req, res) => {
  try {
    const properties = await Property.find({ approvalStatus: 'pending' })
      .populate('owner', 'name email phone')
      .populate('agent', 'name email phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: properties.length,
      data: properties
    });
  } catch (error) {
    console.error('Get pending properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching pending properties'
    });
  }
};

// @desc    Get all properties with filters
// @route   GET /api/admin/properties
// @access  Private (Admin only)
const getAllProperties = async (req, res) => {
  try {
    const { status, approvalStatus, type, page = 1, limit = 10 } = req.query;
    
    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (approvalStatus) filter.approvalStatus = approvalStatus;
    if (type) filter.type = type;

    const properties = await Property.find(filter)
      .populate('owner', 'name email phone')
      .populate('agent', 'name email phone')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Property.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: properties.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: properties
    });
  } catch (error) {
    console.error('Get all properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching properties'
    });
  }
};

// @desc    Approve a property
// @route   PUT /api/admin/properties/:id/approve
// @access  Private (Admin only)
const approveProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    if (property.approvalStatus === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Property is already approved'
      });
    }

    // Update property status
    property.approvalStatus = 'approved';
    property.approvedBy = req.user.id;
    property.approvedAt = new Date();
    property.isPublished = true;

    await property.save();

    res.status(200).json({
      success: true,
      message: 'Property approved successfully',
      data: property
    });
  } catch (error) {
    console.error('Approve property error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while approving property'
    });
  }
};

// @desc    Reject a property
// @route   PUT /api/admin/properties/:id/reject
// @access  Private (Admin only)
const rejectProperty = async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    if (property.approvalStatus === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Property is already rejected'
      });
    }

    // Update property status
    property.approvalStatus = 'rejected';
    property.approvedBy = req.user.id;
    property.approvedAt = new Date();
    property.rejectionReason = rejectionReason;
    property.isPublished = false;

    await property.save();

    res.status(200).json({
      success: true,
      message: 'Property rejected successfully',
      data: property
    });
  } catch (error) {
    console.error('Reject property error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while rejecting property'
    });
  }
};

// @desc    Get property statistics
// @route   GET /api/admin/properties/stats
// @access  Private (Admin only)
const getPropertyStats = async (req, res) => {
  try {
    const stats = await Property.aggregate([
      {
        $group: {
          _id: '$approvalStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalProperties = await Property.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalAgents = await User.countDocuments({ role: 'agent' });

    const formattedStats = {
      totalProperties,
      totalUsers,
      totalAgents,
      approvalStatus: {
        pending: 0,
        approved: 0,
        rejected: 0
      }
    };

    stats.forEach(stat => {
      formattedStats.approvalStatus[stat._id] = stat.count;
    });

    res.status(200).json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    console.error('Get property stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics'
    });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin only)
const getUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 10 } = req.query;
    
    const filter = {};
    if (role) filter.role = role;

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
};

// @desc    Update user status
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin only)
const updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: user
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user status'
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin only)
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Don't allow admin to delete themselves
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting user'
    });
  }
};

module.exports = {
  getPendingProperties,
  approveProperty,
  rejectProperty,
  getAllProperties,
  getPropertyStats,
  getUsers,
  updateUserStatus,
  deleteUser
};
