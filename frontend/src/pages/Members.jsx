import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import Layout from "../components/Layout";
import { companyAPI, roleAPI } from "../services/api";
import UserProfileModal from "../components/UserProfileModal";
import { t } from "../i18n";
import { getLocale } from "../utils/formatLocale";
import {
  Users,
  Mail,
  Calendar,
  Shield,
  Trash2,
  AlertCircle,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const Members = () => {
  const { selectedCompany, hasPermission } = useAuth();
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [profileMember, setProfileMember] = useState(null);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRoles, setExpandedRoles] = useState({});

  useEffect(() => {
    if (selectedCompany) {
      loadData();
    }
  }, [selectedCompany]);

  const loadData = async () => {
    try {
      // Members list should be available to every company member.
      const membersRes = await companyAPI.getMembers(selectedCompany.id);
      setMembers(membersRes.data.members || []);

      const canLoadRoles =
        hasPermission("manage_members") ||
        hasPermission("assign_roles") ||
        hasPermission("view_roles") ||
        hasPermission("manage_roles");

      if (canLoadRoles) {
        const rolesRes = await roleAPI.getRoles(selectedCompany.id);
        setRoles(rolesRes.data.roles || []);
      } else {
        setRoles([]);
      }
    } catch (error) {
      console.error("Error loading members:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedMember) return;

    try {
      await roleAPI.assignRole(
        selectedCompany.id,
        selectedMember.id,
        selectedRoleId || null
      );
      setShowRoleModal(false);
      setSelectedMember(null);
      setSelectedRoleId("");
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || t("members.failedToAssignRole", "Failed to assign role"));
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm(t("members.confirmRemoveMember", "Are you sure you want to remove this member?"))) return;

    try {
      await companyAPI.removeMember(selectedCompany.id, memberId);
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || t("members.failedToRemoveMember", "Failed to remove member"));
    }
  };

  const formatDate = (datetime) => {
    return new Date(datetime).toLocaleDateString(getLocale(), {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Filter members by search term
  const filteredMembers = members.filter((member) => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
    const email = member.email.toLowerCase();
    return fullName.includes(searchLower) || email.includes(searchLower);
  });

  // Group members by role
  const groupedMembers = filteredMembers.reduce((groups, member) => {
    const roleKey = member.role_id || "no_role";
    const roleName = member.role_name || t("members.noRoleAssigned");

    if (!groups[roleKey]) {
      groups[roleKey] = {
        roleName,
        roleId: member.role_id,
        hierarchyLevel: member.hierarchy_level || 0,
        members: [],
      };
    }
    groups[roleKey].members.push(member);
    return groups;
  }, {});

  // Sort groups by hierarchy level (highest first), then by role name
  const sortedGroups = Object.values(groupedMembers).sort((a, b) => {
    if (b.hierarchyLevel !== a.hierarchyLevel) {
      return b.hierarchyLevel - a.hierarchyLevel;
    }
    return a.roleName.localeCompare(b.roleName);
  });

  // Toggle role group expansion
  const toggleRoleGroup = (roleKey) => {
    setExpandedRoles((prev) => ({
      ...prev,
      [roleKey]: !prev[roleKey],
    }));
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
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>{t("members.title")}</h1>
            <p style={styles.subtitle}>
              {t("members.subtitle")}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div style={styles.searchContainer}>
          <Search size={20} style={styles.searchIcon} />
          <input
            type="text"
            placeholder={t("members.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              style={styles.clearButton}
              className="btn btn-outline"
            >
              {t("common.clear", "Clear")}
            </button>
          )}
        </div>

        {/* Statistics */}
        <div style={styles.stats}>
          <div style={styles.statItem}>
            <Users size={20} color="var(--primary-color)" />
            <span style={styles.statText}>
              <strong>{filteredMembers.length}</strong> {t("common.of")}{" "}
              <strong>{members.length}</strong> {t("members.members")}
            </span>
          </div>
          <div style={styles.statItem}>
            <Shield size={20} color="var(--secondary-color)" />
            <span style={styles.statText}>
              <strong>{sortedGroups.length}</strong>{" "}
              {sortedGroups.length === 1 ? t("members.role", "role") : t("members.roles")}
            </span>
          </div>
        </div>

        {/* Grouped Members */}
        {sortedGroups.length === 0 ? (
          <div className="card" style={styles.emptyState}>
            <AlertCircle size={48} color="var(--gray)" />
            <h3>{t("members.noMembers")}</h3>
            <p style={{ color: "var(--text-secondary)" }}>
              {t("members.tryAdjustingSearch", "Try adjusting your search criteria")}
            </p>
          </div>
        ) : (
          <div style={styles.roleGroupsLayout}>
            {sortedGroups.map((group) => {
              const roleKey = group.roleId || "no_role";
              const isExpanded = expandedRoles[roleKey] !== false; // Default to expanded
              const isSingleMemberGroup = group.members.length === 1;

              return (
                <div
                  key={roleKey}
                  className="card"
                  style={{
                    ...styles.roleGroup,
                    ...(isSingleMemberGroup
                      ? styles.roleGroupSingle
                      : styles.roleGroupMulti),
                  }}
                >
                  {/* Role Group Header */}
                  <div
                    style={styles.roleGroupHeader}
                    onClick={() => toggleRoleGroup(roleKey)}
                    data-role-group-header
                  >
                    <div style={styles.roleGroupTitle}>
                      <Shield
                        size={24}
                        color={
                          group.hierarchyLevel >= 8
                            ? "var(--danger-color)"
                            : group.hierarchyLevel >= 5
                            ? "var(--primary-color)"
                            : "var(--secondary-color)"
                        }
                      />
                      <div>
                        <h3 style={styles.roleName}>{group.roleName}</h3>
                        {group.hierarchyLevel > 0 && (
                          <span style={styles.roleLevel}>
                            {t("members.level", { level: group.hierarchyLevel })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={styles.roleGroupActions}>
                      <span className="badge badge-primary">
                        {group.members.length}{" "}
                        {group.members.length === 1
                          ? t("members.member")
                          : t("members.members", "members")}
                      </span>
                      {isExpanded ? (
                        <ChevronUp size={24} color="var(--text-secondary)" />
                      ) : (
                        <ChevronDown size={24} color="var(--text-secondary)" />
                      )}
                    </div>
                  </div>

                  {/* Role Group Members */}
                  {isExpanded && (
                    <div
                      style={{
                        ...styles.membersGrid,
                        ...(isSingleMemberGroup && styles.membersGridSingle),
                      }}
                    >
                      {group.members.map((member) => (
                        <div
                          key={member.id}
                          className="card"
                          style={styles.memberCard}
                        >
                          <div
                            style={styles.memberHeader}
                            onClick={() => {
                              setProfileMember(member);
                              setShowProfileModal(true);
                            }}
                            title="Click to view profile"
                          >
                            <div style={styles.avatar}>
                              {member.avatar ? (
                                <img
                                  src={member.avatar}
                                  alt={`${member.first_name} ${member.last_name}`}
                                  style={styles.avatarImage}
                                />
                              ) : (
                                <>
                                  {member.first_name[0]}
                                  {member.last_name[0]}
                                </>
                              )}
                            </div>
                            <div style={styles.memberInfo}>
                              <h3 style={styles.memberName}>
                                {member.first_name} {member.last_name}
                                {member.is_owner === 1 && (
                                  <span
                                    className="badge badge-primary"
                                    style={{ marginLeft: "0.5rem" }}
                                  >
                                    {t("members.owner", "Owner")}
                                  </span>
                                )}
                              </h3>
                              <div style={styles.memberEmail}>
                                <Mail size={14} />
                                <span>{member.email}</span>
                              </div>
                            </div>
                          </div>

                          <div style={styles.memberDetails}>
                            <div style={styles.detailRow}>
                              <Calendar size={16} color="var(--gray)" />
                              <span style={styles.detailText}>
                                {t("members.joined", {
                                  date: formatDate(member.joined_at),
                                })}
                              </span>
                            </div>

                            <div style={styles.detailRow}>
                              <Shield size={16} color="var(--gray)" />
                              <span style={styles.detailText}>
                                {member.role_name || t("members.noRoleAssigned")}
                              </span>
                            </div>
                          </div>

                          {(hasPermission("manage_members") ||
                            hasPermission("assign_roles") ||
                            hasPermission("remove_members")) &&
                            member.is_owner !== 1 && (
                              <div style={styles.memberActions}>
                                {(hasPermission("manage_members") ||
                                  hasPermission("assign_roles")) && (
                                  <button
                                    className="btn btn-outline"
                                    onClick={() => {
                                      setSelectedMember(member);
                                      setSelectedRoleId(member.role_id || "");
                                      setShowRoleModal(true);
                                    }}
                                    style={styles.actionButton}
                                  >
                                    <Shield size={16} />
                                    {t("members.assignRole")}
                                  </button>
                                )}
                                {(hasPermission("manage_members") ||
                                  hasPermission("remove_members")) && (
                                  <button
                                    className="btn btn-danger"
                                    onClick={() => handleRemoveMember(member.id)}
                                    style={styles.actionButton}
                                  >
                                    <Trash2 size={16} />
                                    {t("members.remove")}
                                  </button>
                                )}
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Role Assignment Modal */}
        {showRoleModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowRoleModal(false)}
          >
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{t("members.assignRole")}</h2>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.875rem",
                  }}
                >
                  {t("members.assignRoleTo", { firstName: selectedMember?.first_name, lastName: selectedMember?.last_name })}
                </p>
              </div>

              <div className="input-group">
                <label>{t("members.selectRole", "Select Role")}</label>
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                >
                  <option value="">{t("members.noRole", "No role")}</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline"
                  onClick={() => setShowRoleModal(false)}
                >
                  {t("common.cancel")}
                </button>
                <button className="btn btn-primary" onClick={handleAssignRole}>
                  {t("members.assignRole")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Profile Modal */}
        {showProfileModal && profileMember && (
          <UserProfileModal
            user={profileMember}
            companyId={selectedCompany.id}
            onClose={() => {
              setShowProfileModal(false);
              setProfileMember(null);
            }}
          />
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
  },
  title: {
    fontSize: "2rem",
    fontWeight: "700",
  },
  subtitle: {
    color: "var(--text-secondary)",
    fontSize: "1rem",
    marginTop: "0.5rem",
  },
  searchContainer: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    padding: "1rem",
    backgroundColor: "var(--white)",
    borderRadius: "0.75rem",
    border: "1px solid var(--border-color)",
  },
  searchIcon: {
    color: "var(--text-secondary)",
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: "1rem",
    color: "var(--text-primary)",
    backgroundColor: "transparent",
  },
  clearButton: {
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    whiteSpace: "nowrap",
  },
  stats: {
    display: "flex",
    gap: "1.5rem",
    flexWrap: "wrap",
  },
  statItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  statText: {
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "3rem",
    gap: "1rem",
    textAlign: "center",
  },
  roleGroupsLayout: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
    gap: "1.25rem",
    alignItems: "start",
  },
  roleGroup: {
    padding: 0,
    overflow: "hidden",
  },
  roleGroupSingle: {
    gridColumn: "auto",
  },
  roleGroupMulti: {
    gridColumn: "1 / -1",
  },
  roleGroupHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1.5rem",
    cursor: "pointer",
    transition: "background-color 0.2s",
    borderBottom: "1px solid var(--border-color)",
  },
  roleGroupTitle: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  roleName: {
    fontSize: "1.25rem",
    fontWeight: "600",
    marginBottom: "0.25rem",
  },
  roleLevel: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    fontWeight: "500",
  },
  roleGroupActions: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  membersGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
    gap: "1rem",
    padding: "1.5rem",
  },
  membersGridSingle: {
    gridTemplateColumns: "1fr",
    padding: "1rem",
  },
  memberCard: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  memberHeader: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    cursor: "pointer",
    transition: "opacity 0.2s ease",
  },
  avatar: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    backgroundColor: "var(--primary-color)",
    color: "var(--white)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.25rem",
    fontWeight: "600",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: "1.125rem",
    fontWeight: "600",
    marginBottom: "0.25rem",
    display: "flex",
    alignItems: "center",
  },
  memberEmail: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    color: "var(--text-secondary)",
    fontSize: "0.875rem",
  },
  memberDetails: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    padding: "1rem",
    backgroundColor: "var(--light-gray)",
    borderRadius: "0.5rem",
  },
  detailRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  detailText: {
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
  },
  memberActions: {
    display: "flex",
    gap: "0.5rem",
  },
  actionButton: {
    flex: 1,
    fontSize: "0.875rem",
    padding: "0.5rem 0.75rem",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    objectFit: "cover",
  },
};

export default Members;
