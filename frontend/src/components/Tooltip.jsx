import React, { useState } from "react";
import { HelpCircle } from "lucide-react";

const Tooltip = ({
  children,
  content,
  position = "top",
  showIcon = false,
  delay = 300,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);

  const showTooltip = () => {
    const id = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    setTimeoutId(id);
  };

  const hideTooltip = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    setIsVisible(false);
  };

  const positionStyles = {
    top: {
      bottom: "calc(100% + 8px)",
      left: "50%",
      transform: "translateX(-50%)",
    },
    bottom: {
      top: "calc(100% + 8px)",
      left: "50%",
      transform: "translateX(-50%)",
    },
    left: {
      right: "calc(100% + 8px)",
      top: "50%",
      transform: "translateY(-50%)",
    },
    right: {
      left: "calc(100% + 8px)",
      top: "50%",
      transform: "translateY(-50%)",
    },
  };

  return (
    <div
      style={styles.container}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {showIcon ? (
        <HelpCircle size={16} color="var(--gray)" style={styles.icon} />
      ) : (
        children
      )}

      {isVisible && (
        <div style={{ ...styles.tooltip, ...positionStyles[position] }}>
          {content}
          <div style={{ ...styles.arrow, ...getArrowStyle(position) }} />
        </div>
      )}
    </div>
  );
};

const getArrowStyle = (position) => {
  const arrowSize = 6;
  const baseStyle = {
    position: "absolute",
    width: 0,
    height: 0,
    borderStyle: "solid",
  };

  switch (position) {
    case "top":
      return {
        ...baseStyle,
        bottom: `-${arrowSize}px`,
        left: "50%",
        transform: "translateX(-50%)",
        borderWidth: `${arrowSize}px ${arrowSize}px 0 ${arrowSize}px`,
        borderColor: "var(--dark) transparent transparent transparent",
      };
    case "bottom":
      return {
        ...baseStyle,
        top: `-${arrowSize}px`,
        left: "50%",
        transform: "translateX(-50%)",
        borderWidth: `0 ${arrowSize}px ${arrowSize}px ${arrowSize}px`,
        borderColor: "transparent transparent var(--dark) transparent",
      };
    case "left":
      return {
        ...baseStyle,
        right: `-${arrowSize}px`,
        top: "50%",
        transform: "translateY(-50%)",
        borderWidth: `${arrowSize}px 0 ${arrowSize}px ${arrowSize}px`,
        borderColor: "transparent transparent transparent var(--dark)",
      };
    case "right":
      return {
        ...baseStyle,
        left: `-${arrowSize}px`,
        top: "50%",
        transform: "translateY(-50%)",
        borderWidth: `${arrowSize}px ${arrowSize}px ${arrowSize}px 0`,
        borderColor: "transparent var(--dark) transparent transparent",
      };
    default:
      return baseStyle;
  }
};

const styles = {
  container: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
  },
  tooltip: {
    position: "absolute",
    backgroundColor: "var(--dark)",
    color: "var(--white)",
    padding: "0.5rem 0.75rem",
    borderRadius: "0.375rem",
    fontSize: "0.875rem",
    lineHeight: "1.4",
    maxWidth: "250px",
    zIndex: 1000,
    whiteSpace: "normal",
    wordWrap: "break-word",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    animation: "fadeIn 0.2s ease-out",
  },
  icon: {
    cursor: "help",
  },
  arrow: {
    position: "absolute",
  },
};

// Add fade animation
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default Tooltip;





