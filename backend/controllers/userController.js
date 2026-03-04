const { getDatabase, saveDatabase } = require("../config/database");
const bcrypt = require("bcryptjs");
const { validatePasswordStrength } = require("../utils/helpers");

// Update user profile (name, email)
async function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const { first_name, last_name, email } = req.body;

    const db = await getDatabase();

    // Check if email is being changed and if it's already taken
    if (email && email !== req.user.email) {
      const existingUser = db
        .prepare("SELECT id FROM users WHERE email = ? AND id != ?")
        .get(email, userId);

      if (existingUser) {
        return res.status(400).json({ error: "Email already in use" });
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (first_name !== undefined) {
      updates.push("first_name = ?");
      values.push(first_name);
    }
    if (last_name !== undefined) {
      updates.push("last_name = ?");
      values.push(last_name);
    }
    if (email !== undefined) {
      updates.push("email = ?");
      values.push(email);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(userId);

    const query = `
      UPDATE users 
      SET ${updates.join(", ")}
      WHERE id = ?
    `;

    db.prepare(query).run(...values);
    saveDatabase();

    // Get updated user
    const updatedUser = db
      .prepare(
        "SELECT id, email, first_name, last_name, avatar, created_at FROM users WHERE id = ?"
      )
      .get(userId);

    res.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
}

// Update user avatar
async function updateAvatar(req, res) {
  try {
    const userId = req.user.id;
    const { avatar } = req.body; // Base64 string, URL, or null to remove

    // Allow null to remove avatar
    if (avatar === undefined) {
      return res.status(400).json({ error: "Avatar data required" });
    }

    const db = await getDatabase();

    db.prepare(
      `
      UPDATE users 
      SET avatar = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
    ).run(avatar, userId);

    saveDatabase();

    res.json({
      message: "Avatar updated successfully",
      avatar,
    });
  } catch (error) {
    console.error("Update avatar error:", error);
    res.status(500).json({ error: "Failed to update avatar" });
  }
}

// Get user statistics (work hours)
async function getUserStats(req, res) {
  try {
    const { userId, companyId } = req.params;
    const db = await getDatabase();

    // Check if user is member of the company
    const membership = db
      .prepare(
        `
      SELECT 1 FROM company_members 
      WHERE user_id = ? AND company_id = ?
    `
      )
      .get(req.user.id, companyId);

    if (!membership) {
      return res
        .status(403)
        .json({ error: "You are not a member of this company" });
    }

    // Get user info
    const user = db
      .prepare(
        `
      SELECT u.id, u.email, u.first_name, u.last_name, u.avatar,
             cm.joined_at, r.name as role_name, r.hierarchy_level
      FROM users u
      JOIN company_members cm ON u.id = cm.user_id
      LEFT JOIN roles r ON cm.role_id = r.id
      WHERE u.id = ? AND cm.company_id = ?
    `
      )
      .get(userId, companyId);

    if (!user) {
      return res.status(404).json({ error: "User not found in this company" });
    }

    // Calculate total hours (all time)
    const totalHoursResult = db
      .prepare(
        `
      SELECT SUM(total_hours) as total
      FROM time_logs
      WHERE user_id = ? AND company_id = ? AND clock_out IS NOT NULL
    `
      )
      .get(userId, companyId);

    const totalHours = totalHoursResult?.total || 0;

    // Calculate hours this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthHoursResult = db
      .prepare(
        `
      SELECT SUM(total_hours) as total
      FROM time_logs
      WHERE user_id = ? AND company_id = ? 
        AND clock_out IS NOT NULL
        AND clock_in >= ?
    `
      )
      .get(userId, companyId, startOfMonth.toISOString());

    const monthHours = monthHoursResult?.total || 0;

    // Week: Monday to Sunday (reset from Sunday to Monday)
    const weekStart = new Date(now);
    const daysToMonday = (now.getDay() + 6) % 7;
    weekStart.setDate(now.getDate() - daysToMonday);
    weekStart.setHours(0, 0, 0, 0);

    // Calculate hours this week (Monday-based)
    const weekHoursResult = db
      .prepare(
        `
      SELECT SUM(total_hours) as total
      FROM time_logs
      WHERE user_id = ? AND company_id = ? 
        AND clock_out IS NOT NULL
        AND clock_in >= ?
    `
      )
      .get(userId, companyId, weekStart.toISOString());

    const weekHours = weekHoursResult?.total || 0;

    // Week daily hours (Mon=0 to Sun=6) for bar chart
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const weekDailyHours = [0, 0, 0, 0, 0, 0, 0];
    const dayHoursRows = db
      .prepare(
        `
      SELECT DATE(clock_in) as d, SUM(total_hours) as h
      FROM time_logs
      WHERE user_id = ? AND company_id = ? AND clock_out IS NOT NULL
        AND clock_in >= ? AND clock_in < ?
      GROUP BY DATE(clock_in)
    `
      )
      .all(userId, companyId, weekStart.toISOString(), weekEnd.toISOString());
    dayHoursRows.forEach((row) => {
      const d = new Date(row.d + "T12:00:00");
      const dayIndex = (d.getDay() + 6) % 7;
      weekDailyHours[dayIndex] = row.h || 0;
    });

    // Activity heatmap: last 12 months (date -> hours)
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    twelveMonthsAgo.setHours(0, 0, 0, 0);
    const heatmapRows = db
      .prepare(
        `
      SELECT DATE(clock_in) as d, SUM(total_hours) as h
      FROM time_logs
      WHERE user_id = ? AND company_id = ? AND clock_out IS NOT NULL
        AND clock_in >= ?
      GROUP BY DATE(clock_in)
    `
      )
      .all(userId, companyId, twelveMonthsAgo.toISOString());
    const activityHeatmap = {};
    heatmapRows.forEach((row) => {
      activityHeatmap[row.d] = row.h || 0;
    });

    // Count total work days
    const workDaysResult = db
      .prepare(
        `
      SELECT COUNT(DISTINCT DATE(clock_in)) as count
      FROM time_logs
      WHERE user_id = ? AND company_id = ?
    `
      )
      .get(userId, companyId);

    const workDays = workDaysResult?.count || 0;

    // Get recent logs (last 10)
    const recentLogs = db
      .prepare(
        `
      SELECT id, clock_in, clock_out, total_hours
      FROM time_logs
      WHERE user_id = ? AND company_id = ?
      ORDER BY clock_in DESC
      LIMIT 10
    `
      )
      .all(userId, companyId);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar: user.avatar,
        role_name: user.role_name,
        hierarchy_level: user.hierarchy_level,
        joined_at: user.joined_at,
      },
      stats: {
        totalHours,
        monthHours,
        weekHours,
        workDays,
        averageHoursPerDay: workDays > 0 ? totalHours / workDays : 0,
        weekDailyHours,
        activityHeatmap,
      },
      recentLogs,
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({ error: "Failed to get user statistics" });
  }
}

// Change password
async function changePassword(req, res) {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Both passwords required" });
    }

    if (!validatePasswordStrength(newPassword)) {
      return res.status(400).json({
        error:
          "New password must be at least 8 characters and include uppercase, lowercase, number, and special character",
      });
    }

    const db = await getDatabase();

    // Get current user
    const user = db
      .prepare("SELECT id, password FROM users WHERE id = ?")
      .get(userId);

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    db.prepare(
      `
      UPDATE users 
      SET password = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
    ).run(hashedPassword, userId);

    saveDatabase();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Failed to change password" });
  }
}

module.exports = {
  updateProfile,
  updateAvatar,
  getUserStats,
  changePassword,
};
