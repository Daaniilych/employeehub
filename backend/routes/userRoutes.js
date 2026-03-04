const express = require("express");
const router = express.Router();
const {
  updateProfile,
  updateAvatar,
  getUserStats,
  changePassword,
} = require("../controllers/userController");
const { authenticateToken } = require("../middleware/auth");

// All routes require authentication
router.use(authenticateToken);

// Update profile (name, email)
router.put("/profile", updateProfile);

// Update avatar
router.put("/avatar", updateAvatar);

// Change password
router.put("/password", changePassword);

// Get user statistics
router.get("/:userId/stats/:companyId", getUserStats);

module.exports = router;
