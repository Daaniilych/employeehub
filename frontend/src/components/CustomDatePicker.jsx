import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const CustomDatePicker = ({
  label,
  value,
  onChange,
  placeholder = "Select date...",
  minDate = null,
  maxDate = null,
}) => {
  // Convert string value to Date object if needed
  const dateValue = value ? new Date(value) : null;

  const handleChange = (date) => {
    if (date) {
      // Convert Date to YYYY-MM-DD string
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      onChange(`${year}-${month}-${day}`);
    } else {
      onChange("");
    }
  };

  return (
    <div style={styles.container}>
      {label && <label style={styles.label}>{label}</label>}
      <div style={styles.inputWrapper}>
        <DatePicker
          selected={dateValue}
          onChange={handleChange}
          dateFormat="yyyy-MM-dd"
          placeholderText={placeholder}
          minDate={minDate}
          maxDate={maxDate}
          showYearDropdown
          showMonthDropdown
          dropdownMode="select"
          isClearable
          className="custom-datepicker-input"
          calendarClassName="custom-datepicker-calendar"
          wrapperClassName="custom-datepicker-wrapper"
        />
      </div>
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
  inputWrapper: {
    position: "relative",
    width: "100%",
  },
};

export default CustomDatePicker;
