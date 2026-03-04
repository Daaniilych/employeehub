const express = require("express");
const router = express.Router();
const {
  clockIn,
  clockOut,
  getTimeLogs,
  getMyTimeLogs,
  getCurrentStatus,
} = require("../controllers/timeLogController");
const { authenticateToken, checkCompanyAccess } = require("../middleware/auth");

// Clock in/out - now require authentication for permission checks
router.post("/clock-in", authenticateToken, clockIn);
router.post("/clock-out", authenticateToken, clockOut);

// Protected routes
router.use("/:companyId", authenticateToken, checkCompanyAccess);

// Get current status
router.get("/:companyId/status", getCurrentStatus);

// Get my time logs (self-access endpoint)
router.get("/:companyId/my-logs", getMyTimeLogs);

// Get all time logs (owner or view_all_timelogs permission)
router.get("/:companyId", getTimeLogs);

// Manual edit/delete endpoints are intentionally disabled to keep time logs immutable.

module.exports = router;
