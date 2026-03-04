const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { register, login, getMe } = require("../controllers/authController");
const { authenticateToken } = require("../middleware/auth");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth requests. Please try again later." },
});

// Public routes
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);

// Protected routes
router.get("/me", authenticateToken, getMe);

module.exports = router;



