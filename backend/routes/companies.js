const express = require("express");
const router = express.Router();
const {
  createCompany,
  joinCompany,
  getCompany,
  getCompanyMembers,
  updateCompany,
  removeMember,
  leaveCompany,
  deleteCompany,
  refreshInviteCode,
} = require("../controllers/companyController");
const {
  authenticateToken,
  checkCompanyAccess,
  checkOwnerAccess,
  checkPermission,
  checkAnyPermission,
} = require("../middleware/auth");

// Create company
router.post("/", authenticateToken, createCompany);

// Join company by invite code
router.post("/join", authenticateToken, joinCompany);

// Get company details
router.get("/:companyId", authenticateToken, checkCompanyAccess, getCompany);

// Get company members (all company members can view)
router.get(
  "/:companyId/members",
  authenticateToken,
  checkCompanyAccess,
  getCompanyMembers
);

// Update company (requires edit permission)
router.put(
  "/:companyId",
  authenticateToken,
  checkCompanyAccess,
  checkPermission("edit_company_settings"),
  updateCompany
);

// Leave company (self-service)
router.post(
  "/:companyId/leave",
  authenticateToken,
  checkCompanyAccess,
  leaveCompany
);

// Remove member
router.delete(
  "/:companyId/members/:userId",
  authenticateToken,
  checkCompanyAccess,
  checkAnyPermission("remove_members", "manage_members"),
  removeMember
);

// Delete company (owner only)
router.delete(
  "/:companyId",
  authenticateToken,
  checkCompanyAccess,
  checkOwnerAccess,
  deleteCompany
);

// Refresh invite code (requires permission or owner)
router.post(
  "/:companyId/refresh-invite-code",
  authenticateToken,
  checkCompanyAccess,
  checkPermission("refresh_invite_code"),
  refreshInviteCode
);

module.exports = router;
