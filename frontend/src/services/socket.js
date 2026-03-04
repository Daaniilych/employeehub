import { io } from "socket.io-client";

// Use current window location for socket connection
// In development, Vite proxy will handle it, in production use env variable
const getSocketURL = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  // In development, use current host (works with IP addresses)
  if (import.meta.env.DEV) {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = "5000"; // Backend port
    return `${protocol}//${hostname}:${port}`;
  }
  // Fallback to localhost
  return "http://localhost:5000";
};

const SOCKET_URL = getSocketURL();

// Initialize socket but don't auto-connect (wait for token)
export const socket = io(SOCKET_URL, {
  autoConnect: false, // Don't connect until token is set
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});

// Store token for reconnections
let storedToken = null;

// Handle successful connection
socket.on("connect", () => {
  console.log("Socket.IO connected successfully");
  // Ensure token is set for reconnections
  if (storedToken) {
    socket.auth = { token: storedToken };
  }
});

// Handle disconnection
socket.on("disconnect", (reason) => {
  console.log("Socket.IO disconnected:", reason);
  // On disconnect, preserve token for reconnection
  if (storedToken && reason !== "io client disconnect") {
    socket.auth = { token: storedToken };
  }
});

// Handle connection errors
socket.on("connect_error", (error) => {
  console.error("Socket.IO connection error:", error.message);

  // If auth error, clear invalid token
  if (
    error.message.includes("token") ||
    error.message.includes("User not found") ||
    error.message.includes("Authentication error") ||
    error.message.includes("Invalid token")
  ) {
    console.log("Invalid token detected, clearing localStorage");
    storedToken = null;
    localStorage.removeItem("token");
    localStorage.removeItem("selectedCompanyId");

    // Redirect to login if not already there
    if (
      !window.location.pathname.includes("/login") &&
      !window.location.pathname.includes("/register") &&
      window.location.pathname !== "/"
    ) {
      console.log("Redirecting to login...");
      window.location.href = "/login";
    }
  }
});

export const connectSocket = (token) => {
  if (!token) {
    console.warn("No token provided to connectSocket");
    return socket;
  }

  // Store token for reconnections
  storedToken = token;

  // Set token in auth before connecting
  socket.auth = { token };

  // Disconnect first if already connected (to reconnect with new token)
  if (socket.connected) {
    socket.disconnect();
  }

  // Connect with token
  socket.connect();

  return socket;
};

export const disconnectSocket = () => {
  storedToken = null;
  if (socket && socket.connected) {
    socket.disconnect();
  }
};

export const getSocket = () => socket;

export default {
  socket,
  connectSocket,
  disconnectSocket,
  getSocket,
};
