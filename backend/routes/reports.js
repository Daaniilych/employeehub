const express = require("express");
const router = express.Router();
const { generateReport, downloadReport, getReports } = require("../controllers/reportController");
const {
  authenticateToken,
  checkCompanyAccess,
  checkAnyPermission,
} = require("../middleware/auth");

// All report routes require company access
router.use("/:companyId", authenticateToken, checkCompanyAccess);

// Generate report (requires create permission)
router.post(
  "/:companyId/generate",
  checkAnyPermission("create_reports"),
  generateReport
);

// Download report (requires view or create permission)
router.get(
  "/:companyId/download/:fileName",
  checkAnyPermission("view_reports", "create_reports"),
  downloadReport
);

// Get reports list (requires view or create permission)
router.get(
  "/:companyId",
  checkAnyPermission("view_reports", "create_reports"),
  getReports
);

module.exports = router;
