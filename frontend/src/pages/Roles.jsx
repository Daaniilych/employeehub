import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import Layout from "../components/Layout";
import { roleAPI } from "../services/api";
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Clock,
  Search,
  Download,
  LogIn,
  LogOut,
  Scan,
  FileText,
  Users,
  UserPlus,
  UserMinus,
  UserCheck,
  Eye,
  Settings,
  RefreshCw,
  Building2,
  KeyRound,
} from "lucide-react";
import {
  getPermissionsByCategory,
  getPermissionByKey,
} from "../utils/permissions";
import { t } from "../i18n";

const Roles = () => {
  const { selectedCompany, hasPermission } = useAuth();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    permissions: {},
    hierarchyLevel: 5,
  });
  const [expandedCategories, setExpandedCategories] = useState({});
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  // Get permissions grouped by category
  const permissionsByCategory = getPermissionsByCategory();

  useEffect(() => {
    if (selectedCompany) {
      loadRoles();
    }
  }, [selectedCompany]);

  const loadRoles = async () => {
    try {
      const response = await roleAPI.getRoles(selectedCompany.id);
      setRoles(response.data.roles);
    } catch (error) {
      console.error("Error loading roles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (role = null) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        permissions: role.permissions || {},
        hierarchyLevel: role.hierarchy_level || 5,
      });
    } else {
      setEditingRole(null);
      setFormData({
        name: "",
        permissions: {},
        hierarchyLevel: 5,
      });
    }
    // Keep categories collapsed by default for a cleaner UI
    const allCategories = Object.keys(permissionsByCategory);
    const expanded = {};
    allCategories.forEach((cat) => {
      expanded[cat] = false;
    });
    if (allCategories.length > 0) {
      expanded[allCategories[0]] = true;
    }
    setExpandedCategories(expanded);
    setShowSelectedOnly(false);
    setShowModal(true);
  };

  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const getSelectedCountInCategory = (permissions) => {
    return permissions.filter((p) => formData.permissions[p.key] === true)
      .length;
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRole(null);
    setFormData({ name: "", permissions: {}, hierarchyLevel: 5 });
    setExpandedCategories({});
    setShowSelectedOnly(false);
  };

  const handlePermissionToggle = (permissionKey) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [permissionKey]: !formData.permissions[permissionKey],
      },
    });
  };

  const getPermissionIcon = (permissionKey) => {
    const iconMap = {
      view_all_timelogs: Eye,
      view_employee_filters: Search,
      scan_others: Scan,
      use_scanner_terminal: Scan,
      view_reports: FileText,
      create_reports: FileText,
      remove_members: UserMinus,
      assign_roles: UserCheck,
      manage_members: Users,
      view_roles: Shield,
      create_roles: Shield,
      edit_roles: Shield,
      delete_roles: Shield,
      manage_roles: Shield,
      view_company_settings: Settings,
      edit_company_settings: Settings,
      view_invite_code: KeyRound,
      refresh_invite_code: RefreshCw,
      manage_company: Building2,
    };

    return iconMap[permissionKey] || KeyRound;
  };

  const setAllCategoriesExpanded = (expanded) => {
    const allCategories = Object.keys(permissionsByCategory);
    const next = {};
    allCategories.forEach((cat) => {
      next[cat] = expanded;
    });
    setExpandedCategories(next);
  };

  const toggleAllInCategory = (permissions, enabled) => {
    const nextPermissions = { ...formData.permissions };
    permissions.forEach((permission) => {
      nextPermissions[permission.key] = enabled;
    });
    setFormData({
      ...formData,
      permissions: nextPermissions,
    });
  };

  // Format permission name for display
  const formatPermissionName = (permissionKey) => {
    const permission = getPermissionByKey(permissionKey);
    if (permission) {
      // Try to get translation, fallback to label
      const translationKey = `roles.${permissionKey}`;
      const translated = t(translationKey);
      return translated !== translationKey ? translated : permission.label;
    }
    return permissionKey.replace(/_/g, " ");
  };

  // Translate category name
  const translateCategory = (category) => {
    const categoryMap = {
      "Time Tracking": t("roles.timeTracking"),
      "Reports": t("reports.title"),
      "Members": t("members.title"),
      "Roles": t("roles.title"),
      "Company Settings": t("settings.title"),
    };
    return categoryMap[category] || category;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingRole) {
        await roleAPI.update(selectedCompany.id, editingRole.id, formData);
      } else {
        await roleAPI.create(selectedCompany.id, formData);
      }

      handleCloseModal();
      loadRoles();
    } catch (error) {
      alert(error.response?.data?.error || t("roles.failedToSaveRole", "Failed to save role"));
    }
  };

  const handleDelete = async (roleId) => {
    if (!confirm(t("roles.confirmDeleteRole", "Are you sure you want to delete this role?"))) return;

    try {
      await roleAPI.delete(selectedCompany.id, roleId);
      loadRoles();
    } catch (error) {
      alert(error.response?.data?.error || t("roles.failedToDeleteRole", "Failed to delete role"));
    }
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

  // Granular role permissions
  const canViewRoles =
    hasPermission("view_roles") ||
    hasPermission("create_roles") ||
    hasPermission("edit_roles") ||
    hasPermission("delete_roles") ||
    hasPermission("manage_roles");
  const canCreateRoles =
    hasPermission("create_roles") || hasPermission("manage_roles");
  const canEditRoles =
    hasPermission("edit_roles") || hasPermission("manage_roles");
  const canDeleteRoles =
    hasPermission("delete_roles") || hasPermission("manage_roles");

  if (!canViewRoles) {
    return (
      <Layout>
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <Shield size={64} color="var(--gray)" />
          <h2 style={{ marginTop: "1rem" }}>{t("common.accessDenied", "Access Denied")}</h2>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>
            {t("roles.noPermissionToViewRoles", "You don't have permission to view roles")}
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>{t("roles.rolesAndPermissions")}</h1>
            <p style={styles.subtitle}>
              {canCreateRoles || canEditRoles || canDeleteRoles
                ? t("roles.subtitle")
                : t("roles.viewRoles", "View roles and their permissions")}
            </p>
          </div>
          {canCreateRoles && (
            <button
              className="btn btn-primary"
              onClick={() => handleOpenModal()}
            >
              <Plus size={20} />
              {t("roles.createRole")}
            </button>
          )}
        </div>

        {/* Roles Grid */}
        <div style={styles.rolesGrid}>
          {roles.map((role) => (
            <div key={role.id} className="card" style={styles.roleCard}>
              <div style={styles.roleHeader}>
                <div style={styles.roleIcon}>
                  <Shield size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={styles.roleName}>{role.name}</h3>
                  <span
                    style={styles.hierarchyBadge(role.hierarchy_level || 5)}
                    className="role-level-badge"
                  >
                    {t("members.level", { level: role.hierarchy_level || 5 })}
                  </span>
                </div>
              </div>

              <div style={styles.permissionsSection}>
                <p style={styles.permissionsLabel}>
                  {t("roles.permissions")} (
                  {
                    Object.entries(role.permissions || {}).filter(
                      ([key, value]) => value === true
                    ).length
                  }
                  ):
                </p>
                <div
                  style={styles.permissionsList}
                  className="roles-permissions-list-scroll"
                >
                  {Object.keys(role.permissions || {}).filter(
                    (key) => role.permissions[key]
                  ).length === 0 ? (
                    <span style={styles.noPermissions}>
                      {t("roles.noPermissionsAssigned", "No permissions assigned")}
                    </span>
                  ) : (
                    Object.entries(role.permissions || {})
                      .filter(([key, value]) => value === true)
                      .map(([key]) => (
                        <span key={key} className="badge badge-primary">
                          {formatPermissionName(key)}
                        </span>
                      ))
                  )}
                </div>
              </div>

              {(canEditRoles || canDeleteRoles) && (
                <div style={styles.roleActions}>
                  {canEditRoles && (
                    <button
                      className="btn btn-outline"
                      onClick={() => handleOpenModal(role)}
                      style={styles.actionButton}
                    >
                      <Edit size={16} />
                      {t("common.edit")}
                    </button>
                  )}
                  {canDeleteRoles && (
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(role.id)}
                      style={styles.actionButton}
                    >
                      <Trash2 size={16} />
                      {t("common.delete")}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Create/Edit Role Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <div
              className="modal"
              onClick={(e) => e.stopPropagation()}
              style={styles.modal}
            >
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h2>{editingRole ? t("roles.editRole") : t("roles.createNewRole")}</h2>
                </div>

                <div className="input-group">
                  <label>{t("roles.roleName")}</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder={t("roles.enterRoleName")}
                    required
                  />
                </div>

                <div className="input-group">
                  <div style={styles.hierarchySection}>
                    <div style={styles.hierarchyHeader}>
                      <label style={styles.hierarchyLabel}>
                        {t("roles.hierarchyLevel")}
                      </label>
                      <div style={styles.levelDisplay}>
                        <span style={styles.levelNumber}>
                          {formData.hierarchyLevel}
                        </span>
                        <span style={styles.levelMax}>/ 10</span>
                      </div>
                    </div>

                    <div style={styles.sliderWrapper}>
                      <div style={styles.levelNumbers}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                hierarchyLevel: level,
                              })
                            }
                            style={{
                              ...styles.levelButton,
                              ...(formData.hierarchyLevel === level
                                ? styles.levelButtonActive
                                : {}),
                              ...(formData.hierarchyLevel >= level
                                ? styles.levelButtonFilled
                                : {}),
                            }}
                            className="roles-level-button"
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={formData.hierarchyLevel}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            hierarchyLevel: parseInt(e.target.value),
                          })
                        }
                        style={styles.slider}
                      />
                    </div>

                    <p style={styles.hierarchyHint}>
                      {t("roles.hierarchyDescription")}
                    </p>
                  </div>
                </div>

                <div className="input-group">
                  <label>{t("roles.permissions")}</label>
                  <p style={styles.permissionsHint}>
                    {t("roles.selectPermissions")}
                  </p>
                  <div style={styles.permissionsQuickActions}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={styles.quickActionButton}
                      onClick={() => setAllCategoriesExpanded(true)}
                    >
                      {t("roles.expandAll")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={styles.quickActionButton}
                      onClick={() => setAllCategoriesExpanded(false)}
                    >
                      {t("roles.collapseAll")}
                    </button>
                    <label style={styles.showSelectedOnlyLabel}>
                      <input
                        type="checkbox"
                        checked={showSelectedOnly}
                        onChange={(e) => setShowSelectedOnly(e.target.checked)}
                        style={styles.checkbox}
                      />
                      <span>{t("roles.showSelectedOnly")}</span>
                    </label>
                  </div>
                  <div
                    style={styles.permissionsCategoriesContainer}
                    className="permissions-scrollable"
                  >
                    {Object.entries(permissionsByCategory).map(
                      ([category, permissions]) => {
                        const visiblePermissions = showSelectedOnly
                          ? permissions.filter(
                              (permission) =>
                                formData.permissions[permission.key] === true
                            )
                          : permissions;
                        const isExpanded =
                          expandedCategories[category] === true;
                        const selectedCount = getSelectedCountInCategory(permissions);

                        return (
                          <div key={category} style={styles.permissionCategory}>
                            <div
                              style={{
                                ...styles.categoryHeader,
                                ...(isExpanded
                                  ? styles.categoryHeaderExpanded
                                  : {}),
                              }}
                              onClick={() => toggleCategory(category)}
                              data-category-header
                            >
                              <div style={styles.categoryTitleWrapper}>
                                <h4 style={styles.categoryTitle}>{translateCategory(category)}</h4>
                                <span style={styles.categoryCount}>
                                  {selectedCount} / {permissions.length}
                                </span>
                              </div>
                            </div>
                            {isExpanded && (
                              <div style={styles.permissionsCheckboxes}>
                                <div style={styles.categoryQuickActions}>
                                  <button
                                    type="button"
                                    className="btn btn-outline"
                                    style={styles.categoryActionButton}
                                    onClick={() =>
                                      toggleAllInCategory(permissions, true)
                                    }
                                  >
                                    {t("roles.selectAllInCategory")}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-outline"
                                    style={styles.categoryActionButton}
                                    onClick={() =>
                                      toggleAllInCategory(permissions, false)
                                    }
                                  >
                                    {t("common.clear")}
                                  </button>
                                </div>
                                {visiblePermissions.length === 0 ? (
                                  <div style={styles.noPermissions}>
                                    {t("roles.noPermissionsAssigned")}
                                  </div>
                                ) : (
                                  visiblePermissions.map((permission) => {
                                    const PermissionIcon = getPermissionIcon(
                                      permission.key
                                    );
                                    return (
                                  <label
                                    key={permission.key}
                                    style={styles.checkboxLabel}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={
                                        formData.permissions[permission.key] ===
                                        true
                                      }
                                      onChange={() =>
                                        handlePermissionToggle(permission.key)
                                      }
                                      style={styles.checkbox}
                                    />
                                    <div style={styles.permissionInfo}>
                                      <div style={styles.permissionLabelRow}>
                                        <span style={styles.permissionIcon}>
                                          <PermissionIcon
                                            size={15}
                                            style={styles.permissionIconSvg}
                                          />
                                        </span>
                                        <span style={styles.permissionLabel}>
                                          {formatPermissionName(permission.key)}
                                        </span>
                                      </div>
                                      <span
                                        style={styles.permissionDescription}
                                      >
                                        {t(`roles.${permission.key}Description`, permission.description)}
                                      </span>
                                    </div>
                                  </label>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleCloseModal}
                  >
                    {t("common.cancel")}
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingRole ? t("roles.updateRole", "Update Role") : t("roles.createRole")}
                  </button>
                </div>
              </form>
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
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "1rem",
    backgroundColor: "transparent",
    padding: 0,
    margin: 0,
  },
  title: {
    fontSize: "2rem",
    fontWeight: "700",
    color: "var(--text-primary)",
    backgroundColor: "transparent",
    margin: 0,
    padding: 0,
  },
  subtitle: {
    color: "var(--text-secondary)",
    fontSize: "1rem",
    marginTop: "0.5rem",
    backgroundColor: "transparent",
    marginBottom: 0,
    padding: 0,
  },
  rolesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
    gap: "1rem",
  },
  roleCard: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  roleHeader: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  roleIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "0.75rem",
    backgroundColor: "rgba(79, 70, 229, 0.1)",
    color: "var(--primary-color)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  roleName: {
    fontSize: "1.25rem",
    fontWeight: "600",
  },
  permissionsSection: {
    padding: "1rem",
    backgroundColor: "var(--light-gray)",
    borderRadius: "0.5rem",
    position: "relative",
  },
  permissionsLabel: {
    fontSize: "0.875rem",
    fontWeight: "600",
    marginBottom: "0.75rem",
    color: "var(--text-secondary)",
  },
  permissionsList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    maxHeight: "120px",
    overflowY: "auto",
    paddingRight: "0.5rem",
  },
  noPermissions: {
    fontSize: "0.875rem",
    color: "var(--gray)",
    fontStyle: "italic",
  },
  roleActions: {
    display: "flex",
    gap: "0.5rem",
  },
  actionButton: {
    flex: 1,
    fontSize: "0.875rem",
    padding: "0.5rem 0.75rem",
  },
  modal: {
    maxWidth: "800px",
    maxHeight: "90vh",
  },
  permissionsHint: {
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
    marginTop: "0.25rem",
    marginBottom: "1rem",
  },
  permissionsQuickActions: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "1rem",
    flexWrap: "wrap",
  },
  quickActionButton: {
    padding: "0.4rem 0.75rem",
    fontSize: "0.8125rem",
  },
  showSelectedOnlyLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    color: "var(--text-secondary)",
    fontSize: "0.875rem",
    cursor: "pointer",
  },
  permissionsCategoriesContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "0",
    padding: "0",
    backgroundColor: "transparent",
  },
  permissionCategory: {
    border: "2px solid #dee2e6",
    borderRadius: "0.75rem",
    overflow: "hidden",
    marginBottom: "1.5rem",
    backgroundColor: "var(--white)",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    width: "100%",
    display: "flex",
    flexDirection: "column",
  },
  categoryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 1.5rem",
    cursor: "pointer",
    backgroundColor: "var(--light-gray)",
    transition: "all 0.2s ease",
    userSelect: "none",
    borderBottom: "1px solid transparent",
    minHeight: "70px",
    position: "relative",
    borderRadius: "0.75rem 0.75rem 0 0",
  },
  categoryHeaderExpanded: {
    borderBottom: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-secondary)",
  },
  categoryTitleWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    flex: 1,
  },
  categoryTitle: {
    fontSize: "1.125rem",
    fontWeight: "700",
    color: "var(--primary-color)",
    margin: 0,
    lineHeight: "1.5",
  },
  categoryCount: {
    fontSize: "0.875rem",
    color: "var(--primary-color)",
    fontWeight: "700",
    padding: "0.4rem 0.8rem",
    backgroundColor: "rgba(79, 70, 229, 0.1)",
    borderRadius: "16px",
    minWidth: "60px",
    textAlign: "center",
    border: "1.5px solid var(--primary-color)",
  },
  permissionsCheckboxes: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    padding: "1.5rem",
    backgroundColor: "var(--white)",
    width: "100%",
    boxSizing: "border-box",
    maxHeight: "360px",
    overflowY: "auto",
  },
  categoryQuickActions: {
    display: "flex",
    gap: "0.5rem",
    marginBottom: "0.25rem",
    flexWrap: "wrap",
  },
  categoryActionButton: {
    padding: "0.35rem 0.6rem",
    fontSize: "0.8rem",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
    cursor: "pointer",
    padding: "0.75rem",
    borderRadius: "0.5rem",
    backgroundColor: "var(--white)",
    border: "1px solid var(--border-color)",
    transition: "all 0.2s",
  },
  checkbox: {
    width: "18px",
    height: "18px",
    cursor: "pointer",
    marginTop: "0.25rem",
    flexShrink: 0,
  },
  permissionInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    flex: 1,
  },
  permissionLabelRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  permissionIcon: {
    width: "24px",
    height: "24px",
    borderRadius: "0.4rem",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(79, 70, 229, 0.12)",
    color: "var(--primary-color)",
    flexShrink: 0,
  },
  permissionIconSvg: {
    position: "static",
    transform: "none",
    margin: 0,
    color: "inherit",
    display: "block",
  },
  permissionLabel: {
    fontSize: "0.9375rem",
    fontWeight: "500",
    color: "var(--text-primary)",
  },
  permissionDescription: {
    fontSize: "0.8125rem",
    color: "var(--text-secondary)",
    lineHeight: "1.4",
  },
  hierarchySection: {
    width: "100%",
  },
  hierarchyHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "1.5rem",
  },
  hierarchyLabel: {
    fontSize: "1rem",
    fontWeight: "600",
    color: "var(--text-primary)",
  },
  levelDisplay: {
    display: "flex",
    alignItems: "baseline",
    gap: "0.25rem",
  },
  levelNumber: {
    fontSize: "2rem",
    fontWeight: "700",
    color: "var(--primary-color)",
    lineHeight: "1",
  },
  levelMax: {
    fontSize: "1rem",
    fontWeight: "500",
    color: "var(--text-secondary)",
  },
  hierarchyBadge: (level) => ({
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
    color: "var(--white)",
    borderRadius: "1rem",
    fontSize: "0.8125rem",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    boxShadow: `0 2px 8px ${
      level >= 11
        ? "rgba(234, 179, 8, 0.5)"
        : level >= 9
        ? "rgba(220, 38, 38, 0.3)"
        : level >= 7
        ? "rgba(245, 158, 11, 0.3)"
        : level >= 5
        ? "rgba(16, 185, 129, 0.3)"
        : level >= 3
        ? "rgba(59, 130, 246, 0.3)"
        : "rgba(107, 114, 128, 0.3)"
    }`,
    transition: "all 0.3s ease",
  }),
  hierarchyHint: {
    fontSize: "0.8125rem",
    color: "var(--text-secondary)",
    marginTop: "1rem",
    textAlign: "center",
  },
  sliderWrapper: {
    position: "relative",
    marginBottom: "1rem",
  },
  levelNumbers: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "0.75rem",
    gap: "0.25rem",
  },
  levelButton: {
    flex: 1,
    height: "40px",
    border: "2px solid var(--border-color)",
    backgroundColor: "var(--white)",
    borderRadius: "0.5rem",
    fontSize: "0.875rem",
    fontWeight: "600",
    color: "var(--text-secondary)",
    cursor: "pointer",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  levelButtonFilled: {
    borderColor: "var(--primary-color)",
    backgroundColor: "rgba(79, 70, 229, 0.05)",
    color: "var(--primary-color)",
  },
  levelButtonActive: {
    borderColor: "var(--primary-color)",
    backgroundColor: "var(--primary-color)",
    color: "var(--white)",
    transform: "scale(1.1)",
    boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)",
    zIndex: 1,
  },
  slider: {
    width: "100%",
    height: "6px",
    borderRadius: "3px",
    backgroundColor: "var(--border-color)",
    outline: "none",
    cursor: "pointer",
    appearance: "none",
    WebkitAppearance: "none",
  },
};

export default Roles;
