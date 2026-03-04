import { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Clock,
  TrendingUp,
  Award,
  Mail,
  User,
} from "lucide-react";
import { userAPI } from "../services/api";
import { t } from "../i18n";
import { formatLocaleDate, formatLocaleDuration } from "../utils/formatLocale";
import ActivityHeatmap from "./ActivityHeatmap";

const UserProfileModal = ({ user, companyId, onClose }) => {
  const userId = user?.user_id ?? user?.id;
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId && companyId) {
      loadUserStats();
    }
  }, [userId, companyId]);

  const loadUserStats = async () => {
    if (!userId || !companyId) return;
    try {
      setLoading(true);
      const response = await userAPI.getUserStats(userId, companyId);
      setStats(response.data);
    } catch (error) {
      console.error("Error loading user stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    const firstName = stats?.user?.first_name || user?.first_name || "";
    const lastName = stats?.user?.last_name || user?.last_name || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatDuration = formatLocaleDuration;

  const styles = {
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10000,
      padding: "1rem",
    },
    modal: {
      backgroundColor: "var(--white)",
      borderRadius: "1rem",
      maxWidth: "600px",
      width: "100%",
      maxHeight: "90vh",
      overflowY: "auto",
      position: "relative",
      boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
    },
    header: {
      padding: "1.5rem",
      borderBottom: "1px solid var(--border-color)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      position: "sticky",
      top: 0,
      backgroundColor: "var(--white)",
      zIndex: 1,
      borderRadius: "1rem 1rem 0 0",
    },
    title: {
      fontSize: "1.25rem",
      fontWeight: "700",
      color: "var(--text-primary)",
    },
    closeButton: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "0.5rem",
      borderRadius: "0.5rem",
      transition: "all 0.2s ease",
      color: "var(--text-secondary)",
    },
    content: {
      padding: "1.5rem",
    },
    profileSection: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      marginBottom: "2rem",
      padding: "1.5rem",
      backgroundColor: "var(--bg-secondary)",
      borderRadius: "0.75rem",
    },
    avatar: {
      width: "100px",
      height: "100px",
      borderRadius: "50%",
      overflow: "hidden",
      border: "4px solid var(--primary-color)",
      marginBottom: "1rem",
      boxShadow: "0 4px 12px rgba(79, 70, 229, 0.2)",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
    },
    avatarPlaceholder: {
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background:
        "linear-gradient(135deg, var(--primary-color), var(--secondary-color))",
      color: "white",
      fontSize: "2rem",
      fontWeight: "700",
    },
    userName: {
      fontSize: "1.5rem",
      fontWeight: "700",
      color: "var(--text-primary)",
      marginBottom: "0.5rem",
    },
    userEmail: {
      fontSize: "0.9rem",
      color: "var(--text-secondary)",
      marginBottom: "0.5rem",
    },
    roleBadge: {
      display: "inline-block",
      padding: "0.5rem 1rem",
      backgroundColor: "rgba(79, 70, 229, 0.1)",
      color: "var(--primary-color)",
      borderRadius: "9999px",
      fontSize: "0.875rem",
      fontWeight: "600",
      marginTop: "0.5rem",
    },
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "1rem",
      marginBottom: "1.5rem",
    },
    statCard: {
      padding: "1.5rem",
      backgroundColor: "var(--white)",
      border: "1px solid var(--border-color)",
      borderRadius: "0.75rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
      transition: "all 0.3s ease",
    },
    statIcon: {
      width: "40px",
      height: "40px",
      borderRadius: "0.5rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: "0.5rem",
    },
    statLabel: {
      fontSize: "0.75rem",
      color: "var(--text-secondary)",
      textTransform: "uppercase",
      fontWeight: "600",
      letterSpacing: "0.5px",
    },
    statValue: {
      fontSize: "1.5rem",
      fontWeight: "700",
      color: "var(--text-primary)",
    },
    infoSection: {
      marginBottom: "1.5rem",
    },
    sectionTitle: {
      fontSize: "1rem",
      fontWeight: "700",
      color: "var(--text-primary)",
      marginBottom: "1rem",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
    },
    infoItem: {
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      padding: "0.75rem",
      backgroundColor: "var(--bg-secondary)",
      borderRadius: "0.5rem",
      marginBottom: "0.5rem",
    },
    infoLabel: {
      fontSize: "0.875rem",
      color: "var(--text-secondary)",
      flex: 1,
    },
    infoValue: {
      fontSize: "0.875rem",
      fontWeight: "600",
      color: "var(--text-primary)",
    },
    loadingContainer: {
      padding: "3rem",
      textAlign: "center",
    },
    loadingText: {
      color: "var(--text-secondary)",
      marginTop: "1rem",
    },
    heatmapSection: {
      marginTop: "1.5rem",
    },
    heatmapCard: {
      padding: "1rem",
      backgroundColor: "var(--bg-secondary)",
      border: "1px solid var(--border-color)",
      borderRadius: "0.75rem",
      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    },
  };

  if (loading) {
    return (
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div style={styles.header}>
            <h2 style={styles.title}>{t("profile.userProfile")}</h2>
            <button onClick={onClose} style={styles.closeButton}>
              <X size={24} />
            </button>
          </div>
          <div style={styles.loadingContainer}>
            <div className="spinner"></div>
            <p style={styles.loadingText}>{t("profile.loadingUserInformation")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>{t("profile.userProfile", "User Profile")}</h2>
          <button onClick={onClose} style={styles.closeButton}>
            <X size={24} />
          </button>
        </div>

        <div style={styles.content}>
          {/* Profile Section */}
          <div style={styles.profileSection}>
            <div style={styles.avatar}>
              {stats?.user?.avatar ? (
                <img
                  src={stats.user.avatar}
                  alt="Profile"
                  style={styles.avatarImage}
                />
              ) : (
                <div style={styles.avatarPlaceholder}>{getInitials()}</div>
              )}
            </div>
            <h3 style={styles.userName}>
              {stats?.user?.first_name} {stats?.user?.last_name}
            </h3>
            <p style={styles.userEmail}>{stats?.user?.email}</p>
            {stats?.user?.role_name && (
              <div style={styles.roleBadge}>
                {stats.user.role_name}
                {stats.user.hierarchy_level &&
                  ` (${t("members.level", { level: stats.user.hierarchy_level })})`}
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div
                style={{
                  ...styles.statIcon,
                  backgroundColor: "var(--stat-icon-bg, rgba(79, 70, 229, 0.1))",
                }}
                className="profile-stat-icon"
              >
                <Clock size={20} color="var(--stat-icon-color, var(--primary-color))" />
              </div>
              <div style={styles.statLabel}>{t("profile.thisMonthLabel")}</div>
              <div style={styles.statValue}>
                {formatDuration(stats?.stats?.monthHours || 0)}
              </div>
            </div>

            <div style={styles.statCard}>
              <div
                style={{
                  ...styles.statIcon,
                  backgroundColor: "var(--stat-icon-bg, rgba(79, 70, 229, 0.1))",
                }}
                className="profile-stat-icon"
              >
                <TrendingUp size={20} color="var(--stat-icon-color, var(--primary-color))" />
              </div>
              <div style={styles.statLabel}>{t("profile.thisWeekLabel")}</div>
              <div style={styles.statValue}>
                {formatDuration(stats?.stats?.weekHours || 0)}
              </div>
            </div>

            <div style={styles.statCard}>
              <div
                style={{
                  ...styles.statIcon,
                  backgroundColor: "var(--stat-icon-bg, rgba(79, 70, 229, 0.1))",
                }}
                className="profile-stat-icon"
              >
                <Award size={20} color="var(--stat-icon-color, var(--primary-color))" />
              </div>
              <div style={styles.statLabel}>{t("profile.totalHoursLabel")}</div>
              <div style={styles.statValue}>
                {formatDuration(stats?.stats?.totalHours || 0)}
              </div>
            </div>

            <div style={styles.statCard}>
              <div
                style={{
                  ...styles.statIcon,
                  backgroundColor: "var(--stat-icon-bg, rgba(79, 70, 229, 0.1))",
                }}
                className="profile-stat-icon"
              >
                <Calendar size={20} color="var(--stat-icon-color, var(--primary-color))" />
              </div>
              <div style={styles.statLabel}>{t("profile.workDaysLabel")}</div>
              <div style={styles.statValue}>{stats?.stats?.workDays || 0}</div>
            </div>
          </div>

          {/* Additional Info */}
          <div style={styles.infoSection}>
            <div style={styles.sectionTitle}>
              <User size={18} />
              {t("profile.additionalInformation")}
            </div>
            <div style={styles.infoItem}>
              <Calendar size={18} color="var(--text-secondary)" />
              <div style={styles.infoLabel}>{t("profile.joinedCompanyLabel")}</div>
              <div style={styles.infoValue}>
                {stats?.user?.joined_at
                  ? formatLocaleDate(stats.user.joined_at)
                  : t("common.notAvailable")}
              </div>
            </div>
            <div style={styles.infoItem}>
              <TrendingUp size={18} color="var(--text-secondary)" />
              <div style={styles.infoLabel}>{t("profile.avgHoursPerDayLabel")}</div>
              <div style={styles.infoValue}>
                {formatDuration(stats?.stats?.averageHoursPerDay || 0)}
              </div>
            </div>
            <div style={styles.infoItem}>
              <Mail size={18} color="var(--text-secondary)" />
              <div style={styles.infoLabel}>{t("auth.email")}</div>
              <div style={styles.infoValue}>{stats?.user?.email}</div>
            </div>
          </div>

          {/* Activity History Heatmap */}
          <div style={styles.heatmapSection}>
            <div style={styles.sectionTitle}>
              <Calendar size={18} />
              {t("profile.activityHistory")}
            </div>
            <div className="heatmap-card" style={styles.heatmapCard}>
              <ActivityHeatmap heatmap={stats?.stats?.activityHeatmap || {}} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
