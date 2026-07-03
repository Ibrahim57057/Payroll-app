// src/services/salaryService.js
import api from "./api";

export const salaryService = {
  // ✅ Get all salary structures
  getStructures: async () => {
    try {
      const response = await api.get("/salary-structures");
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching salary structures:", error);
      return { success: false, data: [] };
    }
  },

  // ✅ Get grade levels
  getGradeLevels: async (category) => {
    try {
      const params = category ? { category } : {};
      const response = await api.get("/grade-levels", { params });
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching grade levels:", error);
      return { success: false, data: [] };
    }
  },

  // ✅ Update grade level
  updateGradeLevel: async (id, data) => {
    try {
      const response = await api.put(`/grade-levels/${id}`, data);
      console.log("✅ Grade level updated successfully");
      return response.data;
    } catch (error) {
      console.error(`❌ Error updating grade level ${id}:`, error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to update grade level",
      };
    }
  },

  // ✅ Get all allowances
  getAllowances: async () => {
    try {
      const response = await api.get("/allowance-types");
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching allowances:", error);
      return { success: false, data: [] };
    }
  },

  // ✅ Update allowance
  updateAllowance: async (id, data) => {
    try {
      const response = await api.put(`/allowance-types/${id}`, data);
      console.log("✅ Allowance updated successfully");
      return response.data;
    } catch (error) {
      console.error(`❌ Error updating allowance ${id}:`, error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to update allowance",
      };
    }
  },

  // ✅ Create new allowance
  createAllowance: async (data) => {
    try {
      const response = await api.post("/allowance-types", data);
      console.log("✅ Allowance created successfully");
      return response.data;
    } catch (error) {
      console.error("❌ Error creating allowance:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to create allowance",
      };
    }
  },
};
