import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Layout from "../components/Layout";
import LiveTimer from "../components/LiveTimer";
import { companyAPI, timeLogAPI } from "../services/api";
import { socket } from "../services/socket";
import { t } from "../i18n";
import { formatLocaleDuration, getLocale } from "../utils/formatLocale";
import { useIsMobile } from "../hooks/useIsMobile";
import {
  Users,
  Clock,
  FileText,
  TrendingUp,
  Copy,
  CheckCircle,
  AlertCircle,
  Timer,
  RefreshCw,
} from "lucide-react";

const Dashboard = () => {
  const { selectedCompany, user, hasPermission, refreshUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [activeEmployees, setActiveEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");
  const [selectedLevelFilter, setSelectedLevelFilter] = useState("all");
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);
  const canViewAllTimeLogs = Boolean(
    selectedCompany?.is_owner || selectedCompany?.permissions?.view_all_timelogs
  );
  const canUseEmployeeFilters = hasPermission("view_employee_filters");

  const loadDashboardData = useCallback(async () => {
    if (!selectedCompany) return;
    try {
      const [membersRes, logsRes, statusRes] = await Promise.all([
        companyAPI.getMembers(selectedCompany.id),
        timeLogAPI.getTimeLogs(selectedCompany.id, { limit: 50 }), // Increased limit to get more active employees
        timeLogAPI.getCurrentStatus(selectedCompany.id),
      ]);

      // Exclude scanners from member count
      const membersWithoutScanners = membersRes.data.members.filter(
        (member) => !member.is_scanner || member.is_owner
      );

      setStats({
        totalMembers: membersWithoutScanners.length,
        currentStatus: statusRes.data,
      });

      // Load active employees based on permissions
      const canViewAll = canViewAllTimeLogs;

      const members = membersRes.data.members || [];
      const membersByUserId = new Map(
        members.map((member) => [member.user_id, member])
      );

      // Filter recent logs based on permissions
      let filteredLogs = logsRes.data.logs;

      if (!canViewAll && !selectedCompany.is_owner) {
        // Get current user's member info
        const myMember = membersByUserId.get(user.id);
        const myHierarchyLevel = myMember?.hierarchy_level || 0;

        filteredLogs = logsRes.data.logs.filter((log) => {
          // Always show own logs
          if (log.user_id === user.id) return true;

          // Find log owner's member info
          const logOwnerMember = membersByUserId.get(log.user_id);

          // Default hierarchy visibility: same level and lower levels.
          return (
            !!logOwnerMember &&
            (logOwnerMember.hierarchy_level || 0) <= myHierarchyLevel
          );
        });
      }
      setRecentLogs(filteredLogs.slice(0, 20)); // Show more logs for scrolling

      // Always process active employees (at minimum, user can see themselves)
      const allLogs = logsRes.data.logs || [];
      const active = [];
      const completedTodayHoursByUser = new Map();

      // Get unique users who are currently working
      const processedUsers = new Set();
      const now = new Date();
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      for (const log of allLogs) {
        if (log.clock_out && new Date(log.clock_in) >= startOfDay) {
          completedTodayHoursByUser.set(
            log.user_id,
            (completedTodayHoursByUser.get(log.user_id) || 0) +
              (log.total_hours || 0)
          );
        }
      }

      for (const log of allLogs) {
        if (!log.clock_out && !processedUsers.has(log.user_id)) {
          const member = membersByUserId.get(log.user_id);
          const previousDaySeconds = Math.floor(
            (completedTodayHoursByUser.get(log.user_id) || 0) * 3600
          );

          active.push({
            user_id: log.user_id,
            name: `${log.first_name} ${log.last_name}`,
            email: log.email,
            avatar: log.avatar,
            clock_in: log.clock_in,
            previousDaySeconds,
            role_id: member?.role_id || null,
            role_name: member?.role_name || "No Role",
            hierarchy_level: member?.hierarchy_level || 0,
          });
          processedUsers.add(log.user_id);
        }
      }

      // Filter based on permissions
      let filteredActive = active;

      if (!canViewAll) {
        const myMember = membersByUserId.get(user.id);
        const myHierarchyLevel = myMember?.hierarchy_level || 0;

        filteredActive = active.filter((emp) => {
          // Always show self
          if (emp.user_id === user.id) return true;

          // Default hierarchy visibility: same level and lower levels.
          return (emp.hierarchy_level || 0) <= myHierarchyLevel;
        });
      }

      setActiveEmployees(filteredActive);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, user?.id, canViewAllTimeLogs]);

  useEffect(() => {
    if (!selectedCompany) return;

    loadDashboardData();

    // Socket events are primary real-time source; keep polling as fallback.
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000);

    const handleClockIn = () => {
      loadDashboardData();
    };

    const handleClockOut = () => {
      loadDashboardData();
    };

    socket.on("employee-clocked-in", handleClockIn);
    socket.on("employee-clocked-out", handleClockOut);

    return () => {
      clearInterval(interval);
      socket.off("employee-clocked-in", handleClockIn);
      socket.off("employee-clocked-out", handleClockOut);
    };
  }, [selectedCompany, loadDashboardData]);

  const copyInviteCode = () => {
    navigator.clipboard.writeText(selectedCompany.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const refreshInviteCode = async () => {
    try {
      setRefreshing(true);
      await companyAPI.refreshInviteCode(selectedCompany.id);

      // Update selected company in context
      await refreshUser();

    } catch (error) {
      console.error("Error refreshing invite code:", error);
      alert(error.response?.data?.error || "Failed to refresh invite code");
    } finally {
      setRefreshing(false);
    }
  };

  const calculateTimeRemaining = (expiresAt) => {
    if (!expiresAt) return t("common.noExpiration", "No expiration");

    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry - now;

    if (diff <= 0) return t("common.expired", "Expired");

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return t("dashboard.remaining", { time: `${hours}h ${mins}m` });
    }
    return t("dashboard.remaining", { time: `${mins}m` });
  };

  // Update time remaining and auto-refresh code when expired
  useEffect(() => {
    if (selectedCompany?.invite_code_expires_at) {
      const updateTime = () => {
        const remaining = calculateTimeRemaining(
          selectedCompany.invite_code_expires_at
        );
        setTimeRemaining(remaining);

        // Auto-refresh code if expired
        if (remaining === "Expired") {
          // Backend will auto-refresh on next request, so just refresh user data
          refreshUser();
        }
      };

      // Update immediately
      updateTime();

      // Minute precision is enough for current UI display.
      const interval = setInterval(updateTime, 30000);

      return () => clearInterval(interval);
    }
  }, [selectedCompany, refreshUser]);

  const formatDateTime = (datetime) => {
    return new Date(datetime).toLocaleString(getLocale(), {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const formatTime = (datetime) => {
    return new Date(datetime).toLocaleTimeString(getLocale(), {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const formatDate = (datetime) => {
    const date = new Date(datetime);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateStr = date.toDateString();
    const todayStr = today.toDateString();
    const yesterdayStr = yesterday.toDateString();

    if (dateStr === todayStr) {
      return t("dashboard.today");
    } else if (dateStr === yesterdayStr) {
      return t("dashboard.yesterday");
    } else {
      return date.toLocaleDateString(getLocale(), {
        weekday: "long",
        month: "short",
        day: "numeric",
        year:
          date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  const formatDuration = formatLocaleDuration;

  const groupEmployeesByRole = (employees) => {
    const grouped = {};

    employees.forEach((emp) => {
      const roleName = emp.role_name || "No Role";
      if (!grouped[roleName]) {
        grouped[roleName] = {
          role_name: roleName,
          role_id: emp.role_id,
          hierarchy_level: emp.hierarchy_level,
          employees: [],
        };
      }
      grouped[roleName].employees.push(emp);
    });

    // Sort groups by hierarchy level (highest first)
    return Object.values(grouped).sort(
      (a, b) => b.hierarchy_level - a.hierarchy_level
    );
  };

  const filteredEmployees = useMemo(() => {
    if (!canUseEmployeeFilters) {
      return activeEmployees;
    }

    let filtered = activeEmployees;
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (normalizedSearch) {
      filtered = filtered.filter(
        (emp) =>
          emp.name.toLowerCase().includes(normalizedSearch) ||
          emp.email.toLowerCase().includes(normalizedSearch)
      );
    }

    if (selectedRoleFilter !== "all") {
      filtered = filtered.filter((emp) => emp.role_name === selectedRoleFilter);
    }

    if (selectedLevelFilter !== "all") {
      const level = parseInt(selectedLevelFilter, 10);
      filtered = filtered.filter((emp) => emp.hierarchy_level === level);
    }

    return filtered;
  }, [
    activeEmployees,
    canUseEmployeeFilters,
    searchTerm,
    selectedRoleFilter,
    selectedLevelFilter,
  ]);

  const statistics = useMemo(() => {
    const byLevel = {};
    filteredEmployees.forEach((emp) => {
      const level = emp.hierarchy_level || 0;
      byLevel[level] = (byLevel[level] || 0) + 1;
    });

    const avgLevel =
      filteredEmployees.length > 0
        ? (
            filteredEmployees.reduce(
              (sum, emp) => sum + (emp.hierarchy_level || 0),
              0
            ) / filteredEmployees.length
          ).toFixed(1)
        : 0;

    return {
      total: filteredEmployees.length,
      byLevel,
      avgLevel,
      uniqueRoles: new Set(filteredEmployees.map((emp) => emp.role_name)).size,
    };
  }, [filteredEmployees]);

  const uniqueRoles = useMemo(
    () => [...new Set(activeEmployees.map((emp) => emp.role_name))].sort(),
    [activeEmployees]
  );

  const uniqueLevels = useMemo(
    () =>
      [...new Set(activeEmployees.map((emp) => emp.hierarchy_level))].sort(
        (a, b) => b - a
      ),
    [activeEmployees]
  );

  const groupedEmployeesByRole = useMemo(
    () => groupEmployeesByRole(filteredEmployees),
    [filteredEmployees]
  );

  if (loading) {
    return (
      <Layout>
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </Layout>
    );
  }

  const mobileStyles = isMobile
    ? {
        dashboard: { ...styles.dashboard, gap: "1.5rem", padding: "0.5rem" },
        title: { ...styles.title, fontSize: "1.5rem" },
        subtitle: { ...styles.subtitle, fontSize: "0.875rem" },
        inviteCode: { ...styles.inviteCode, fontSize: "1.25rem" },
        statsGrid: {
          ...styles.statsGrid,
          gridTemplateColumns: "1fr",
          gap: "0.75rem",
        },
        filtersRow: {
          ...styles.filtersRow,
          flexDirection: "column",
          gap: "0.75rem",
          alignItems: "stretch",
        },
        filterGroup: {
          ...styles.filterGroup,
          flexDirection: "column",
          alignItems: "flex-start",
          width: "100%",
        },
        filterSelect: {
          ...styles.filterSelect,
          padding: "0.875rem 1rem",
          fontSize: "16px",
          width: "100%",
          minHeight: "44px",
        },
        clearFiltersBtn: {
          ...styles.clearFiltersBtn,
          padding: "0.875rem 1.5rem",
          fontSize: "1rem",
          minHeight: "44px",
          width: "100%",
        },
        searchInput: {
          ...styles.searchInput,
          padding: "0.875rem 1rem",
          fontSize: "16px",
          minHeight: "44px",
        },
        inviteCodeBox: {
          ...styles.inviteCodeBox,
          gap: "0.75rem",
          flexWrap: "wrap",
        },
        inviteCodeActions: { ...styles.inviteCodeActions, gap: "0.75rem" },
        logEntry: { padding: "1rem", gap: "0.75rem" },
        logTimes: { gridTemplateColumns: "1fr", gap: "0.75rem" },
        logDate: { fontSize: "0.7rem", wordBreak: "break-word" },
      }
    : {};

  return (
    <Layout>
      <div style={{ ...styles.dashboard, ...mobileStyles.dashboard }}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={{ ...styles.title, ...mobileStyles.title }}>
              {t("dashboard.title")}
            </h1>
            <p style={{ ...styles.subtitle, ...mobileStyles.subtitle }}>
              {t("dashboard.welcomeBack", {
                name: user?.firstName,
                companyName: selectedCompany?.name,
              })}
            </p>
          </div>
        </div>

        {/* Live Timer - Current Work Session */}
        {stats?.currentStatus?.isWorking &&
          stats?.currentStatus?.currentLog?.clock_in && (
            <LiveTimer
              startTime={stats.currentStatus.currentLog.clock_in}
              previousDaySeconds={stats.currentStatus.previousDaySeconds || 0}
            />
          )}

        {/* Invite Code Card */}
        {(selectedCompany?.is_owner || hasPermission("view_invite_code")) && (
          <div className="card" style={styles.inviteCard}>
            <div style={styles.inviteContent}>
              <div>
                <h3 style={styles.inviteTitle}>
                  {t("dashboard.companyInviteCode")}
                </h3>
                <p style={styles.inviteDescription}>
                  {t("dashboard.shareCodeDescription")}
                </p>
                {selectedCompany.invite_code_expires_at && (
                  <p
                    style={{
                      ...styles.inviteDescription,
                      color:
                        timeRemaining === "Expired"
                          ? "var(--danger-color)"
                          : "var(--warning-color)",
                      fontWeight: "500",
                      marginTop: "0.5rem",
                    }}
                  >
                    <Timer size={16} style={{ marginRight: "0.5rem" }} />
                    {timeRemaining}
                  </p>
                )}
              </div>
              <div
                style={{
                  ...styles.inviteCodeActions,
                  ...mobileStyles.inviteCodeActions,
                }}
              >
                <div
                  style={{
                    ...styles.inviteCodeBox,
                    ...mobileStyles.inviteCodeBox,
                  }}
                >
                  <span
                    style={{ ...styles.inviteCode, ...mobileStyles.inviteCode }}
                  >
                    {selectedCompany.invite_code}
                  </span>
                  <button
                    onClick={copyInviteCode}
                    className="btn btn-secondary"
                  >
                    {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                {(selectedCompany.is_owner ||
                  hasPermission("refresh_invite_code")) && (
                  <button
                    onClick={refreshInviteCode}
                    disabled={refreshing}
                    className="btn btn-primary"
                    style={{ marginTop: "0.75rem" }}
                  >
                    <RefreshCw
                      size={20}
                      style={{
                        animation: refreshing
                          ? "spin 1s linear infinite"
                          : "none",
                      }}
                    />
                    {refreshing
                      ? t("common.loading")
                      : t("dashboard.refreshCode")}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div style={{ ...styles.statsGrid, ...mobileStyles.statsGrid }}>
          <div className="card" style={styles.statCard}>
            <div style={styles.statIcon("var(--primary-color)")}>
              <Users size={24} />
            </div>
            <div>
              <p style={styles.statLabel}>{t("dashboard.teamMembers")}</p>
              <h3 style={styles.statValue}>{stats?.totalMembers || 0}</h3>
            </div>
          </div>

          <div className="card" style={styles.statCard}>
            <div
              style={styles.statIcon(
                stats?.currentStatus?.isClockedIn
                  ? "var(--success-color)"
                  : "var(--danger-color)"
              )}
            >
              <Clock size={24} />
            </div>
            <div>
              <p style={styles.statLabel}>{t("dashboard.yourStatus")}</p>
              <h3
                style={{
                  ...styles.statValue,
                  color: stats?.currentStatus?.isClockedIn
                    ? "var(--success-color)"
                    : "var(--danger-color)",
                }}
              >
                {stats?.currentStatus?.isClockedIn
                  ? t("dashboard.clockedIn")
                  : t("dashboard.clockedOut")}
              </h3>
            </div>
          </div>

          <div
            className="card"
            style={{ ...styles.statCard, cursor: "pointer" }}
            onClick={() => navigate("/time-tracking")}
          >
            <div style={styles.statIcon("var(--secondary-color)")}>
              <Clock size={24} />
            </div>
            <div>
              <p style={styles.statLabel}>{t("timeTracking.title")}</p>
              <p style={styles.statLink}>{t("dashboard.goToTimeTracking")}</p>
            </div>
          </div>

          {hasPermission("create_reports") && (
            <div
              className="card"
              style={{ ...styles.statCard, cursor: "pointer" }}
              onClick={() => navigate("/reports")}
            >
              <div style={styles.statIcon("var(--warning-color)")}>
                <FileText size={24} />
              </div>
              <div>
                <p style={styles.statLabel}>{t("reports.title")}</p>
                <p style={styles.statLink}>{t("dashboard.generateReports")}</p>
              </div>
            </div>
          )}
        </div>

        {/* Active Employees - For managers/admins */}
        {activeEmployees.length > 0 && (
            <div className="card">
              <div style={styles.sectionHeader}>
                <Timer size={24} color="var(--success-color)" />
                <h2 style={styles.sectionTitle}>
                  {t("dashboard.currentlyWorking", {
                    count: activeEmployees.length,
                  })}
                </h2>
              </div>

              {/* Filters and Statistics (Only for users with permission) */}
              {hasPermission("view_employee_filters") && (
                <div className="dashboard-filters-section" style={styles.filtersSection}>
                  {/* Search Bar */}
                  <div style={styles.searchBar}>
                    <input
                      type="text"
                      className="dashboard-search-input"
                      placeholder={t("members.searchPlaceholder")}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{
                        ...styles.searchInput,
                        ...mobileStyles.searchInput,
                      }}
                    />
                  </div>

                  {/* Filters Row */}
                  <div
                    style={{ ...styles.filtersRow, ...mobileStyles.filtersRow }}
                  >
                    {/* Role Filter */}
                    <div
                      style={{
                        ...styles.filterGroup,
                        ...mobileStyles.filterGroup,
                      }}
                    >
                      <label style={styles.filterLabel}>
                        {t("dashboard.role")}
                      </label>
                      <select
                        className="dashboard-filter-select"
                        value={selectedRoleFilter}
                        onChange={(e) => setSelectedRoleFilter(e.target.value)}
                        style={{
                          ...styles.filterSelect,
                          ...mobileStyles.filterSelect,
                        }}
                      >
                        <option value="all">{t("dashboard.allRoles")}</option>
                        {uniqueRoles.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Level Filter */}
                    <div
                      style={{
                        ...styles.filterGroup,
                        ...mobileStyles.filterGroup,
                      }}
                    >
                      <label style={styles.filterLabel}>
                        {t("dashboard.level")}
                      </label>
                      <select
                        className="dashboard-filter-select"
                        value={selectedLevelFilter}
                        onChange={(e) => setSelectedLevelFilter(e.target.value)}
                        style={{
                          ...styles.filterSelect,
                          ...mobileStyles.filterSelect,
                        }}
                      >
                        <option value="all">{t("dashboard.allLevels")}</option>
                        {uniqueLevels.map((level) => (
                          <option key={level} value={level}>
                            {t("dashboard.levelDisplay", { level })}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Clear Filters */}
                    {(searchTerm ||
                      selectedRoleFilter !== "all" ||
                      selectedLevelFilter !== "all") && (
                      <button
                        onClick={() => {
                          setSearchTerm("");
                          setSelectedRoleFilter("all");
                          setSelectedLevelFilter("all");
                        }}
                        style={{
                          ...styles.clearFiltersBtn,
                          ...mobileStyles.clearFiltersBtn,
                        }}
                      >
                        {t("dashboard.clearFilters")}
                      </button>
                    )}
                  </div>

                  {/* Statistics */}
                  <div style={styles.statsRow}>
                    <div className="dashboard-stat-box" style={styles.statBox}>
                      <div style={styles.filterStatValue}>
                        {statistics.total}
                      </div>
                      <div style={styles.filterStatLabel}>
                        {t("dashboard.showing")}
                      </div>
                    </div>
                    <div className="dashboard-stat-box" style={styles.statBox}>
                      <div style={styles.filterStatValue}>
                        {statistics.uniqueRoles}
                      </div>
                      <div style={styles.filterStatLabel}>
                        {t("dashboard.roles")}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Group by roles */}
              {filteredEmployees.length === 0 ? (
                <div style={styles.noResults}>
                  <p>No employees found matching your filters</p>
                </div>
              ) : (
                groupedEmployeesByRole.map(
                  (roleGroup) => (
                    <div key={roleGroup.role_name} style={styles.roleGroup}>
                      <div style={styles.roleGroupHeader}>
                        <div style={styles.roleGroupTitle}>
                          <span style={styles.roleName}>
                            {roleGroup.role_name}
                          </span>
                          <span
                            style={styles.roleLevel(roleGroup.hierarchy_level)}
                          >
                            {t("dashboard.levelDisplay", {
                              level: roleGroup.hierarchy_level,
                            })}
                          </span>
                          <span style={styles.roleCount}>
                            {roleGroup.employees.length}{" "}
                            {roleGroup.employees.length === 1
                              ? t("dashboard.person")
                              : t("dashboard.people")}
                          </span>
                        </div>
                      </div>
                      <div style={styles.activeEmployeesGrid}>
                        {roleGroup.employees.map((employee) => (
                          <div
                            key={employee.user_id}
                            style={styles.activeEmployeeCard}
                          >
                            <div style={styles.activeEmployeeInfo}>
                              <div style={styles.activeEmployeeAvatar}>
                                {employee.avatar ? (
                                  <img
                                    src={employee.avatar}
                                    alt={employee.name}
                                    style={styles.avatarImage}
                                  />
                                ) : (
                                  employee.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                )}
                              </div>
                              <div style={styles.activeEmployeeDetails}>
                                <div style={styles.activeEmployeeName}>
                                  {employee.name}
                                </div>
                                <div style={styles.activeEmployeeEmail}>
                                  {employee.email}
                                </div>
                                <div style={styles.employeeStatus}>
                                  <div style={styles.activeIndicator}></div>
                                  {t("dashboard.working")}
                                </div>
                              </div>
                            </div>
                            <div style={styles.activeEmployeeTimerSlot}>
                              <LiveTimer
                                startTime={employee.clock_in}
                                previousDaySeconds={
                                  employee.previousDaySeconds || 0
                                }
                                compact
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                )
              )}
            </div>
          )}

        {/* Recent Activity */}
        <div className="card" style={styles.recentActivity}>
          <h2 style={styles.sectionTitle}>Recent Time Logs</h2>

          {recentLogs.length === 0 ? (
            <div style={styles.emptyState}>
              <AlertCircle size={48} color="var(--gray)" />
              <p style={styles.emptyText}>No time logs yet</p>
              <button
                className="btn btn-primary"
                onClick={() => navigate("/time-tracking")}
              >
                Start Time Tracking
              </button>
            </div>
          ) : (
            <div style={styles.logsGrouped} className="logs-scrollable">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  style={{ ...styles.logEntry, ...mobileStyles.logEntry }}
                  className="log-entry-hover"
                >
                  <div style={styles.logEmployee}>
                    <div style={styles.employeeAvatar}>
                      {log.avatar ? (
                        <img
                          src={log.avatar}
                          alt={`${log.first_name} ${log.last_name}`}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <>
                          {log.first_name[0]}
                          {log.last_name[0]}
                        </>
                      )}
                    </div>
                    <div style={styles.employeeInfo}>
                      <div style={styles.employeeName}>
                        {log.first_name} {log.last_name}
                      </div>
                      <div style={styles.employeeEmail}>{log.email}</div>
                      <div
                        style={{ ...styles.logDate, ...mobileStyles.logDate }}
                      >
                        {formatDate(log.clock_in)}
                      </div>
                    </div>
                  </div>
                  <div style={{ ...styles.logTimes, ...mobileStyles.logTimes }}>
                    <div style={styles.timeBlock}>
                      <div style={styles.timeLabel}>
                        {t("dashboard.clockIn")}
                      </div>
                      <div style={styles.timeValue}>
                        {formatTime(log.clock_in)}
                      </div>
                    </div>
                    <div style={styles.timeArrow}>→</div>
                    <div style={styles.timeBlock}>
                      <div style={styles.timeLabel}>
                        {t("dashboard.clockOut")}
                      </div>
                      <div style={styles.timeValue}>
                        {log.clock_out ? (
                          formatTime(log.clock_out)
                        ) : (
                          <span className="badge badge-success">
                            {t("dashboard.inProgress")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={styles.timeDuration} className="time-duration-box">
                      <div style={styles.durationLabel} className="time-duration-label">
                        {t("dashboard.total")}
                      </div>
                      <div style={styles.durationValue} className="time-duration-value">
                        {log.clock_out ? (
                          formatDuration(log.total_hours)
                        ) : (
                          <span style={{ color: "var(--success-color)", fontWeight: "600" }}>
                            {t("dashboard.inProgress")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

const styles = {
  dashboard: {
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "1rem",
  },
  title: {
    fontSize: "2rem",
    fontWeight: "700",
    marginBottom: "0.5rem",
  },
  subtitle: {
    color: "var(--text-secondary)",
    fontSize: "1rem",
  },
  inviteCard: {
    backgroundColor: "rgba(79, 70, 229, 0.05)",
    border: "2px solid var(--primary-color)",
  },
  inviteContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexDirection: "column",
    gap: "1rem",
  },
  "@media (min-width: 640px)": {
    inviteContent: {
      flexDirection: "row",
      alignItems: "center",
    },
  },
  inviteTitle: {
    fontSize: "1.25rem",
    fontWeight: "600",
    marginBottom: "0.25rem",
  },
  inviteDescription: {
    color: "var(--text-secondary)",
    fontSize: "0.875rem",
  },
  inviteCodeBox: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  inviteCodeActions: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
  },
  inviteCode: {
    fontSize: "1.5rem",
    fontWeight: "700",
    fontFamily: "monospace",
    color: "var(--primary-color)",
    letterSpacing: "0.1em",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
    gap: "1rem",
  },
  statCard: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  statIcon: (color) => ({
    width: "56px",
    height: "56px",
    borderRadius: "0.75rem",
    backgroundColor: `${color}15`,
    color: color,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }),
  statLabel: {
    color: "var(--text-secondary)",
    fontSize: "0.875rem",
    marginBottom: "0.25rem",
  },
  statValue: {
    fontSize: "1.75rem",
    fontWeight: "700",
  },
  statLink: {
    color: "var(--primary-color)",
    fontSize: "0.875rem",
    fontWeight: "500",
  },
  recentActivity: {
    minHeight: "300px",
  },
  sectionTitle: {
    fontSize: "1.5rem",
    fontWeight: "600",
    marginBottom: "1.5rem",
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
  logsGrouped: {
    display: "flex",
    flexDirection: "column",
    gap: "0",
    maxHeight: "500px",
    overflowY: "scroll",
    paddingRight: "0.5rem",
  },
  logEntry: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    padding: "1.25rem",
    backgroundColor: "var(--white)",
    borderRadius: "0.75rem",
    border: "1px solid var(--border-color)",
    transition: "all 0.3s ease",
    marginBottom: "1rem",
    boxShadow: "none",
  },
  logEmployee: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  employeeAvatar: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    background:
      "linear-gradient(135deg, var(--primary-color), var(--secondary-color))",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.95rem",
    fontWeight: "700",
    flexShrink: 0,
    boxShadow: "none",
  },
  employeeInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    flex: 1,
    minWidth: 0,
  },
  employeeName: {
    fontSize: "1rem",
    fontWeight: "700",
    color: "var(--text-primary)",
    wordBreak: "break-word",
    overflowWrap: "break-word",
  },
  employeeEmail: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
  },
  logDate: {
    fontSize: "0.75rem",
    color: "var(--primary-color)",
    fontWeight: "600",
    marginTop: "0.15rem",
    wordBreak: "break-word",
    overflowWrap: "break-word",
  },
  logTimes: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
    gap: "1rem",
    alignItems: "center",
  },
  timeBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  timeLabel: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  timeValue: {
    fontSize: "1rem",
    fontWeight: "600",
    color: "var(--text-primary)",
    fontFamily: "monospace",
  },
  timeArrow: {
    fontSize: "1.5rem",
    color: "var(--primary-color)",
    textAlign: "center",
    fontWeight: "300",
  },
  timeDuration: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.25rem",
    padding: "0.75rem 1.25rem",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: "0.75rem",
    border: "2px solid rgba(16, 185, 129, 0.3)",
    minWidth: "120px",
  },
  durationLabel: {
    fontSize: "0.7rem",
    color: "#059669",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
  durationValue: {
    fontSize: "1.5rem",
    fontWeight: "800",
    color: "#10b981",
    fontFamily: "monospace",
    letterSpacing: "-0.02em",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "1.5rem",
  },
  activeEmployeesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
    gap: "1rem",
  },
  roleGroup: {
    marginBottom: "2rem",
  },
  roleGroupHeader: {
    marginBottom: "1rem",
    paddingBottom: "0.75rem",
    borderBottom: "2px solid var(--border-color)",
  },
  roleGroupTitle: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    flexWrap: "wrap",
  },
  roleName: {
    fontSize: "1.125rem",
    fontWeight: "600",
    color: "var(--text-primary)",
  },
  roleLevel: (level) => ({
    padding: "0.375rem 0.875rem",
    background: `linear-gradient(135deg, 
      ${
        level >= 11
          ? "#eab308"
          : level >= 9
          ? "#dc2626"
          : level >= 7
          ? "#f59e0b"
          : level >= 5
          ? "#10b981"
          : level >= 3
          ? "#3b82f6"
          : "#6b7280"
      }, 
      ${
        level >= 11
          ? "#fbbf24"
          : level >= 9
          ? "#ef4444"
          : level >= 7
          ? "#fbbf24"
          : level >= 5
          ? "#34d399"
          : level >= 3
          ? "#60a5fa"
          : "#9ca3af"
      })`,
    color: "white",
    borderRadius: "1rem",
    fontSize: "0.8125rem",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    boxShadow: "none",
    transition: "all 0.3s ease",
  }),
  roleCount: {
    padding: "0.25rem 0.75rem",
    background: "rgba(79, 70, 229, 0.1)",
    color: "var(--primary-color)",
    borderRadius: "1rem",
    fontSize: "0.75rem",
    fontWeight: "500",
  },
  activeEmployeeCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    flexWrap: "wrap",
    padding: "1rem",
    background: "rgba(16, 185, 129, 0.05)",
    border: "1px solid rgba(16, 185, 129, 0.2)",
    borderRadius: "0.75rem",
    transition: "all 0.2s ease",
  },
  activeEmployeeInfo: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    flex: 1,
    minWidth: "0",
  },
  activeEmployeeDetails: {
    minWidth: 0,
    flex: 1,
  },
  activeEmployeeAvatar: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    background:
      "linear-gradient(135deg, var(--primary-color), var(--secondary-color))",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "600",
    fontSize: "1rem",
    flexShrink: 0,
  },
  activeEmployeeName: {
    fontWeight: "600",
    color: "var(--text-primary)",
    marginBottom: "0.25rem",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  activeEmployeeEmail: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    marginBottom: "0.25rem",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  activeEmployeeTimerSlot: {
    flexShrink: 0,
    marginLeft: "auto",
    alignSelf: "flex-start",
  },
  employeeStatus: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.75rem",
    color: "#059669",
    fontWeight: "500",
  },
  activeIndicator: {
    width: "8px",
    height: "8px",
    background: "#10b981",
    borderRadius: "50%",
    animation: "pulse 2s infinite",
  },
  filtersSection: {
    marginBottom: "2rem",
    padding: "1.5rem",
    background: "var(--bg-secondary)",
    borderRadius: "0.75rem",
    border: "1px solid var(--border-color)",
  },
  searchBar: {
    marginBottom: "1rem",
  },
  searchInput: {
    width: "100%",
    padding: "0.75rem 1rem",
    fontSize: "1rem",
    backgroundColor: "var(--white)",
    color: "var(--text-primary)",
    border: "2px solid var(--border-color)",
    borderRadius: "0.5rem",
    outline: "none",
    transition: "all 0.2s",
  },
  filtersRow: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: "1.5rem",
  },
  filterGroup: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  filterLabel: {
    fontSize: "0.875rem",
    fontWeight: "500",
    color: "var(--text-secondary)",
  },
  filterSelect: {
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    border: "1px solid var(--border-color)",
    borderRadius: "0.5rem",
    background: "var(--white)",
    color: "var(--text-primary)",
    cursor: "pointer",
    outline: "none",
  },
  clearFiltersBtn: {
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    background: "var(--danger-color)",
    color: "white",
    border: "none",
    borderRadius: "0.5rem",
    cursor: "pointer",
    fontWeight: "500",
    transition: "all 0.2s",
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
    gap: "1rem",
    marginTop: "1rem",
  },
  statBox: {
    textAlign: "center",
    padding: "1rem",
    background: "var(--white)",
    color: "var(--text-primary)",
    borderRadius: "0.5rem",
    border: "1px solid var(--border-color)",
  },
  filterStatValue: {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "var(--primary-color)",
    marginBottom: "0.25rem",
  },
  filterStatLabel: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  noResults: {
    textAlign: "center",
    padding: "3rem",
    color: "var(--text-secondary)",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    objectFit: "cover",
  },
};

export default Dashboard;
