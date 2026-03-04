const { getDatabase } = require("../config/database");
const { calculateHours } = require("../utils/helpers");

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

// Helper function to check user permission
const checkUserPermission = (req, db, permission) => {
  try {
    if (!req.companyMembership || !req.companyMembership.role_id) {
      return false;
    }

    const role = db
      .prepare("SELECT permissions FROM roles WHERE id = ?")
      .get(req.companyMembership.role_id);

    if (!role) return false;

    const permissions = JSON.parse(role.permissions);

    // Support both array and object format (with implied permissions)
    if (Array.isArray(permissions)) {
      if (permissions.includes(permission)) return true;
      // Backward compatibility: old split permissions imply new unified scanner access.
      if (
        permission === "scan_others" &&
        (permissions.includes("clock_in_others") ||
          permissions.includes("clock_out_others"))
      ) {
        return true;
      }
      return false;
    } else if (typeof permissions === "object") {
      if (permissions[permission] === true) return true;
      // Backward compatibility: old split permissions imply new unified scanner access.
      if (
        permission === "scan_others" &&
        (permissions.clock_in_others === true || permissions.clock_out_others === true)
      ) {
        return true;
      }
      return Object.entries(IMPLIED_PERMISSIONS).some(([parent, implied]) => {
        return permissions[parent] === true && implied.includes(permission);
      });
    }

    return false;
  } catch (error) {
    console.error("Permission check error:", error);
    return false;
  }
};

const getRoleHierarchyLevel = (db, roleId) => {
  if (!roleId) return 0;
  const role = db
    .prepare("SELECT hierarchy_level FROM roles WHERE id = ?")
    .get(roleId);
  return role?.hierarchy_level || 0;
};

const getViewerScope = (req, db) => {
  const canViewAll = req.isOwner || checkUserPermission(req, db, "view_all_timelogs");
  const viewerRoleLevel = getRoleHierarchyLevel(db, req.companyMembership?.role_id);

  return { canViewAll, viewerRoleLevel };
};

const canAccessUserLogs = (req, db, companyId, targetUserId) => {
  if (parseInt(targetUserId, 10) === req.user.id) {
    return true;
  }

  const { canViewAll, viewerRoleLevel } = getViewerScope(req, db);

  if (canViewAll) {
    return true;
  }

  const targetMembership = db
    .prepare(
      `
      SELECT cm.role_id
      FROM company_members cm
      WHERE cm.company_id = ? AND cm.user_id = ?
    `
    )
    .get(companyId, targetUserId);

  if (!targetMembership) {
    return false;
  }

  const targetRoleLevel = getRoleHierarchyLevel(db, targetMembership.role_id);

  // Default hierarchy visibility: own role and lower roles.
  if (targetRoleLevel <= viewerRoleLevel) {
    return true;
  }

  return false;
};

// Clock in (scan QR code)
const clockIn = async (req, res) => {
  try {
    const db = await getDatabase();
    const { qrCode, companyId } = req.body;

    if (!qrCode || !companyId) {
      return res
        .status(400)
        .json({ error: "QR code and company ID are required" });
    }

    // Find user by QR code
    const targetUser = db
      .prepare("SELECT id, first_name, last_name FROM users WHERE qr_code = ?")
      .get(qrCode);

    if (!targetUser) {
      return res.status(404).json({ error: "Invalid QR code" });
    }

    // Check if someone is trying to clock in another person
    const isClockingOtherPerson = targetUser.id !== req.user.id;
    
    // Get user's company membership and role info
    const userMembership = db
      .prepare(
        `
      SELECT cm.*, c.owner_id, r.is_scanner
      FROM company_members cm
      JOIN companies c ON cm.company_id = c.id
      LEFT JOIN roles r ON cm.role_id = r.id
      WHERE cm.user_id = ? AND cm.company_id = ?
    `
      )
      .get(req.user.id, companyId);

    if (!userMembership) {
      return res
        .status(403)
        .json({ error: "You are not a member of this company" });
    }

    // Security: Scanner cannot clock in/out themselves
    if (userMembership.is_scanner === 1 && !isClockingOtherPerson) {
      return res.status(403).json({
        error: "Scanner terminal cannot be used to clock in yourself. Please use your personal QR code or the Time Tracking page.",
      });
    }

    if (isClockingOtherPerson) {
      // Set membership for permission check
      req.companyMembership = userMembership;
      req.isOwner = userMembership.owner_id === req.user.id;

      // Scanner role can always clock in other employees in scanner terminal mode.
      // Other roles must have explicit permission (or be owner).
      const canUseScannerTerminal =
        userMembership.is_scanner === 1 ||
        checkUserPermission(req, db, "use_scanner_terminal");
      const hasScanOthers = checkUserPermission(req, db, "scan_others");
      if (!hasScanOthers && !canUseScannerTerminal && !req.isOwner) {
        return res.status(403).json({
          error: "You don't have permission to clock in other employees",
        });
      }
    }

    // Check if user is member of company
    const membership = db
      .prepare(
        `
      SELECT id FROM company_members WHERE user_id = ? AND company_id = ?
    `
      )
      .get(targetUser.id, companyId);

    if (!membership) {
      return res
        .status(403)
        .json({ error: "User is not a member of this company" });
    }

    // Check if user already clocked in (has open time log)
    const openLog = db
      .prepare(
        `
      SELECT id FROM time_logs 
      WHERE user_id = ? AND company_id = ? AND clock_out IS NULL
      ORDER BY clock_in DESC
      LIMIT 1
    `
      )
      .get(targetUser.id, companyId);

    if (openLog) {
      return res.status(400).json({
        error: `${targetUser.first_name} ${targetUser.last_name} is already clocked in`,
      });
    }

    // Create new time log
    const clockInTime = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO time_logs (user_id, company_id, clock_in)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(targetUser.id, companyId, clockInTime);
    const logId = result.lastInsertRowid;

    const timeLog = db
      .prepare("SELECT * FROM time_logs WHERE id = ?")
      .get(logId);

    // Notify all users in the company via WebSocket
    const io = req.app.get("io");
    if (io) {
      io.to(`company-${companyId}`).emit("employee-clocked-in", {
        userId: targetUser.id,
        userName: `${targetUser.first_name} ${targetUser.last_name}`,
        clockIn: timeLog.clock_in,
      });
    }

    res.status(201).json({
      message: "Clocked in successfully",
      timeLog: {
        id: timeLog.id,
        userId: targetUser.id,
        userName: `${targetUser.first_name} ${targetUser.last_name}`,
        clockIn: timeLog.clock_in,
      },
    });
  } catch (error) {
    console.error("Clock in error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Clock out (scan QR code)
const clockOut = async (req, res) => {
  try {
    const db = await getDatabase();
    const { qrCode, companyId, notes } = req.body;

    if (!qrCode || !companyId) {
      return res
        .status(400)
        .json({ error: "QR code and company ID are required" });
    }

    // Find user by QR code
    const targetUser = db
      .prepare("SELECT id, first_name, last_name FROM users WHERE qr_code = ?")
      .get(qrCode);

    if (!targetUser) {
      return res.status(404).json({ error: "Invalid QR code" });
    }

    // Check if someone is trying to clock out another person
    const isClockingOtherPerson = targetUser.id !== req.user.id;
    
    // Get user's company membership and role info
    const userMembership = db
      .prepare(
        `
      SELECT cm.*, c.owner_id, r.is_scanner
      FROM company_members cm
      JOIN companies c ON cm.company_id = c.id
      LEFT JOIN roles r ON cm.role_id = r.id
      WHERE cm.user_id = ? AND cm.company_id = ?
    `
      )
      .get(req.user.id, companyId);

    if (!userMembership) {
      return res
        .status(403)
        .json({ error: "You are not a member of this company" });
    }

    // Security: Scanner cannot clock in/out themselves
    if (userMembership.is_scanner === 1 && !isClockingOtherPerson) {
      return res.status(403).json({
        error: "Scanner terminal cannot be used to clock out yourself. Please use your personal QR code or the Time Tracking page.",
      });
    }

    if (isClockingOtherPerson) {
      // Set membership for permission check
      req.companyMembership = userMembership;
      req.isOwner = userMembership.owner_id === req.user.id;

      // Scanner role can always clock out other employees in scanner terminal mode.
      // Other roles must have explicit permission (or be owner).
      const canUseScannerTerminal =
        userMembership.is_scanner === 1 ||
        checkUserPermission(req, db, "use_scanner_terminal");
      const hasScanOthers = checkUserPermission(req, db, "scan_others");
      if (!hasScanOthers && !canUseScannerTerminal && !req.isOwner) {
        return res.status(403).json({
          error: "You don't have permission to clock out other employees",
        });
      }
    }

    // Find open time log
    const openLog = db
      .prepare(
        `
      SELECT * FROM time_logs 
      WHERE user_id = ? AND company_id = ? AND clock_out IS NULL
      ORDER BY clock_in DESC
      LIMIT 1
    `
      )
      .get(targetUser.id, companyId);

    if (!openLog) {
      return res.status(400).json({
        error: `No open time log found for ${targetUser.first_name} ${targetUser.last_name}. Please clock in first.`,
      });
    }

    // Calculate hours
    const clockOutTime = new Date().toISOString();
    const totalHours = calculateHours(openLog.clock_in, clockOutTime);

    // Update time log
    db.prepare(
      `
      UPDATE time_logs 
      SET clock_out = ?, total_hours = ?, notes = ?
      WHERE id = ?
    `
    ).run(clockOutTime, totalHours, notes || null, openLog.id);

    const timeLog = db
      .prepare("SELECT * FROM time_logs WHERE id = ?")
      .get(openLog.id);

    // Notify all users in the company via WebSocket
    const io = req.app.get("io");
    if (io) {
      io.to(`company-${companyId}`).emit("employee-clocked-out", {
        userId: targetUser.id,
        userName: `${targetUser.first_name} ${targetUser.last_name}`,
        clockOut: timeLog.clock_out,
        totalHours: timeLog.total_hours,
      });
    }

    res.json({
      message: "Clocked out successfully",
      timeLog: {
        id: timeLog.id,
        userId: targetUser.id,
        userName: `${targetUser.first_name} ${targetUser.last_name}`,
        clockIn: timeLog.clock_in,
        clockOut: timeLog.clock_out,
        totalHours: timeLog.total_hours,
      },
    });
  } catch (error) {
    console.error("Clock out error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get time logs for company
const getTimeLogs = async (req, res) => {
  try {
    const db = await getDatabase();
    const { companyId } = req.params;
    const { userId, dateFrom, dateTo, page = 1, limit = 50 } = req.query;

    const { canViewAll, viewerRoleLevel } = getViewerScope(req, db);

    let query = `
      SELECT 
        tl.*,
        u.first_name, u.last_name, u.email, u.avatar
      FROM time_logs tl
      JOIN users u ON tl.user_id = u.id
      JOIN company_members cm ON cm.user_id = tl.user_id AND cm.company_id = tl.company_id
      LEFT JOIN roles r ON r.id = cm.role_id
      WHERE tl.company_id = ?
    `;

    const params = [companyId];

    // If user can't view all logs, apply default hierarchy visibility:
    // self + same role level + lower role levels.
    if (!canViewAll) {
      const visibilityConditions = [
        "tl.user_id = ?",
        "COALESCE(r.hierarchy_level, 0) <= ?",
      ];
      params.push(req.user.id);
      params.push(viewerRoleLevel);

      query += ` AND (${visibilityConditions.join(" OR ")})`;
    }

    if (userId) {
      query += " AND tl.user_id = ?";
      params.push(parseInt(userId, 10));
    }

    if (dateFrom) {
      query += " AND tl.clock_in >= ?";
      params.push(dateFrom);
    }

    if (dateTo) {
      query += " AND tl.clock_in <= ?";
      params.push(dateTo);
    }

    query += " ORDER BY tl.clock_in DESC";
    query += " LIMIT ? OFFSET ?";
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const logs = db.prepare(query).all(...params);

    // Get total count with the same visibility rules
    let countQuery = `
      SELECT COUNT(*) as count
      FROM time_logs tl
      JOIN company_members cm ON cm.user_id = tl.user_id AND cm.company_id = tl.company_id
      LEFT JOIN roles r ON r.id = cm.role_id
      WHERE tl.company_id = ?
    `;
    const countParams = [companyId];

    if (!canViewAll) {
      const countVisibilityConditions = [
        "tl.user_id = ?",
        "COALESCE(r.hierarchy_level, 0) <= ?",
      ];
      countParams.push(req.user.id);
      countParams.push(viewerRoleLevel);

      countQuery += ` AND (${countVisibilityConditions.join(" OR ")})`;
    }

    if (userId) {
      countQuery += " AND tl.user_id = ?";
      countParams.push(parseInt(userId, 10));
    }

    if (dateFrom) {
      countQuery += " AND tl.clock_in >= ?";
      countParams.push(dateFrom);
    }

    if (dateTo) {
      countQuery += " AND tl.clock_in <= ?";
      countParams.push(dateTo);
    }

    const { count } = db.prepare(countQuery).get(...countParams);

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get time logs error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get current user's time logs
const getMyTimeLogs = async (req, res) => {
  try {
    const db = await getDatabase();
    const { companyId } = req.params;
    const userId = req.user.id;

    const logs = db
      .prepare(
        `
      SELECT * FROM time_logs
      WHERE user_id = ? AND company_id = ?
      ORDER BY clock_in DESC
      LIMIT 50
    `
      )
      .all(userId, companyId);

    res.json({ logs });
  } catch (error) {
    console.error("Get my time logs error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get current status (clocked in or out)
const getCurrentStatus = async (req, res) => {
  try {
    const db = await getDatabase();
    const { companyId } = req.params;
    const { userId } = req.query;

    const targetUserId = parseInt(userId, 10) || req.user.id;

    if (!canAccessUserLogs(req, db, companyId, targetUserId)) {
      return res.status(403).json({
        error: "You don't have permission to view this user's status",
      });
    }

    const openLog = db
      .prepare(
        `
      SELECT * FROM time_logs 
      WHERE user_id = ? AND company_id = ? AND clock_out IS NULL
      ORDER BY clock_in DESC
      LIMIT 1
    `
      )
      .get(targetUserId, companyId);

    // Calculate total hours worked today (for accumulating timer)
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).toISOString();

    const completedTodayLogs = db
      .prepare(
        `
      SELECT SUM(total_hours) as total FROM time_logs 
      WHERE user_id = ? AND company_id = ? 
        AND clock_in >= ? 
        AND clock_out IS NOT NULL
    `
      )
      .get(targetUserId, companyId, startOfDay);

    const previousDayHours = completedTodayLogs?.total || 0;
    const previousDaySeconds = Math.floor(previousDayHours * 3600); // convert hours to seconds

    res.json({
      isClockedIn: !!openLog,
      currentLog: openLog || null,
      previousDaySeconds, // total seconds worked today (excluding current session)
    });
  } catch (error) {
    console.error("Get current status error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Update time log (manual correction)
const updateTimeLog = async (req, res) => {
  try {
    const db = await getDatabase();
    const { companyId, logId } = req.params;
    const { clockIn, clockOut, notes } = req.body;

    const log = db
      .prepare("SELECT * FROM time_logs WHERE id = ? AND company_id = ?")
      .get(logId, companyId);

    if (!log) {
      return res.status(404).json({ error: "Time log not found" });
    }

    const updates = [];
    const values = [];

    if (clockIn) {
      updates.push("clock_in = ?");
      values.push(clockIn);
    }

    if (clockOut) {
      updates.push("clock_out = ?");
      values.push(clockOut);
    }

    if (notes !== undefined) {
      updates.push("notes = ?");
      values.push(notes);
    }

    // Recalculate hours if both times are available
    const finalClockIn = clockIn || log.clock_in;
    const finalClockOut = clockOut || log.clock_out;

    if (finalClockIn && finalClockOut) {
      const totalHours = calculateHours(finalClockIn, finalClockOut);
      updates.push("total_hours = ?");
      values.push(totalHours);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(logId);

    db.prepare(
      `
      UPDATE time_logs 
      SET ${updates.join(", ")}
      WHERE id = ?
    `
    ).run(...values);

    const updatedLog = db
      .prepare("SELECT * FROM time_logs WHERE id = ?")
      .get(logId);

    res.json({
      message: "Time log updated successfully",
      timeLog: updatedLog,
    });
  } catch (error) {
    console.error("Update time log error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Delete time log
const deleteTimeLog = async (req, res) => {
  try {
    const db = await getDatabase();
    const { companyId, logId } = req.params;

    const log = db
      .prepare("SELECT * FROM time_logs WHERE id = ? AND company_id = ?")
      .get(logId, companyId);

    if (!log) {
      return res.status(404).json({ error: "Time log not found" });
    }

    db.prepare("DELETE FROM time_logs WHERE id = ?").run(logId);

    res.json({ message: "Time log deleted successfully" });
  } catch (error) {
    console.error("Delete time log error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  clockIn,
  clockOut,
  getTimeLogs,
  getMyTimeLogs,
  getCurrentStatus,
  updateTimeLog,
  deleteTimeLog,
};
