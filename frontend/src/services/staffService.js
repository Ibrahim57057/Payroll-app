// src/services/staffService.js
import api from "./api";

export const staffService = {
  // ✅ Get all staff
  getAll: async (params = {}) => {
    try {
      const response = await api.get("/staff", { params });
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching staff:", error);
      return { success: false, data: [] };
    }
  },

  // ✅ Get single staff by ID
  getById: async (id) => {
    try {
      const response = await api.get(`/staff/${id}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error fetching staff ${id}:`, error);
      return { success: false, data: null };
    }
  },

  // ✅ Create new staff
  create: async (staffData) => {
    try {
      const response = await api.post("/staff", staffData);
      console.log("✅ Staff created successfully");
      return response.data;
    } catch (error) {
      console.error("❌ Error creating staff:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to create staff",
      };
    }
  },

  // ✅ Update staff
  update: async (id, staffData) => {
    try {
      const response = await api.put(`/staff/${id}`, staffData);
      console.log("✅ Staff updated successfully");
      return response.data;
    } catch (error) {
      console.error(`❌ Error updating staff ${id}:`, error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to update staff",
      };
    }
  },

  // ✅ Delete staff (soft delete)
  delete: async (id) => {
    try {
      const response = await api.delete(`/staff/${id}`);
      console.log("✅ Staff deactivated successfully");
      return response.data;
    } catch (error) {
      console.error(`❌ Error deleting staff ${id}:`, error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to delete staff",
      };
    }
  },

  // ✅ Get staff by department
  getByDepartment: async (departmentId) => {
    try {
      const response = await api.get(`/staff/department/${departmentId}`);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching staff by department:", error);
      return { success: false, data: [] };
    }
  },

  // ✅ Get staff by category
  getByCategory: async (category) => {
    try {
      const response = await api.get(`/staff/category/${category}`);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching staff by category:", error);
      return { success: false, data: [] };
    }
  },

  // ✅ Get staff statistics
  getStats: async () => {
    try {
      const response = await api.get("/staff/stats");
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching staff stats:", error);
      return { success: false, data: null };
    }
  },
};
