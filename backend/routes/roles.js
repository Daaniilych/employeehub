const express = require("express");
const router = express.Router();
const {
  createRole,
  getCompanyRoles,
  updateRole,
  deleteRole,
  assignRole,
} = require("../controllers/roleController");
const {
  authenticateToken,
  checkCompanyAccess,
  checkPermission,
  checkAnyPermission,
} = require("../middleware/auth");

// All role routes require company access
router.use("/:companyId", authenticateToken, checkCompanyAccess);

// Get company roles
router.get(
  "/:companyId",
  checkAnyPermission("view_roles", "create_roles", "edit_roles", "delete_roles", "manage_roles"),
  getCompanyRoles
);

// Create role
router.post("/:companyId", checkPermission("create_roles"), createRole);

// Update role
router.put("/:companyId/:roleId", checkPermission("edit_roles"), updateRole);

// Delete role
router.delete("/:companyId/:roleId", checkPermission("delete_roles"), deleteRole);

// Assign role to member
router.post(
  "/:companyId/assign/:userId",
  checkAnyPermission("assign_roles", "manage_members"),
  assignRole
);

module.exports = router;
