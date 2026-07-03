// src/services/leaveService.js
import api from "./api";

const leaveService = {
  // ✅ Get all leave requests
  getAll: async (params = {}) => {
    try {
      const response = await api.get("/leave-requests", { params });
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching leave requests:", error);
      return { success: false, data: [] };
    }
  },

  // ✅ Get leave requests by staff
  getByStaff: async (staffId) => {
    try {
      const response = await api.get(`/leave-requests/staff/${staffId}`);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching staff leave requests:", error);
      return { success: false, data: [] };
    }
  },

  // ✅ Create leave request
  create: async (data) => {
    try {
      const response = await api.post("/leave-requests", data);
      console.log("✅ Leave request created successfully");
      return response.data;
    } catch (error) {
      console.error("❌ Error creating leave request:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to create leave request",
      };
    }
  },

  // ✅ Approve leave request
  approve: async (id, approved_by) => {
    try {
      const response = await api.put(`/leave-requests/${id}/approve`, {
        approved_by,
      });
      console.log("✅ Leave request approved");
      return response.data;
    } catch (error) {
      console.error("❌ Error approving leave:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to approve leave",
      };
    }
  },

  // ✅ Reject leave request
  reject: async (id, data) => {
    try {
      const response = await api.put(`/leave-requests/${id}/reject`, data);
      console.log("✅ Leave request rejected");
      return response.data;
    } catch (error) {
      console.error("❌ Error rejecting leave:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to reject leave",
      };
    }
  },

  // ✅ Get leave balances for staff
  getBalances: async (staffId) => {
    try {
      const response = await api.get(`/leave-balance/${staffId}`);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching leave balances:", error);
      return { success: false, data: [] };
    }
  },

  // ✅ Get leave types
  getLeaveTypes: async () => {
    try {
      const response = await api.get("/leave-types");
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching leave types:", error);
      return { success: false, data: [] };
    }
  },

  // ✅ Update leave type
  updateLeaveType: async (id, data) => {
    try {
      const response = await api.put(`/leave-types/${id}`, data);
      console.log("✅ Leave type updated");
      return response.data;
    } catch (error) {
      console.error("❌ Error updating leave type:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to update leave type",
      };
    }
  },
};

export default leaveService; // ✅ Default export
