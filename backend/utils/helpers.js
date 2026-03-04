const crypto = require("crypto");

// Generate unique invite code
const generateInviteCode = () => {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
};

// Generate unique QR code string for user
const generateQRCode = (userId) => {
  return `EMP-${userId}-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
};

// Calculate hours between two dates
const calculateHours = (clockIn, clockOut) => {
  const start = new Date(clockIn);
  const end = new Date(clockOut);
  const diffMs = end - start;
  const diffHours = diffMs / (1000 * 60 * 60);
  return Math.round(diffHours * 100) / 100; // Round to 2 decimal places
};

// Validate email format
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Validate password strength
const validatePasswordStrength = (password) => {
  if (typeof password !== "string") return false;
  // At least 8 chars, one lowercase, one uppercase, one number, one special char
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
  return re.test(password);
};

// Format date for reports
const formatDate = (date) => {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";
    return d.toISOString().split("T")[0];
  } catch (error) {
    console.error("formatDate error:", error);
    return "-";
  }
};

// Format datetime for reports
const formatDateTime = (date) => {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";

    // Use manual formatting to avoid locale issues
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch (error) {
    console.error("formatDateTime error:", error);
    return "-";
  }
};

// Format time only (HH:MM) for reports
const formatTime = (date) => {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";

    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");

    return `${hours}:${minutes}`;
  } catch (error) {
    console.error("formatTime error:", error);
    return "-";
  }
};

module.exports = {
  generateInviteCode,
  generateQRCode,
  calculateHours,
  validateEmail,
  validatePasswordStrength,
  formatDate,
  formatDateTime,
  formatTime,
};
