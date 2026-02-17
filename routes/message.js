const express = require("express");
const router = express.Router();
const {
  createMessage,
  getAllMessages,
  getMessageById,
  deleteMessage,
} = require("../controllers/message");

// Public route for users to submit inquiries
router.post("/", createMessage);

// Admin routes
router.get("/", getAllMessages);
router.get("/:id", getMessageById);
router.delete("/:id", deleteMessage);

module.exports = router;
