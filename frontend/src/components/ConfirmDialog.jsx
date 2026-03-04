import React, { useState } from "react";
import { AlertTriangle, Info, HelpCircle, X } from "lucide-react";

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  type = "warning", // warning, danger, info
  requireConfirmation = false,
  confirmationText = "",
  loading = false,
}) => {
  const [inputValue, setInputValue] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requireConfirmation && inputValue !== confirmationText) {
      return;
    }
    onConfirm();
  };

  const handleClose = () => {
    setInputValue("");
    onClose();
  };

  const icons = {
    warning: <AlertTriangle size={48} color="var(--warning-color)" />,
    danger: <AlertTriangle size={48} color="var(--danger-color)" />,
    info: <Info size={48} color="var(--primary-color)" />,
    question: <HelpCircle size={48} color="var(--primary-color)" />,
  };

  const buttonStyles = {
    warning: "btn-warning",
    danger: "btn-danger",
    info: "btn-primary",
    question: "btn-primary",
  };

  const isConfirmDisabled =
    loading || (requireConfirmation && inputValue !== confirmationText);

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={styles.modal}
      >
        <button onClick={handleClose} style={styles.closeButton}>
          <X size={20} />
        </button>

        <div className="modal-header" style={styles.header}>
          <div style={styles.iconWrapper}>{icons[type]}</div>
          <h2 style={styles.title}>{title}</h2>
          <p style={styles.message}>{message}</p>
        </div>

        {requireConfirmation && (
          <div style={styles.confirmationSection}>
            <p style={styles.confirmationLabel}>
              Please type <strong>{confirmationText}</strong> to confirm:
            </p>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={confirmationText}
              style={styles.confirmationInput}
              autoFocus
            />
          </div>
        )}

        <div className="modal-footer">
          <button
            className="btn btn-outline"
            onClick={handleClose}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            className={`btn ${buttonStyles[type]}`}
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  modal: {
    maxWidth: "500px",
  },
  closeButton: {
    position: "absolute",
    top: "1rem",
    right: "1rem",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "0.25rem",
    color: "var(--text-secondary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "0.25rem",
    transition: "background-color 0.2s",
  },
  header: {
    textAlign: "center",
  },
  iconWrapper: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "1rem",
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: "700",
    marginBottom: "0.75rem",
  },
  message: {
    fontSize: "1rem",
    color: "var(--text-secondary)",
    lineHeight: "1.6",
    margin: 0,
  },
  confirmationSection: {
    padding: "0 1.5rem",
    marginTop: "1rem",
  },
  confirmationLabel: {
    fontSize: "0.875rem",
    marginBottom: "0.5rem",
    color: "var(--text-secondary)",
  },
  confirmationInput: {
    width: "100%",
    padding: "0.75rem",
    border: "2px solid var(--border-color)",
    borderRadius: "0.5rem",
    fontSize: "1rem",
    fontFamily: "inherit",
  },
};

export default ConfirmDialog;





