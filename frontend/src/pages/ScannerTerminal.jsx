import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { timeLogAPI } from "../services/api";
import { socket } from "../services/socket";
import { CheckCircle, XCircle, Clock, LogIn, LogOut, X, Settings } from "lucide-react";
import { t } from "../i18n";

const ScannerTerminal = () => {
  const { selectedCompany, user, isOwner, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [qrInput, setQrInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState(null);
  const [lastScanned, setLastScanned] = useState(null);
  const inputRef = useRef(null);
  const timeoutRef = useRef(null);
  const qrBufferRef = useRef("");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isTablet, setIsTablet] = useState(
    window.innerWidth <= 1200 || window.innerHeight <= 900
  );
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      setIsMobile(window.innerWidth <= 768);
      setIsTablet(window.innerWidth <= 1200 || window.innerHeight <= 900);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const processQRCode = React.useCallback(async (qrCode) => {
    if (!qrCode || qrCode.length < 5 || !selectedCompany) {
      // Invalid QR code or no company
      return;
    }

    setScanning(true);
    setMessage(null);

    try {
      // First, try to clock in
      try {
        const response = await timeLogAPI.clockIn({
          qrCode: qrCode,
          companyId: selectedCompany.id,
        });

        const userName = response.data?.timeLog?.userName || "Employee";
        setLastScanned({
          name: userName,
          action: "in",
          time: new Date(),
        });
        setMessage({
          type: "success",
          text: t("scannerTerminal.welcome", { userName }),
          subtitle: t("scannerTerminal.successfullyClockedIn"),
        });

        // Reset after 5 seconds
        setTimeout(() => {
          setMessage(null);
          setLastScanned(null);
          qrBufferRef.current = "";
          setQrInput("");
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 5000);
      } catch (clockInError) {
        // If clock in fails, try clock out
        if (
          clockInError.response?.status === 400 &&
          clockInError.response?.data?.error?.includes("already clocked in")
        ) {
          // User is already clocked in, try clock out
          const response = await timeLogAPI.clockOut({
            qrCode: qrCode,
            companyId: selectedCompany.id,
          });

          const userName = response.data?.timeLog?.userName || "Employee";
          setLastScanned({
            name: userName,
            action: "out",
            time: new Date(),
          });
          setMessage({
            type: "success",
            text: t("scannerTerminal.goodbye", { userName }),
            subtitle: t("scannerTerminal.successfullyClockedOut"),
          });

          // Reset after 5 seconds
          setTimeout(() => {
            setMessage(null);
            setLastScanned(null);
            qrBufferRef.current = "";
            setQrInput("");
            if (inputRef.current) {
              inputRef.current.focus();
            }
          }, 5000);
        } else {
          // Other error
          throw clockInError;
        }
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || t("scannerTerminal.scanFailed");
      setMessage({
        type: "error",
        text: errorMessage,
        subtitle: t("scannerTerminal.scanAgain"),
      });

      // Reset after 4 seconds
      setTimeout(() => {
        setMessage(null);
        qrBufferRef.current = "";
        setQrInput("");
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 4000);
    } finally {
      setScanning(false);
    }
  }, [selectedCompany]);

  useEffect(() => {
    // Keep scanner input focused without aggressive polling.
    const keepFocus = () => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }
    };

    keepFocus();
    const focusOnUserInteraction = () => keepFocus();
    const focusOnVisibility = () => {
      if (!document.hidden) keepFocus();
    };

    // Global keyboard event handler to capture scanner input
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input field (except our hidden one)
      if (
        e.target.tagName === "INPUT" &&
        e.target !== inputRef.current &&
        e.target.type !== "hidden"
      ) {
        return;
      }

        // Handle Enter key (scanner sends Enter at the end)
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        
        // Clear any pending timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        const qrCode = qrBufferRef.current.trim() || qrInput.trim();
        if (qrCode.length > 5 && !scanning) {
          const codeToProcess = qrCode;
          qrBufferRef.current = "";
          setQrInput("");
          processQRCode(codeToProcess);
        } else {
          qrBufferRef.current = "";
          setQrInput("");
        }
        return;
      }

      // Handle Escape key for exit (only for admins/owners)
      if (e.key === "Escape") {
        if (isOwner || hasPermission("manage_company") || hasPermission("view_company_settings")) {
          e.preventDefault();
          e.stopPropagation();
          navigate("/dashboard");
          return;
        }
        return;
      }

      // Ignore modifier keys
      if (
        e.key === "Shift" ||
        e.key === "Control" ||
        e.key === "Alt" ||
        e.key === "Meta" ||
        e.key === "Tab"
      ) {
        return;
      }

      // Capture printable characters
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        e.stopPropagation();

        // Add character to buffer
        qrBufferRef.current += e.key;
        setQrInput(qrBufferRef.current); // Also update state for visual feedback

        // Clear buffer after timeout (scanner sends data quickly, then Enter)
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          const qrCode = qrBufferRef.current.trim();
          if (qrCode.length > 5 && !scanning) {
            const codeToProcess = qrCode;
            qrBufferRef.current = "";
            setQrInput("");
            processQRCode(codeToProcess);
          } else {
            qrBufferRef.current = "";
            setQrInput("");
          }
        }, 300); // 300ms timeout - scanner sends data quickly, then Enter
      }
    };

    // Listen for real-time clock in/out events
    const handleClockIn = () => {
      // Could show notification if needed
    };

    const handleClockOut = () => {
      // Could show notification if needed
    };

    socket.on("employee-clocked-in", handleClockIn);
    socket.on("employee-clocked-out", handleClockOut);

    // Keep focus on common user interactions.
    window.addEventListener("pointerdown", focusOnUserInteraction, true);
    window.addEventListener("focus", focusOnUserInteraction, true);
    document.addEventListener("visibilitychange", focusOnVisibility);

    // Add global keyboard listener
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      socket.off("employee-clocked-in", handleClockIn);
      socket.off("employee-clocked-out", handleClockOut);
      window.removeEventListener("pointerdown", focusOnUserInteraction, true);
      window.removeEventListener("focus", focusOnUserInteraction, true);
      document.removeEventListener("visibilitychange", focusOnVisibility);
      document.removeEventListener("keydown", handleKeyDown, true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [scanning, selectedCompany, processQRCode, isOwner, hasPermission, navigate]);

  if (!selectedCompany) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <XCircle size={64} color="var(--danger-color)" />
          <h1 style={styles.errorTitle}>{t("scannerTerminal.noCompanySelected")}</h1>
          <p style={styles.errorText}>
            {t("scannerTerminal.selectCompanyMessage")}
          </p>
        </div>
      </div>
    );
  }

  // Check if user can exit terminal (owner or admin)
  const canExitTerminal = isOwner || hasPermission("manage_company") || hasPermission("view_company_settings");
  const fitScale = isTablet
    ? Math.max(
        0.72,
        Math.min(
          1,
          Math.min(viewport.width / (isMobile ? 430 : 1180), viewport.height / (isMobile ? 760 : 920))
        )
      )
    : 1;

  const responsiveStyles = isMobile
    ? {
        container: {
          padding: "0.75rem",
          minHeight: "100dvh",
          alignItems: "center",
          justifyContent: "center",
          overflowY: "auto",
        },
        content: { padding: "1.5rem 1rem", borderRadius: "1rem" },
        header: { marginBottom: "1.5rem" },
        feedbackStage: { minHeight: "220px" },
        title: { fontSize: "1.75rem" },
        subtitle: { fontSize: "1rem" },
        instructionTitle: { fontSize: "1.25rem" },
        instructionText: { fontSize: "0.95rem" },
        scanningText: { fontSize: "1rem" },
        messageContainer: { padding: "1.25rem", marginTop: 0, marginBottom: 0 },
        messageTitle: { fontSize: "1.35rem" },
        messageSubtitle: { fontSize: "0.95rem" },
        messageIcon: { marginBottom: "0.75rem" },
        lastScannedInfo: { display: "none" },
        statusBar: { marginTop: "1rem", padding: "0.75rem" },
        exitButton: {
          top: "0.5rem",
          right: "0.5rem",
          padding: "0.5rem 0.75rem",
          fontSize: "0.75rem",
        },
      }
    : isTablet
      ? {
          container: {
            padding: "1rem",
            minHeight: "100dvh",
            alignItems: "center",
            justifyContent: "center",
            overflowY: "auto",
          },
          content: { padding: "2.5rem 2rem", borderRadius: "1.25rem" },
          header: { marginBottom: "2rem" },
          feedbackStage: { minHeight: "280px" },
          title: { fontSize: "2.5rem" },
          subtitle: { fontSize: "1.25rem" },
          instructionTitle: { fontSize: "1.75rem" },
          instructionText: { fontSize: "1.1rem" },
          scanningText: { fontSize: "1.25rem" },
          messageContainer: { padding: "1.5rem", marginTop: 0, marginBottom: 0 },
          messageTitle: { fontSize: "1.75rem" },
          messageSubtitle: { fontSize: "1rem" },
          messageIcon: { marginBottom: "1rem" },
          lastScannedInfo: { marginTop: "1rem", paddingTop: "1rem" },
          actionBadge: { padding: "0.5rem 1rem", fontSize: "0.95rem" },
          timeText: { fontSize: "0.95rem" },
          statusBar: { marginTop: "1rem" },
          exitButton: {
            top: "0.75rem",
            right: "0.75rem",
            padding: "0.625rem 1rem",
            fontSize: "0.8125rem",
          },
        }
      : {};

  const instructionIconSize = isMobile ? 52 : isTablet ? 60 : 80;
  const messageIconSize = isMobile ? 72 : isTablet ? 84 : 120;

  return (
    <div style={{...styles.container, ...responsiveStyles.container}}>
      {/* Exit button for admins/owners */}
      {canExitTerminal && (
        <button
          onClick={() => navigate("/dashboard")}
          style={{...styles.exitButton, ...responsiveStyles.exitButton}}
          title="Exit Terminal Mode (Press ESC)"
          onMouseEnter={(e) => {
            Object.assign(e.currentTarget.style, exitButtonHover);
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "var(--danger-color)";
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.3)";
          }}
        >
          <X size={20} />
          <span>{t("scannerTerminal.exitTerminal")}</span>
        </button>
      )}

      {/* Hidden input for scanner (USB HID keyboard mode) - always focused */}
      <input
        ref={inputRef}
        type="text"
        value={qrInput}
        onChange={(e) => {
          setQrInput(e.target.value);
          // Also update buffer
          qrBufferRef.current = e.target.value;
        }}
        onKeyDown={(e) => {
          // Prevent default to avoid page navigation
          if (e.key === "Enter") {
            e.preventDefault();
            const qrCode = qrBufferRef.current.trim() || qrInput.trim();
            if (qrCode.length > 5 && !scanning) {
              const codeToProcess = qrCode;
              qrBufferRef.current = "";
              setQrInput("");
              processQRCode(codeToProcess);
            }
          }
        }}
        style={styles.hiddenInput}
        autoFocus
        placeholder=""
        autoComplete="off"
        tabIndex={0}
      />

      {/* Main Content */}
      <div
        style={{
          ...styles.content,
          ...responsiveStyles.content,
          ...(fitScale < 1 ? { zoom: fitScale } : {}),
        }}
      >
        {/* Header */}
        <div style={{...styles.header, ...responsiveStyles.header}}>
          <h1 style={{...styles.title, ...responsiveStyles.title}}>{t("scannerTerminal.timeTrackingTerminal")}</h1>
          <p style={{...styles.subtitle, ...responsiveStyles.subtitle}}>{selectedCompany.name}</p>
        </div>

        <div style={{...styles.feedbackStage, ...responsiveStyles.feedbackStage}}>
          {/* Instructions */}
          {!message && !scanning && (
            <div style={styles.instructions}>
              <div style={styles.instructionIcon}>
                <Clock size={instructionIconSize} />
              </div>
              <h2 style={{...styles.instructionTitle, ...responsiveStyles.instructionTitle}}>
                {t("scannerTerminal.scanQRCodeInstruction")}
              </h2>
              <p style={{...styles.instructionText, ...responsiveStyles.instructionText}}>
                {t("scannerTerminal.scanInstruction")}
              </p>
            </div>
          )}

          {/* Scanning State */}
          {scanning && !message && (
            <div style={styles.scanningContainer}>
              <div className="spinner" style={styles.spinner}></div>
              <p style={{...styles.scanningText, ...responsiveStyles.scanningText}}>{t("scannerTerminal.processing", "Processing...")}</p>
            </div>
          )}

          {/* Success/Error Message */}
          {message && (
            <div
              style={{
                ...styles.messageContainer,
                ...responsiveStyles.messageContainer,
                ...(message.type === "success"
                  ? styles.successContainer
                  : styles.errorContainer),
              }}
            >
            <div style={{...styles.messageIcon, ...responsiveStyles.messageIcon}}>
                {message.type === "success" ? (
                  <CheckCircle size={messageIconSize} />
                ) : (
                  <XCircle size={messageIconSize} />
                )}
              </div>
              <h2 style={{...styles.messageTitle, ...responsiveStyles.messageTitle}}>{message.text}</h2>
              {message.subtitle && (
                <p style={{...styles.messageSubtitle, ...responsiveStyles.messageSubtitle}}>{message.subtitle}</p>
              )}
            {lastScanned && (
              <div style={{...styles.lastScannedInfo, ...responsiveStyles.lastScannedInfo}}>
                <div style={{...styles.actionBadge, ...responsiveStyles.actionBadge}}>
                    {lastScanned.action === "in" ? (
                      <LogIn size={24} />
                    ) : (
                      <LogOut size={24} />
                    )}
                    <span style={styles.actionText}>
                      {lastScanned.action === "in" ? t("dashboard.clockIn") : t("dashboard.clockOut")}
                    </span>
                  </div>
                <p style={{...styles.timeText, ...responsiveStyles.timeText}}>
                    {lastScanned.time.toLocaleTimeString()}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Indicator */}
        <div style={{...styles.statusBar, ...responsiveStyles.statusBar}}>
          <div
            style={{
              ...styles.statusDot,
              ...(scanning ? styles.statusDotActive : styles.statusDotReady),
            }}
          />
          <span style={styles.statusText}>
            {scanning ? t("scannerTerminal.processing", "Processing...") : t("scannerTerminal.ready")}
          </span>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "var(--bg-secondary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
  },
  content: {
    width: "100%",
    maxWidth: "800px",
    backgroundColor: "var(--white)",
    borderRadius: "1.5rem",
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
    padding: "4rem",
    textAlign: "center",
  },
  header: {
    marginBottom: "3rem",
  },
  title: {
    fontSize: "3rem",
    fontWeight: "700",
    color: "var(--text-primary)",
    marginBottom: "0.5rem",
  },
  subtitle: {
    fontSize: "1.5rem",
    color: "var(--text-secondary)",
    fontWeight: "500",
  },
  instructions: {
    marginTop: "2rem",
    marginBottom: "3rem",
  },
  instructionIcon: {
    margin: "0 auto 2rem",
    color: "var(--primary-color)",
  },
  instructionTitle: {
    fontSize: "2rem",
    fontWeight: "600",
    color: "var(--text-primary)",
    marginBottom: "1rem",
  },
  instructionText: {
    fontSize: "1.25rem",
    color: "var(--text-secondary)",
    maxWidth: "36rem",
    margin: "0 auto",
  },
  feedbackStage: {
    minHeight: "360px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  scanningContainer: {
    marginTop: "3rem",
    marginBottom: "3rem",
  },
  spinner: {
    width: "80px",
    height: "80px",
    margin: "0 auto 2rem",
    borderWidth: "6px",
  },
  scanningText: {
    fontSize: "1.5rem",
    color: "var(--text-secondary)",
    fontWeight: "500",
  },
  messageContainer: {
    marginTop: "1rem",
    marginBottom: "1rem",
    padding: "3rem",
    borderRadius: "1rem",
    width: "100%",
    maxWidth: "100%",
  },
  successContainer: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    border: "3px solid var(--success-color)",
  },
  errorContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    border: "3px solid var(--danger-color)",
  },
  messageIcon: {
    marginBottom: "1.5rem",
    color: "var(--success-color)",
  },
  messageTitle: {
    fontSize: "2.5rem",
    fontWeight: "700",
    color: "var(--text-primary)",
    marginBottom: "0.5rem",
    lineHeight: 1.25,
    overflowWrap: "anywhere",
  },
  messageSubtitle: {
    fontSize: "1.25rem",
    color: "var(--text-secondary)",
    marginBottom: "1.5rem",
    overflowWrap: "anywhere",
  },
  lastScannedInfo: {
    marginTop: "2rem",
    paddingTop: "2rem",
    borderTop: "2px solid var(--border-color)",
  },
  actionBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.75rem 1.5rem",
    backgroundColor: "var(--white)",
    borderRadius: "9999px",
    marginBottom: "1rem",
    fontSize: "1.125rem",
    fontWeight: "600",
    color: "var(--text-primary)",
  },
  actionText: {
    marginLeft: "0.25rem",
  },
  timeText: {
    fontSize: "1.125rem",
    color: "var(--text-secondary)",
    fontWeight: "500",
  },
  statusBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.75rem",
    marginTop: "3rem",
    padding: "1rem",
    backgroundColor: "var(--light-gray)",
    borderRadius: "0.5rem",
  },
  statusDot: {
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    transition: "all 0.3s ease",
  },
  statusDotReady: {
    backgroundColor: "var(--success-color)",
    boxShadow: "0 0 10px rgba(16, 185, 129, 0.5)",
  },
  statusDotActive: {
    backgroundColor: "var(--primary-color)",
    boxShadow: "0 0 10px rgba(79, 70, 229, 0.5)",
    animation: "pulse 1.5s ease-in-out infinite",
  },
  statusText: {
    fontSize: "1rem",
    fontWeight: "500",
    color: "var(--text-secondary)",
  },
  hiddenInput: {
    position: "fixed",
    top: "0",
    left: "0",
    width: "1px",
    height: "1px",
    opacity: 0,
    border: "none",
    outline: "none",
    padding: 0,
    margin: 0,
    zIndex: -1,
  },
  errorTitle: {
    fontSize: "2rem",
    fontWeight: "700",
    color: "var(--text-primary)",
    marginBottom: "1rem",
  },
  errorText: {
    fontSize: "1.25rem",
    color: "var(--text-secondary)",
  },
  exitButton: {
    position: "fixed",
    top: "1rem",
    right: "1rem",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.75rem 1.25rem",
    backgroundColor: "var(--danger-color)",
    color: "var(--white)",
    border: "none",
    borderRadius: "0.5rem",
    fontSize: "0.875rem",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)",
    zIndex: 1000,
    transition: "all 0.2s ease",
  },
};

export default ScannerTerminal;

