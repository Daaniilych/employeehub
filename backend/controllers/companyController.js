const { getDatabase } = require("../config/database");
const { generateInviteCode } = require("../utils/helpers");

// Create new company
const createCompany = async (req, res) => {
  try {
    const db = await getDatabase();
    const { name, subscriptionPlan = "free" } = req.body;
    const ownerId = req.user.id;

    if (!name) {
      return res.status(400).json({ error: "Company name is required" });
    }

    if (name.length > 50) {
      return res
        .status(400)
        .json({ error: "Company name must be 50 characters or less" });
    }

    if (name.length < 2) {
      return res
        .status(400)
        .json({ error: "Company name must be at least 2 characters" });
    }

    // Generate unique invite code with expiration (1 hour)
    let inviteCode;
    let isUnique = false;

    while (!isUnique) {
      inviteCode = generateInviteCode();
      const existing = db
        .prepare("SELECT id FROM companies WHERE invite_code = ?")
        .get(inviteCode);
      if (!existing) isUnique = true;
    }

    // Set invite code expiration to 1 hour from now
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Create company
    const stmt = db.prepare(`
      INSERT INTO companies (name, owner_id, invite_code, invite_code_expires_at, subscription_plan)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      name,
      ownerId,
      inviteCode,
      expiresAt,
      subscriptionPlan
    );
    const companyId = result.lastInsertRowid;

    // Create default Owner role with highest level
    const ownerRoleStmt = db.prepare(`
      INSERT INTO roles (company_id, name, permissions, hierarchy_level)
      VALUES (?, 'Owner', ?, 11)
    `);

    // Owner has all permissions (including new ones)
    const ownerPermissions = JSON.stringify({
      view_all_timelogs: true,
      view_employee_filters: true,
      scan_others: true,
      use_scanner_terminal: true,
      view_reports: true,
      create_reports: true,
      remove_members: true,
      assign_roles: true,
      manage_members: true,
      view_roles: true,
      create_roles: true,
      edit_roles: true,
      delete_roles: true,
      manage_roles: true,
      create_channels: true,
      delete_channels: true,
      manage_channels: true,
      pin_channels: true,
      view_company_settings: true,
      edit_company_settings: true,
      view_invite_code: true,
      refresh_invite_code: true,
      manage_company: true,
    });

    const ownerRoleResult = ownerRoleStmt.run(companyId, ownerPermissions);
    const ownerRoleId = ownerRoleResult.lastInsertRowid;

    // Add owner as company member with Owner role
    db.prepare(
      `
      INSERT INTO company_members (user_id, company_id, role_id)
      VALUES (?, ?, ?)
    `
    ).run(ownerId, companyId, ownerRoleId);

    // Get created company
    const company = db
      .prepare("SELECT * FROM companies WHERE id = ?")
      .get(companyId);

    res.status(201).json({
      message: "Company created successfully",
      company: {
        id: company.id,
        name: company.name,
        inviteCode: company.invite_code,
        subscriptionPlan: company.subscription_plan,
        isOwner: true,
      },
    });
  } catch (error) {
    console.error("Create company error:", error);
    res.status(500).json({ error: "Server error while creating company" });
  }
};

// Join company by invite code
const joinCompany = async (req, res) => {
  try {
    const db = await getDatabase();
    const { inviteCode } = req.body;
    const userId = req.user.id;

    if (!inviteCode) {
      return res.status(400).json({ error: "Invite code is required" });
    }

    // Find company by invite code
    const company = db
      .prepare("SELECT * FROM companies WHERE invite_code = ?")
      .get(inviteCode.toUpperCase());

    if (!company) {
      return res.status(404).json({ error: "Invalid invite code" });
    }

    // Check if invite code has expired
    if (company.invite_code_expires_at) {
      const expiresAt = new Date(company.invite_code_expires_at);
      if (expiresAt < new Date()) {
        return res.status(400).json({
          error: "Invite code has expired",
          expired: true,
        });
      }
    }

    // Check if user is already a member
    const existingMember = db
      .prepare(
        `
      SELECT id FROM company_members 
      WHERE user_id = ? AND company_id = ?
    `
      )
      .get(userId, company.id);

    if (existingMember) {
      return res
        .status(400)
        .json({ error: "You are already a member of this company" });
    }

    // Add user as company member
    db.prepare(
      `
      INSERT INTO company_members (user_id, company_id)
      VALUES (?, ?)
    `
    ).run(userId, company.id);



    res.json({
      message: "Successfully joined company",
      company: {
        id: company.id,
        name: company.name,
        inviteCode: company.invite_code,
        subscriptionPlan: company.subscription_plan,
        isOwner: false,
      },
    });
  } catch (error) {
    console.error("Join company error:", error);
    res.status(500).json({ error: "Server error while joining company" });
  }
};

// Get company details
const getCompany = async (req, res) => {
  try {
    const db = await getDatabase();
    const { companyId } = req.params;

    // Auto-refresh invite code if expired
    const refreshed = autoRefreshInviteCodeIfExpired(db, companyId);

    const company = db
      .prepare("SELECT * FROM companies WHERE id = ?")
      .get(companyId);

    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    // Get members count
    const membersCount = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM company_members WHERE company_id = ?
    `
      )
      .get(companyId).count;

    res.json({
      company: {
        id: company.id,
        name: company.name,
        inviteCode: company.invite_code,
        inviteCodeExpiresAt: company.invite_code_expires_at,
        subscriptionPlan: company.subscription_plan,
        membersCount,
        isOwner: req.isOwner,
        createdAt: company.created_at,
        autoRefreshed: !!refreshed, // Indicate if code was auto-refreshed
      },
    });
  } catch (error) {
    console.error("Get company error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get company members
const getCompanyMembers = async (req, res) => {
  try {
    const db = await getDatabase();
    const { companyId } = req.params;
    const isOwner = req.isOwner || false;

    // Build query - Owner sees all members including scanners, others don't see scanners
    let query = `
      SELECT 
        u.id as user_id,
        u.id, u.email, u.first_name, u.last_name, u.qr_code, u.avatar,
        cm.joined_at, cm.role_id,
        COALESCE(r.name, '') as role_name,
        COALESCE(r.hierarchy_level, 0) as hierarchy_level,
        COALESCE(r.is_scanner, 0) as is_scanner,
        CASE WHEN c.owner_id = u.id THEN 1 ELSE 0 END as is_owner
      FROM company_members cm
      JOIN users u ON cm.user_id = u.id
      JOIN companies c ON cm.company_id = c.id
      LEFT JOIN roles r ON cm.role_id = r.id
      WHERE cm.company_id = ?
    `;

    // If not owner, exclude scanners (but always show owner)
    if (!isOwner) {
      query += ` AND (c.owner_id = u.id OR COALESCE(r.is_scanner, 0) = 0)`;
    }

    query += ` ORDER BY is_owner DESC, COALESCE(r.hierarchy_level, 0) DESC, cm.joined_at ASC`;

    const members = db.prepare(query).all(companyId);

    res.json({ members });
  } catch (error) {
    console.error("Get company members error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Update company
const updateCompany = async (req, res) => {
  try {
    const db = await getDatabase();
    const { companyId } = req.params;
    const { name, subscriptionPlan } = req.body;

    const updates = [];
    const values = [];

    if (name) {
      updates.push("name = ?");
      values.push(name);
    }

    if (subscriptionPlan) {
      updates.push("subscription_plan = ?");
      values.push(subscriptionPlan);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(companyId);

    db.prepare(
      `
      UPDATE companies 
      SET ${updates.join(", ")}
      WHERE id = ?
    `
    ).run(...values);

    const company = db
      .prepare("SELECT * FROM companies WHERE id = ?")
      .get(companyId);

    res.json({
      message: "Company updated successfully",
      company,
    });
  } catch (error) {
    console.error("Update company error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Remove member from company
const removeMember = async (req, res) => {
  try {
    const db = await getDatabase();
    const { companyId, userId } = req.params;

    // Check if trying to remove owner
    const company = db
      .prepare("SELECT owner_id FROM companies WHERE id = ?")
      .get(companyId);

    if (company.owner_id === parseInt(userId)) {
      return res.status(400).json({ error: "Cannot remove company owner" });
    }

    db.prepare(
      `
      DELETE FROM company_members 
      WHERE user_id = ? AND company_id = ?
    `
    ).run(userId, companyId);

    res.json({ message: "Member removed successfully" });
  } catch (error) {
    console.error("Remove member error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Leave company (self-service)
const leaveCompany = async (req, res) => {
  try {
    const db = await getDatabase();
    const { companyId } = req.params;
    const userId = req.user.id;

    // Check if user is owner
    const company = db
      .prepare("SELECT owner_id FROM companies WHERE id = ?")
      .get(companyId);

    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    if (company.owner_id === userId) {
      return res.status(400).json({ 
        error: "Company owner cannot leave the company. Please transfer ownership or delete the company instead." 
      });
    }

    // Check if user is a member
    const membership = db
      .prepare("SELECT id FROM company_members WHERE user_id = ? AND company_id = ?")
      .get(userId, companyId);

    if (!membership) {
      return res.status(400).json({ error: "You are not a member of this company" });
    }

    // Remove user from company
    db.prepare(
      `
      DELETE FROM company_members 
      WHERE user_id = ? AND company_id = ?
    `
    ).run(userId, companyId);

    res.json({ message: "You have successfully left the company" });
  } catch (error) {
    console.error("Leave company error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Delete company (owner only)
const deleteCompany = async (req, res) => {
  try {
    const db = await getDatabase();
    const { companyId } = req.params;

    // Verify company exists and user is owner
    const company = db
      .prepare("SELECT owner_id FROM companies WHERE id = ?")
      .get(companyId);

    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    if (company.owner_id !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Only company owner can delete the company" });
    }

    // Delete all related data (in order due to foreign key constraints)

    // 1. Delete reports
    db.prepare("DELETE FROM reports WHERE company_id = ?").run(companyId);

    // 5. Delete report configs
    db.prepare("DELETE FROM report_configs WHERE company_id = ?").run(
      companyId
    );

    // 6. Delete time logs
    db.prepare(
      `
      DELETE FROM time_logs 
      WHERE user_id IN (SELECT user_id FROM company_members WHERE company_id = ?)
      AND company_id = ?
    `
    ).run(companyId, companyId);

    // 7. Delete roles
    db.prepare("DELETE FROM roles WHERE company_id = ?").run(companyId);

    // 8. Delete invitations
    db.prepare("DELETE FROM invitations WHERE company_id = ?").run(companyId);

    // 9. Delete company members
    db.prepare("DELETE FROM company_members WHERE company_id = ?").run(
      companyId
    );

    // 10. Finally, delete the company
    db.prepare("DELETE FROM companies WHERE id = ?").run(companyId);

    res.json({
      message: "Company deleted successfully",
      deletedCompanyId: companyId,
    });
  } catch (error) {
    console.error("Delete company error:", error);
    res.status(500).json({ error: "Server error while deleting company" });
  }
};

// Helper function to refresh invite code (used by both manual and auto refresh)
const refreshInviteCodeInternal = (db, companyId) => {
  // Generate new unique invite code
  let newInviteCode;
  let isUnique = false;

  while (!isUnique) {
    newInviteCode = generateInviteCode();
    const existing = db
      .prepare("SELECT id FROM companies WHERE invite_code = ? AND id != ?")
      .get(newInviteCode, companyId);
    if (!existing) isUnique = true;
  }

  // Set new expiration time (1 hour from now)
  const newExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  // Update company with new invite code and expiration
  db.prepare(
    `
    UPDATE companies 
    SET invite_code = ?, invite_code_expires_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `
  ).run(newInviteCode, newExpiresAt, companyId);

  return {
    inviteCode: newInviteCode,
    expiresAt: newExpiresAt,
  };
};

// Auto-refresh invite code if expired (called automatically)
const autoRefreshInviteCodeIfExpired = (db, companyId) => {
  try {
    const company = db
      .prepare("SELECT * FROM companies WHERE id = ?")
      .get(companyId);

    if (!company || !company.invite_code_expires_at) {
      return null;
    }

    // Check if invite code has expired
    const expiresAt = new Date(company.invite_code_expires_at);
    const now = new Date();

    if (expiresAt < now) {
      // Code has expired, auto-refresh it
      console.log(`Auto-refreshing expired invite code for company ${companyId}`);
      return refreshInviteCodeInternal(db, companyId);
    }

    return null;
  } catch (error) {
    console.error("Auto-refresh invite code error:", error);
    return null;
  }
};

// Refresh invite code (requires permission or owner)
const refreshInviteCode = async (req, res) => {
  try {
    const db = await getDatabase();
    const { companyId } = req.params;

    // Get company
    const company = db
      .prepare("SELECT * FROM companies WHERE id = ?")
      .get(companyId);

    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    // Permission check is handled by middleware

    // Refresh the code
    const result = refreshInviteCodeInternal(db, companyId);

    // Broadcast updated invite code to all connected company members.
    const io = req.app.get("io");
    if (io) {
      io.to(`company-${companyId}`).emit("company-invite-code-updated", {
        companyId: Number(companyId),
        inviteCode: result.inviteCode,
        expiresAt: result.expiresAt,
      });
    }

    res.json({
      success: true,
      inviteCode: result.inviteCode,
      expiresAt: result.expiresAt,
      message: "Invite code refreshed successfully",
    });
  } catch (error) {
    console.error("Refresh invite code error:", error);
    res
      .status(500)
      .json({ error: "Server error while refreshing invite code" });
  }
};

module.exports = {
  createCompany,
  joinCompany,
  getCompany,
  getCompanyMembers,
  updateCompany,
  removeMember,
  leaveCompany,
  deleteCompany,
  refreshInviteCode,
  autoRefreshInviteCodeIfExpired,
};
