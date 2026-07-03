// src/services/payslipService.js
import api from "./api";

export const payslipService = {
  // ✅ Get payslip by ID
  getById: async (id) => {
    try {
      const response = await api.get(`/payslips/${id}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error fetching payslip ${id}:`, error);
      return { success: false, data: null };
    }
  },

  // ✅ Get payslips by staff
  getByStaff: async (staffId, params = {}) => {
    try {
      const response = await api.get(`/payslips/staff/${staffId}`, { params });
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching payslips for staff:", error);
      return { success: false, data: [] };
    }
  },

  // ✅ Get payslips by payroll run
  getByPayrollRun: async (payrollRunId) => {
    try {
      const response = await api.get(`/payslips/run/${payrollRunId}`);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching payslips for payroll run:", error);
      return { success: false, data: [] };
    }
  },

  // ✅ Generate payslip PDF
  generatePDF: async (id) => {
    try {
      const response = await api.get(`/payslips/${id}/pdf`, {
        responseType: "blob",
      });
      return response.data;
    } catch (error) {
      console.error("❌ Error generating PDF:", error);
      return null;
    }
  },

  // ✅ Email payslip to staff - FIXED
  emailPayslip: async (id, userId) => {
    try {
      const response = await api.post(`/payslips/${id}/email`, {
        user_id: userId || null,
      });
      console.log("✅ Payslip emailed successfully");
      return response.data;
    } catch (error) {
      console.error("❌ Error emailing payslip:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to email payslip",
      };
    }
  },

  // ✅ Get payslip preview data
  getPreview: async (staffId, month, year) => {
    try {
      // Make sure staffId is valid
      if (!staffId) {
        return {
          success: false,
          data: null,
          message: "Staff ID is required",
        };
      }

      if (!month || !year) {
        return {
          success: false,
          data: null,
          message: "Month and year are required",
        };
      }

      console.log("🔍 Fetching preview for:", { staffId, month, year });

      const response = await api.get("/payslips/preview", {
        params: {
          staffId: staffId,
          month: month,
          year: year,
        },
      });

      return response.data;
    } catch (error) {
      console.error("❌ Error fetching payslip preview:", error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || "No payslip found",
      };
    }
  },
};

export default payslipService;
