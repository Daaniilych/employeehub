import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

const CustomSelect = ({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select an option",
  multiple = false,
  disabled = false,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (optionValue) => {
    if (multiple) {
      const newValue = Array.isArray(value)
        ? value.includes(optionValue)
          ? value.filter((val) => val !== optionValue)
          : [...value, optionValue]
        : [optionValue];
      onChange(newValue);
    } else {
      onChange(optionValue);
      setIsOpen(false);
    }
  };

  const getDisplayValue = () => {
    if (multiple && Array.isArray(value) && value.length > 0) {
      return `${value.length} selected`;
    }

    const selectedOption = options.find((opt) => opt.value === value);
    return selectedOption ? selectedOption.label : placeholder;
  };

  const isSelected = (optionValue) => {
    if (multiple) {
      return Array.isArray(value) && value.includes(optionValue);
    }
    return value === optionValue;
  };

  const hasValue = multiple
    ? Array.isArray(value) && value.length > 0
    : value !== undefined && value !== null && value !== "";

  return (
    <div style={styles.container}>
      {label && <label style={styles.label}>{label}</label>}

      <div
        ref={selectRef}
        style={{
          ...styles.selectWrapper,
          ...(disabled && styles.disabled),
          ...(error && styles.errorBorder),
        }}
      >
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          style={styles.selectButton}
          className="custom-select-button"
          disabled={disabled}
        >
          <span
            style={{
              ...styles.selectValue,
              ...(!hasValue && styles.placeholder),
            }}
          >
            {getDisplayValue()}
          </span>
          <span
            style={{
              ...styles.chevronWrapper,
              transform: isOpen ? "rotateX(180deg)" : "rotateX(0deg)",
            }}
          >
            <ChevronDown size={20} />
          </span>
        </button>

        {isOpen && !disabled && (
          <div style={styles.dropdown}>
            {options.length === 0 ? (
              <div style={styles.noOptions}>No options available</div>
            ) : (
              options.map((option) => (
                <div
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  style={{
                    ...styles.option,
                    ...(isSelected(option.value) && styles.optionSelected),
                  }}
                  className="custom-select-option"
                >
                  {multiple && (
                    <input
                      type="checkbox"
                      checked={isSelected(option.value)}
                      onChange={() => {}}
                      style={styles.checkbox}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <div style={styles.optionContent}>
                    <div style={styles.optionLabel}>{option.label}</div>
                    {option.description && (
                      <div style={styles.optionDescription}>
                        {option.description}
                      </div>
                    )}
                  </div>
                  {!multiple && isSelected(option.value) && (
                    <Check size={16} style={styles.checkIcon} />
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {error && <span style={styles.errorText}>{error}</span>}
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
  },
  label: {
    fontSize: "0.875rem",
    fontWeight: "500",
    color: "var(--text-primary)",
    marginBottom: "0.5rem",
  },
  selectWrapper: {
    position: "relative",
    width: "100%",
  },
  selectButton: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    padding: "0.75rem 1rem",
    backgroundColor: "var(--white)",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    fontSize: "1rem",
    color: "var(--text-primary)",
    cursor: "pointer",
    transition: "all 0.2s ease",
    outline: "none",
    textAlign: "left",
  },
  selectValue: {
    flex: "1 1 auto",
    minWidth: 0,
    color: "var(--text-primary)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  placeholder: {
    color: "var(--text-secondary)",
    opacity: 0.6,
  },
  chevronWrapper: {
    flex: "0 0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-secondary)",
    transition: "transform 0.2s ease",
    width: "20px",
    height: "20px",
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 0.5rem)",
    left: 0,
    right: 0,
    backgroundColor: "var(--white)",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    zIndex: 1000,
    maxHeight: "250px",
    overflowY: "auto",
    animation: "slideDown 0.2s ease-out",
  },
  option: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.75rem 1rem",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  optionSelected: {
    backgroundColor: "rgba(79, 70, 229, 0.1)",
    fontWeight: "500",
  },
  optionContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    minWidth: 0,
  },
  optionLabel: {
    fontSize: "1rem",
    color: "var(--text-primary)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  optionDescription: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  checkbox: {
    width: "16px",
    height: "16px",
    cursor: "pointer",
  },
  checkIcon: {
    color: "var(--primary-color)",
    flexShrink: 0,
    position: "static",
    left: "auto",
    top: "auto",
    transform: "none",
    display: "block",
    marginLeft: "auto",
    alignSelf: "center",
  },
  noOptions: {
    padding: "1rem",
    textAlign: "center",
    color: "var(--text-secondary)",
    fontSize: "0.875rem",
  },
  disabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  errorBorder: {
    borderColor: "var(--error-color)",
  },
  errorText: {
    fontSize: "0.75rem",
    color: "var(--error-color)",
    marginTop: "0.25rem",
  },
};

// Add CSS animations and hover effects
if (typeof document !== "undefined") {
  const existingStyle = document.getElementById("custom-select-styles");
  if (!existingStyle) {
    const styleSheet = document.createElement("style");
    styleSheet.id = "custom-select-styles";
    styleSheet.textContent = `
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .custom-select-button:hover:not(:disabled) {
        border-color: var(--primary-color);
      }

      .custom-select-button:focus {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
      }

      .custom-select-option:hover {
        background-color: var(--background, #f9fafb);
      }

      /* Custom scrollbar */
      .custom-select-button + div::-webkit-scrollbar {
        width: 8px;
      }

      .custom-select-button + div::-webkit-scrollbar-track {
        background: var(--background, #f9fafb);
        border-radius: 4px;
      }

      .custom-select-button + div::-webkit-scrollbar-thumb {
        background: var(--border-color, #e5e7eb);
        border-radius: 4px;
      }

      .custom-select-button + div::-webkit-scrollbar-thumb:hover {
        background: var(--text-secondary, #9ca3af);
      }
    `;
    document.head.appendChild(styleSheet);
  }
}

export default CustomSelect;
