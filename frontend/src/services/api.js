import axios from "axios";

// Use relative path for API - Vite proxy will handle it
const API_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  getMe: () => api.get("/auth/me"),
};

// Company API
export const companyAPI = {
  create: (data) => api.post("/companies", data),
  join: (inviteCode) => api.post("/companies/join", { inviteCode }),
  getCompany: (id) => api.get(`/companies/${id}`),
  getMembers: (id) => api.get(`/companies/${id}/members`),
  update: (id, data) => api.put(`/companies/${id}`, data),
  removeMember: (companyId, userId) =>
    api.delete(`/companies/${companyId}/members/${userId}`),
  leaveCompany: (companyId) =>
    api.post(`/companies/${companyId}/leave`),
  delete: (companyId) => api.delete(`/companies/${companyId}`),
  refreshInviteCode: (companyId) =>
    api.post(`/companies/${companyId}/refresh-invite-code`),
};

// Role API
export const roleAPI = {
  getRoles: (companyId) => api.get(`/roles/${companyId}`),
  create: (companyId, data) => api.post(`/roles/${companyId}`, data),
  update: (companyId, roleId, data) =>
    api.put(`/roles/${companyId}/${roleId}`, data),
  delete: (companyId, roleId) => api.delete(`/roles/${companyId}/${roleId}`),
  assignRole: (companyId, userId, roleId) =>
    api.post(`/roles/${companyId}/assign/${userId}`, { roleId }),
};

// Time Log API
export const timeLogAPI = {
  clockIn: (data) => api.post("/time-logs/clock-in", data),
  clockOut: (data) => api.post("/time-logs/clock-out", data),
  getTimeLogs: (companyId, params) =>
    api.get(`/time-logs/${companyId}`, { params }),
  getMyLogs: (companyId) => api.get(`/time-logs/${companyId}/my-logs`),
  getCurrentStatus: (companyId, userId) =>
    api.get(`/time-logs/${companyId}/status`, { params: { userId } }),
  update: (companyId, logId, data) =>
    api.put(`/time-logs/${companyId}/${logId}`, data),
  delete: (companyId, logId) => api.delete(`/time-logs/${companyId}/${logId}`),
};

// Report API
export const reportAPI = {
  generate: (companyId, data) =>
    api.post(`/reports/${companyId}/generate`, data),
  getReports: (companyId) => api.get(`/reports/${companyId}`),
  download: async (companyId, fileName) => {
    const response = await api.get(
      `/reports/${companyId}/download/${fileName}`,
      {
        responseType: "blob",
      }
    );
    return response;
  },
  getConfigs: (companyId) => api.get(`/reports/${companyId}/configs`),
  createConfig: (companyId, data) =>
    api.post(`/reports/${companyId}/configs`, data),
  deleteConfig: (companyId, configId) =>
    api.delete(`/reports/${companyId}/configs/${configId}`),
};


// User API
export const userAPI = {
  updateProfile: (data) => api.put("/users/profile", data),
  updateAvatar: (avatar) => api.put("/users/avatar", { avatar }),
  changePassword: (data) => api.put("/users/password", data),
  getUserStats: (userId, companyId) =>
    api.get(`/users/${userId}/stats/${companyId}`),
};

export default api;
