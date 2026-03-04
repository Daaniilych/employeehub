import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { t } from "../i18n";
import {
  User,
  Settings,
  LogOut,
  Camera,
  Save,
  Lock,
  Clock,
  TrendingUp,
  Calendar,
  Award,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import { userAPI, timeLogAPI, companyAPI } from "../services/api";
import LiveTimer from "../components/LiveTimer";
import ActivityHeatmap from "../components/ActivityHeatmap";
import { useIsMobile } from "../hooks/useIsMobile";
import { formatLocaleDate, formatLocaleDuration } from "../utils/formatLocale";

const Profile = () => {
  const { user, selectedCompany, refreshUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [isBackButtonHovered, setIsBackButtonHovered] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [showLeaveCompanyModal, setShowLeaveCompanyModal] = useState(false);
  const [leaveCompanyConfirm, setLeaveCompanyConfirm] = useState("");
  const isMobile = useIsMobile(768);

  // Profile settings state
  const [profileData, setProfileData] = useState({
    first_name: user?.firstName || "",
    last_name: user?.lastName || "",
    email: user?.email || "",
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Load user statistics and current status
  useEffect(() => {
    if (user && selectedCompany) {
      loadUserStats();
      loadCurrentStatus();
    }
  }, [user, selectedCompany]);

  const loadUserStats = async () => {
    try {
      setStatsLoading(true);
      const response = await userAPI.getUserStats(user.id, selectedCompany.id);
      setStats(response.data);
    } catch (error) {
      console.error("Error loading user stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadCurrentStatus = async () => {
    try {
      const response = await timeLogAPI.getCurrentStatus(selectedCompany.id);
      setCurrentStatus(response.data);
    } catch (error) {
      console.error("Error loading current status:", error);
    }
  };

  const formatDuration = formatLocaleDuration;

  // Handle avatar upload
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image size must be less than 2MB" });
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        setLoading(true);
        await userAPI.updateAvatar(reader.result);
        await refreshUser();
        setMessage({ type: "success", text: "Avatar updated successfully!" });
      } catch (error) {
        setMessage({
          type: "error",
          text: error.response?.data?.error || "Failed to update avatar",
        });
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarRemove = async () => {
    if (!window.confirm("Are you sure you want to remove your avatar?")) {
      return;
    }

    try {
      setLoading(true);
      await userAPI.updateAvatar(null);
      await refreshUser();
      setMessage({ type: "success", text: "Avatar removed successfully!" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to remove avatar",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle profile update
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await userAPI.updateProfile(profileData);
      await refreshUser();
      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to update profile",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({
        type: "error",
        text: "New password must be at least 6 characters",
      });
      return;
    }

    try {
      setLoading(true);
      await userAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setMessage({ type: "success", text: "Password changed successfully!" });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to change password",
      });
    } finally {
      setLoading(false);
    }
  };


  const handleLeaveCompany = async () => {
    if (leaveCompanyConfirm !== selectedCompany?.name) {
      setMessage({ 
        type: "error", 
        text: t("profile.leaveCompanyConfirm", { companyName: selectedCompany?.name })
      });
      return;
    }

    if (!selectedCompany) {
      return;
    }

    try {
      setLoading(true);
      await companyAPI.leaveCompany(selectedCompany.id);
      setMessage({ 
        type: "success", 
        text: t("profile.leaveCompany") + " " + t("common.success")
      });
      setShowLeaveCompanyModal(false);
      setLeaveCompanyConfirm("");
      
      // Refresh user data to update company list
      await refreshUser();
      
      // Navigate to company setup if no companies left
      setTimeout(() => {
        navigate("/company-setup");
      }, 1500);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || t("errors.generic"),
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    const firstName = user?.firstName || "";
    const lastName = user?.lastName || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const mobileStyles = isMobile ? {
    container: { padding: "1rem" },
    title: { fontSize: "1.5rem" },
    subtitle: { fontSize: "0.875rem" },
    tabContent: { padding: "1rem" },
    avatarLarge: { width: "80px", height: "80px", border: "3px solid var(--primary-color)" },
    avatarMedium: { width: "60px", height: "60px", border: "2px solid var(--primary-color)" },
    avatarPlaceholder: { fontSize: "1.5rem" },
    userName: { fontSize: "1.25rem" },
    userEmail: { fontSize: "0.875rem" },
    statsGrid: { gridTemplateColumns: "1fr", gap: "0.75rem" },
    statCard: { padding: "1rem" },
    statValue: { fontSize: "1.25rem" },
    infoGrid: { gridTemplateColumns: "1fr", gap: "0.75rem" },
    infoCard: { padding: "1rem", gap: "0.75rem" },
    formGrid: { gridTemplateColumns: "1fr", gap: "0.75rem" },
    sectionTitle: { fontSize: "1.125rem", marginTop: "1.5rem", marginBottom: "0.75rem" },
    settingsSection: { marginBottom: "1.5rem", paddingBottom: "1.5rem" },
    avatarUploadSection: { flexDirection: "column", gap: "1rem", alignItems: "center" },
    tabs: { padding: "0 1rem", overflowX: "auto" },
    tab: { padding: "0.875rem 1rem", fontSize: "0.875rem" },
    dangerZone: { marginTop: "2rem", padding: "1rem" },
    dangerZoneTitle: { fontSize: "1.125rem" },
    dangerZoneDescription: { fontSize: "0.875rem" },
  } : {};

  const renderProfileTab = () => (
    <div style={{...styles.tabContent, ...mobileStyles.tabContent}}>
      <div style={styles.profileHeader}>
        <div style={styles.avatarSection}>
          <div style={{...styles.avatarLarge, ...mobileStyles.avatarLarge}}>
            {user?.avatar ? (
              <img src={user.avatar} alt="Profile" style={styles.avatarImage} />
            ) : (
              <div style={{...styles.avatarPlaceholder, ...mobileStyles.avatarPlaceholder}}>{getInitials()}</div>
            )}
          </div>
          <h2 style={{...styles.userName, ...mobileStyles.userName}}>
            {user?.firstName} {user?.lastName}
          </h2>
          <p style={{...styles.userEmail, ...mobileStyles.userEmail}}>{user?.email}</p>
          {selectedCompany && (
            <div style={styles.companyBadge}>
              {selectedCompany.name}
              {selectedCompany.is_owner ? " (Owner)" : ""}
            </div>
          )}
          {/* Live Timer - if currently working */}
          {currentStatus?.isClockedIn &&
            currentStatus?.currentLog?.clock_in && (
              <div style={styles.liveTimerContainer}>
                <LiveTimer
                  startTime={currentStatus.currentLog.clock_in}
                  previousDaySeconds={currentStatus.previousDaySeconds || 0}
                />
              </div>
            )}
        </div>
      </div>

      {/* Work Statistics */}
      {statsLoading ? (
        <div style={styles.loadingStats}>{t("profile.loadingStatistics")}</div>
      ) : stats ? (
        <>
          <h3 style={{...styles.sectionTitle, ...mobileStyles.sectionTitle}}>{t("profile.workStatistics")}</h3>
          <div style={{...styles.statsGrid, ...mobileStyles.statsGrid}}>
            <div style={{...styles.statCard, ...mobileStyles.statCard}}>
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
              <div style={{...styles.statValue, ...mobileStyles.statValue}}>
                {formatDuration(stats.stats?.monthHours || 0)}
              </div>
            </div>

            <div style={{...styles.statCard, ...mobileStyles.statCard}}>
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
              <div style={{...styles.statValue, ...mobileStyles.statValue}}>
                {formatDuration(stats.stats?.weekHours || 0)}
              </div>
              {stats.stats?.weekDailyHours && (
                <div className="profile-week-barchart" style={styles.weekBarChart}>
                  {stats.stats.weekDailyHours.map((h, i) => {
                    const maxH = Math.max(...stats.stats.weekDailyHours, 1);
                    const pct = (h / maxH) * 100;
                    return (
                      <div key={i} style={styles.weekBarWrapper} title={`${h.toFixed(1)}h`}>
                        <div
                          className="profile-week-bar"
                          style={{
                            ...styles.weekBar,
                            height: `${Math.max(pct, 4)}%`,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{...styles.statCard, ...mobileStyles.statCard}}>
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
              <div style={{...styles.statValue, ...mobileStyles.statValue}}>
                {formatDuration(stats.stats?.totalHours || 0)}
              </div>
            </div>

            <div style={{...styles.statCard, ...mobileStyles.statCard}}>
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
              <div style={{...styles.statValue, ...mobileStyles.statValue}}>{stats.stats?.workDays || 0}</div>
            </div>
          </div>

          <h3 style={{...styles.sectionTitle, ...mobileStyles.sectionTitle}}>{t("profile.additionalInformation")}</h3>
          <div style={{...styles.infoGrid, ...mobileStyles.infoGrid}}>
            <div style={{...styles.infoCard, ...mobileStyles.infoCard}}>
              <Calendar size={24} color="var(--primary-color)" />
              <div>
                <div style={styles.infoLabel}>{t("profile.joinedCompanyLabel")}</div>
                <div style={styles.infoValue}>
                  {stats.user?.joined_at
                    ? formatLocaleDate(stats.user.joined_at)
                    : t("common.notAvailable")}
                </div>
              </div>
            </div>

            <div style={{...styles.infoCard, ...mobileStyles.infoCard}}>
              <TrendingUp size={24} color="var(--primary-color)" />
              <div>
                <div style={styles.infoLabel}>{t("profile.avgHoursPerDayLabel")}</div>
                <div style={styles.infoValue}>
                  {formatDuration(stats.stats?.averageHoursPerDay || 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Activity History Heatmap */}
          <h3 style={{...styles.sectionTitle, ...mobileStyles.sectionTitle}}>
            {t("profile.activityHistory")}
          </h3>
          <div className="heatmap-card" style={styles.heatmapCard}>
            <ActivityHeatmap heatmap={stats.stats?.activityHeatmap || {}} />
          </div>
        </>
      ) : null}
    </div>
  );

  const renderSettingsTab = () => (
    <div style={{...styles.tabContent, ...mobileStyles.tabContent}}>
      {message.text && (
        <div
          style={{
            ...styles.message,
            backgroundColor: message.type === "success" ? "#d4edda" : "#f8d7da",
            color: message.type === "success" ? "#155724" : "#721c24",
          }}
        >
          {message.text}
        </div>
      )}

      {/* Avatar Upload */}
      <div style={{...styles.settingsSection, ...mobileStyles.settingsSection}}>
        <h3 style={{...styles.sectionTitle, ...mobileStyles.sectionTitle}}>Profile Picture</h3>
        <div style={{...styles.avatarUploadSection, ...mobileStyles.avatarUploadSection}}>
          <div style={{...styles.avatarMedium, ...mobileStyles.avatarMedium}}>
            {user?.avatar ? (
              <img src={user.avatar} alt="Profile" style={styles.avatarImage} />
            ) : (
              <div style={styles.avatarPlaceholder}>{getInitials()}</div>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarChange}
            accept="image/*"
            style={{ display: "none" }}
          />
          <div style={styles.avatarButtons}>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={styles.uploadButton}
              disabled={loading}
            >
              <Camera size={18} />
              {t("profile.uploadNewPicture")}
            </button>
            {user?.avatar && (
              <button
                onClick={handleAvatarRemove}
                style={styles.removeButton}
                disabled={loading}
              >
                <Trash2 size={18} />
                {t("profile.removeAvatar")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <form onSubmit={handleProfileUpdate} style={styles.settingsSection}>
        <h3 style={{...styles.sectionTitle, ...mobileStyles.sectionTitle}}>{t("profile.personalInformation")}</h3>
        <div style={{...styles.formGrid, ...mobileStyles.formGrid}}>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t("auth.firstName")}</label>
            <input
              type="text"
              value={profileData.first_name}
              onChange={(e) =>
                setProfileData({ ...profileData, first_name: e.target.value })
              }
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t("auth.lastName")}</label>
            <input
              type="text"
              value={profileData.last_name}
              onChange={(e) =>
                setProfileData({ ...profileData, last_name: e.target.value })
              }
              style={styles.input}
            />
          </div>
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>{t("auth.email")}</label>
          <input
            type="email"
            value={profileData.email}
            onChange={(e) =>
              setProfileData({ ...profileData, email: e.target.value })
            }
            style={styles.input}
          />
        </div>
        <button type="submit" style={styles.saveButton} disabled={loading}>
          <Save size={18} />
          {t("profile.saveChanges")}
        </button>
      </form>

      {/* Change Password */}
      <form onSubmit={handlePasswordChange} style={{...styles.settingsSection, ...mobileStyles.settingsSection}}>
        <h3 style={{...styles.sectionTitle, ...mobileStyles.sectionTitle}}>{t("profile.changePassword")}</h3>
        <div style={styles.formGroup}>
          <label style={styles.label}>{t("profile.currentPassword")}</label>
          <input
            type="password"
            value={passwordData.currentPassword}
            onChange={(e) =>
              setPasswordData({
                ...passwordData,
                currentPassword: e.target.value,
              })
            }
            style={{...styles.input, ...(isMobile ? {fontSize: "16px", minHeight: "44px", padding: "0.875rem 1rem"} : {})}}
          />
        </div>
        <div style={{...styles.formGrid, ...mobileStyles.formGrid}}>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t("profile.newPassword")}</label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  newPassword: e.target.value,
                })
              }
              style={{...styles.input, ...(isMobile ? {fontSize: "16px", minHeight: "44px", padding: "0.875rem 1rem"} : {})}}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t("profile.confirmPassword")}</label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  confirmPassword: e.target.value,
                })
              }
              style={{...styles.input, ...(isMobile ? {fontSize: "16px", minHeight: "44px", padding: "0.875rem 1rem"} : {})}}
            />
          </div>
        </div>
        <button type="submit" style={styles.saveButton} disabled={loading}>
          <Lock size={18} />
          {t("profile.updatePassword")}
        </button>
      </form>

      {/* Danger Zone */}
      {selectedCompany && !selectedCompany.is_owner && (
        <div style={{...styles.dangerZone, ...mobileStyles.dangerZone}}>
          <h3 style={{...styles.dangerZoneTitle, ...mobileStyles.dangerZoneTitle}}>{t("profile.dangerZone")}</h3>
          <p style={{...styles.dangerZoneDescription, ...mobileStyles.dangerZoneDescription}}>
            {t("profile.leaveCompanyWarning")}
          </p>
          <button
            onClick={() => setShowLeaveCompanyModal(true)}
            style={styles.dangerButton}
            disabled={loading}
          >
            <LogOut size={18} />
            {t("profile.leaveCompany")}
          </button>
        </div>
      )}
    </div>
  );


  const styles = {
    container: {
      padding: "clamp(1rem, 3vw, 2rem)",
      maxWidth: "1200px",
      margin: "0 auto",
    },
    backButton: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      padding: "0.75rem 1.5rem",
      backgroundColor: "transparent",
      color: "var(--text-primary)",
      border: "1px solid var(--border-color)",
      borderRadius: "0.5rem",
      fontSize: "0.9rem",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.3s ease",
      marginBottom: "1.5rem",
    },
    backButtonHover: {
      backgroundColor: "var(--bg-secondary)",
      borderColor: "var(--primary-color)",
      color: "var(--primary-color)",
    },
    header: {
      marginBottom: "2rem",
    },
    title: {
      fontSize: "clamp(1.5rem, 4vw, 2rem)",
      fontWeight: "700",
      color: "var(--text-primary)",
      marginBottom: "0.5rem",
    },
    subtitle: {
      fontSize: "clamp(0.875rem, 2vw, 1rem)",
      color: "var(--text-secondary)",
    },
    card: {
      backgroundColor: "var(--white)",
      borderRadius: "1rem",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
      overflow: "hidden",
    },
    tabs: {
      display: "flex",
      borderBottom: "2px solid var(--border-color)",
      padding: "0 1.5rem",
      gap: "0.5rem",
      overflowX: "auto",
    },
    tab: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      padding: "1rem 1.5rem",
      border: "none",
      background: "none",
      cursor: "pointer",
      fontSize: "0.9rem",
      fontWeight: "600",
      color: "var(--text-secondary)",
      borderBottom: "3px solid transparent",
      transition: "all 0.3s ease",
      whiteSpace: "nowrap",
    },
    tabActive: {
      color: "var(--primary-color)",
      borderBottom: "3px solid var(--primary-color)",
    },
    tabContent: {
      padding: "2rem",
    },
    profileHeader: {
      textAlign: "center",
      marginBottom: "2rem",
    },
    avatarSection: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "1rem",
    },
    avatarLarge: {
      width: "120px",
      height: "120px",
      borderRadius: "50%",
      overflow: "hidden",
      border: "4px solid var(--primary-color)",
      boxShadow: "0 4px 12px rgba(79, 70, 229, 0.2)",
    },
    avatarMedium: {
      width: "80px",
      height: "80px",
      borderRadius: "50%",
      overflow: "hidden",
      border: "3px solid var(--primary-color)",
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
      fontSize: "1.75rem",
      fontWeight: "700",
      color: "var(--text-primary)",
      margin: 0,
    },
    userEmail: {
      fontSize: "1rem",
      color: "var(--text-secondary)",
      margin: 0,
    },
    companyBadge: {
      display: "inline-block",
      padding: "0.5rem 1rem",
      backgroundColor: "rgba(79, 70, 229, 0.1)",
      color: "var(--primary-color)",
      borderRadius: "9999px",
      fontSize: "0.875rem",
      fontWeight: "600",
      marginTop: "0.5rem",
    },
    liveTimerContainer: {
      marginTop: "1rem",
      display: "flex",
      justifyContent: "center",
    },
    infoGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
      gap: "1rem",
      marginTop: "2rem",
    },
    infoCard: {
      display: "flex",
      alignItems: "center",
      gap: "1rem",
      padding: "1.5rem",
      backgroundColor: "var(--bg-secondary)",
      borderRadius: "0.75rem",
      border: "1px solid var(--border-color)",
    },
    infoLabel: {
      fontSize: "0.75rem",
      color: "var(--text-secondary)",
      textTransform: "uppercase",
      fontWeight: "600",
      letterSpacing: "0.5px",
    },
    infoValue: {
      fontSize: "1rem",
      color: "var(--text-primary)",
      fontWeight: "600",
      marginTop: "0.25rem",
    },
    settingsSection: {
      marginBottom: "2rem",
      paddingBottom: "2rem",
      borderBottom: "1px solid var(--border-color)",
    },
    avatarUploadSection: {
      display: "flex",
      alignItems: "center",
      gap: "1.5rem",
    },
    avatarButtons: {
      display: "flex",
      gap: "0.75rem",
      flexWrap: "wrap",
      justifyContent: "center",
    },
    uploadButton: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      padding: "0.75rem 1.5rem",
      backgroundColor: "var(--primary-color)",
      color: "white",
      border: "none",
      borderRadius: "0.5rem",
      fontSize: "0.9rem",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.3s ease",
    },
    removeButton: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      padding: "0.75rem 1.5rem",
      backgroundColor: "transparent",
      color: "#ef4444",
      border: "2px solid #ef4444",
      borderRadius: "0.5rem",
      fontSize: "0.9rem",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.3s ease",
    },
    formGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
      gap: "1rem",
    },
    formGroup: {
      marginBottom: "1.5rem",
    },
    label: {
      display: "block",
      fontSize: "0.875rem",
      fontWeight: "600",
      color: "var(--text-primary)",
      marginBottom: "0.5rem",
    },
    input: {
      width: "100%",
      padding: "0.75rem 1rem",
      border: "1px solid var(--border-color)",
      backgroundColor: "var(--white)",
      color: "var(--text-primary)",
      borderRadius: "0.5rem",
      fontSize: "0.9rem",
      transition: "all 0.3s ease",
      outline: "none",
      boxSizing: "border-box",
    },
    saveButton: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      padding: "0.75rem 2rem",
      backgroundColor: "var(--success-color)",
      color: "white",
      border: "none",
      borderRadius: "0.5rem",
      fontSize: "0.9rem",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.3s ease",
      marginTop: "1rem",
    },
    message: {
      padding: "1rem",
      borderRadius: "0.5rem",
      marginBottom: "1.5rem",
      fontSize: "0.9rem",
      fontWeight: "500",
    },
    emptyState: {
      textAlign: "center",
      padding: "4rem 2rem",
    },
    emptyTitle: {
      fontSize: "1.5rem",
      fontWeight: "700",
      color: "var(--text-primary)",
      marginTop: "1rem",
      marginBottom: "0.5rem",
    },
    emptyText: {
      fontSize: "1rem",
      color: "var(--text-secondary)",
      maxWidth: "500px",
      margin: "0 auto",
    },
    sectionTitle: {
      fontSize: "1.25rem",
      fontWeight: "700",
      color: "var(--text-primary)",
      marginTop: "2rem",
      marginBottom: "1rem",
    },
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "1rem",
      marginBottom: "2rem",
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
    weekBarChart: {
      display: "flex",
      alignItems: "flex-end",
      gap: "4px",
      height: 36,
      marginTop: "0.5rem",
    },
    weekBarWrapper: {
      flex: 1,
      height: "100%",
      display: "flex",
      alignItems: "flex-end",
      minWidth: 8,
    },
    weekBar: {
      width: "100%",
      minHeight: 4,
      backgroundColor: "#6366f1",
      borderRadius: 2,
      transition: "height 0.2s ease",
    },
    heatmapCard: {
      padding: "1.5rem",
      backgroundColor: "var(--white)",
      border: "1px solid var(--border-color)",
      borderRadius: "0.75rem",
      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    },
    loadingStats: {
      textAlign: "center",
      padding: "2rem",
      color: "var(--text-secondary)",
      fontSize: "1rem",
    },
    dangerZone: {
      marginTop: "3rem",
      padding: "1.5rem",
      backgroundColor: "rgba(239, 68, 68, 0.08)",
      border: "1px solid rgba(239, 68, 68, 0.35)",
      borderRadius: "0.75rem",
    },
    dangerZoneTitle: {
      fontSize: "1.25rem",
      fontWeight: "700",
      color: "#dc2626",
      marginBottom: "0.5rem",
    },
    dangerZoneDescription: {
      fontSize: "0.9rem",
      color: "var(--text-secondary)",
      marginBottom: "1rem",
      lineHeight: "1.6",
    },
    dangerButton: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      padding: "0.75rem 1.5rem",
      backgroundColor: "#dc2626",
      color: "white",
      border: "none",
      borderRadius: "0.5rem",
      fontSize: "0.9rem",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.3s ease",
    },
    modalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    },
    modal: {
      backgroundColor: "var(--white)",
      borderRadius: "1rem",
      padding: "2rem",
      maxWidth: "500px",
      width: "90%",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
    },
    modalTitle: {
      fontSize: "1.5rem",
      fontWeight: "700",
      color: "#dc2626",
      marginBottom: "1rem",
    },
    modalDescription: {
      fontSize: "1rem",
      color: "var(--text-primary)",
      marginBottom: "0.5rem",
      lineHeight: "1.6",
    },
    modalWarning: {
      fontSize: "0.9rem",
      color: "#991b1b",
      marginBottom: "1.5rem",
      fontWeight: "600",
    },
    modalFormGroup: {
      marginBottom: "1.5rem",
    },
    modalLabel: {
      display: "block",
      fontSize: "0.875rem",
      fontWeight: "600",
      color: "var(--text-primary)",
      marginBottom: "0.5rem",
    },
    modalInput: {
      width: "100%",
      padding: "0.75rem 1rem",
      border: "2px solid var(--border-color)",
      backgroundColor: "var(--white)",
      color: "var(--text-primary)",
      borderRadius: "0.5rem",
      fontSize: "0.9rem",
      transition: "all 0.3s ease",
      outline: "none",
      boxSizing: "border-box",
    },
    modalActions: {
      display: "flex",
      gap: "0.75rem",
      justifyContent: "flex-end",
    },
    modalCancelButton: {
      padding: "0.75rem 1.5rem",
      backgroundColor: "transparent",
      color: "var(--text-primary)",
      border: "1px solid var(--border-color)",
      borderRadius: "0.5rem",
      fontSize: "0.9rem",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.3s ease",
    },
    modalDangerButton: {
      padding: "0.75rem 1.5rem",
      backgroundColor: "#dc2626",
      color: "white",
      border: "none",
      borderRadius: "0.5rem",
      fontSize: "0.9rem",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.3s ease",
    },
    modalDangerButtonDisabled: {
      backgroundColor: "#fca5a5",
      cursor: "not-allowed",
      opacity: 0.6,
    },
  };

  return (
    <div style={{...styles.container, ...mobileStyles.container}}>
      <button
        onClick={() => navigate(-1)}
        onMouseEnter={() => setIsBackButtonHovered(true)}
        onMouseLeave={() => setIsBackButtonHovered(false)}
        style={{
          ...styles.backButton,
          ...(isBackButtonHovered && styles.backButtonHover),
        }}
      >
        <ArrowLeft size={20} />
        <span>{t("common.back")}</span>
      </button>

      <div style={styles.header}>
        <h1 style={styles.title}>{t("profile.title")}</h1>
        <p style={styles.subtitle}>
          {t("profile.personalInformation")}
        </p>
      </div>

      <div style={styles.card}>
        <div style={{...styles.tabs, ...mobileStyles.tabs}}>
          <button
            onClick={() => setActiveTab("profile")}
            style={{
              ...styles.tab,
              ...mobileStyles.tab,
              ...(activeTab === "profile" ? styles.tabActive : {}),
            }}
          >
            <User size={18} />
            {t("profile.profile")}
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            style={{
              ...styles.tab,
              ...mobileStyles.tab,
              ...(activeTab === "settings" ? styles.tabActive : {}),
            }}
          >
            <Settings size={18} />
            {t("profile.settings")}
          </button>
        </div>

        {activeTab === "profile" && renderProfileTab()}
        {activeTab === "settings" && renderSettingsTab()}
      </div>

      {/* Leave Company Modal */}
      {showLeaveCompanyModal && (
        <div style={styles.modalOverlay} onClick={() => setShowLeaveCompanyModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>{t("profile.leaveCompany")}</h3>
            <p style={styles.modalDescription}>
              {t("profile.leaveCompanyWarning")}
            </p>
            <p style={styles.modalWarning}>
              {t("profile.leaveCompanyWarning")}
            </p>
            <div style={styles.modalFormGroup}>
              <label style={styles.modalLabel}>
                {t("profile.leaveCompanyConfirm", { companyName: selectedCompany?.name })}
              </label>
              <input
                type="text"
                value={leaveCompanyConfirm}
                onChange={(e) => setLeaveCompanyConfirm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && leaveCompanyConfirm === selectedCompany?.name && !loading) {
                    handleLeaveCompany();
                  }
                }}
                placeholder={selectedCompany?.name}
                style={styles.modalInput}
                autoFocus
              />
            </div>
            <div style={styles.modalActions}>
              <button
                onClick={() => {
                  setShowLeaveCompanyModal(false);
                  setLeaveCompanyConfirm("");
                }}
                style={styles.modalCancelButton}
                disabled={loading}
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleLeaveCompany}
                style={{
                  ...styles.modalDangerButton,
                  ...((loading || leaveCompanyConfirm !== selectedCompany?.name) && styles.modalDangerButtonDisabled),
                }}
                disabled={loading || leaveCompanyConfirm !== selectedCompany?.name}
              >
                {loading ? t("profile.leaving") : t("profile.leaveCompany")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
