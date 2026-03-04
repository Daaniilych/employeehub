import React from "react";
import { Loader2 } from "lucide-react";

const Loading = ({
  size = "medium",
  text = "Loading...",
  fullScreen = false,
  overlay = false,
}) => {
  const sizes = {
    small: 20,
    medium: 40,
    large: 60,
  };

  const iconSize = sizes[size] || sizes.medium;

  const LoadingContent = () => (
    <div style={styles.content}>
      <Loader2
        size={iconSize}
        color="var(--primary-color)"
        style={styles.spinner}
      />
      {text && (
        <p
          style={{
            ...styles.text,
            fontSize: size === "small" ? "0.875rem" : "1rem",
          }}
        >
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div style={styles.fullScreen}>
        <LoadingContent />
      </div>
    );
  }

  if (overlay) {
    return (
      <div style={styles.overlay}>
        <LoadingContent />
      </div>
    );
  }

  return <LoadingContent />;
};

const styles = {
  content: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "1rem",
  },
  spinner: {
    animation: "spin 1s linear infinite",
  },
  text: {
    color: "var(--text-secondary)",
    fontWeight: "500",
    margin: 0,
  },
  fullScreen: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "var(--white)",
    zIndex: 9999,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    zIndex: 100,
    borderRadius: "inherit",
  },
};

// Add spin animation
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  `;
  document.head.appendChild(styleSheet);
}

// Inline Loader component for buttons
export const ButtonLoader = ({ size = 16 }) => (
  <Loader2
    size={size}
    color="currentColor"
    style={{ animation: "spin 1s linear infinite" }}
  />
);

export default Loading;





