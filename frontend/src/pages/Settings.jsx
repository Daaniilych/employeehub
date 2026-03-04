import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Layout from "../components/Layout";
import { companyAPI } from "../services/api";
import {
  Settings as SettingsIcon,
  Building2,
  Save,
  Trash2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { t } from "../i18n";
import { formatLocaleDate } from "../utils/formatLocale";

const Settings = () => {
  const { selectedCompany, refreshCompanies, hasPermission, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState(selectedCompany?.name || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState({ text: "", isExpired: false, hasRemaining: false });

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      await companyAPI.update(selectedCompany.id, {
        name: companyName,
      });

      await refreshCompanies();
      setMessage({ type: "success", text: t("settings.settingsSaved") });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || t("settings.failedToSaveSettings"),
      });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleDeleteCompany = async () => {
    if (deleteConfirmation !== selectedCompany.name) {
      setMessage({
        type: "error",
        text: t("settings.companyNameMismatch"),
      });
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setDeleting(true);

    try {
      await companyAPI.delete(selectedCompany.id);
      await refreshCompanies();
      navigate("/company-setup");
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || t("settings.failedToDeleteCompany"),
      });
      setDeleting(false);
      setShowDeleteModal(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const refreshInviteCode = async () => {
    try {
      setRefreshing(true);
      await companyAPI.refreshInviteCode(selectedCompany.id);

      // Update selected company in context
      await refreshUser();

      setMessage({
        type: "success",
        text: t("settings.inviteCodeRefreshed"),
      });
    } catch (error) {
      console.error("Error refreshing invite code:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.error || t("settings.failedToRefreshInviteCode"),
      });
    } finally {
      setRefreshing(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const calculateTimeRemaining = (expiresAt) => {
    if (!expiresAt) return { text: t("common.noExpiration", "No expiration"), isExpired: false, hasRemaining: false };

    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry - now;

    if (diff <= 0) return { text: t("common.expired"), isExpired: true, hasRemaining: false };

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return { text: t("settings.timeRemainingHours", { hours, mins }), isExpired: false, hasRemaining: true };
    }
    return { text: t("settings.timeRemainingMinutes", { mins }), isExpired: false, hasRemaining: true };
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
        if (remaining.isExpired) {
          console.log("Invite code expired, auto-refreshing...");
          // Backend will auto-refresh on next request, so just refresh user data
          refreshUser();
        }
      };

      // Update immediately
      updateTime();

      // Update every second to catch expiration in real-time
      const interval = setInterval(updateTime, 1000);

      return () => clearInterval(interval);
    }
  }, [selectedCompany, refreshUser]);

  // Check if user has permission to view settings
  const canViewSettings =
    hasPermission("view_company_settings") ||
    hasPermission("edit_company_settings") ||
    hasPermission("manage_company");
  const canEditSettings =
    hasPermission("edit_company_settings") || hasPermission("manage_company");
  const canDeleteCompany = selectedCompany?.is_owner === 1; // Only owner can delete

  if (!canViewSettings) {
    return (
      <Layout>
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <SettingsIcon size={64} color="var(--gray)" />
          <h2 style={{ marginTop: "1rem" }}>{t("common.accessDenied")}</h2>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>
            {t("settings.noPermissionToViewSettings")}
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={styles.container}>
        <h1 style={styles.title}>{t("settings.title")}</h1>

        {!canEditSettings && (
          <div
            style={{
              ...styles.message,
              ...styles.infoMessage,
            }}
          >
            <span>ℹ️ {t("settings.readOnlyAccess")}</span>
          </div>
        )}

        {message && (
          <div
            style={{
              ...styles.message,
              ...(message.type === "success"
                ? styles.successMessage
                : styles.errorMessage),
            }}
          >
            <span>{message.text}</span>
          </div>
        )}

        {/* Company Information */}
        <div className="card">
          <div style={styles.sectionHeader}>
            <Building2 size={24} color="var(--primary-color)" />
            <h2 style={styles.sectionTitle}>{t("settings.companyInformation")}</h2>
          </div>

          <form onSubmit={handleSaveSettings} style={styles.form}>
            <div className="input-group">
              <label>{t("settings.companyName")}</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={t("settings.enterCompanyName")}
                required
                disabled={!canEditSettings}
              />
            </div>

            <div className="input-group">
              <label>{t("settings.inviteCode")}</label>
              <input
                type="text"
                value={selectedCompany.invite_code}
                readOnly
                disabled
                style={styles.readOnlyInput}
              />
              <div style={styles.inviteCodeActions}>
                <small
                  style={{
                    ...styles.hint,
                    ...(timeRemaining.isExpired
                      ? styles.expiredText
                      : timeRemaining.hasRemaining
                      ? styles.activeText
                      : {}),
                  }}
                >
                  {timeRemaining.text
                    ? `${timeRemaining.text} • ${t("settings.shareCodeWithMembers")}`
                    : t("settings.shareCodeDescription")}
                </small>
                {(selectedCompany.is_owner ||
                  hasPermission("refresh_invite_code")) && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={refreshInviteCode}
                    disabled={refreshing}
                  >
                    {refreshing ? t("settings.refreshing") : t("settings.refreshCode")}
                  </button>
                )}
              </div>
            </div>

            {canEditSettings && (
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                <Save size={20} />
                {saving ? t("settings.saving") : t("settings.saveChanges")}
              </button>
            )}
          </form>
        </div>

        {/* Company Stats */}
        <div className="card">
          <h2 style={styles.sectionTitle}>{t("settings.companyStatistics")}</h2>

          <div style={styles.statsGrid}>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>{t("settings.created")}</span>
              <span style={styles.statValue}>
                {formatLocaleDate(selectedCompany.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Danger Zone - Only for Company Owner */}
        {canDeleteCompany && (
          <div className="card" style={styles.dangerZone}>
            <div style={styles.sectionHeader}>
              <AlertTriangle size={24} color="var(--danger-color)" />
              <h2 style={styles.dangerTitle}>{t("settings.dangerZone")}</h2>
            </div>

            <div style={styles.dangerContent}>
              <div>
                <h3 style={styles.dangerSubtitle}>{t("settings.deleteCompany")}</h3>
                <p style={styles.dangerDescription}>
                  {t("settings.deleteCompanyDescription")}
                </p>
              </div>
              <button
                className="btn btn-danger"
                onClick={() => setShowDeleteModal(true)}
                style={styles.deleteButton}
              >
                <Trash2 size={20} />
                {t("settings.deleteCompany")}
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowDeleteModal(false)}
          >
            <div
              className="modal"
              onClick={(e) => e.stopPropagation()}
              style={styles.deleteModal}
            >
              <div className="modal-header">
                <div style={styles.modalIconWrapper}>
                  <AlertTriangle size={48} color="var(--danger-color)" />
                </div>
                <h2 style={styles.modalTitle}>{t("settings.deleteCompany")}</h2>
                <p style={styles.modalSubtitle}>
                  {t("settings.deleteCompanyWarning")}{" "}
                  <strong>{selectedCompany.name}</strong> {t("settings.andAllAssociatedData")}
                </p>
              </div>

              <div style={styles.modalBody}>
                <p style={styles.confirmText}>
                  {t("settings.typeToConfirm")} <strong>{selectedCompany.name}</strong> {t("settings.toConfirm")}
                </p>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder={t("settings.companyName")}
                  className="input-group"
                  style={styles.confirmInput}
                  autoFocus
                />

                <div style={styles.warningBox}>
                  <AlertTriangle size={20} />
                  <div>
                    <strong>{t("settings.warningThisWillDelete")}</strong>
                    <ul style={styles.warningList}>
                      <li>{t("settings.warningMembers")}</li>
                      <li>{t("settings.warningTimeLogs")}</li>
                      <li>{t("settings.warningReports")}</li>
                      <li>{t("settings.warningRoles")}</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmation("");
                  }}
                  disabled={deleting}
                >
                  {t("common.cancel")}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleDeleteCompany}
                  disabled={
                    deleting || deleteConfirmation !== selectedCompany.name
                  }
                  style={styles.confirmDeleteButton}
                >
                  <Trash2 size={20} />
                  {deleting ? t("settings.deleting") : t("settings.deleteCompany")}
                </button>
              </div>
            </div>
          </div>
        )}
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
  message: {
    padding: "1rem",
    borderRadius: "0.5rem",
    fontSize: "0.875rem",
    fontWeight: "500",
  },
  successMessage: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    color: "var(--success-color)",
  },
  errorMessage: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    color: "var(--danger-color)",
  },
  infoMessage: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    color: "var(--primary-color)",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "1.5rem",
  },
  sectionTitle: {
    fontSize: "1.5rem",
    fontWeight: "600",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  readOnlyInput: {
    backgroundColor: "var(--light-gray)",
    cursor: "not-allowed",
  },
  hint: {
    display: "block",
    marginTop: "0.25rem",
    fontSize: "0.875rem",
    color: "var(--gray)",
  },
  inviteCodeActions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
    marginTop: "0.5rem",
    flexWrap: "wrap",
  },
  expiredText: {
    color: "var(--danger-color)",
    fontWeight: "600",
  },
  activeText: {
    color: "var(--warning-color)",
    fontWeight: "500",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1.5rem",
  },
  statItem: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  statLabel: {
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
    fontWeight: "500",
  },
  statValue: {
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "var(--text-primary)",
  },
  dangerZone: {
    border: "2px solid var(--danger-color)",
    backgroundColor: "rgba(239, 68, 68, 0.02)",
  },
  dangerTitle: {
    fontSize: "1.5rem",
    fontWeight: "600",
    color: "var(--danger-color)",
  },
  dangerContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "2rem",
    flexWrap: "wrap",
  },
  dangerSubtitle: {
    fontSize: "1.125rem",
    fontWeight: "600",
    marginBottom: "0.5rem",
  },
  dangerDescription: {
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
    lineHeight: "1.6",
  },
  deleteButton: {
    whiteSpace: "nowrap",
    minWidth: "max-content",
  },
  deleteModal: {
    maxWidth: "600px",
  },
  modalIconWrapper: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "1rem",
  },
  modalTitle: {
    fontSize: "1.75rem",
    fontWeight: "700",
    marginBottom: "0.5rem",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: "1rem",
    color: "var(--text-secondary)",
    textAlign: "center",
    lineHeight: "1.6",
  },
  modalBody: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  confirmText: {
    fontSize: "0.875rem",
    marginBottom: "0.5rem",
  },
  confirmInput: {
    width: "100%",
    padding: "0.75rem",
    border: "2px solid var(--border-color)",
    borderRadius: "0.5rem",
    fontSize: "1rem",
  },
  warningBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
    padding: "1rem",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: "0.5rem",
    border: "1px solid var(--danger-color)",
    fontSize: "0.875rem",
  },
  warningList: {
    marginTop: "0.5rem",
    marginLeft: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  confirmDeleteButton: {
    minWidth: "150px",
  },
};

export default Settings;
