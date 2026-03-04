const jwt = require("jsonwebtoken");
const { getDatabase } = require("../config/database");

const IMPLIED_PERMISSIONS = {
  manage_members: [
    "remove_members",
    "assign_roles",
    "view_invite_code",
    "refresh_invite_code",
  ],
  manage_roles: ["view_roles", "create_roles", "edit_roles", "delete_roles"],
  manage_company: ["view_company_settings", "edit_company_settings"],
};

const hasPermissionWithImplications = (permissions, permission) => {
  if (!permissions) return false;

  if (Array.isArray(permissions)) {
    return permissions.includes(permission);
  }

  if (typeof permissions === "object") {
    if (permissions[permission] === true) return true;
    return Object.entries(IMPLIED_PERMISSIONS).some(([parent, implied]) => {
      return permissions[parent] === true && implied.includes(permission);
    });
  }

  return false;
};

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const db = await getDatabase();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = db
      .prepare(
        "SELECT id, email, first_name, last_name, qr_code, avatar FROM users WHERE id = ?"
      )
      .get(decoded.id);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

const checkCompanyAccess = async (req, res, next) => {
  try {
    const db = await getDatabase();
    const companyId = req.params.companyId || req.body.companyId;
    const userId = req.user.id;

    const membership = db
      .prepare(
        `
      SELECT cm.*, c.owner_id 
      FROM company_members cm
      JOIN companies c ON cm.company_id = c.id
      WHERE cm.user_id = ? AND cm.company_id = ?
    `
      )
      .get(userId, companyId);

    if (!membership) {
      return res.status(403).json({ error: "Access denied to this company" });
    }

    req.companyMembership = membership;
    req.isOwner = membership.owner_id === userId;
    next();
  } catch (error) {
    return res.status(500).json({ error: "Database error" });
  }
};

const checkOwnerAccess = (req, res, next) => {
  if (!req.isOwner) {
    return res
      .status(403)
      .json({ error: "Only company owner can perform this action" });
  }
  next();
};

const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (req.isOwner) {
        return next(); // Owners have all permissions
      }

      const db = await getDatabase();
      const roleId = req.companyMembership.role_id;

      if (!roleId) {
        return res.status(403).json({ error: "No role assigned" });
      }

      const role = db
        .prepare("SELECT permissions FROM roles WHERE id = ?")
        .get(roleId);

      if (!role) {
        return res.status(403).json({ error: "Role not found" });
      }

      const permissions = JSON.parse(role.permissions);

      const hasPermission = hasPermissionWithImplications(
        permissions,
        permission
      );

      if (!hasPermission) {
        return res
          .status(403)
          .json({ error: `Permission denied: ${permission}` });
      }

      next();
    } catch (error) {
      return res.status(500).json({ error: "Database error" });
    }
  };
};

// Check any of multiple permissions (OR logic)
const checkAnyPermission = (...permissionsToCheck) => {
  return async (req, res, next) => {
    try {
      if (req.isOwner) {
        return next(); // Owners have all permissions
      }

      const db = await getDatabase();
      const roleId = req.companyMembership.role_id;

      if (!roleId) {
        return res.status(403).json({ error: "No role assigned" });
      }

      const role = db
        .prepare("SELECT permissions FROM roles WHERE id = ?")
        .get(roleId);

      if (!role) {
        return res.status(403).json({ error: "Role not found" });
      }

      const permissions = JSON.parse(role.permissions);

      // Check if user has ANY of the required permissions
      let hasAnyPermission = false;

      for (const permission of permissionsToCheck) {
        if (hasPermissionWithImplications(permissions, permission)) {
          hasAnyPermission = true;
          break;
        }
      }

      if (!hasAnyPermission) {
        return res.status(403).json({
          error: `Permission denied. Required one of: ${permissionsToCheck.join(
            ", "
          )}`,
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({ error: "Database error" });
    }
  };
};

module.exports = {
  authenticateToken,
  checkCompanyAccess,
  checkOwnerAccess,
  checkPermission,
  checkAnyPermission,
};
