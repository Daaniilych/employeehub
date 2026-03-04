require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const { getDatabase, initDatabase } = require("./config/database");

const app = express();
const server = http.createServer(app);
const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];
const envAllowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = Array.from(
  new Set([...defaultAllowedOrigins, ...envAllowedOrigins, process.env.CLIENT_URL].filter(Boolean))
);

const isPrivateLanOrigin = (origin) => {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:") return false;
    const host = url.hostname;
    // Common local network ranges for development environments.
    return (
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)
    );
  } catch (error) {
    return false;
  }
};

const isOriginAllowed = (origin) => {
  if (allowedOrigins.includes(origin)) return true;
  if (process.env.NODE_ENV !== "production" && isPrivateLanOrigin(origin)) {
    return true;
  }
  return false;
};

const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Make Socket.IO available in controllers via req.app.get("io")
app.set("io", io);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" })); // Increased limit for file uploads
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve uploaded files
const path = require("path");
const fs = require("fs");
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/companies", require("./routes/companies"));
app.use("/api/roles", require("./routes/roles"));
app.use("/api/time-logs", require("./routes/timeLogs"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/users", require("./routes/userRoutes"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// WebSocket authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;

  console.log("Socket.IO auth attempt:", {
    hasToken: !!token,
    auth: socket.handshake.auth,
    headers: socket.handshake.headers,
  });

  if (!token) {
    console.log("Socket.IO: No token provided in auth");
    return next(new Error("Authentication error"));
  }

  try {
    const db = await getDatabase();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = db
      .prepare(
        "SELECT id, email, first_name, last_name, avatar FROM users WHERE id = ?"
      )
      .get(decoded.id);

    if (!user) {
      console.log(`Socket.IO: User not found (id: ${decoded.id})`);
      return next(new Error("User not found - please login again"));
    }

    console.log(`Socket.IO: User authenticated - ${user.email} (${user.id})`);
    socket.user = user;
    next();
  } catch (error) {
    console.log("Socket.IO: Invalid token -", error.message);
    next(new Error("Invalid token - please login again"));
  }
});

// WebSocket connection handling
io.on("connection", async (socket) => {
  console.log(`User connected: ${socket.user.email} (${socket.user.id})`);

  // Join user-specific room for direct notifications
  socket.join(`user-${socket.user.id}`);

  // Automatically join all companies user is member of
  try {
    const db = await getDatabase();
    const companies = db
      .prepare("SELECT company_id FROM company_members WHERE user_id = ?")
      .all(socket.user.id);
    
    companies.forEach((company) => {
      socket.join(`company-${company.company_id}`);
      console.log(`User ${socket.user.id} auto-joined company ${company.company_id}`);
    });
  } catch (error) {
    console.error("Auto-join companies error:", error);
  }

  // Join company rooms (manual join for new companies)
  socket.on("join-company", async (data) => {
    try {
      const companyId = data.companyId || data;
      const db = await getDatabase();
      // Verify user is member of company
      const membership = db
        .prepare(
          `
        SELECT id FROM company_members 
        WHERE user_id = ? AND company_id = ?
      `
        )
        .get(socket.user.id, companyId);

      if (membership) {
        socket.join(`company-${companyId}`);
        console.log(`User ${socket.user.id} joined company ${companyId}`);
      }
    } catch (error) {
      console.error("Join company error:", error);
    }
  });



  // Disconnect
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.user.email}`);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 5000;

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database
    await initDatabase();
    console.log("✅ Database initialized");

    // Initialize database tables
    require("./config/initDb");

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(
        `📊 Database: ${process.env.DB_PATH || "./database/company.db"}`
      );
      console.log(
        `🔒 JWT Secret: ${process.env.JWT_SECRET ? "✓ Set" : "✗ Not set"}`
      );
      console.log(`\nAvailable routes:`);
      console.log(`  POST   /api/auth/register`);
      console.log(`  POST   /api/auth/login`);
      console.log(`  GET    /api/auth/me`);
      console.log(`  POST   /api/companies`);
      console.log(`  POST   /api/companies/join`);
      console.log(`  GET    /api/companies/:id`);
      console.log(`  POST   /api/time-logs/clock-in`);
      console.log(`  POST   /api/time-logs/clock-out`);
      console.log(`  And more...`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

module.exports = { app, server, io };
