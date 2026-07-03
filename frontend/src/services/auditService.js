// src/services/auditService.js
import api from "./api";

export const auditService = {
  // ✅ Get audit logs
  getLogs: async (params = {}) => {
    try {
      const response = await api.get("/audit-logs", { params });
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching audit logs:", error);
      return { success: false, data: [] };
    }
  },

  // ✅ Get audit log by ID
  getById: async (id) => {
    try {
      const response = await api.get(`/audit-logs/${id}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error fetching audit log ${id}:`, error);
      return { success: false, data: null };
    }
  },

  // ✅ Get audit log by user
  getByUser: async (userId, params = {}) => {
    try {
      const response = await api.get(`/audit-logs/user/${userId}`, { params });
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching user audit logs:", error);
      return { success: false, data: [] };
    }
  },

  // ✅ Get audit log by module
  getByModule: async (module, params = {}) => {
    try {
      const response = await api.get(`/audit-logs/module/${module}`, {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching module audit logs:", error);
      return { success: false, data: [] };
    }
  },

  // ✅ Get audit log stats
  getStats: async () => {
    try {
      const response = await api.get("/audit-logs/stats");
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching audit stats:", error);
      return { success: false, data: null };
    }
  },

  // ✅ Export audit logs - FIXED: Use export=true query parameter
  exportLogs: async (params = {}) => {
    try {
      // Build query params
      const queryParams = new URLSearchParams();
      queryParams.append("export", "true");

      if (params.module && params.module !== "all") {
        queryParams.append("module", params.module);
      }
      if (params.action && params.action !== "all") {
        queryParams.append("action", params.action);
      }
      if (params.startDate) {
        queryParams.append("startDate", params.startDate);
      }
      if (params.search) {
        queryParams.append("search", params.search);
      }
      if (params.user && params.user !== "all") {
        queryParams.append("user", params.user);
      }

      const url = `/audit-logs?${queryParams.toString()}`;
      console.log("📤 Export URL:", url);

      const response = await api.get(url, {
        responseType: "blob",
      });
      return response.data;
    } catch (error) {
      console.error("❌ Error exporting audit logs:", error);
      return null;
    }
  },
};
