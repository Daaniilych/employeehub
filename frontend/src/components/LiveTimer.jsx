import React, { useState, useEffect } from "react";
import { Timer } from "lucide-react";

const LiveTimer = ({ startTime, previousDaySeconds = 0, compact = false }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const calculateElapsed = () => {
      const start = new Date(startTime);
      const now = new Date();
      const currentSessionSeconds = Math.floor((now - start) / 1000); // seconds in current session
      const totalSeconds = previousDaySeconds + currentSessionSeconds; // total for the day
      setElapsed(totalSeconds);
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);

    return () => clearInterval(interval);
  }, [startTime, previousDaySeconds]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")}`;
  };

  if (compact) {
    return (
      <div style={styles.compactContainer}>
        <Timer size={16} color="#10b981" />
        <span style={styles.compactTime}>{formatTime(elapsed)}</span>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.iconWrapper}>
        <Timer size={24} color="#10b981" />
      </div>
      <div style={styles.content}>
        <div style={styles.label}>Total Time Today</div>
        <div style={styles.time}>{formatTime(elapsed)}</div>
        <div style={styles.subtext}>
          Last clock-in at{" "}
          {new Date(startTime).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
        </div>
      </div>
      <div style={styles.pulse}></div>
    </div>
  );
};

const styles = {
  container: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: "1.5rem",
    padding: "1.5rem",
    background:
      "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)",
    border: "2px solid #10b981",
    borderRadius: "1rem",
    marginBottom: "2rem",
    overflow: "hidden",
  },
  iconWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "60px",
    height: "60px",
    background: "rgba(16, 185, 129, 0.2)",
    borderRadius: "50%",
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: "0.875rem",
    color: "#059669",
    fontWeight: "600",
    marginBottom: "0.25rem",
  },
  time: {
    fontSize: "2rem",
    fontWeight: "700",
    color: "#10b981",
    fontFamily: "monospace",
    letterSpacing: "0.05em",
  },
  subtext: {
    fontSize: "0.75rem",
    color: "var(--gray)",
    marginTop: "0.25rem",
  },
  pulse: {
    position: "absolute",
    top: "1rem",
    right: "1rem",
    width: "12px",
    height: "12px",
    background: "#10b981",
    borderRadius: "50%",
    animation: "pulse 2s infinite",
  },
  compactContainer: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem 0.75rem",
    background: "rgba(16, 185, 129, 0.1)",
    border: "1px solid #10b981",
    borderRadius: "0.5rem",
    flexShrink: 0,
    minWidth: "fit-content",
  },
  compactTime: {
    fontSize: "0.875rem",
    fontWeight: "600",
    color: "#10b981",
    fontFamily: "monospace",
    whiteSpace: "nowrap",
  },
};

export default LiveTimer;
