const crypto = require('crypto');
const User = require('../models/User');
const Agent = require('../models/Agent');
const sendEmail = require('../utils/sendEmail');
const path = require('path');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, mobile, password, role } = req.body;

    // Additional validation for email and mobile
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          status: 'error',
          message: 'Please provide a valid email'
        });
      }
    }
    if (mobile) {
      const mobileRegex = /^\d{10}$/;
      if (!mobileRegex.test(mobile)) {
        return res.status(400).json({
          status: 'error',
          message: 'Please provide a valid 10-digit mobile number'
        });
      }
    }

    // Check if user already exists with email or mobile
    let existingUser;
    if (email) {
      existingUser = await User.findOne({ email });
    } else if (mobile) {
      existingUser = await User.findOne({ phone: mobile });
    }

    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User already exists with this email or mobile number'
      });
    }

    // Create user
    const userData = {
      name,
      password,
      role: role || 'user'
    };
    if (email) userData.email = email;
    if (mobile) userData.phone = mobile;

    const user = await User.create(userData);

    // If user is registering as agent, create agent profile
    if (role === 'agent') {
      await Agent.create({
        user: user._id,
        bio: '',
        specialties: [],
        languages: [],
        experience: 0,
        isVerified: false,
        isActive: true
      });
    }

    // Generate JWT token
    const token = user.getSignedJwtToken();

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
          isActive: user.isActive
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during registration'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, mobile, password } = req.body;

    // Additional validation for email and mobile
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          status: 'error',
          message: 'Please provide a valid email'
        });
      }
    }
    if (mobile) {
      const mobileRegex = /^\d{10}$/;
      if (!mobileRegex.test(mobile)) {
        return res.status(400).json({
          status: 'error',
          message: 'Please provide a valid 10-digit mobile number'
        });
      }
    }

    // Find user by email or mobile
    let user;
    if (email) {
      user = await User.findOne({ email }).select('+password');
    } else if (mobile) {
      user = await User.findOne({ phone: mobile }).select('+password');
    }

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Account is deactivated'
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = user.getSignedJwtToken();

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
          isActive: user.isActive
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during login'
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('favorites');
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
          isActive: user.isActive,
          favorites: user.favorites
        }
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const userId = req.user.id;

    const user = await User.findByIdAndUpdate(
      userId,
      { name, phone },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
          isActive: user.isActive
        }
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during profile update'
    });
  }
};

// @desc    Update password
// @route   PUT /api/auth/password
// @access  Private
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get user with password
    const user = await User.findById(userId).select('+password');

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Generate new token
    const token = user.getSignedJwtToken();

    res.status(200).json({
      status: 'success',
      data: {
        token
      }
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during password update'
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found with this email'
      });
    }

    // Generate reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Create reset URL
    // frontend url
    const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;
    const frontendResetUrl = process.env.FRONTEND_URL + `/reset-password.html?token=${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${frontendResetUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Token',
        message
      });

      res.status(200).json({
        status: 'success',
        message: 'Email sent'
      });
    } catch (error) {
      console.log(error);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        status: 'error',
        message: 'Email could not be sent'
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during password reset'
    });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Hash token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired reset token'
      });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Generate new token
    const jwtToken = user.getSignedJwtToken();

    res.status(200).json({
      status: 'success',
      data: {
        token: jwtToken
      }
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during password reset'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled on the client side
    // by removing the token. Here we can log the logout event.
    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during logout'
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
  logout,
  // Upload user avatar
  async uploadAvatar(req, res) {
    try {
      if (!req.file || !req.file.path) {
        return res.status(400).json({ status: 'error', message: 'No image uploaded' });
      }

      const user = await User.findByIdAndUpdate(
        req.user.id,
        { avatar: req.file.path },
        { new: true }
      ).select('-password');

      res.status(200).json({
        status: 'success',
        data: { user }
      });
    } catch (error) {
      console.error('Upload avatar error:', error);
      res.status(500).json({ status: 'error', message: 'Server error during avatar upload' });
    }
  }
};
