import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { t } from "../i18n";
import {
  LayoutDashboard,
  Clock,
  FileText,
  Users,
  Shield,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
  Menu,
  X,
  User,
  QrCode,
  Scan,
  Globe,
} from "lucide-react";
import QRCodeModal from "./QRCodeModal";
import { useIsMobile } from "../hooks/useIsMobile";

const Navbar = () => {
  const {
    user,
    logout,
    selectedCompany,
    companies,
    selectCompany,
    hasPermission,
    isOwner,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileProfileMenu, setShowMobileProfileMenu] = useState(false);
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  // Use compact navigation earlier to avoid overflow on split-screen/tablets.
  const isMobile = useIsMobile(1100);
  const [language, setLanguage] = useState(localStorage.getItem("preferences_language") || "en");
  const profileMenuRef = useRef(null);
  const mobileProfileMenuRef = useRef(null);

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      setLanguage(localStorage.getItem("preferences_language") || "en");
    };
    window.addEventListener("languagechange", handleLanguageChange);
    return () => window.removeEventListener("languagechange", handleLanguageChange);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setShowMobileMenu(false);
    }
  }, [isMobile]);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setShowProfileMenu(false);
      }
      if (
        mobileProfileMenuRef.current &&
        !mobileProfileMenuRef.current.contains(event.target)
      ) {
        setShowMobileProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const getInitials = () => {
    const firstName = user?.firstName || "";
    const lastName = user?.lastName || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // All possible navigation items
  const allNavItems = [
    {
      path: "/dashboard",
      label: t("dashboard.title"),
      icon: LayoutDashboard,
      alwaysShow: true, // Dashboard always visible
    },
    {
      path: "/time-tracking",
      label: t("timeTracking.title"),
      icon: Clock,
      alwaysShow: true, // Time tracking is available to all company users
    },
    {
      path: "/scanner-terminal",
      label: t("scannerTerminal.title"),
      icon: Scan,
      permissions: ["use_scanner_terminal"], // Only scanner users
    },
    {
      path: "/reports",
      label: t("reports.title"),
      icon: FileText,
      permissions: ["view_reports", "create_reports"], // Any of these
    },
    {
      path: "/members",
      label: t("members.title"),
      icon: Users,
      alwaysShow: true, // Members list visible to all company users
    },
    {
      path: "/roles",
      label: t("roles.title"),
      icon: Shield,
      permissions: ["view_roles", "manage_roles"], // Any of these
    },
    {
      path: "/settings",
      label: t("settings.title"),
      icon: Settings,
      permissions: [
        "view_company_settings",
        "edit_company_settings",
        "manage_company",
      ], // Any of these
    },
  ];

  // Check if user is a scanner account
  const isScannerAccount = hasPermission("use_scanner_terminal");

  // Filter navigation items based on permissions
  const navItems = allNavItems.filter((item) => {
    // Hide Time Tracking for scanner accounts (but not for Owner)
    if (isScannerAccount && !isOwner && item.path === "/time-tracking") {
      return false;
    }

    // Always show items marked as alwaysShow
    if (item.alwaysShow) return true;

    // Owner has access to everything EXCEPT Scanner Terminal (which needs permission)
    if (isOwner) {
      // Scanner Terminal still requires permission even for Owner
      if (item.path === "/scanner-terminal") {
        return hasPermission("use_scanner_terminal");
      }
      // Everything else is accessible to Owner (including Members)
      return true;
    }

    // Check single permission (legacy)
    if (item.permission) return hasPermission(item.permission);

    // Check multiple permissions (any of them)
    if (item.permissions && Array.isArray(item.permissions)) {
      return item.permissions.some((perm) => hasPermission(perm));
    }

    return false;
  });

  const handleCompanyChange = (company) => {
    selectCompany(company);
    setShowCompanyMenu(false);
    navigate("/dashboard");
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.container}>
        {/* Mobile Layout */}
        {isMobile ? (
          <>
            <div style={styles.mobileHeader}>
              <Link to="/dashboard" style={styles.logo}>
                <Building2 size={24} />
                <span>{t("landing.title")}</span>
              </Link>
              <div style={styles.mobileHeaderButtons}>
                {/* Profile Menu Button */}
                <div style={styles.mobileProfileButtonContainer} ref={mobileProfileMenuRef}>
                  <button
                    style={styles.mobileProfileButton}
                    onClick={() => {
                      setShowMobileProfileMenu(!showMobileProfileMenu);
                      setShowMobileMenu(false);
                    }}
                  >
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt="Profile"
                        style={styles.mobileProfileAvatar}
                      />
                    ) : (
                      <div style={styles.mobileProfileAvatarPlaceholder}>
                        {getInitials()}
                      </div>
                    )}
                  </button>
                  
                  {/* Mobile Profile Menu */}
                  {showMobileProfileMenu && (
                    <div style={styles.mobileProfileMenu}>
                      <div style={styles.mobileProfileMenuHeader}>
                        <div style={styles.mobileProfileMenuAvatar}>
                          {user?.avatar ? (
                            <img
                              src={user.avatar}
                              alt="Profile"
                              style={styles.avatarImage}
                            />
                          ) : (
                            <div style={styles.avatarPlaceholder}>
                              {getInitials()}
                            </div>
                          )}
                        </div>
                        <div>
                          <div style={styles.menuUserName}>
                            {user?.firstName} {user?.lastName}
                          </div>
                          <div style={styles.menuUserEmail}>{user?.email}</div>
                        </div>
                      </div>

                      <hr style={styles.menuDivider} />

                      <button
                        onClick={() => {
                          navigate("/profile");
                          setShowMobileProfileMenu(false);
                        }}
                        style={styles.menuItem}
                      >
                        <User size={18} />
                        <span>{t("profile.title")}</span>
                      </button>

                      <button
                        onClick={() => {
                          navigate("/preferences");
                          setShowMobileProfileMenu(false);
                        }}
                        style={styles.menuItem}
                      >
                        <Globe size={18} />
                        <span>{t("preferences.title")}</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowQRCodeModal(true);
                          setShowMobileProfileMenu(false);
                        }}
                        style={styles.menuItem}
                      >
                        <QrCode size={18} />
                        <span>{t("qrCodeModal.title")}</span>
                      </button>

                      <button
                        onClick={() => {
                          handleLogout();
                          setShowMobileProfileMenu(false);
                        }}
                        style={{ ...styles.menuItem, ...styles.logoutMenuItem }}
                      >
                        <LogOut size={18} />
                        <span>{t("auth.logout")}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Navigation Menu Button */}
                <button
                  style={styles.mobileMenuButton}
                  onClick={() => {
                    setShowMobileMenu(!showMobileMenu);
                    setShowMobileProfileMenu(false);
                  }}
                >
                  {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
                </button>
              </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {showMobileMenu && (
              <div style={styles.mobileMenu}>
                {/* Company Selector */}
                {selectedCompany && (
                  <div style={styles.mobileCompanySection}>
                    <div style={styles.mobileCompanyHeader}>
                      <Building2 size={16} />
                      <span style={styles.mobileCompanyName}>
                        {selectedCompany.name}
                      </span>
                    </div>
                    <select
                      style={styles.mobileCompanySelect}
                      value={selectedCompany.id}
                      onChange={(e) => {
                        if (e.target.value === "create-join") {
                          navigate("/company-setup");
                          setShowMobileMenu(false);
                          return;
                        }
                        const company = companies.find(
                          (c) => c.id === parseInt(e.target.value)
                        );
                        if (company) {
                          handleCompanyChange(company);
                        }
                      }}
                    >
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                          {company.is_owner
                            ? ` (${t("members.owner", "Owner")})`
                            : company.role_name
                            ? ` (${company.role_name})`
                            : ` (${t("members.member", "Member")})`}
                        </option>
                      ))}
                      <option value="create-join" style={{ fontWeight: "600", color: "var(--primary-color)" }}>
                        {t("company.createJoinCompany")}
                      </option>
                    </select>
                  </div>
                )}

                {/* Navigation Links */}
                <div style={styles.mobileNavLinks}>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        style={{
                          ...styles.mobileNavLink,
                          ...(isActive ? styles.mobileNavLinkActive : {}),
                        }}
                        onClick={() => setShowMobileMenu(false)}
                      >
                        <Icon size={20} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>

              </div>
            )}
          </>
        ) : (
          /* Desktop Layout */
          <>
            <div style={styles.leftSection}>
              <Link to="/dashboard" style={styles.logo}>
                <Building2 size={24} />
                <span>{t("landing.title")}</span>
              </Link>

              {selectedCompany && (
                <div style={styles.companySelector}>
                  <button
                    style={styles.companyButton}
                    onClick={() => setShowCompanyMenu(!showCompanyMenu)}
                  >
                    <Building2 size={16} />
                    <span>{selectedCompany.name}</span>
                    <ChevronDown size={16} />
                  </button>

                  {showCompanyMenu && (
                    <div style={styles.companyMenu}>
                      {companies.map((company) => (
                        <button
                          key={company.id}
                          style={{
                            ...styles.companyMenuItem,
                            ...(company.id === selectedCompany.id
                              ? styles.activeCompany
                              : {}),
                          }}
                          onClick={() => handleCompanyChange(company)}
                        >
                          <Building2 size={16} />
                          <span>{company.name}</span>
                          {company.is_owner ? (
                            <span style={styles.ownerBadge}>
                              {t("members.owner", "Owner")}
                            </span>
                          ) : company.role_name ? (
                            <span style={styles.roleBadge}>
                              {company.role_name}
                            </span>
                          ) : (
                            <span style={styles.roleBadge}>
                              {t("members.member", "Member")}
                            </span>
                          )}
                        </button>
                      ))}
                      <hr style={styles.divider} />
                      <button
                        style={styles.companyMenuItem}
                        onClick={() => {
                          setShowCompanyMenu(false);
                          navigate("/company-setup");
                        }}
                      >
                        {t("company.createJoinCompany")}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={styles.navLinks}>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    style={{
                      ...styles.navLink,
                      ...(isActive ? styles.activeNavLink : {}),
                    }}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div style={styles.userSection} ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                style={styles.avatarButton}
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt="Profile"
                    style={styles.avatarImage}
                  />
                ) : (
                  <div style={styles.avatarPlaceholder}>{getInitials()}</div>
                )}
              </button>

              {showProfileMenu && (
                <div style={styles.profileMenu}>
                  <div style={styles.profileMenuHeader}>
                    <div style={styles.menuAvatar}>
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt="Profile"
                          style={styles.avatarImage}
                        />
                      ) : (
                        <div style={styles.avatarPlaceholder}>
                          {getInitials()}
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={styles.menuUserName}>
                        {user?.firstName} {user?.lastName}
                      </div>
                      <div style={styles.menuUserEmail}>{user?.email}</div>
                    </div>
                  </div>

                  <hr style={styles.menuDivider} />

                  <button
                    onClick={() => {
                      navigate("/profile");
                      setShowProfileMenu(false);
                    }}
                    style={styles.menuItem}
                  >
                    <User size={18} />
                    <span>{t("profile.title")}</span>
                  </button>

                  <button
                    onClick={() => {
                      navigate("/preferences");
                      setShowProfileMenu(false);
                    }}
                    style={styles.menuItem}
                  >
                    <Globe size={18} />
                    <span>{t("preferences.title")}</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowQRCodeModal(true);
                      setShowProfileMenu(false);
                    }}
                    style={styles.menuItem}
                  >
                    <QrCode size={18} />
                    <span>{t("qrCodeModal.title")}</span>
                  </button>

                  <button
                    onClick={() => {
                      handleLogout();
                      setShowProfileMenu(false);
                    }}
                    style={{ ...styles.menuItem, ...styles.logoutMenuItem }}
                  >
                    <LogOut size={18} />
                    <span>{t("auth.logout")}</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* QR Code Modal */}
      {showQRCodeModal && user && (
        <QRCodeModal user={user} onClose={() => setShowQRCodeModal(false)} />
      )}
    </nav>
  );
};

const styles = {
  nav: {
    backgroundColor: "var(--white)",
    borderBottom: "1px solid var(--border-color)",
    padding: "0.75rem 0",
    position: "sticky",
    top: 0,
    zIndex: 1000,
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.08)",
    transition: "all 0.3s ease",
  },
  container: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "0 1rem",
    display: "flex",
    alignItems: "center",
    gap: "2rem",
  },
  leftSection: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontWeight: "700",
    fontSize: "1.25rem",
    color: "var(--primary-color)",
  },
  companySelector: {
    position: "relative",
  },
  companyButton: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem 1rem",
    backgroundColor: "var(--light-gray)",
    border: "1px solid var(--border-color)",
    borderRadius: "0.5rem",
    fontSize: "0.875rem",
    color: "var(--text-primary)",
    cursor: "pointer",
  },
  companyMenu: {
    position: "absolute",
    top: "100%",
    left: 0,
    marginTop: "0.5rem",
    backgroundColor: "var(--white)",
    border: "1px solid var(--border-color)",
    borderRadius: "0.5rem",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    minWidth: "250px",
    maxHeight: "400px",
    overflowY: "auto",
    zIndex: 1000,
  },
  companyMenuItem: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.75rem 1rem",
    backgroundColor: "transparent",
    border: "none",
    textAlign: "left",
    fontSize: "0.875rem",
    color: "var(--text-primary)",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  activeCompany: {
    backgroundColor: "var(--light-gray)",
    fontWeight: "600",
  },
  ownerBadge: {
    marginLeft: "auto",
    padding: "0.125rem 0.5rem",
    backgroundColor: "var(--primary-color)",
    color: "var(--white)",
    fontSize: "0.75rem",
    borderRadius: "9999px",
  },
  roleBadge: {
    marginLeft: "auto",
    padding: "0.125rem 0.5rem",
    backgroundColor: "var(--light-gray)",
    color: "var(--text-secondary)",
    fontSize: "0.75rem",
    borderRadius: "9999px",
  },
  divider: {
    margin: "0.5rem 0",
    border: "none",
    borderTop: "1px solid var(--border-color)",
  },
  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
    flex: 1,
  },
  navLink: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem 1rem",
    borderRadius: "0.5rem",
    fontSize: "0.875rem",
    fontWeight: "500",
    color: "var(--text-secondary)",
    transition: "all 0.2s",
  },
  activeNavLink: {
    backgroundColor: "var(--light-gray)",
    color: "var(--primary-color)",
  },
  userSection: {
    position: "relative",
  },
  avatarButton: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    border: "2px solid transparent",
    backgroundColor: "transparent",
    cursor: "pointer",
    transition: "all 0.3s ease",
    padding: 0,
    overflow: "hidden",
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
    fontSize: "0.875rem",
    fontWeight: "700",
  },
  profileMenu: {
    position: "absolute",
    top: "calc(100% + 0.5rem)",
    right: 0,
    minWidth: "280px",
    backgroundColor: "var(--white)",
    borderRadius: "0.75rem",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
    border: "1px solid var(--border-color)",
    padding: "0.5rem",
    zIndex: 1000,
  },
  profileMenuHeader: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    padding: "1rem",
  },
  menuAvatar: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    overflow: "hidden",
    border: "2px solid var(--primary-color)",
    flexShrink: 0,
  },
  menuUserName: {
    fontSize: "0.95rem",
    fontWeight: "600",
    color: "var(--text-primary)",
    marginBottom: "0.25rem",
  },
  menuUserEmail: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
  },
  menuDivider: {
    margin: "0.5rem 0",
    border: "none",
    borderTop: "1px solid var(--border-color)",
  },
  menuItem: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.75rem 1rem",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "0.5rem",
    textAlign: "left",
    fontSize: "0.9rem",
    fontWeight: "500",
    color: "var(--text-primary)",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  logoutMenuItem: {
    color: "var(--error-color)",
  },
  // Mobile styles
  mobileHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  mobileHeaderButtons: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  mobileProfileButtonContainer: {
    position: "relative",
  },
  mobileProfileButton: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    border: "2px solid transparent",
    backgroundColor: "transparent",
    cursor: "pointer",
    padding: 0,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  mobileProfileAvatar: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: "50%",
  },
  mobileProfileAvatarPlaceholder: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, var(--primary-color), var(--secondary-color))",
    color: "white",
    fontSize: "0.875rem",
    fontWeight: "700",
    borderRadius: "50%",
  },
  mobileProfileMenu: {
    position: "absolute",
    top: "calc(100% + 0.5rem)",
    right: 0,
    minWidth: "280px",
    backgroundColor: "var(--white)",
    borderRadius: "0.75rem",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
    border: "1px solid var(--border-color)",
    padding: "0.5rem",
    zIndex: 1001,
  },
  mobileProfileMenuHeader: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    padding: "1rem",
  },
  mobileProfileMenuAvatar: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    overflow: "hidden",
    border: "2px solid var(--primary-color)",
    flexShrink: 0,
  },
  mobileMenuButton: {
    padding: "0.5rem",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    color: "var(--text-primary)",
    minWidth: "44px",
    minHeight: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  mobileMenu: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "var(--white)",
    borderBottom: "1px solid var(--border-color)",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    maxHeight: "calc(100vh - 60px)",
    overflowY: "auto",
  },
  mobileCompanySection: {
    padding: "0.75rem",
    backgroundColor: "var(--light-gray)",
    borderRadius: "0.5rem",
  },
  mobileCompanyHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginBottom: "0.5rem",
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
  },
  mobileCompanyName: {
    fontWeight: "600",
    color: "var(--text-primary)",
  },
  mobileCompanySelect: {
    width: "100%",
    padding: "0.5rem",
    border: "1px solid var(--border-color)",
    borderRadius: "0.375rem",
    backgroundColor: "var(--white)",
    fontSize: "0.875rem",
  },
  mobileNavLinks: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  mobileNavLink: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.875rem 1rem",
    borderRadius: "0.5rem",
    fontSize: "1rem",
    fontWeight: "500",
    color: "var(--text-secondary)",
    transition: "all 0.2s",
  },
  mobileNavLinkActive: {
    backgroundColor: "var(--light-gray)",
    color: "var(--primary-color)",
  },
};

export default Navbar;
