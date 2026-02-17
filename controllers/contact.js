const Message = require('../models/Message');

const createContact = async (req, res) => {
  try {
    const User = require('../models/User');

    // Find an admin user to receive the message
    const adminUser = await User.findOne({ role: 'admin' });

    if (!adminUser) {
      return res.status(500).json({
        status: 'error',
        message: 'No admin user found to receive contact messages'
      });
    }

    // Check if user is logged in (for registered users submitting contact forms)
    let senderUser = null;
    if (req.user) {
      senderUser = req.user;
    }

    // Create message data for contact form submission
    const messageData = {
      from: senderUser ? senderUser._id : null,
      to: adminUser._id,
      subject: req.body.subject || 'Contact Form Submission',
      message: req.body.message,
      email: req.body.email,
      phone: req.body.phone,
      messageType: req.body.type || 'general',
      priority: req.body.priority || 'normal',
      status: 'sent',
      metadata: {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        source: 'contact_form'
      }
    };

    const message = await Message.create(messageData);

    // Populate the message for response
    await message.populate([
      { path: 'from', select: 'name email' },
      { path: 'to', select: 'name email' }
    ]);

    res.status(201).json({
      status: 'success',
      data: {
        message
      }
    });
  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during contact creation'
    });
  }
};

// @desc    Get user's own messages (for logged-in users who submitted contact forms)
// @route   GET /api/contact/my-messages
// @access  Private (User)
const getUserMessages = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find messages sent by this user that are contact form submissions
    const messages = await Message.find({
      from: userId,
      'metadata.source': 'contact_form'
    })
      .populate('from', 'name email')
      .populate('to', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: messages
    });
  } catch (error) {
    console.error('Get user messages error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};
// @desc    Get all contact messages (Admin/Staff) - now shows contact form submissions as messages
// @route   GET /api/contact
// @access  Private (Admin/Staff)
const getContacts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object for contact form messages
    const filter = {
      'metadata.source': 'contact_form'
    };

    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.messageType) filter.messageType = req.query.messageType;

    // Build sort object
    let sort = { createdAt: -1 };
    if (req.query.sort) {
      switch (req.query.sort) {
        case 'newest':
          sort = { createdAt: -1 };
          break;
        case 'oldest':
          sort = { createdAt: 1 };
          break;
        case 'priority':
          sort = { priority: -1, createdAt: -1 };
          break;
        case 'status':
          sort = { status: 1, createdAt: -1 };
          break;
      }
    }

    const messages = await Message.find(filter)
      .populate('to', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: {
        messages,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};
// @desc    Get single contact message
// @route   GET /api/contact/:id
// @access  Private (Admin/Staff)
const getContact = async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.id,
      'metadata.source': 'contact_form'
    })
      .populate('to', 'name email');

    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Contact message not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        message
      }
    });
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

// @desc    Update contact message
// @route   PUT /api/contact/:id
// @access  Private (Admin/Staff)
const updateContact = async (req, res) => {
  try {
    const updateData = {};

    if (req.body.status) updateData.status = req.body.status;
    if (req.body.priority) updateData.priority = req.body.priority;
    if (req.body.messageType) updateData.messageType = req.body.messageType;
    if (req.body.isRead !== undefined) updateData.isRead = req.body.isRead;

    const message = await Message.findOneAndUpdate(
      { _id: req.params.id, 'metadata.source': 'contact_form' },
      updateData,
      { new: true, runValidators: true }
    )
      .populate('to', 'name email');

    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Contact message not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        message
      }
    });
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during contact update'
    });
  }
};

// @desc    Reply to contact message
// @route   POST /api/contact/:id/reply
// @access  Private (Admin/Staff)
const replyToContact = async (req, res) => {
  try {
    const { message } = req.body;

    const contactMessage = await Message.findOne({
      _id: req.params.id,
      'metadata.source': 'contact_form'
    });

    if (!contactMessage) {
      return res.status(404).json({
        status: 'error',
        message: 'Contact message not found'
      });
    }

    // Create a reply message
    const replyMessage = await Message.create({
      from: req.user.id,
      to: contactMessage.email, // Reply to the original sender's email as a guest user
      subject: `Re: ${contactMessage.subject}`,
      message: message,
      email: contactMessage.email,
      messageType: 'support',
      priority: 'normal',
      status: 'sent',
      metadata: {
        source: 'admin_reply',
        replyTo: contactMessage._id
      }
    });

    // Update original message status to replied
    contactMessage.status = 'replied';
    await contactMessage.save();

    await replyMessage.populate([
      { path: 'from', select: 'name email' }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        message: replyMessage
      }
    });
  } catch (error) {
    console.error('Reply to contact error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during reply'
    });
  }
};

// @desc    Mark contact message as read
// @route   PUT /api/contact/:id/read
// @access  Private (Admin/Staff)
const markAsRead = async (req, res) => {
  try {
    const message = await Message.findOneAndUpdate(
      { _id: req.params.id, 'metadata.source': 'contact_form' },
      { isRead: true, readAt: new Date(), status: 'read' },
      { new: true }
    )
      .populate('to', 'name email');

    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Contact message not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        message
      }
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

// @desc    Delete contact message
// @route   DELETE /api/contact/:id
// @access  Private (Admin)
const deleteContact = async (req, res) => {
  try {
    const message = await Message.findOneAndDelete({
      _id: req.params.id,
      'metadata.source': 'contact_form'
    });

    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Contact message not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Contact message deleted successfully'
    });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during contact deletion'
    });
  }
};

// @desc    Get contact message statistics
// @route   GET /api/contact/stats
// @access  Private (Admin)
const getContactStats = async (req, res) => {
  try {
    const filter = { 'metadata.source': 'contact_form' };

    const totalContacts = await Message.countDocuments(filter);
    const newContacts = await Message.countDocuments({ ...filter, status: 'sent' });
    const readContacts = await Message.countDocuments({ ...filter, status: 'read' });
    const repliedContacts = await Message.countDocuments({ ...filter, status: 'replied' });

    // Get messages by type
    const messagesByType = await Message.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$messageType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get messages by priority
    const messagesByPriority = await Message.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent messages (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentContacts = await Message.countDocuments({
      ...filter,
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Get unread messages
    const unreadContacts = await Message.countDocuments({
      ...filter,
      isRead: false
    });

    res.status(200).json({
      status: 'success',
      data: {
        totalContacts,
        newContacts,
        readContacts,
        repliedContacts,
        recentContacts,
        unreadContacts,
        messagesByType,
        messagesByPriority
      }
    });
  } catch (error) {
    console.error('Get contact stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

module.exports = {
  createContact,
  getContacts,
  getContact,
  updateContact,
  deleteContact,
  replyToContact,
  markAsRead,
  getContactStats,
  getUserMessages
};
