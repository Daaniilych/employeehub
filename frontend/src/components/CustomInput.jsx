import React from "react";

const CustomInput = ({
  type = "text",
  value,
  onChange,
  placeholder,
  label,
  error,
  disabled = false,
  required = false,
  rows = 3,
  autoFocus = false,
  className = "",
  style = {},
  ...props
}) => {
  const isTextarea = type === "textarea";
  const InputElement = isTextarea ? "textarea" : "input";

  const handleChange = (e) => {
    onChange(e.target.value);
  };

  return (
    <div style={styles.container}>
      {label && (
        <label style={styles.label}>
          {label}
          {required && <span style={styles.required}> *</span>}
        </label>
      )}

      <InputElement
        type={isTextarea ? undefined : type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        rows={isTextarea ? rows : undefined}
        autoFocus={autoFocus}
        className={`custom-input ${className}`}
        style={{
          ...styles.input,
          ...(isTextarea && styles.textarea),
          ...(disabled && styles.disabled),
          ...(error && styles.errorBorder),
          ...style,
        }}
        {...props}
      />

      {error && <span style={styles.errorText}>{error}</span>}
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    width: "100%",
  },
  label: {
    fontSize: "0.875rem",
    fontWeight: "500",
    color: "var(--text-primary)",
    marginBottom: "0.25rem",
  },
  required: {
    color: "var(--error-color)",
  },
  input: {
    width: "100%",
    padding: "0.75rem 1rem",
    backgroundColor: "var(--white)",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    fontSize: "1rem",
    color: "var(--text-primary)",
    transition: "all 0.2s ease",
    outline: "none",
    fontFamily: "inherit",
  },
  textarea: {
    resize: "vertical",
    minHeight: "80px",
  },
  disabled: {
    opacity: 0.6,
    cursor: "not-allowed",
    backgroundColor: "var(--background)",
  },
  errorBorder: {
    borderColor: "var(--error-color)",
  },
  errorText: {
    fontSize: "0.75rem",
    color: "var(--error-color)",
    marginTop: "-0.25rem",
  },
};

// Add hover and focus styles
if (typeof document !== "undefined") {
  const existingStyle = document.getElementById("custom-input-styles");
  if (!existingStyle) {
    const styleSheet = document.createElement("style");
    styleSheet.id = "custom-input-styles";
    styleSheet.textContent = `
      .custom-input:hover:not(:disabled) {
        border-color: var(--primary-color);
      }

      .custom-input:focus {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
      }

      .custom-input::placeholder {
        color: var(--text-secondary);
        opacity: 0.6;
      }

      .custom-input:disabled {
        cursor: not-allowed;
      }

      /* Date input styling */
      .custom-input[type="date"]::-webkit-calendar-picker-indicator {
        cursor: pointer;
        filter: var(--primary-filter, none);
        opacity: 0.6;
        transition: opacity 0.2s ease;
      }

      .custom-input[type="date"]::-webkit-calendar-picker-indicator:hover {
        opacity: 1;
      }

      /* Remove number input arrows */
      .custom-input[type="number"]::-webkit-inner-spin-button,
      .custom-input[type="number"]::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

      .custom-input[type="number"] {
        -moz-appearance: textfield;
      }
    `;
    document.head.appendChild(styleSheet);
  }
}

export default CustomInput;





