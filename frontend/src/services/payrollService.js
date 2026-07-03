// src/services/payrollService.js
import api from "./api";

export const payrollService = {
  // ✅ Get payroll runs
  getPayrollRuns: async (params = {}) => {
    try {
      const response = await api.get("/payroll-runs", { params });
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching payroll runs:", error);
      return { success: false, data: [] };
    }
  },

  // ✅ Get single payroll run
  getPayrollRun: async (id) => {
    try {
      const response = await api.get(`/payroll-runs/${id}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error fetching payroll run ${id}:`, error);
      return { success: false, data: null };
    }
  },

  // ✅ Process payroll - WITH EXTENDED TIMEOUT
  processPayroll: async (data) => {
    try {
      // Use the api instance with extended timeout
      const response = await api.post("/payroll/process", data, {
        timeout: 120000, // 2 minutes timeout for payroll processing
      });
      console.log("✅ Payroll processed successfully");
      return response.data;
    } catch (error) {
      console.error("❌ Error processing payroll:", error);
      // Check if it's a timeout error
      if (error.code === "ECONNABORTED") {
        return {
          success: false,
          message:
            "Payroll processing is taking longer than expected. Please check back in a few minutes.",
        };
      }
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to process payroll",
      };
    }
  },

  // ✅ Approve payroll (Bursar)
  approvePayroll: async (id, userId) => {
    try {
      const response = await api.put(`/payroll/${id}/approve-bursar`, {
        approved_by: userId,
      });
      console.log("✅ Payroll approved by Bursar");
      return response.data;
    } catch (error) {
      console.error("❌ Error approving payroll:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to approve payroll",
      };
    }
  },

  // ✅ Final approve payroll (VC)
  finalApprovePayroll: async (id, userId) => {
    try {
      const response = await api.put(`/payroll/${id}/approve-vc`, {
        approved_by: userId,
      });
      console.log("✅ Payroll approved by VC");
      return response.data;
    } catch (error) {
      console.error("❌ Error final approving payroll:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to final approve payroll",
      };
    }
  },

  // ✅ Disburse payroll
  disbursePayroll: async (id) => {
    try {
      const response = await api.put(`/payroll/${id}/disburse`);
      console.log("✅ Payroll disbursed successfully");
      return response.data;
    } catch (error) {
      console.error("❌ Error disbursing payroll:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to disburse payroll",
      };
    }
  },

  // ✅ Get payroll stats
  getStats: async () => {
    try {
      const response = await api.get("/payroll/stats");
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching payroll stats:", error);
      return { success: false, data: null };
    }
  },

  // ✅ Get payroll summary by month
  getSummary: async (month, year) => {
    try {
      const response = await api.get(
        `/payroll/summary?month=${month}&year=${year}`,
      );
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching payroll summary:", error);
      return { success: false, data: null };
    }
  },

  // ✅ Get deduction summary
  getDeductionSummary: async (month, year) => {
    try {
      const response = await api.get(
        `/payroll/deduction-summary?month=${month}&year=${year}`,
      );
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching deduction summary:", error);
      return { success: false, data: [] };
    }
  },
};

export default payrollService;
