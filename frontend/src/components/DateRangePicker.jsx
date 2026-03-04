import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const DateRangePicker = ({
  label,
  startDate,
  endDate,
  onChange,
  placeholder = "Select date range...",
}) => {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  const toStr = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const handleChange = (dates) => {
    if (dates) {
      const [dStart, dEnd] = dates;
      if (dStart) {
        onChange(toStr(dStart), dEnd ? toStr(dEnd) : toStr(dStart));
      } else {
        onChange("", "");
      }
    } else {
      onChange("", "");
    }
  };

  return (
    <div style={styles.container}>
      {label && <label style={styles.label}>{label}</label>}
      <div style={styles.inputWrapper}>
        <DatePicker
          selectsRange
          startDate={start}
          endDate={end}
          onChange={handleChange}
          dateFormat="yyyy-MM-dd"
          placeholderText={placeholder}
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

export default DateRangePicker;
