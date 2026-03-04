const initSqlJs = require("sql.js");
const path = require("path");
const fs = require("fs");

const dbPath = process.env.DB_PATH || "./database/company.db";
const dbDir = path.dirname(dbPath);

// Create database directory if it doesn't exist
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db = null;
let SQL = null;

// Initialize the database
async function initDatabase() {
  if (db) return db;

  SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run("PRAGMA foreign_keys = ON");

  return db;
}

// Save database to file
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// Wrapper class to match better-sqlite3 API
class DatabaseWrapper {
  constructor(database) {
    this.db = database;
  }

  prepare(sql) {
    const stmt = this.db.prepare(sql);
    return {
      run: (...params) => {
        stmt.bind(params);
        stmt.step();
        const result = {
          changes: this.db.getRowsModified(),
          lastInsertRowid:
            this.db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] || 0,
        };
        stmt.reset();
        saveDatabase();
        return result;
      },
      get: (...params) => {
        stmt.bind(params);
        if (stmt.step()) {
          const columns = stmt.getColumnNames();
          const values = stmt.get();
          stmt.reset();
          const result = {};
          columns.forEach((col, idx) => {
            result[col] = values[idx];
          });
          return result;
        }
        stmt.reset();
        return undefined;
      },
      all: (...params) => {
        stmt.bind(params);
        const columns = stmt.getColumnNames();
        const results = [];
        while (stmt.step()) {
          const values = stmt.get();
          const row = {};
          columns.forEach((col, idx) => {
            row[col] = values[idx];
          });
          results.push(row);
        }
        stmt.reset();
        return results;
      },
    };
  }

  exec(sql) {
    this.db.run(sql);
    saveDatabase();
    return this;
  }

  pragma(pragma) {
    this.db.run(`PRAGMA ${pragma}`);
    return this;
  }
}

// Initialize and export
let dbWrapper = null;

async function getDatabase() {
  if (!dbWrapper) {
    await initDatabase();
    dbWrapper = new DatabaseWrapper(db);
  }
  return dbWrapper;
}

// Export for synchronous contexts (will be initialized on first server start)
module.exports = {
  getDatabase,
  initDatabase,
  saveDatabase,
};
