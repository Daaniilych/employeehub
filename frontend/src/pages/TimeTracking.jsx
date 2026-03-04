import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import Layout from "../components/Layout";
import LiveTimer from "../components/LiveTimer";
import { timeLogAPI } from "../services/api";
import { socket } from "../services/socket";
import { QRCodeSVG } from "qrcode.react";
import jsQR from "jsqr";
import { t } from "../i18n";
import {
  Clock,
  QrCode,
  Scan,
  CheckCircle,
  XCircle,
  Calendar,
  LogIn,
  LogOut,
} from "lucide-react";

const DEBUG = import.meta.env.DEV;
const debugLog = (...args) => {
  if (DEBUG) {
    console.log(...args);
  }
};

const TimeTracking = () => {
  const { selectedCompany, user, hasPermission, isOwner } = useAuth();
  const [myStatus, setMyStatus] = useState(null);
  const [myLogs, setMyLogs] = useState([]);
  const [showQR, setShowQR] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanMode, setScanMode] = useState("in"); // 'in' or 'out'
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [hasCameraStream, setHasCameraStream] = useState(false);
  const videoRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && (
      /iPhone|iPad|iPod|Android|Mobile|Tablet/i.test(navigator.userAgent) ||
      (window.innerWidth <= 768)
    )
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(
        /iPhone|iPad|iPod|Android|Mobile|Tablet/i.test(navigator.userAgent) ||
        (window.innerWidth <= 768)
      );
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadData = useCallback(async () => {
    if (!selectedCompany) return;
    try {
      const [statusRes, logsRes] = await Promise.all([
        timeLogAPI.getCurrentStatus(selectedCompany.id),
        timeLogAPI.getMyLogs(selectedCompany.id),
      ]);

      setMyStatus(statusRes.data);
      setMyLogs(logsRes.data.logs);
    } catch (error) {
      console.error("Error loading time tracking data:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany]);

  const stopScanning = useCallback(() => {
    setScanning(false);
    setCameraError(null);
    setHasCameraStream(false);
    
    // Clear scanning interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    
    setShowScanner(false);
  }, []);

  const onScanSuccess = useCallback(async (decodedText) => {
    try {
      setScanning(false);

      let response;
      if (scanMode === "in") {
        response = await timeLogAPI.clockIn({
          qrCode: decodedText,
          companyId: selectedCompany.id,
        });
        const userName = response.data?.timeLog?.userName || "Employee";
        setMessage({
          type: "success",
          text: `✓ ${userName} successfully clocked in!`,
        });
      } else {
        response = await timeLogAPI.clockOut({
          qrCode: decodedText,
          companyId: selectedCompany.id,
        });
        const userName = response.data?.timeLog?.userName || "Employee";
        setMessage({
          type: "success",
          text: `✓ ${userName} successfully clocked out!`,
        });
      }

      setShowScanner(false);
      await loadData();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Scan failed",
      });
    }

    setTimeout(() => setMessage(""), 4000);
  }, [scanMode, selectedCompany, loadData]);

  const onScanError = useCallback((_error) => {
    // Ignore scan errors (they happen frequently while scanning)
  }, []);

  useEffect(() => {
    if (selectedCompany && user) {
      loadData();

      // Socket events are primary real-time source; keep polling as fallback.
      const interval = setInterval(() => {
        loadData();
      }, 30000);

      // Listen for real-time clock in/out events
      const handleClockIn = () => {
        loadData();
      };

      const handleClockOut = () => {
        loadData();
      };

      socket.on("employee-clocked-in", handleClockIn);
      socket.on("employee-clocked-out", handleClockOut);

      return () => {
        clearInterval(interval);
        socket.off("employee-clocked-in", handleClockIn);
        socket.off("employee-clocked-out", handleClockOut);
      };
    }
  }, [selectedCompany, user, loadData]);

  // Scan QR code from webcam frames
  const scanQRCode = useCallback(() => {
    if (!scanning) return;

    // Get video from native video element
    const video = videoRef.current;
    
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    if (!canvasRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvasRef.current = canvas;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code && code.data) {
      debugLog("QR Code detected:", code.data);
      onScanSuccess(code.data);
    }
  }, [scanning, onScanSuccess]);

  useEffect(() => {
    if (showScanner && scanning) {
      // Start scanning interval
      scanIntervalRef.current = setInterval(scanQRCode, 350);
    } else {
      // Clear interval when not scanning
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    }

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [showScanner, scanning, scanQRCode]);

  // Initialize native video stream for mobile devices or as fallback
  useEffect(() => {
    if (!showScanner || !scanning) return;
    
    // Check if mobile device directly in useEffect (including tablets)
    const checkIsMobile = /iPhone|iPad|iPod|Android|Mobile|Tablet/i.test(navigator.userAgent) || 
                          (window.innerWidth <= 768);
    debugLog("Scanner useEffect triggered", {
      showScanner, 
      scanning, 
      isMobile, 
      checkIsMobile,
      hasVideoRef: !!videoRef.current,
      userAgent: navigator.userAgent,
      windowWidth: window.innerWidth
    });
    
    const initNativeVideo = async () => {
      try {
        setHasCameraStream(false);

          // Mobile browsers usually block getUserMedia on non-secure contexts.
        if (!window.isSecureContext) {
          throw new Error(
            "Camera requires HTTPS or localhost. Open the app via https:// or localhost."
          );
        }

          // Polyfill for navigator.mediaDevices if it doesn't exist
        if (!navigator.mediaDevices) {
          debugLog("navigator.mediaDevices doesn't exist, creating polyfill...");
          navigator.mediaDevices = {};
        }
          
          // Polyfill getUserMedia if it doesn't exist but old API does
        if (!navigator.mediaDevices.getUserMedia && navigator.getUserMedia) {
            debugLog("Creating getUserMedia polyfill from old API...");
            navigator.mediaDevices.getUserMedia = function(constraints) {
              return new Promise((resolve, reject) => {
                navigator.getUserMedia(constraints, resolve, reject);
              });
            };
        } else if (!navigator.mediaDevices.getUserMedia && navigator.webkitGetUserMedia) {
            debugLog("Creating getUserMedia polyfill from webkit API...");
            navigator.mediaDevices.getUserMedia = function(constraints) {
              return new Promise((resolve, reject) => {
                navigator.webkitGetUserMedia(constraints, resolve, reject);
              });
            };
        } else if (!navigator.mediaDevices.getUserMedia && navigator.mozGetUserMedia) {
            debugLog("Creating getUserMedia polyfill from moz API...");
            navigator.mediaDevices.getUserMedia = function(constraints) {
              return new Promise((resolve, reject) => {
                navigator.mozGetUserMedia(constraints, resolve, reject);
              });
            };
          }
          
        debugLog("Initializing native video...", {
            hasMediaDevices: !!navigator.mediaDevices,
            hasGetUserMedia: !!(navigator.mediaDevices?.getUserMedia),
            hasOldGetUserMedia: !!navigator.getUserMedia,
            hasWebkitGetUserMedia: !!navigator.webkitGetUserMedia,
            hasMozGetUserMedia: !!navigator.mozGetUserMedia,
            userAgent: navigator.userAgent,
            protocol: window.location.protocol,
            hostname: window.location.hostname
          });
          
          // Try direct call first, then fallback to polyfill
        let stream = null;
          
        debugLog("Requesting camera access...");
          
          // Try direct call to navigator.mediaDevices.getUserMedia
        if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
            try {
              debugLog("Trying navigator.mediaDevices.getUserMedia with simple constraints first...");
              // Try with simple constraints first (some browsers don't support facingMode)
              stream = await navigator.mediaDevices.getUserMedia({
                video: true
              });
              debugLog("Simple constraints succeeded!");
            } catch (simpleError) {
              console.error("Simple constraints failed:", simpleError);
              // Try with facingMode if simple failed
              try {
                debugLog("Trying with facingMode constraint...");
                stream = await navigator.mediaDevices.getUserMedia({
                  video: { facingMode: "environment" }
                });
                debugLog("FacingMode constraint succeeded!");
              } catch (facingModeError) {
                console.error("FacingMode also failed:", facingModeError);
                throw facingModeError;
              }
            }
        } else if (navigator.getUserMedia) {
            // Old API - use simple constraints
            debugLog("Trying old navigator.getUserMedia API...");
            stream = await new Promise((resolve, reject) => {
              navigator.getUserMedia({ video: true }, resolve, reject);
            });
        } else if (navigator.webkitGetUserMedia) {
            // Webkit API - use simple constraints
            debugLog("Trying webkitGetUserMedia API...");
            stream = await new Promise((resolve, reject) => {
              navigator.webkitGetUserMedia({ video: true }, resolve, reject);
            });
        } else if (navigator.mozGetUserMedia) {
            // Mozilla API - use simple constraints
            debugLog("Trying mozGetUserMedia API...");
            stream = await new Promise((resolve, reject) => {
              navigator.mozGetUserMedia({ video: true }, resolve, reject);
            });
        } else {
            // No getUserMedia API available at all
            const isSecure = window.location.protocol === "https:" || 
                            window.location.hostname === "localhost" || 
                            window.location.hostname === "127.0.0.1" ||
                            window.location.hostname.startsWith("192.168.");
            
            console.error("No getUserMedia API found. Browser info:", {
              userAgent: navigator.userAgent,
              protocol: window.location.protocol,
              hostname: window.location.hostname,
              isSecure: isSecure,
              hasMediaDevices: !!navigator.mediaDevices,
              hasGetUserMedia: !!navigator.getUserMedia,
              hasWebkitGetUserMedia: !!navigator.webkitGetUserMedia,
              hasMozGetUserMedia: !!navigator.mozGetUserMedia
            });
            
            if (!isSecure) {
              throw new Error("Camera requires HTTPS connection. Please use HTTPS or access from localhost (192.168.x.x).");
            }
            
            throw new Error("Your browser does not support camera access. Please use Chrome, Safari, or Firefox on a modern device.");
          }
          
        debugLog("Camera stream received:", stream);
        streamRef.current = stream;
          
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraError(null);
          setHasCameraStream(true);
          debugLog("Native video stream started successfully");
        } else {
          console.error("videoRef.current is null!");
        }
      } catch (error) {
        console.error("Failed to initialize native video:", error);
        setHasCameraStream(false);
        const errorMsg = error?.message || error?.toString() || "Unknown error";
        let errorMessage = "Failed to access camera. Please check permissions.";
          
        if (errorMsg.includes("NotAllowedError") || errorMsg.includes("PermissionDenied")) {
          errorMessage = "Camera permission denied. Please allow camera access in your browser settings.";
        } else if (errorMsg.includes("NotFoundError") || errorMsg.includes("Requested device not found")) {
          errorMessage = "No camera found on this device.";
        } else if (errorMsg.includes("NotReadableError") || errorMsg.includes("TrackStartError")) {
          errorMessage = "Camera is already in use by another application.";
        } else if (errorMsg.includes("getUserMedia is not implemented") || errorMsg.includes("not supported")) {
          errorMessage = "Camera API not supported. Please use Safari on iOS or Chrome on Android.";
        } else {
          errorMessage = `Camera error: ${errorMsg}`;
        }

        setCameraError(errorMessage);
        setScanning(false);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      initNativeVideo();
    }, 200);

    return () => {
      clearTimeout(timer);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setHasCameraStream(false);
    };
  }, [showScanner, scanning, isMobile]);

  const startScanning = (mode) => {
    setScanMode(mode);
    setShowScanner(true);
    setScanning(true);
  };

  // Handle file input for mobile devices (fallback when getUserMedia is not available)
  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imageUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code && code.data) {
          debugLog("QR Code detected from file:", code.data);
          onScanSuccess(code.data);
        } else {
          setMessage({
            type: "error",
            text: "No QR code found in the image. Please try again.",
          });
          setTimeout(() => setMessage(""), 4000);
        }
        
        URL.revokeObjectURL(imageUrl);
      };
      img.src = imageUrl;
    } catch (error) {
      console.error("Error processing file:", error);
      setMessage({
        type: "error",
        text: "Failed to process image. Please try again.",
      });
      setTimeout(() => setMessage(""), 4000);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };


  const formatDateTime = (datetime) => {
    return new Date(datetime).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </Layout>
    );
  }

  const mobileStyles = isMobile ? {
    container: { gap: "1.5rem", padding: "0.5rem" },
    title: { fontSize: "1.5rem" },
    actionsGrid: { display: "flex", flexDirection: "column", gap: "1rem" },
    scannerModal: { maxWidth: "100%", width: "100%", height: "100vh", maxHeight: "100vh", borderRadius: "0", margin: "0" },
    qrReader: { minHeight: "50vh", maxHeight: "60vh" },
    cardTitle: { fontSize: "1.25rem" },
  } : {};

  return (
    <Layout>
      <div style={{...styles.container, ...mobileStyles.container}}>
        <h1 style={{...styles.title, ...mobileStyles.title}}>{t("timeTracking.title")}</h1>

        {/* Live Timer - показывать только если пользователь на работе */}
        {myStatus?.isClockedIn && myStatus?.currentLog?.clock_in && (
          <LiveTimer
            startTime={myStatus.currentLog.clock_in}
            previousDaySeconds={myStatus.previousDaySeconds || 0}
          />
        )}

        {message && (
          <div
            style={{
              ...styles.message,
              ...(message.type === "success"
                ? styles.successMessage
                : styles.errorMessage),
            }}
          >
            {message.type === "success" ? (
              <CheckCircle size={20} />
            ) : (
              <XCircle size={20} />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Current Status Card */}
        <div className="card" style={styles.statusCard}>
          <div style={styles.statusHeader}>
            <h2 style={{...styles.cardTitle, ...mobileStyles.cardTitle}}>{t("timeTracking.currentStatus")}</h2>
            <div
              className={`time-status-badge ${
                myStatus?.isClockedIn ? "time-status-badge-in" : "time-status-badge-out"
              }`}
              style={{
                ...styles.statusBadge,
                ...(myStatus?.isClockedIn
                  ? styles.clockedInBadge
                  : styles.clockedOutBadge),
              }}
            >
              <Clock size={16} />
              {myStatus?.isClockedIn ? t("dashboard.clockedIn") : t("dashboard.clockedOut")}
            </div>
          </div>

          {myStatus?.currentLog && (
            <div style={styles.currentLogInfo}>
              <p style={styles.infoText}>
                {t("timeTracking.started", "Started")}: {formatDateTime(myStatus.currentLog.clock_in)}
              </p>
            </div>
          )}

          <div style={styles.infoBox} className="time-note-box">
            <p style={styles.infoText}>
              <strong>{t("common.note")}:</strong> {t("timeTracking.qrCodeNote")}
            </p>
          </div>
        </div>

        {/* QR Code & Scanner Actions */}
        <div style={{...styles.actionsGrid, ...mobileStyles.actionsGrid}}>
          <div className="card" style={styles.actionCard}>
            <div style={styles.actionIcon("var(--primary-color)")} className="time-action-icon">
              <QrCode size={32} />
            </div>
            <h3 style={styles.actionTitle}>{t("timeTracking.myQRCode")}</h3>
            <p style={styles.actionDescription}>
              {t("timeTracking.showQRCodeDescription")}
            </p>
            <button
              className="btn btn-primary"
              onClick={() => setShowQR(!showQR)}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {showQR ? t("timeTracking.hideQRCode", "Hide QR Code") : t("timeTracking.showQRCode")}
            </button>

            {showQR && (
              <div style={styles.qrContainer}>
                <QRCodeSVG
                  value={user?.qrCode || "NO_QR_CODE"}
                  size={200}
                  level="H"
                />
                <p style={styles.qrLabel}>
                  {user?.firstName} {user?.lastName}
                </p>
              </div>
            )}
          </div>

          {/* Show scanner buttons only if user has permission or is owner */}
          {(hasPermission("scan_others") ||
            isOwner) && (
            <>
              {hasPermission("scan_others") || isOwner ? (
                <div className="card" style={styles.actionCard}>
                  <div style={styles.actionIcon("var(--success-color)")} className="time-action-icon">
                    <Scan size={32} />
                  </div>
                  <h3 style={styles.actionTitle}>{t("timeTracking.clockInOthers")}</h3>
                  <p style={styles.actionDescription}>
                    {t("timeTracking.clockInOthersDescription")}
                  </p>
                  <button
                    className="btn btn-success"
                    onClick={() => startScanning("in")}
                    disabled={scanning}
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    <Scan size={18} style={{ marginRight: "0.5rem" }} />
                    {t("timeTracking.startScanToClockIn")}
                  </button>
                </div>
              ) : null}

              {hasPermission("scan_others") || isOwner ? (
                <div className="card" style={styles.actionCard}>
                  <div style={styles.actionIcon("var(--danger-color)")} className="time-action-icon">
                    <Scan size={32} />
                  </div>
                  <h3 style={styles.actionTitle}>{t("timeTracking.clockOutOthers")}</h3>
                  <p style={styles.actionDescription}>
                    {t("timeTracking.clockOutOthersDescription")}
                  </p>
                  <button
                    className="btn btn-danger"
                    onClick={() => startScanning("out")}
                    disabled={scanning}
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    <Scan size={18} style={{ marginRight: "0.5rem" }} />
                    {t("timeTracking.startScanToClockOut")}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* QR Scanner Modal */}
        {showScanner && (
          <div className="modal-overlay" onClick={stopScanning}>
            <div
              className="modal"
              onClick={(e) => e.stopPropagation()}
              style={{...styles.scannerModal, ...mobileStyles.scannerModal}}
            >
              <div className="modal-header">
                <h2 style={styles.scannerModalTitle}>
                  {scanMode === "in" ? (
                    <>
                      <LogIn size={24} style={{ marginRight: "0.5rem" }} />
                      Scan QR Code to Clock In
                    </>
                  ) : (
                    <>
                      <LogOut size={24} style={{ marginRight: "0.5rem" }} />
                      Scan QR Code to Clock Out
                    </>
                  )}
                </h2>
                <p style={styles.scannerModalSubtitle}>
                  Point your camera at the employee's QR code
                </p>
              </div>
              <div style={{...styles.qrReader, ...mobileStyles.qrReader}}>
                {/* Try native video first */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ 
                    width: "100%", 
                    height: "auto", 
                    maxHeight: "400px",
                    display: hasCameraStream ? "block" : "none"
                  }}
                />
                {/* Fallback: File input for devices without getUserMedia support */}
                {!hasCameraStream && (
                  <div style={styles.fileInputContainer}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileSelect}
                      style={styles.fileInput}
                      id="camera-file-input"
                    />
                    <label htmlFor="camera-file-input" style={styles.fileInputLabel}>
                      <Scan size={48} color="var(--primary-color)" />
                      <p style={styles.fileInputText}>
                        {isMobile 
                          ? "Tap to take a photo of QR code"
                          : "Click to select image with QR code"}
                      </p>
                    </label>
                  </div>
                )}
              </div>
              {cameraError && (
                <div style={styles.errorContainer}>
                  <XCircle size={24} color="var(--danger-color)" />
                  <p style={styles.errorText}>{cameraError}</p>
                  {/iPhone|iPad|iPod/i.test(navigator.userAgent) && (
                    <div style={styles.helpText}>
                      <p style={styles.helpTextItem}>
                        • Try using Safari instead of Chrome on iOS
                      </p>
                      <p style={styles.helpTextItem}>
                        • Go to Settings → Safari → Camera → Allow
                      </p>
                      <p style={styles.helpTextItem}>
                        • Make sure you're accessing via HTTPS or local network
                      </p>
                    </div>
                  )}
                </div>
              )}
              <div style={styles.scannerInstructions}>
                <p style={styles.instructionText}>
                  💡 <strong>Tip:</strong> Make sure the QR code is well-lit and
                  fully visible in the frame
                </p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={stopScanning}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* My Time Logs */}
        <div className="card">
          <h2 style={styles.cardTitle}>{t("timeTracking.myLogs")}</h2>

          {myLogs.length === 0 ? (
            <div style={styles.emptyState}>
              <Calendar size={48} color="var(--gray)" className="time-empty-icon" />
              <p style={styles.emptyText}>{t("timeTracking.noTimeLogsYet")}</p>
            </div>
          ) : (
            <div style={styles.logsTable} className="logs-scrollable">
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>{t("timeTracking.clockInTime")}</th>
                    <th style={styles.th}>{t("timeTracking.clockOutTime")}</th>
                    <th style={styles.th}>{t("timeTracking.totalHours", "Total Hours")}</th>
                  </tr>
                </thead>
                <tbody>
                  {myLogs.map((log) => (
                    <tr key={log.id} style={styles.tr}>
                      <td style={styles.td}>{formatDateTime(log.clock_in)}</td>
                      <td style={styles.td}>
                        {log.clock_out ? (
                          formatDateTime(log.clock_out)
                        ) : (
                          <span className="badge badge-success">
                            {t("dashboard.inProgress")}
                          </span>
                        )}
                      </td>
                      <td style={styles.td}>
                        {log.total_hours ? `${log.total_hours}h` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
    padding: "0",
  },
  title: {
    fontSize: "2rem",
    fontWeight: "700",
  },
  message: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "1rem",
    borderRadius: "0.5rem",
    fontSize: "0.875rem",
    fontWeight: "500",
  },
  successMessage: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    color: "var(--success-color)",
  },
  errorMessage: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    color: "var(--danger-color)",
  },
  statusCard: {
    backgroundColor: "rgba(79, 70, 229, 0.05)",
    border: "2px solid var(--primary-color)",
  },
  statusHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0.5rem",
    marginBottom: "1rem",
  },
  cardTitle: {
    fontSize: "1.5rem",
    fontWeight: "600",
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem 1rem",
    borderRadius: "9999px",
    fontSize: "0.875rem",
    fontWeight: "600",
  },
  clockedInBadge: {
    backgroundColor: "var(--success-color)",
    color: "var(--white)",
  },
  clockedOutBadge: {
    backgroundColor: "var(--gray)",
    color: "var(--white)",
  },
  currentLogInfo: {
    padding: "1rem",
    backgroundColor: "var(--white)",
    borderRadius: "0.5rem",
    marginBottom: "1rem",
  },
  infoText: {
    color: "var(--text-secondary)",
  },
  infoBox: {
    padding: "1rem",
    backgroundColor: "rgba(79, 70, 229, 0.05)",
    borderRadius: "0.5rem",
    marginTop: "1rem",
    border: "1px solid rgba(79, 70, 229, 0.2)",
  },
  actionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
    gap: "1.5rem",
  },
  actionsGridMobile: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  actionCard: {
    textAlign: "center",
  },
  actionIcon: (color) => ({
    width: "64px",
    height: "64px",
    margin: "0 auto 1rem",
    borderRadius: "1rem",
    backgroundColor: `${color}15`,
    color: color,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }),
  actionTitle: {
    fontSize: "1.25rem",
    fontWeight: "600",
    marginBottom: "0.5rem",
  },
  actionDescription: {
    color: "var(--text-secondary)",
    marginBottom: "1rem",
    fontSize: "0.875rem",
  },
  qrContainer: {
    marginTop: "1.5rem",
    padding: "1.5rem",
    backgroundColor: "var(--white)",
    borderRadius: "0.75rem",
    border: "2px solid var(--border-color)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1rem",
  },
  qrLabel: {
    fontWeight: "600",
    fontSize: "1rem",
  },
  qrReader: {
    width: "100%",
    minHeight: "300px",
    marginBottom: "1rem",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    borderRadius: "0.5rem",
    overflow: "hidden",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "3rem",
    gap: "1rem",
  },
  emptyText: {
    color: "var(--text-secondary)",
    fontSize: "1.125rem",
  },
  logsTable: {
    maxHeight: "500px",
    overflowY: "auto",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "0.75rem",
    borderBottom: "2px solid var(--border-color)",
    fontWeight: "600",
    color: "var(--text-secondary)",
    fontSize: "0.875rem",
  },
  tr: {
    borderBottom: "1px solid var(--border-color)",
  },
  td: {
    padding: "1rem 0.75rem",
  },
  scannerModal: {
    maxWidth: "600px",
    width: "90%",
  },
  scannerModalMobile: {
    maxWidth: "100%",
    width: "100%",
    height: "100vh",
    maxHeight: "100vh",
    borderRadius: "0",
    margin: "0",
  },
  scannerModalTitle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.5rem",
    fontWeight: "600",
    marginBottom: "0.5rem",
  },
  scannerModalSubtitle: {
    textAlign: "center",
    color: "var(--text-secondary)",
    fontSize: "0.875rem",
    marginTop: "0.5rem",
  },
  scannerInstructions: {
    padding: "1rem",
    backgroundColor: "rgba(79, 70, 229, 0.05)",
    borderRadius: "0.5rem",
    marginTop: "1rem",
    marginBottom: "1rem",
  },
  instructionText: {
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
    textAlign: "center",
    margin: 0,
  },
  errorContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    padding: "1rem",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: "0.5rem",
    marginBottom: "1rem",
  },
  errorText: {
    color: "var(--danger-color)",
    fontSize: "0.875rem",
    textAlign: "center",
    margin: 0,
    fontWeight: "500",
  },
  helpText: {
    marginTop: "1rem",
    padding: "0.75rem",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: "0.5rem",
    width: "100%",
  },
  helpTextItem: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    margin: "0.25rem 0",
    textAlign: "left",
  },
  cameraNotSupported: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    gap: "1rem",
    minHeight: "300px",
  },
  cameraNotSupportedText: {
    color: "var(--text-secondary)",
    fontSize: "0.875rem",
    textAlign: "center",
    margin: 0,
  },
  fileInputContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    minHeight: "300px",
    gap: "1rem",
  },
  fileInput: {
    display: "none",
  },
  fileInputLabel: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "1rem",
    padding: "2rem",
    border: "2px dashed var(--primary-color)",
    borderRadius: "1rem",
    backgroundColor: "rgba(79, 70, 229, 0.05)",
    cursor: "pointer",
    transition: "all 0.2s ease",
    width: "100%",
    minHeight: "200px",
  },
  fileInputText: {
    color: "var(--text-primary)",
    fontSize: "1rem",
    fontWeight: "500",
    margin: 0,
    textAlign: "center",
  },
};

export default TimeTracking;
