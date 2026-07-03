// src/services/deductionService.js
import api from "./api";

const deductionService = {
  // ============================================================
  // DEDUCTION TYPES
  // ============================================================

  // ✅ Get all deduction types
  getDeductionTypes: async () => {
    try {
      const response = await api.get("/deduction-types");
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching deduction types:", error);
      return { success: false, data: [] };
    }
  },

  // ✅ Get deduction type by ID
  getDeductionTypeById: async (id) => {
    try {
      const response = await api.get(`/deduction-types/${id}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error fetching deduction type ${id}:`, error);
      return { success: false, data: null };
    }
  },

  // ✅ Create a new deduction type
  createDeductionType: async (data) => {
    try {
      const response = await api.post("/deduction-types", data);
      return response.data;
    } catch (error) {
      console.error("❌ Error creating deduction type:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to create deduction type",
      };
    }
  },

  // ✅ Update a deduction type
  updateDeductionType: async (id, data) => {
    try {
      const response = await api.put(`/deduction-types/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`❌ Error updating deduction type ${id}:`, error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to update deduction type",
      };
    }
  },

  // ✅ Delete a deduction type - UPDATE THIS
  deleteDeductionType: async (id) => {
    try {
      const response = await api.delete(`/deduction-types/${id}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error deleting deduction type ${id}:`, error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to delete deduction type",
      };
    }
  },
  // ============================================================
  // TAX BANDS
  // ============================================================

  // ✅ Get all tax bands
  getTaxBands: async () => {
    try {
      const response = await api.get("/tax-bands");
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching tax bands:", error);
      return { success: false, data: [] };
    }
  },

  // ✅ Update a tax band - FIXED with proper error handling
  updateTaxBand: async (id, data) => {
    try {
      // First get current tax bands
      const response = await api.get("/tax-bands");

      if (!response.data.success) {
        return { success: false, message: "Failed to fetch current tax bands" };
      }

      const taxBands = response.data.data || [];
      const index = taxBands.findIndex((band) => band.id === id);

      if (index === -1) {
        return { success: false, message: "Tax band not found" };
      }

      // Update the tax band locally
      taxBands[index] = { ...taxBands[index], rate: data.rate };

      // Try to update via settings
      try {
        const settingsResponse = await api.put("/settings", {
          settings: {
            tax_bands: JSON.stringify(taxBands),
          },
        });

        if (settingsResponse.data.success) {
          return {
            success: true,
            message: "Tax band updated successfully",
            data: settingsResponse.data.data,
          };
        } else {
          // Settings update failed, try direct update
          const directResponse = await api.put(`/tax-bands/${id}`, {
            rate: data.rate,
          });
          if (directResponse.data.success) {
            return {
              success: true,
              message: "Tax band updated successfully",
              data: directResponse.data.data,
            };
          } else {
            // Both failed, return error
            return {
              success: false,
              message:
                settingsResponse.data.message ||
                directResponse.data.message ||
                "Failed to update tax band",
            };
          }
        }
      } catch (settingsError) {
        console.error("❌ Settings update error:", settingsError);
        // Settings endpoint failed, try direct update
        try {
          const directResponse = await api.put(`/tax-bands/${id}`, {
            rate: data.rate,
          });
          if (directResponse.data.success) {
            return {
              success: true,
              message: "Tax band updated successfully",
              data: directResponse.data.data,
            };
          } else {
            return {
              success: false,
              message:
                directResponse.data.message || "Failed to update tax band",
            };
          }
        } catch (directError) {
          console.error("❌ Direct update error:", directError);
          // Both failed, return error
          return {
            success: false,
            message:
              directError.response?.data?.message ||
              "Failed to update tax band. Please try again.",
          };
        }
      }
    } catch (error) {
      console.error(`❌ Error updating tax band ${id}:`, error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to update tax band",
      };
    }
  },

  // ============================================================
  // STAFF DEDUCTIONS
  // ============================================================

  // ✅ Assign deduction to staff
  assignDeduction: async (data) => {
    try {
      const response = await api.post("/staff-deductions", data);
      return response.data;
    } catch (error) {
      console.error("❌ Error assigning deduction:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to assign deduction",
      };
    }
  },

  // ✅ Remove deduction from staff
  removeDeduction: async (id) => {
    try {
      const response = await api.delete(`/staff-deductions/${id}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error removing deduction ${id}:`, error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to remove deduction",
      };
    }
  },

  // ✅ Get staff deductions by staff ID
  getStaffDeductions: async (staffId) => {
    try {
      const response = await api.get(`/staff-deductions/${staffId}`);
      return response.data;
    } catch (error) {
      console.error(
        `❌ Error fetching staff deductions for ${staffId}:`,
        error,
      );
      return { success: false, data: [] };
    }
  },

  // ============================================================
  // STAFF LIST
  // ============================================================

  // ✅ Get staff list
  getStaffList: async () => {
    try {
      const response = await api.get("/staff");
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching staff list:", error);
      return { success: false, data: [] };
    }
  },

  // ✅ Get staff by ID
  getStaffById: async (id) => {
    try {
      const response = await api.get(`/staff/${id}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error fetching staff ${id}:`, error);
      return { success: false, data: null };
    }
  },

  // ============================================================
  // ALLOWANCES
  // ============================================================

  // ✅ Get all allowance types
  getAllowanceTypes: async () => {
    try {
      const response = await api.get("/allowance-types");
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching allowance types:", error);
      return { success: false, data: [] };
    }
  },

  // ✅ Update allowance type
  updateAllowanceType: async (id, data) => {
    try {
      const response = await api.put(`/allowance-types/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`❌ Error updating allowance type ${id}:`, error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to update allowance type",
      };
    }
  },
};

export default deductionService;
