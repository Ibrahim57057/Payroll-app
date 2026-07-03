// src/services/dashboardService.js
import api from "./api";

export const dashboardService = {
  // ✅ Get dashboard stats
  getStats: async () => {
    try {
      const response = await api.get("/dashboard/stats");
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching stats:", error);
      return { success: false, data: null };
    }
  },

  // ✅ Get payroll status
  getPayrollStatus: async () => {
    try {
      const response = await api.get("/payroll/status");
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching payroll status:", error);
      return { success: false, data: [] };
    }
  },

  // ✅ Get recent activity
  getRecentActivity: async (limit = 5) => {
    try {
      const response = await api.get(`/audit-log?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching recent activity:", error);
      return { success: false, data: [] };
    }
  },

  // ✅ Get notifications - FIXED (with userId parameter)
  getNotifications: async (userId) => {
    try {
      if (!userId) {
        console.log("⚠️ No userId provided to getNotifications");
        return { success: true, data: [] };
      }
      const response = await api.get(`/notifications?user_id=${userId}`);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching notifications:", error);
      return { success: false, data: [] };
    }
  },
};
