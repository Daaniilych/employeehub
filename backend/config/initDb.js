require("dotenv").config();
const { getDatabase, saveDatabase } = require("./database");

async function initDb() {
  console.log("Initializing database...");

  const db = await getDatabase();

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      qr_code TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Companies table
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      owner_id INTEGER NOT NULL,
      invite_code TEXT UNIQUE NOT NULL,
      invite_code_expires_at DATETIME,
      subscription_plan TEXT DEFAULT 'free',
      subscription_expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Company members (связь many-to-many между users и companies)
  db.exec(`
    CREATE TABLE IF NOT EXISTS company_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      company_id INTEGER NOT NULL,
      role_id INTEGER,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL,
      UNIQUE(user_id, company_id)
    )
  `);

  // Roles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      permissions TEXT NOT NULL,
      hierarchy_level INTEGER DEFAULT 5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      UNIQUE(company_id, name, hierarchy_level)
    )
  `);

  // Time logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS time_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      company_id INTEGER NOT NULL,
      clock_in DATETIME NOT NULL,
      clock_out DATETIME,
      total_hours REAL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    )
  `);

  // Reports configuration table
  db.exec(`
    CREATE TABLE IF NOT EXISTS report_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      format TEXT NOT NULL,
      fields TEXT NOT NULL,
      schedule_time TEXT,
      is_automatic INTEGER DEFAULT 0,
      template TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    )
  `);

  // Generated reports table
  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      config_id INTEGER,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      format TEXT NOT NULL,
      generated_by INTEGER,
      date_from DATETIME,
      date_to DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (config_id) REFERENCES report_configs(id) ON DELETE SET NULL,
      FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);


  // Invitations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      code TEXT UNIQUE NOT NULL,
      created_by INTEGER NOT NULL,
      uses_count INTEGER DEFAULT 0,
      max_uses INTEGER DEFAULT 1,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Performance indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_time_logs_company_clock_in
      ON time_logs(company_id, clock_in DESC);
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_time_logs_user_company_clock_out
      ON time_logs(user_id, company_id, clock_out);
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_company_members_company_user
      ON company_members(company_id, user_id);
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_company_members_user_company
      ON company_members(user_id, company_id);
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_reports_company_created_at
      ON reports(company_id, created_at DESC);
  `);

  // Migration: Add invite_code_expires_at column if it doesn't exist
  try {
    db.exec(`
      ALTER TABLE companies ADD COLUMN invite_code_expires_at DATETIME;
    `);
    console.log(
      "✅ Migration: Added invite_code_expires_at column to companies table"
    );
  } catch (error) {
    // Column already exists, ignore error
    if (!error.message.includes("duplicate column name")) {
      console.error("Migration error:", error.message);
    }
  }

  // Migration: Add avatar column to users table if it doesn't exist
  try {
    db.exec(`
      ALTER TABLE users ADD COLUMN avatar TEXT;
    `);
    console.log("✅ Migration: Added avatar column to users table");
  } catch (error) {
    // Column already exists, ignore error
    if (!error.message.includes("duplicate column name")) {
      console.error("Migration error:", error.message);
    }
  }

  // Migration: Add is_scanner column to roles table if it doesn't exist
  try {
    db.exec(`
      ALTER TABLE roles ADD COLUMN is_scanner INTEGER DEFAULT 0;
    `);
    console.log("✅ Migration: Added is_scanner column to roles table");
  } catch (error) {
    // Column already exists, ignore error
    if (!error.message.includes("duplicate column name")) {
      console.error("Migration error:", error.message);
    }
  }

  // Migration: Create Owner role for existing companies without one
  try {
    const companiesWithoutOwnerRole = db
      .prepare(
        `
      SELECT DISTINCT c.id, c.owner_id
      FROM companies c
      LEFT JOIN roles r ON r.company_id = c.id AND r.name = 'Owner' AND r.hierarchy_level = 11
      WHERE r.id IS NULL
    `
      )
      .all();

    if (companiesWithoutOwnerRole.length > 0) {
      // Get all permissions
      const allPermissions = {};
      const permissionsList = [
        "view_all_timelogs",
        "view_employee_filters",
        "scan_others",
        "use_scanner_terminal",
        "view_reports",
        "create_reports",
        "remove_members",
        "assign_roles",
        "manage_members",
        "view_roles",
        "create_roles",
        "edit_roles",
        "delete_roles",
        "manage_roles",
        "create_channels",
        "delete_channels",
        "manage_channels",
        "pin_channels",
        "view_company_settings",
        "edit_company_settings",
        "view_invite_code",
        "refresh_invite_code",
        "manage_company",
      ];
      permissionsList.forEach((perm) => {
        allPermissions[perm] = true;
      });

      const ownerRoleStmt = db.prepare(`
        INSERT INTO roles (company_id, name, permissions, hierarchy_level, is_scanner)
        VALUES (?, 'Owner', ?, 11, 0)
      `);

      companiesWithoutOwnerRole.forEach((company) => {
        const ownerRoleResult = ownerRoleStmt.run(
          company.id,
          JSON.stringify(allPermissions)
        );
        const ownerRoleId = ownerRoleResult.lastInsertRowid;

        // Assign Owner role to owner
        db.prepare(
          `
          UPDATE company_members 
          SET role_id = ?
          WHERE user_id = ? AND company_id = ?
        `
        ).run(ownerRoleId, company.owner_id, company.id);
      });

      console.log(
        `✅ Migration: Created Owner roles for ${companiesWithoutOwnerRole.length} companies`
      );
    }
  } catch (error) {
    console.error("Migration error (Owner roles):", error.message);
  }

  saveDatabase();

  console.log("✅ Database initialized successfully!");
  console.log("Tables created:");
  console.log("  - users");
  console.log("  - companies");
  console.log("  - company_members");
  console.log("  - roles");
  console.log("  - time_logs");
  console.log("  - report_configs");
  console.log("  - reports");
  console.log("  - invitations");
}

initDb().catch(console.error);
