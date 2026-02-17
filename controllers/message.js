const Message = require("../models/Message");

// @desc    Create new message (inquiry)
// @route   POST /api/messages
// @access  Public
exports.createMessage = async (req, res) => {
  try {
    const { name, email, subject, phone, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: "All required fields must be filled" });
    }

    const newMessage = await Message.create({ name, email, subject, phone, message });

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: newMessage,
    });
  } catch (error) {
    console.error("Error creating message:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get all messages (admin)
// @route   GET /api/messages
// @access  Admin
exports.getAllMessages = async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: messages.length, data: messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get single message by ID
// @route   GET /api/messages/:id
// @access  Admin
exports.getMessageById = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    res.status(200).json({ success: true, data: message });
  } catch (error) {
    console.error("Error fetching message:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Delete message
// @route   DELETE /api/messages/:id
// @access  Admin
exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.id);

    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    res.status(200).json({ success: true, message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
