import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import Layout from "../components/Layout";
import CustomSelect from "../components/CustomSelect";
import DateRangePicker from "../components/DateRangePicker";
import { reportAPI, companyAPI } from "../services/api";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, getYear, getMonth, format } from "date-fns";
import { t } from "../i18n";
import { getCurrentLanguage } from "../i18n";
import { formatDateFnsLocale, getDateFnsLocale, getLocale } from "../utils/formatLocale";
import {
  FileText,
  Download,
  Calendar,
  ChevronDown,
  ChevronRight,
  Search,
  X,
  User,
  Mail,
  LogIn,
  LogOut,
  Clock3,
  Hash,
  Coffee,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

const REPORTS_PER_PAGE = 20;

const getMonthOptions = () => {
  const locale = getDateFnsLocale();
  return [...Array(12)].map((_, i) => {
    const d = new Date(2024, i, 1);
    return { value: String(i), label: format(d, "MMMM", locale ? { locale } : {}) };
  });
};

const toDateString = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTodayDateString = () => toDateString(new Date());

const Reports = () => {
  const { selectedCompany } = useAuth();
  const [reports, setReports] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [reportSortOrder, setReportSortOrder] = useState("newest");
  const [activeTab, setActiveTab] = useState("current");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedArchiveGroups, setExpandedArchiveGroups] = useState(new Set());

  // Form state
  const todayDate = getTodayDateString();
  const [format, setFormat] = useState("pdf");
  const [dateFrom, setDateFrom] = useState(todayDate);
  const [dateTo, setDateTo] = useState(todayDate);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectedFields, setSelectedFields] = useState([
    "name",
    "clockIn",
    "clockOut",
    "totalHours",
  ]);
  const [includeDetails, setIncludeDetails] = useState(false);
  const [notice, setNotice] = useState(null);

  // Employee dropdown state
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  const employeeDropdownRef = useRef(null);
  const noticeTimeoutRef = useRef(null);

  const isOneDay = dateFrom && dateTo && dateFrom === dateTo;
  const isPeriod = dateFrom && dateTo && dateFrom !== dateTo;

  const fieldsForOneDay = [
    { value: "name", label: t("reports.employeeName") },
    { value: "email", label: t("auth.email") },
    { value: "clockIn", label: t("reports.firstIn") },
    { value: "clockOut", label: t("reports.lastOut") },
    { value: "totalHours", label: t("reports.totalHours") },
    { value: "sessions", label: t("reports.sessionsCount") },
    { value: "breakTime", label: t("reports.breakTime") },
  ];

  const fieldsForPeriod = [
    { value: "name", label: t("reports.employeeName") },
    { value: "email", label: t("auth.email") },
    { value: "totalHours", label: t("reports.totalHours") },
    { value: "workDays", label: t("reports.workDays") },
    { value: "averageHours", label: t("reports.averageHours") },
    { value: "sessions", label: t("reports.sessionsCount") },
    { value: "breakTime", label: t("reports.breakTime") },
  ];

  const availableFields = isPeriod ? fieldsForPeriod : fieldsForOneDay;

  useEffect(() => {
    setSelectedFields((prev) => {
      if (isPeriod) {
        const next = prev.filter((f) => f !== "clockIn" && f !== "clockOut" && f !== "averageHours");
        return next.includes("workDays") ? next : [...next, "workDays"];
      }
      if (isOneDay) {
        return prev.filter((f) => f !== "workDays" && f !== "averageHours");
      }
      return prev;
    });
  }, [isPeriod, isOneDay]);

  const fieldIcons = {
    name: User,
    email: Mail,
    clockIn: LogIn,
    clockOut: LogOut,
    totalHours: Clock3,
    workDays: Calendar,
    averageHours: Clock3,
    sessions: Hash,
    breakTime: Coffee,
  };

  const applyPreset = (preset) => {
    const now = new Date();
    if (preset === "today") {
      const d = toDateString(now);
      setDateFrom(d);
      setDateTo(d);
    } else if (preset === "week") {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      const end = endOfWeek(now, { weekStartsOn: 1 });
      setDateFrom(toDateString(start));
      setDateTo(toDateString(end));
    } else if (preset === "month") {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      setDateFrom(toDateString(start));
      setDateTo(toDateString(end));
    }
  };

  useEffect(() => {
    if (selectedCompany) {
      loadData();
    }
  }, [selectedCompany]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        employeeDropdownRef.current &&
        !employeeDropdownRef.current.contains(event.target)
      ) {
        setEmployeeDropdownOpen(false);
        setEmployeeSearchTerm(""); // Clear search when closing
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) {
        clearTimeout(noticeTimeoutRef.current);
      }
    };
  }, []);

  const showNotice = (type, message, duration = 5000) => {
    setNotice({ type, message });

    if (noticeTimeoutRef.current) {
      clearTimeout(noticeTimeoutRef.current);
    }

    if (duration > 0) {
      noticeTimeoutRef.current = setTimeout(() => {
        setNotice(null);
      }, duration);
    }
  };

  const getReportErrorMessage = (error) => {
    const backendMessage = error?.response?.data?.error;
    const normalizedMessage = String(backendMessage || "").toLowerCase();

    if (normalizedMessage.includes("permission denied")) {
      return t(
        "reports.permissionDeniedGenerate",
        "You do not have permission to generate reports."
      );
    }

    return backendMessage || t("reports.failedToGenerate", "Failed to generate report");
  };

  const getDateRangeSummary = () => {
    if (!dateFrom && !dateTo) {
      return t("reports.allDates", "All dates");
    }

    if (dateFrom && dateTo && dateFrom === dateTo) {
      return dateFrom;
    }

    return `${dateFrom || t("reports.beginning", "Beginning")} ${t("reports.to", "To")} ${dateTo || t("dashboard.today")}`;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [reportsRes, membersRes] = await Promise.all([
        reportAPI.getReports(selectedCompany.id),
        companyAPI.getMembers(selectedCompany.id),
      ]);
      setReports(reportsRes.data.reports);
      setMembers(membersRes.data.members);
    } catch (error) {
      console.error("Error loading reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const showIncludeDetailsOption =
    selectedMembers.length === 0 && isPeriod;

  const handleGenerateReport = async () => {
    setGenerating(true);
    const from = dateFrom || todayDate;
    const to = dateTo || todayDate;
    try {
      await reportAPI.generate(selectedCompany.id, {
        format,
        fields: selectedFields,
        dateFrom: from,
        dateTo: to,
        userIds: selectedMembers.length > 0 ? selectedMembers : undefined,
        includeDetails: showIncludeDetailsOption ? includeDetails : undefined,
        language: getCurrentLanguage(),
      });

      showNotice(
        "success",
        t("reports.reportGeneratedSuccess", "Report generated successfully!")
      );
      loadData();
    } catch (error) {
      showNotice("error", getReportErrorMessage(error), 7000);
    } finally {
      setGenerating(false);
    }
  };

  const handleFieldToggle = (field) => {
    if (selectedFields.includes(field)) {
      setSelectedFields(selectedFields.filter((f) => f !== field));
    } else {
      setSelectedFields([...selectedFields, field]);
    }
  };

  const handleMemberToggle = (memberId) => {
    if (selectedMembers.includes(memberId)) {
      setSelectedMembers(selectedMembers.filter((id) => id !== memberId));
    } else {
      setSelectedMembers([...selectedMembers, memberId]);
    }
  };

  const getFilteredMembers = () => {
    if (!employeeSearchTerm) return members;

    const search = employeeSearchTerm.toLowerCase();
    return members.filter(
      (member) =>
        member.email.toLowerCase().includes(search) ||
        `${member.first_name} ${member.last_name}`
          .toLowerCase()
          .includes(search)
    );
  };
  const filteredMembers = useMemo(
    () => getFilteredMembers(),
    [members, employeeSearchTerm]
  );

  const getSelectedMembersText = () => {
    if (selectedMembers.length === 0) return t("reports.allEmployees");
    if (selectedMembers.length === 1) {
      const member = members.find((m) => m.id === selectedMembers[0]);
      return member ? `${member.first_name} ${member.last_name}` : t("reports.oneSelected", "1 selected");
    }
    return t("reports.multipleSelected", { count: selectedMembers.length });
  };

  const handleDownload = async (fileName) => {
    try {
      setDownloading(fileName);
      const response = await reportAPI.download(selectedCompany.id, fileName);

      // Create blob URL and trigger download
      const blob = new Blob([response.data], {
        type: response.headers["content-type"] || "application/octet-stream",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      showNotice(
        "error",
        error.response?.data?.error ||
          t("reports.failedToDownload", "Failed to download report")
      );
    } finally {
      setDownloading(null);
    }
  };

  const sortedReports = useMemo(() => {
    const items = [...reports];
    items.sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return reportSortOrder === "oldest" ? aTime - bTime : bTime - aTime;
    });
    return items;
  }, [reports, reportSortOrder]);

  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);

  const { currentMonthReports, archiveReports, archiveGrouped } = useMemo(() => {
    const current = [];
    const archive = [];
    for (const r of sortedReports) {
      const d = new Date(r.created_at);
      if (isWithinInterval(d, { start: currentMonthStart, end: currentMonthEnd })) {
        current.push(r);
      } else {
        archive.push(r);
      }
    }
    const grouped = {};
    for (const r of archive) {
      const d = new Date(r.created_at);
      const y = getYear(d);
      const m = getMonth(d);
      const key = `${y}-${m}`;
      if (!grouped[key]) grouped[key] = { year: y, month: m, reports: [] };
      grouped[key].reports.push(r);
    }
    const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    const archiveGrouped = sortedKeys.map((k) => ({ key: k, ...grouped[k] }));
    return { currentMonthReports: current, archiveReports: archive, archiveGrouped };
  }, [sortedReports, currentMonthStart, currentMonthEnd]);

  const filterByMonthYear = (items) => {
    if (!filterMonth && !filterYear) return items;
    return items.filter((r) => {
      const d = new Date(r.created_at);
      if (filterMonth && getMonth(d) !== parseInt(filterMonth, 10)) return false;
      if (filterYear && getYear(d) !== parseInt(filterYear, 10)) return false;
      return true;
    });
  };

  const displayedReports =
    activeTab === "current"
      ? filterByMonthYear(currentMonthReports)
      : filterByMonthYear(archiveReports);

  const totalPages = Math.max(1, Math.ceil(displayedReports.length / REPORTS_PER_PAGE));
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * REPORTS_PER_PAGE;
    return displayedReports.slice(start, start + REPORTS_PER_PAGE);
  }, [displayedReports, currentPage]);

  const archiveGroupedFiltered = useMemo(() => {
    return archiveGrouped
      .map((g) => ({
        ...g,
        reports: filterByMonthYear(g.reports),
      }))
      .filter((g) => g.reports.length > 0);
  }, [archiveGrouped, filterMonth, filterYear]);

  const availableYears = useMemo(() => {
    const years = new Set();
    sortedReports.forEach((r) => years.add(getYear(new Date(r.created_at))));
    return [...years].sort((a, b) => b - a);
  }, [sortedReports]);

  const toggleArchiveGroup = (key) => {
    setExpandedArchiveGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const [groupPages, setGroupPages] = useState({});
  const setGroupPage = (key, page) => {
    setGroupPages((prev) => ({ ...prev, [key]: page }));
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filterMonth, filterYear]);

  const formatReportDate = (datetime) => {
    return new Date(datetime).toLocaleString(getLocale(), {
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

  return (
    <Layout>
      <div style={styles.container}>
        <h1 style={styles.title}>{t("reports.title")}</h1>

        {/* Generate Report Card */}
        <div className="card">
          <h2 style={styles.cardTitle}>{t("reports.generateNewReport")}</h2>

          {notice && (
            <div
              style={{
                ...styles.notice,
                ...(notice.type === "success" ? styles.noticeSuccess : styles.noticeError),
              }}
            >
              <div style={styles.noticeContent}>
                {notice.type === "success" ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <AlertCircle size={18} />
                )}
                <span>{notice.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setNotice(null)}
                style={styles.noticeCloseButton}
                aria-label={t("common.close", "Close")}
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div style={styles.formGrid}>
            {/* Format Selection */}
            <div className="input-group">
              <CustomSelect
                label={t("reports.reportFormat")}
                value={format}
                onChange={setFormat}
                options={[
                  {
                    value: "excel",
                    label: t("reports.excelFormat"),
                    description: t("reports.spreadsheetFormat", "Spreadsheet format"),
                  },
                  {
                    value: "pdf",
                    label: t("reports.pdfFormat", "PDF (.pdf)"),
                    description: t("reports.documentFormat", "Document format"),
                  },
                ]}
              />
            </div>

            {/* Date Range Picker */}
            <div className="input-group" style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.5rem", display: "block" }}>
                {t("reports.dateRange")}
              </label>
              <DateRangePicker
                startDate={dateFrom}
                endDate={dateTo}
                onChange={(from, to) => {
                  setDateFrom(from || todayDate);
                  setDateTo(to || todayDate);
                }}
                placeholder={t("reports.dateRangePlaceholder")}
              />
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className={`btn btn-outline ${isOneDay && dateFrom === todayDate ? "btn-primary" : ""}`}
                  onClick={() => applyPreset("today")}
                  style={{ fontSize: "0.875rem" }}
                >
                  {t("reports.today")}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => applyPreset("week")}
                  style={{ fontSize: "0.875rem" }}
                >
                  {t("reports.currentWeek")}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => applyPreset("month")}
                  style={{ fontSize: "0.875rem" }}
                >
                  {t("reports.currentMonth")}
                </button>
              </div>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(dateFrom !== todayDate ||
            dateTo !== todayDate ||
            selectedMembers.length > 0) && (
            <div style={{ marginTop: "1rem" }}>
              <button
                className="btn btn-outline"
                onClick={() => {
                  setDateFrom(todayDate);
                  setDateTo(todayDate);
                  setSelectedMembers([]);
                }}
                style={{ fontSize: "0.875rem" }}
              >
                {t("reports.clearAllFilters", "Clear All Filters")}
              </button>
            </div>
          )}

          {/* Fields Selection */}
          <div className="input-group">
            <label>{t("reports.includeFields")}</label>
            <div style={styles.checkboxGrid}>
              {availableFields.map((field) => (
                <label key={field.value} style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(field.value)}
                    onChange={() => handleFieldToggle(field.value)}
                    style={styles.checkbox}
                  />
                  <span style={styles.fieldLabelContent}>
                    {fieldIcons[field.value] ? (
                      React.createElement(fieldIcons[field.value], {
                        size: 16,
                        style: styles.fieldLabelIcon,
                      })
                    ) : (
                      <FileText size={16} style={styles.fieldLabelIcon} />
                    )}
                    <span>{field.label}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Members Selection - Dropdown */}
          <div className="input-group">
            <label>{t("reports.filterByEmployees")}</label>
            <small
              style={{
                color: "var(--gray)",
                fontSize: "0.875rem",
                display: "block",
                marginBottom: "0.5rem",
              }}
            >
              {t("reports.filterByEmployeesDescription")}
            </small>

            <div style={styles.employeeDropdown} ref={employeeDropdownRef}>
              {/* Dropdown Button */}
              <button
                type="button"
                onClick={() => setEmployeeDropdownOpen(!employeeDropdownOpen)}
                style={styles.employeeDropdownButton}
                className="employee-dropdown-button"
              >
                <span
                  style={{
                    flex: "1 1 auto",
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: "var(--text-primary)",
                  }}
                >
                  {getSelectedMembersText()}
                </span>
                <span
                  style={{
                    flex: "0 0 auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-secondary)",
                    transition: "transform 0.2s ease",
                    width: "20px",
                    height: "20px",
                    transform: employeeDropdownOpen
                      ? "rotateX(180deg)"
                      : "rotateX(0deg)",
                  }}
                >
                  <ChevronDown size={20} />
                </span>
              </button>

              {/* Dropdown Menu */}
              {employeeDropdownOpen && (
                <div style={styles.employeeDropdownMenu}>
                  {/* Search Input */}
                  <div style={styles.searchContainer}>
                    <Search
                      size={18}
                      color="var(--gray)"
                      style={{
                        position: "static",
                        transform: "none",
                        flexShrink: 0,
                        width: "18px",
                        height: "18px",
                        minWidth: "18px",
                      }}
                    />
                    <input
                      type="text"
                      className="reports-employee-search-input"
                      placeholder="Search by name or email..."
                      value={employeeSearchTerm}
                      onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                      style={styles.searchInput}
                      autoFocus
                    />
                    {employeeSearchTerm && (
                      <button
                        onClick={() => setEmployeeSearchTerm("")}
                        style={styles.clearSearchButton}
                        className="clear-search-button"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  {/* Clear Selection Button */}
                  {selectedMembers.length > 0 && (
                    <button
                      onClick={() => setSelectedMembers([])}
                      style={styles.clearAllButton}
                      className="clear-all-button"
                    >
                      {t("reports.clearAll", "Clear All")} ({selectedMembers.length})
                    </button>
                  )}

                  {/* Members List */}
                  <div style={styles.membersList}>
                    {filteredMembers.length === 0 ? (
                      <div style={styles.noResults}>No employees found</div>
                    ) : (
                      filteredMembers.map((member) => (
                        <label
                          key={member.id}
                          style={styles.memberCheckboxLabel}
                          className="employee-dropdown-item"
                        >
                          <input
                            type="checkbox"
                            checked={selectedMembers.includes(member.id)}
                            onChange={() => handleMemberToggle(member.id)}
                            style={styles.checkbox}
                          />
                          <div style={styles.memberTextContainer}>
                            <div style={styles.memberName}>
                              {member.first_name} {member.last_name}
                            </div>
                            <div style={styles.memberEmail}>{member.email}</div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Include Details (only for All Employees + Period) */}
          {showIncludeDetailsOption && (
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.5rem",
                marginTop: "1rem",
                cursor: "pointer",
                fontSize: "0.9rem",
                color: "var(--text-primary)",
              }}
            >
              <input
                type="checkbox"
                checked={includeDetails}
                onChange={(e) => setIncludeDetails(e.target.checked)}
                style={{ marginTop: "0.2rem", flexShrink: 0 }}
              />
              <div>
                <strong>{t("reports.includeDetails")}</strong>
                <div style={{ fontSize: "0.8rem", color: "var(--gray)", marginTop: "0.15rem" }}>
                  {t("reports.includeDetailsDescription")}
                </div>
              </div>
            </label>
          )}

          {/* Report Summary */}
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1rem",
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              color: "var(--text-primary)",
            }}
          >
            <strong>{t("reports.reportWillInclude")}</strong>
            <ul style={{ margin: "0.5rem 0 0 0", paddingLeft: "1.5rem" }}>
              <li>
                <strong>{t("reports.employees")}:</strong>{" "}
                {selectedMembers.length === 0
                  ? t("reports.allEmployees")
                  : t("reports.selectedCount", { count: selectedMembers.length })}
              </li>
              <li>
                <strong>{t("reports.dateRange")}:</strong>{" "}
                {getDateRangeSummary()}
              </li>
              <li>
                <strong>{t("reports.fields", "Fields")}:</strong> {t("reports.selectedCount", { count: selectedFields.length })}
              </li>
              {showIncludeDetailsOption && (
                <li>
                  <strong>{t("reports.includeDetails")}:</strong>{" "}
                  {includeDetails ? t("common.yes") : t("common.no")}
                </li>
              )}
            </ul>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleGenerateReport}
            disabled={generating || selectedFields.length === 0}
            style={{ marginTop: "1rem" }}
          >
            <FileText size={20} />
            {generating ? t("reports.generating", "Generating...") : t("reports.generateReport")}
          </button>
        </div>

        {/* Generated Reports List */}
        <div className="card">
          <div style={styles.reportsHeader}>
            <h2 style={{ ...styles.cardTitle, marginBottom: 0 }}>
              {t("reports.generatedReports")}
            </h2>
            <div style={styles.sortControl}>
              <label style={styles.sortLabel}>{t("reports.sortByDate", "Sort by date")}</label>
              <select
                value={reportSortOrder}
                onChange={(e) => setReportSortOrder(e.target.value)}
                style={styles.sortSelect}
              >
                <option value="newest">{t("reports.newestFirst", "Newest first")}</option>
                <option value="oldest">{t("reports.oldestFirst", "Oldest first")}</option>
              </select>
            </div>
          </div>

          {reports.length === 0 ? (
            <div style={styles.emptyState}>
              <FileText size={48} color="var(--gray)" />
              <p style={styles.emptyText}>{t("reports.noReportsGeneratedYet")}</p>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div style={styles.tabs}>
                <button
                  type="button"
                  onClick={() => setActiveTab("current")}
                  style={{
                    ...styles.tab,
                    ...(activeTab === "current" ? styles.tabActive : {}),
                  }}
                >
                  {t("reports.tabCurrent")} ({currentMonthReports.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("archive")}
                  style={{
                    ...styles.tab,
                    ...(activeTab === "archive" ? styles.tabActive : {}),
                  }}
                >
                  {t("reports.tabArchive")} ({archiveReports.length})
                </button>
              </div>

              {/* Quick filters */}
              <div style={styles.quickFilters}>
                <div style={styles.filterItem}>
                  <label style={styles.filterLabel}>{t("reports.filterByYear")}</label>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    style={styles.filterSelect}
                  >
                    <option value="">{t("reports.filterAllYears")}</option>
                    {availableYears.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.filterItem}>
                  <label style={styles.filterLabel}>{t("reports.filterByMonth")}</label>
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    style={styles.filterSelect}
                  >
                    <option value="">{t("reports.filterAllMonths")}</option>
                    {getMonthOptions().map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Current tab: flat list with pagination */}
              {activeTab === "current" && (
                <>
                  {displayedReports.length === 0 ? (
                    <div style={styles.emptyState}>
                      <FileText size={32} color="var(--gray)" />
                      <p style={styles.emptyText}>{t("reports.noReports")}</p>
                    </div>
                  ) : (
                    <>
                      <div style={styles.reportsTable}>
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              <th style={styles.thCompact}>{t("reports.fileName")}</th>
                              <th style={styles.thCompact}>{t("reports.format")}</th>
                              <th style={styles.thCompact}>{t("reports.generatedBy")}</th>
                              <th style={styles.thCompact}>{t("reports.date")}</th>
                              <th style={styles.thCompact}>{t("reports.actions")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedReports.map((report) => (
                              <tr key={report.id} style={styles.trCompact}>
                                <td style={styles.tdCompact}>{report.file_name}</td>
                                <td style={styles.tdCompact}>
                                  <span className="badge badge-primary" style={{ fontSize: "0.7rem" }}>
                                    {report.format.toUpperCase()}
                                  </span>
                                </td>
                                <td style={styles.tdCompact}>
                                  {report.first_name} {report.last_name}
                                </td>
                                <td style={styles.tdCompact}>{formatReportDate(report.created_at)}</td>
                                <td style={styles.tdCompact}>
                                  <button
                                    className="btn btn-secondary"
                                    onClick={() => handleDownload(report.file_name)}
                                    disabled={downloading === report.file_name}
                                    style={styles.downloadBtn}
                                  >
                                    <Download size={14} />
                                    {downloading === report.file_name
                                      ? t("reports.downloading")
                                      : t("reports.download")}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {totalPages > 1 && (
                        <div style={styles.pagination}>
                          <button
                            className="btn btn-outline"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            style={styles.pageBtn}
                          >
                            {t("reports.pagePrev")}
                          </button>
                          <span style={styles.pageInfo}>
                            {t("reports.pageOf", { current: currentPage, total: totalPages })}
                          </span>
                          <button
                            className="btn btn-outline"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            style={styles.pageBtn}
                          >
                            {t("reports.pageNext")}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Archive tab: accordion by year-month */}
              {activeTab === "archive" && (
                <>
                  {archiveGroupedFiltered.length === 0 ? (
                    <div style={styles.emptyState}>
                      <FileText size={32} color="var(--gray)" />
                      <p style={styles.emptyText}>{t("reports.noReports")}</p>
                    </div>
                  ) : (
                    <div style={styles.accordion}>
                      {archiveGroupedFiltered.map(({ key, year, month, reports: groupReports }) => {
                        const isExpanded = expandedArchiveGroups.has(key);
                        const groupPage = groupPages[key] || 1;
                        const groupTotalPages = Math.max(1, Math.ceil(groupReports.length / REPORTS_PER_PAGE));
                        const paginatedGroup = groupReports.slice(
                          (groupPage - 1) * REPORTS_PER_PAGE,
                          groupPage * REPORTS_PER_PAGE
                        );
                        const monthLabel = formatDateFnsLocale(new Date(year, month, 1), "MMMM yyyy");
                        return (
                          <div key={key} style={styles.accordionItem}>
                            <button
                              type="button"
                              onClick={() => toggleArchiveGroup(key)}
                              style={styles.accordionHeader}
                            >
                              {isExpanded ? (
                                <ChevronDown size={18} style={styles.accordionIcon} />
                              ) : (
                                <ChevronRight size={18} style={styles.accordionIcon} />
                              )}
                              <span style={styles.accordionTitle}>{monthLabel}</span>
                              <span style={styles.accordionBadge}>{groupReports.length}</span>
                            </button>
                            {isExpanded && (
                              <div style={styles.accordionContent}>
                                <div style={styles.reportsTable}>
                                  <table style={styles.table}>
                                    <thead>
                                      <tr>
                                        <th style={styles.thCompact}>{t("reports.fileName")}</th>
                                        <th style={styles.thCompact}>{t("reports.format")}</th>
                                        <th style={styles.thCompact}>{t("reports.generatedBy")}</th>
                                        <th style={styles.thCompact}>{t("reports.date")}</th>
                                        <th style={styles.thCompact}>{t("reports.actions")}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {paginatedGroup.map((report) => (
                                        <tr key={report.id} style={styles.trCompact}>
                                          <td style={styles.tdCompact}>{report.file_name}</td>
                                          <td style={styles.tdCompact}>
                                            <span className="badge badge-primary" style={{ fontSize: "0.7rem" }}>
                                              {report.format.toUpperCase()}
                                            </span>
                                          </td>
                                          <td style={styles.tdCompact}>
                                            {report.first_name} {report.last_name}
                                          </td>
                                          <td style={styles.tdCompact}>{formatReportDate(report.created_at)}</td>
                                          <td style={styles.tdCompact}>
                                            <button
                                              className="btn btn-secondary"
                                              onClick={() => handleDownload(report.file_name)}
                                              disabled={downloading === report.file_name}
                                              style={styles.downloadBtn}
                                            >
                                              <Download size={14} />
                                              {downloading === report.file_name
                                                ? t("reports.downloading")
                                                : t("reports.download")}
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                {groupTotalPages > 1 && (
                                  <div style={styles.pagination}>
                                    <button
                                      className="btn btn-outline"
                                      onClick={() => setGroupPage(key, Math.max(1, groupPage - 1))}
                                      disabled={groupPage === 1}
                                      style={styles.pageBtn}
                                    >
                                      {t("reports.pagePrev")}
                                    </button>
                                    <span style={styles.pageInfo}>
                                      {t("reports.pageOf", { current: groupPage, total: groupTotalPages })}
                                    </span>
                                    <button
                                      className="btn btn-outline"
                                      onClick={() => setGroupPage(key, Math.min(groupTotalPages, groupPage + 1))}
                                      disabled={groupPage === groupTotalPages}
                                      style={styles.pageBtn}
                                    >
                                      {t("reports.pageNext")}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </>
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
  },
  title: {
    fontSize: "2rem",
    fontWeight: "700",
  },
  cardTitle: {
    fontSize: "1.5rem",
    fontWeight: "600",
    marginBottom: "1.5rem",
  },
  notice: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    padding: "0.75rem 1rem",
    borderRadius: "0.5rem",
    marginBottom: "1rem",
    border: "1px solid transparent",
  },
  noticeSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.35)",
    color: "var(--success-color)",
  },
  noticeError: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.35)",
    color: "var(--danger-color)",
  },
  noticeContent: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.875rem",
    fontWeight: "500",
    minWidth: 0,
  },
  noticeCloseButton: {
    background: "transparent",
    border: "none",
    color: "inherit",
    cursor: "pointer",
    padding: "0.25rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "0.25rem",
    flexShrink: 0,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
    gap: "1rem",
    marginBottom: "1.5rem",
    alignItems: "start",
  },
  checkboxGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 180px), 1fr))",
    gap: "0.75rem",
    padding: "1rem",
    backgroundColor: "var(--light-gray)",
    borderRadius: "0.5rem",
  },
  dateToggleRow: {
    marginTop: "0.75rem",
  },
  dateToggleButton: {
    fontSize: "0.875rem",
    minHeight: "40px",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    cursor: "pointer",
    fontSize: "0.875rem",
  },
  fieldLabelContent: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    minWidth: 0,
  },
  fieldLabelIcon: {
    color: "var(--text-secondary)",
    flexShrink: 0,
    position: "static",
    transform: "none",
  },
  checkbox: {
    width: "18px",
    height: "18px",
    minWidth: "18px",
    cursor: "pointer",
    marginTop: "2px",
    flexShrink: 0,
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
  reportsTable: {
    overflowX: "auto",
    maxHeight: "400px",
    overflowY: "auto",
  },
  tabs: {
    display: "flex",
    gap: "0.5rem",
    marginBottom: "1rem",
    borderBottom: "1px solid var(--border-color)",
  },
  tab: {
    padding: "0.5rem 1rem",
    fontSize: "0.9rem",
    fontWeight: "500",
    background: "none",
    border: "none",
    borderBottom: "3px solid transparent",
    color: "var(--text-secondary)",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  tabActive: {
    color: "var(--primary-color)",
    borderBottomColor: "var(--primary-color)",
  },
  quickFilters: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
    marginBottom: "1rem",
  },
  filterItem: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  filterLabel: {
    fontSize: "0.75rem",
    fontWeight: "500",
    color: "var(--text-secondary)",
  },
  filterSelect: {
    padding: "0.4rem 0.75rem",
    borderRadius: "0.5rem",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--white)",
    color: "var(--text-primary)",
    fontSize: "0.875rem",
    outline: "none",
    cursor: "pointer",
    minWidth: "120px",
  },
  thCompact: {
    textAlign: "left",
    padding: "0.4rem 0.5rem",
    borderBottom: "2px solid var(--border-color)",
    fontWeight: "600",
    color: "var(--text-secondary)",
    fontSize: "0.75rem",
  },
  tdCompact: {
    padding: "0.35rem 0.5rem",
    fontSize: "0.8rem",
    verticalAlign: "middle",
  },
  trCompact: {
    borderBottom: "1px solid var(--border-color)",
  },
  downloadBtn: {
    padding: "0.35rem 0.6rem",
    fontSize: "0.75rem",
  },
  pagination: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "1rem",
    marginTop: "1rem",
    paddingTop: "1rem",
    borderTop: "1px solid var(--border-color)",
  },
  pageBtn: {
    padding: "0.4rem 0.75rem",
    fontSize: "0.875rem",
  },
  pageInfo: {
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
  },
  accordion: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  accordionItem: {
    border: "1px solid var(--border-color)",
    borderRadius: "0.5rem",
    overflow: "hidden",
  },
  accordionHeader: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem 0.75rem",
    background: "var(--bg-secondary)",
    border: "none",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: "500",
    color: "var(--text-primary)",
    textAlign: "left",
    transition: "background 0.2s",
  },
  accordionIcon: {
    flexShrink: 0,
    color: "var(--text-secondary)",
  },
  accordionTitle: {
    flex: 1,
  },
  accordionBadge: {
    fontSize: "0.75rem",
    padding: "0.15rem 0.5rem",
    background: "var(--primary-color)",
    color: "white",
    borderRadius: "9999px",
  },
  accordionContent: {
    padding: "0.75rem",
    borderTop: "1px solid var(--border-color)",
  },
  reportsHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    flexWrap: "wrap",
    marginBottom: "1.25rem",
  },
  sortControl: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  sortLabel: {
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
    whiteSpace: "nowrap",
  },
  sortSelect: {
    padding: "0.4rem 0.75rem",
    borderRadius: "0.5rem",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--white)",
    color: "var(--text-primary)",
    fontSize: "0.875rem",
    outline: "none",
    cursor: "pointer",
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
  // Employee dropdown styles
  employeeDropdown: {
    position: "relative",
    width: "100%",
  },
  employeeDropdownButton: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    padding: "0.75rem 1rem",
    fontSize: "1rem",
    border: "2px solid var(--border-color)",
    borderRadius: "0.5rem",
    backgroundColor: "var(--white)",
    cursor: "pointer",
    outline: "none",
    transition: "all 0.2s",
    color: "var(--text-primary)",
    fontFamily: "inherit",
  },
  employeeDropdownMenu: {
    position: "absolute",
    top: "calc(100% + 0.5rem)",
    left: 0,
    right: 0,
    backgroundColor: "var(--white)",
    border: "2px solid var(--border-color)",
    borderRadius: "0.5rem",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    zIndex: 1000,
    maxHeight: "400px",
    display: "flex",
    flexDirection: "column",
  },
  searchContainer: {
    display: "flex",
    alignItems: "center",
    padding: "0.75rem 1rem",
    borderBottom: "1px solid var(--border-color)",
  },
  searchInput: {
    flex: "1 1 auto",
    width: "100%",
    minWidth: 0,
    maxWidth: "none",
    minHeight: "32px",
    border: "none",
    outline: "none",
    fontSize: "0.875rem",
    fontFamily: "inherit",
    color: "var(--text-primary)",
    padding: "0.25rem 0",
    margin: "0 0.75rem",
    background: "transparent",
  },
  clearSearchButton: {
    padding: "0.25rem",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--gray)",
    borderRadius: "0.25rem",
    transition: "all 0.2s",
    flexShrink: 0,
    width: "24px",
    height: "24px",
    minWidth: "24px",
  },
  clearAllButton: {
    margin: "0.5rem",
    padding: "0.5rem",
    fontSize: "0.875rem",
    fontWeight: "500",
    background: "rgba(239, 68, 68, 0.1)",
    color: "var(--danger-color)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    borderRadius: "0.375rem",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  membersList: {
    overflowY: "auto",
    maxHeight: "300px",
    padding: "0.5rem",
  },
  memberCheckboxLabel: {
    display: "flex",
    alignItems: "flex-start",
    gap: "1rem",
    padding: "0.75rem",
    cursor: "pointer",
    borderRadius: "0.375rem",
    transition: "background 0.2s",
  },
  memberTextContainer: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
  },
  memberName: {
    fontSize: "0.875rem",
    fontWeight: "500",
    color: "var(--text-primary)",
    marginBottom: "0.25rem",
    lineHeight: "1.4",
    wordBreak: "break-word",
  },
  memberEmail: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    lineHeight: "1.4",
    wordBreak: "break-word",
  },
  noResults: {
    padding: "2rem",
    textAlign: "center",
    color: "var(--text-secondary)",
    fontSize: "0.875rem",
  },
};

export default Reports;
