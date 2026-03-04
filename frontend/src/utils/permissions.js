// All available permissions in the system
export const PERMISSIONS = {
  // ===== TIME TRACKING =====
  VIEW_ALL_TIMELOGS: {
    key: "view_all_timelogs",
    label: "View All Time Logs",
    description: "View time logs of all employees regardless of role hierarchy",
    category: "Time Tracking",
  },
  VIEW_EMPLOYEE_FILTERS: {
    key: "view_employee_filters",
    label: "View Employee Filters",
    description: "Access to search and filter active employees on Dashboard",
    category: "Time Tracking",
  },
  SCAN_OTHERS: {
    key: "scan_others",
    label: "Scan Others",
    description: "Ability to clock in/out other employees via QR code scanning",
    category: "Time Tracking",
  },
  USE_SCANNER_TERMINAL: {
    key: "use_scanner_terminal",
    label: "Use Scanner Terminal",
    description: "Access to the scanner terminal interface for clocking employees",
    category: "Time Tracking",
  },

  // ===== REPORTS =====
  VIEW_REPORTS: {
    key: "view_reports",
    label: "View Reports",
    description: "View existing reports",
    category: "Reports",
  },
  CREATE_REPORTS: {
    key: "create_reports",
    label: "Create Reports",
    description: "Generate new reports",
    category: "Reports",
  },

  // ===== MEMBERS =====
  REMOVE_MEMBERS: {
    key: "remove_members",
    label: "Remove Members",
    description: "Remove members from the company",
    category: "Members",
  },
  ASSIGN_ROLES: {
    key: "assign_roles",
    label: "Assign Roles",
    description: "Assign roles to members",
    category: "Members",
  },
  MANAGE_MEMBERS: {
    key: "manage_members",
    label: "Manage Members",
    description:
      "Full control over members (view, remove, assign roles and invitations)",
    category: "Members",
  },
  VIEW_INVITE_CODE: {
    key: "view_invite_code",
    label: "View Invite Code",
    description: "View and share company invite code on Dashboard",
    category: "Members",
  },
  REFRESH_INVITE_CODE: {
    key: "refresh_invite_code",
    label: "Refresh Invite Code",
    description:
      "Generate a new invite code when the current one expires or for security",
    category: "Members",
  },

  // ===== ROLES =====
  VIEW_ROLES: {
    key: "view_roles",
    label: "View Roles",
    description: "View existing roles and their permissions",
    category: "Roles",
  },
  CREATE_ROLES: {
    key: "create_roles",
    label: "Create Roles",
    description: "Create new roles",
    category: "Roles",
  },
  EDIT_ROLES: {
    key: "edit_roles",
    label: "Edit Roles",
    description: "Edit existing roles and their permissions",
    category: "Roles",
  },
  DELETE_ROLES: {
    key: "delete_roles",
    label: "Delete Roles",
    description: "Delete existing roles",
    category: "Roles",
  },
  MANAGE_ROLES: {
    key: "manage_roles",
    label: "Manage Roles",
    description: "Full control over roles (create, edit, delete)",
    category: "Roles",
  },

  // ===== COMPANY SETTINGS =====
  VIEW_COMPANY_SETTINGS: {
    key: "view_company_settings",
    label: "View Company Settings",
    description: "View company settings and information",
    category: "Company Settings",
  },
  EDIT_COMPANY_SETTINGS: {
    key: "edit_company_settings",
    label: "Edit Company Settings",
    description: "Edit company name and other settings",
    category: "Company Settings",
  },
  MANAGE_COMPANY: {
    key: "manage_company",
    label: "Manage Company",
    description: "Full control over company settings",
    category: "Company Settings",
  },
};

// Get all permissions as array
export const getAllPermissions = () => {
  return Object.values(PERMISSIONS);
};

// Get permissions grouped by category
export const getPermissionsByCategory = () => {
  const grouped = {};

  getAllPermissions().forEach((permission) => {
    if (!grouped[permission.category]) {
      grouped[permission.category] = [];
    }
    grouped[permission.category].push(permission);
  });

  return grouped;
};

// Get permission by key
export const getPermissionByKey = (key) => {
  return getAllPermissions().find((p) => p.key === key);
};

// Check if permission key exists
export const isValidPermission = (key) => {
  return getAllPermissions().some((p) => p.key === key);
};

// Helper: Check if has any of the permissions
export const hasAnyPermission = (hasPermissionFn, permissionKeys) => {
  return permissionKeys.some((key) => hasPermissionFn(key));
};

// Helper: Check if has all of the permissions
export const hasAllPermissions = (hasPermissionFn, permissionKeys) => {
  return permissionKeys.every((key) => hasPermissionFn(key));
};
