const { getDatabase } = require("../config/database");

// Available permissions (updated to match new system)
const PERMISSIONS = [
  // Time Tracking
  "view_all_timelogs",
  "view_employee_filters",
  "scan_others",
  "use_scanner_terminal",
  // Reports
  "view_reports",
  "create_reports",
  // Members
  "remove_members",
  "assign_roles",
  "manage_members",
  // Roles
  "view_roles",
  "create_roles",
  "edit_roles",
  "delete_roles",
  "manage_roles",
  // Company Settings
  "view_company_settings",
  "edit_company_settings",
  "view_invite_code",
  "refresh_invite_code",
  "manage_company",
];

// Keep backward compatibility for roles created before permission cleanup.
const REMOVED_LEGACY_PERMISSIONS = new Set([
  "delete_company",
  "view_same_role_timelogs",
  "view_lower_rank_timelogs",
  "manage_timelogs",
  "export_timelogs",
  "clock_in_others",
  "clock_out_others",
  "manage_reports",
  "view_members",
  "invite_members",
]);

const sanitizePermissions = (permissionsObj = {}) => {
  return Object.fromEntries(
    Object.entries(permissionsObj).filter(
      ([permissionKey]) => !REMOVED_LEGACY_PERMISSIONS.has(permissionKey)
    )
  );
};

// Create role
const createRole = async (req, res) => {
  try {
    const db = await getDatabase();
    const { companyId } = req.params;
    const { name, permissions, hierarchyLevel } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Role name is required" });
    }

    // Accept both object (new format) and array (legacy format)
    if (!permissions || typeof permissions !== "object") {
      return res.status(400).json({ error: "Permissions are required" });
    }

    // Convert array to object if needed (legacy support)
    let permissionsObj = permissions;
    if (Array.isArray(permissions)) {
      permissionsObj = {};
      permissions.forEach((perm) => {
        permissionsObj[perm] = true;
      });
    }

    permissionsObj = sanitizePermissions(permissionsObj);

    // Validate permissions
    const permissionKeys = Object.keys(permissionsObj);
    const invalidPerms = permissionKeys.filter((p) => !PERMISSIONS.includes(p));
    if (invalidPerms.length > 0) {
      return res
        .status(400)
        .json({ error: `Invalid permissions: ${invalidPerms.join(", ")}` });
    }

    // Validate hierarchy level (1-11, but 11 is reserved for Owner role)
    const level = hierarchyLevel !== undefined ? parseInt(hierarchyLevel) : 5;
    if (level < 1 || level > 11) {
      return res.status(400).json({
        error:
          "Hierarchy level must be between 1 and 11 (11 is reserved for Owner)",
      });
    }

    // Prevent creating roles with level 11 (Owner level)
    if (level === 11) {
      return res.status(400).json({
        error: "Hierarchy level 11 is reserved for the Owner role",
      });
    }

    // Check if role with same name AND hierarchy level already exists
    const existing = db
      .prepare(
        `
      SELECT id FROM roles WHERE company_id = ? AND name = ? AND hierarchy_level = ?
    `
      )
      .get(companyId, name, level);

    if (existing) {
      return res.status(400).json({
        error: "Role with this name and hierarchy level already exists",
      });
    }

    // Check if role should be marked as scanner (has use_scanner_terminal permission)
    const isScanner = permissionsObj.use_scanner_terminal === true ? 1 : 0;

    const stmt = db.prepare(`
      INSERT INTO roles (company_id, name, permissions, hierarchy_level, is_scanner)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      companyId,
      name,
      JSON.stringify(permissionsObj),
      level,
      isScanner
    );
    const roleId = result.lastInsertRowid;

    const role = db.prepare("SELECT * FROM roles WHERE id = ?").get(roleId);

    res.status(201).json({
      message: "Role created successfully",
      role: {
        id: role.id,
        name: role.name,
        permissions: JSON.parse(role.permissions),
        hierarchy_level: role.hierarchy_level || 5,
      },
    });
  } catch (error) {
    console.error("Create role error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get company roles
const getCompanyRoles = async (req, res) => {
  try {
    const db = await getDatabase();
    const { companyId } = req.params;

    const roles = db
      .prepare(
        `
      SELECT id, name, permissions, hierarchy_level, is_scanner, created_at
      FROM roles
      WHERE company_id = ?
      ORDER BY hierarchy_level DESC, created_at ASC
    `
      )
      .all(companyId);

    const rolesWithParsedPermissions = roles.map((role) => ({
      ...role,
      permissions: sanitizePermissions(JSON.parse(role.permissions)),
      hierarchy_level: role.hierarchy_level || 5,
      is_scanner: role.is_scanner || 0,
    }));

    res.json({
      roles: rolesWithParsedPermissions,
      availablePermissions: PERMISSIONS,
    });
  } catch (error) {
    console.error("Get company roles error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Update role
const updateRole = async (req, res) => {
  try {
    const db = await getDatabase();
    const { companyId, roleId } = req.params;
    const { name, permissions, hierarchyLevel } = req.body;

    const role = db
      .prepare("SELECT * FROM roles WHERE id = ? AND company_id = ?")
      .get(roleId, companyId);

    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    // Prevent editing Owner role
    if (role.name === "Owner" && role.hierarchy_level === 11) {
      return res.status(403).json({
        error: "Owner role cannot be edited. It always has all permissions.",
      });
    }

    const updates = [];
    const values = [];

    if (name) {
      updates.push("name = ?");
      values.push(name);
    }

    if (permissions && typeof permissions === "object") {
      // Convert array to object if needed (legacy support)
      let permissionsObj = permissions;
      if (Array.isArray(permissions)) {
        permissionsObj = {};
        permissions.forEach((perm) => {
          permissionsObj[perm] = true;
        });
      }

      permissionsObj = sanitizePermissions(permissionsObj);

      // Validate permissions
      const permissionKeys = Object.keys(permissionsObj);
      const invalidPerms = permissionKeys.filter(
        (p) => !PERMISSIONS.includes(p)
      );
      if (invalidPerms.length > 0) {
        return res
          .status(400)
          .json({ error: `Invalid permissions: ${invalidPerms.join(", ")}` });
      }

      updates.push("permissions = ?");
      values.push(JSON.stringify(permissionsObj));

      // Update is_scanner based on use_scanner_terminal permission
      const isScanner = permissionsObj.use_scanner_terminal === true ? 1 : 0;
      updates.push("is_scanner = ?");
      values.push(isScanner);
    }

    if (hierarchyLevel !== undefined) {
      const level = parseInt(hierarchyLevel);
      if (level < 1 || level > 10) {
        return res.status(400).json({
          error: "Hierarchy level must be between 1 and 10",
        });
      }
      updates.push("hierarchy_level = ?");
      values.push(level);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    // Check if role with same name AND hierarchy level already exists (if name or level is being changed)
    if (name || hierarchyLevel !== undefined) {
      const newName = name || role.name;
      const newLevel =
        hierarchyLevel !== undefined
          ? parseInt(hierarchyLevel)
          : role.hierarchy_level;

      const existing = db
        .prepare(
          `
        SELECT id FROM roles 
        WHERE company_id = ? AND name = ? AND hierarchy_level = ? AND id != ?
      `
        )
        .get(companyId, newName, newLevel, roleId);

      if (existing) {
        return res.status(400).json({
          error: "Role with this name and hierarchy level already exists",
        });
      }
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(roleId);

    db.prepare(
      `
      UPDATE roles 
      SET ${updates.join(", ")}
      WHERE id = ?
    `
    ).run(...values);

    const updatedRole = db
      .prepare("SELECT * FROM roles WHERE id = ?")
      .get(roleId);

    res.json({
      message: "Role updated successfully",
      role: {
        ...updatedRole,
        permissions: sanitizePermissions(JSON.parse(updatedRole.permissions)),
        hierarchy_level: updatedRole.hierarchy_level || 5,
        is_scanner: updatedRole.is_scanner || 0,
      },
    });
  } catch (error) {
    console.error("Update role error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Delete role
const deleteRole = async (req, res) => {
  try {
    const db = await getDatabase();
    const { companyId, roleId } = req.params;

    const role = db
      .prepare("SELECT * FROM roles WHERE id = ? AND company_id = ?")
      .get(roleId, companyId);

    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    // Prevent deleting Owner role
    if (role.name === "Owner" && role.hierarchy_level === 11) {
      return res.status(403).json({
        error: "Owner role cannot be deleted. It is a system role.",
      });
    }

    // Remove role from members (set to NULL due to ON DELETE SET NULL)
    db.prepare("DELETE FROM roles WHERE id = ?").run(roleId);

    res.json({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("Delete role error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Assign role to member
const assignRole = async (req, res) => {
  try {
    const db = await getDatabase();
    const { companyId, userId } = req.params;
    const { roleId } = req.body;

    // Get company to check if user is owner
    const company = db
      .prepare("SELECT owner_id FROM companies WHERE id = ?")
      .get(companyId);

    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    // Prevent assigning any role to Owner (Owner always has Owner role)
    if (company.owner_id === parseInt(userId)) {
      return res.status(403).json({
        error:
          "Owner role cannot be changed. Owner always has the Owner role with all permissions.",
      });
    }

    // Verify role belongs to company
    if (roleId) {
      const role = db
        .prepare(
          "SELECT id, name, hierarchy_level FROM roles WHERE id = ? AND company_id = ?"
        )
        .get(roleId, companyId);

      if (!role) {
        return res.status(404).json({ error: "Role not found" });
      }

      // Prevent assigning Owner role to non-owner
      if (role.name === "Owner" && role.hierarchy_level === 11) {
        return res.status(403).json({
          error:
            "Owner role can only be assigned to the company owner automatically.",
        });
      }
    }

    // Update member role
    db.prepare(
      `
      UPDATE company_members 
      SET role_id = ?
      WHERE user_id = ? AND company_id = ?
    `
    ).run(roleId || null, userId, companyId);

    res.json({ message: "Role assigned successfully" });
  } catch (error) {
    console.error("Assign role error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  createRole,
  getCompanyRoles,
  updateRole,
  deleteRole,
  assignRole,
  PERMISSIONS,
};
