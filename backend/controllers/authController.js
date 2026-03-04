const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getDatabase } = require("../config/database");
const {
  validateEmail,
  generateQRCode,
  validatePasswordStrength,
} = require("../utils/helpers");
const { autoRefreshInviteCodeIfExpired } = require("./companyController");

// Register new user
const register = async (req, res) => {
  try {
    const db = await getDatabase();
    const { email, password, firstName, lastName } = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (!validatePasswordStrength(password)) {
      return res.status(400).json({
        error:
          "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
      });
    }

    // Check if user already exists
    const existingUser = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email);

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "User with this email already exists" });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create user
    const stmt = db.prepare(`
      INSERT INTO users (email, password, first_name, last_name)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(email, hashedPassword, firstName, lastName);
    const userId = result.lastInsertRowid;

    // Generate QR code
    const qrCode = generateQRCode(userId);
    db.prepare("UPDATE users SET qr_code = ? WHERE id = ?").run(qrCode, userId);

    // Get created user
    const user = db
      .prepare(
        "SELECT id, email, first_name, last_name, qr_code, avatar FROM users WHERE id = ?"
      )
      .get(userId);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        qrCode: user.qr_code,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Server error during registration" });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const db = await getDatabase();
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password
    const isPasswordValid = bcrypt.compareSync(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        qrCode: user.qr_code,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error during login" });
  }
};

// Get current user info
const getMe = async (req, res) => {
  try {
    const db = await getDatabase();
    // Get user companies with role permissions
    const companies = db
      .prepare(
        `
      SELECT c.*, cm.role_id, r.name as role_name, r.hierarchy_level, r.permissions,
        CASE WHEN c.owner_id = ? THEN 1 ELSE 0 END as is_owner
      FROM companies c
      JOIN company_members cm ON c.id = cm.company_id
      LEFT JOIN roles r ON cm.role_id = r.id
      WHERE cm.user_id = ?
    `
      )
      .all(req.user.id, req.user.id);

    // Auto-refresh invite codes for all companies if expired
    companies.forEach((company) => {
      autoRefreshInviteCodeIfExpired(db, company.id);
    });

    // Re-fetch companies to get updated invite codes
    const updatedCompanies = db
      .prepare(
        `
      SELECT c.*, cm.role_id, r.name as role_name, r.hierarchy_level, r.permissions,
        CASE WHEN c.owner_id = ? THEN 1 ELSE 0 END as is_owner
      FROM companies c
      JOIN company_members cm ON c.id = cm.company_id
      LEFT JOIN roles r ON cm.role_id = r.id
      WHERE cm.user_id = ?
    `
      )
      .all(req.user.id, req.user.id);

    // Parse permissions JSON for each company
    const companiesWithPermissions = updatedCompanies.map((company) => ({
      ...company,
      permissions: company.permissions ? JSON.parse(company.permissions) : null,
    }));

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.first_name,
        lastName: req.user.last_name,
        qrCode: req.user.qr_code,
        avatar: req.user.avatar,
      },
      companies: companiesWithPermissions,
    });
  } catch (error) {
    console.error("GetMe error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  register,
  login,
  getMe,
};
