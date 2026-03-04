import React, { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../services/api";
import { connectSocket, disconnectSocket, socket } from "../services/socket";

const AuthContext = createContext(null);

const IMPLIED_PERMISSIONS = {
  manage_members: [
    "remove_members",
    "assign_roles",
    "view_invite_code",
    "refresh_invite_code",
  ],
  manage_roles: ["view_roles", "create_roles", "edit_roles", "delete_roles"],
  manage_company: ["view_company_settings", "edit_company_settings"],
};

const hasPermissionWithImplications = (permissions, permission) => {
  if (!permissions || typeof permissions !== "object") return false;
  if (permissions[permission] === true) return true;

  return Object.entries(IMPLIED_PERMISSIONS).some(([parent, implied]) => {
    return permissions[parent] === true && implied.includes(permission);
  });
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  // Join company channel when selectedCompany changes
  useEffect(() => {
    if (selectedCompany && socket) {
      console.log(`Joining company channel: ${selectedCompany.id}`);
      socket.emit("join-company", { companyId: selectedCompany.id });
    }
  }, [selectedCompany]);

  // Keep invite code synchronized across all users in a company.
  useEffect(() => {
    const handleInviteCodeUpdated = (payload = {}) => {
      const { companyId, inviteCode, expiresAt } = payload;
      if (!companyId || !inviteCode) return;

      setCompanies((prev) =>
        prev.map((company) =>
          company.id === companyId
            ? {
                ...company,
                invite_code: inviteCode,
                invite_code_expires_at: expiresAt || company.invite_code_expires_at,
              }
            : company
        )
      );

      setSelectedCompany((prev) =>
        prev && prev.id === companyId
          ? {
              ...prev,
              invite_code: inviteCode,
              invite_code_expires_at: expiresAt || prev.invite_code_expires_at,
            }
          : prev
      );
    };

    socket.on("company-invite-code-updated", handleInviteCodeUpdated);
    return () => {
      socket.off("company-invite-code-updated", handleInviteCodeUpdated);
    };
  }, []);

  const loadUser = async () => {
    try {
      const response = await authAPI.getMe();
      setUser(response.data.user);
      setCompanies(response.data.companies);

      // Auto-select first company if available
      if (response.data.companies.length > 0) {
        const savedCompanyId = localStorage.getItem("selectedCompanyId");
        const company =
          response.data.companies.find(
            (c) => c.id === parseInt(savedCompanyId)
          ) || response.data.companies[0];
        setSelectedCompany(company);
      }

      // Connect to socket
      const token = localStorage.getItem("token");
      connectSocket(token);
    } catch (error) {
      console.error("Load user error:", error);
      localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    const { token, user } = response.data;

    localStorage.setItem("token", token);
    setUser(user);

    await loadUser();
    return response.data;
  };

  const register = async (data) => {
    const response = await authAPI.register(data);
    const { token, user } = response.data;

    localStorage.setItem("token", token);
    setUser(user);

    await loadUser();
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("selectedCompanyId");
    setUser(null);
    setCompanies([]);
    setSelectedCompany(null);
    disconnectSocket();
  };

  const selectCompany = (company) => {
    setSelectedCompany(company);
    localStorage.setItem("selectedCompanyId", company.id);
  };

  const refreshCompanies = async () => {
    try {
      const response = await authAPI.getMe();
      setCompanies(response.data.companies);

      // Update selected company if it exists in new list
      if (selectedCompany) {
        const updated = response.data.companies.find(
          (c) => c.id === selectedCompany.id
        );
        if (updated) {
          setSelectedCompany(updated);
        }
      } else if (response.data.companies.length > 0) {
        // Auto-select first company if no company is currently selected
        const company = response.data.companies[0];
        setSelectedCompany(company);
        localStorage.setItem("selectedCompanyId", company.id);
      }
    } catch (error) {
      console.error("Refresh companies error:", error);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await authAPI.getMe();
      setUser(response.data.user);
      setCompanies(response.data.companies);

      // Update selected company if it exists in new list
      if (selectedCompany) {
        const updated = response.data.companies.find(
          (c) => c.id === selectedCompany.id
        );
        if (updated) {
          setSelectedCompany(updated);
        }
      }
    } catch (error) {
      console.error("Refresh user error:", error);
    }
  };

  // Helper function to check permissions
  const hasPermission = (permission) => {
    if (!selectedCompany) return false;

    // Owner has all permissions
    if (selectedCompany.is_owner) return true;

    // Check role permissions
    if (!selectedCompany.permissions) return false;

    return hasPermissionWithImplications(selectedCompany.permissions, permission);
  };

  const value = {
    user,
    companies,
    selectedCompany,
    loading,
    login,
    register,
    logout,
    selectCompany,
    refreshCompanies,
    refreshUser,
    hasPermission,
    isAuthenticated: !!user,
    isOwner: selectedCompany?.is_owner || false,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
