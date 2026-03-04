import React, { useEffect } from "react";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";

const Toast = ({ message, type = "info", onClose, duration = 5000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    warning: <AlertCircle size={20} />,
    info: <Info size={20} />,
  };

  const styles = {
    success: {
      backgroundColor: "var(--success-color)",
      color: "var(--white)",
    },
    error: {
      backgroundColor: "var(--danger-color)",
      color: "var(--white)",
    },
    warning: {
      backgroundColor: "var(--warning-color)",
      color: "var(--white)",
    },
    info: {
      backgroundColor: "var(--primary-color)",
      color: "var(--white)",
    },
  };

  return (
    <div style={{ ...toastStyles.toast, ...styles[type] }}>
      <div style={toastStyles.content}>
        <span style={toastStyles.icon}>{icons[type]}</span>
        <span style={toastStyles.message}>{message}</span>
      </div>
      <button onClick={onClose} style={toastStyles.closeButton}>
        <X size={18} />
      </button>
    </div>
  );
};

const toastStyles = {
  toast: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1rem 1.25rem",
    borderRadius: "0.5rem",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)",
    minWidth: "300px",
    maxWidth: "500px",
    animation: "slideIn 0.3s ease-out",
    marginBottom: "0.75rem",
  },
  content: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    flex: 1,
  },
  icon: {
    display: "flex",
    flexShrink: 0,
  },
  message: {
    fontSize: "0.9375rem",
    lineHeight: "1.5",
  },
  closeButton: {
    background: "none",
    border: "none",
    color: "inherit",
    cursor: "pointer",
    padding: "0.25rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "0.75rem",
    opacity: 0.8,
    transition: "opacity 0.2s",
  },
};

// Toast Container Component
export const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div style={containerStyles.container}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

const containerStyles = {
  container: {
    position: "fixed",
    top: "5rem",
    right: "1rem",
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
  },
};

// Add animation to global styles
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @media (max-width: 768px) {
    .toast-container {
      right: 0.5rem;
      left: 0.5rem;
    }
    
    .toast-container > div {
      min-width: unset;
      width: 100%;
    }
  }
`;
document.head.appendChild(styleSheet);

export default Toast;





