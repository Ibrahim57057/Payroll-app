// src/services/reportService.js
import api from "./api";

export const reportService = {
  // ✅ Generate Monthly Payroll Summary
  getPayrollSummary: async (params = {}) => {
    try {
      const response = await api.get("/reports/payroll-summary", { params });
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching payroll summary:", error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || "Failed to fetch report",
      };
    }
  },

  // ✅ Generate PAYE Remittance Schedule
  getPAYEReport: async (params = {}) => {
    try {
      const response = await api.get("/reports/paye", { params });
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching PAYE report:", error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || "Failed to fetch report",
      };
    }
  },

  // ✅ Generate Pension Remittance Schedule
  getPensionReport: async (params = {}) => {
    try {
      const response = await api.get("/reports/pension", { params });
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching Pension report:", error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || "Failed to fetch report",
      };
    }
  },

  // ✅ Generate NHF Remittance Schedule
  getNHFReport: async (params = {}) => {
    try {
      const response = await api.get("/reports/nhf", { params });
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching NHF report:", error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || "Failed to fetch report",
      };
    }
  },

  // ✅ Generate Department Cost Report
  getDepartmentCostReport: async (params = {}) => {
    try {
      const response = await api.get("/reports/department-cost", { params });
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching department cost report:", error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || "Failed to fetch report",
      };
    }
  },

  // ✅ Generate Annual PAYE (Form H1)
  getFormH1: async (params = {}) => {
    try {
      const response = await api.get("/reports/form-h1", { params });
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching Form H1:", error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || "Failed to fetch report",
      };
    }
  },

  // ✅ Generate New Staff Report
  getNewStaffReport: async (params = {}) => {
    try {
      const response = await api.get("/reports/new-staff", { params });
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching new staff report:", error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || "Failed to fetch report",
      };
    }
  },

  // ✅ Generate Deduction Summary Report
  getDeductionSummaryReport: async (params = {}) => {
    try {
      const response = await api.get("/reports/deduction-summary", { params });
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching deduction summary:", error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || "Failed to fetch report",
      };
    }
  },

  // ✅ Generate Leave Report
  getLeaveReport: async (params = {}) => {
    try {
      const response = await api.get("/reports/leave", { params });
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching leave report:", error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || "Failed to fetch report",
      };
    }
  },

  // ✅ Generate Year-to-Date Earnings Report
  getYTDEarnings: async (params = {}) => {
    try {
      const response = await api.get("/reports/ytd-earnings", { params });
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching YTD earnings:", error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || "Failed to fetch report",
      };
    }
  },

  // ✅ Export report as PDF
  exportPDF: async (reportType, params = {}) => {
    try {
      const response = await api.get(`/reports/${reportType}/pdf`, {
        params,
        responseType: "blob",
      });
      return response.data;
    } catch (error) {
      console.error("❌ Error exporting PDF:", error);
      return null;
    }
  },

  // ✅ Export report as Excel
  exportExcel: async (reportType, params = {}) => {
    try {
      const response = await api.get(`/reports/${reportType}/excel`, {
        params,
        responseType: "blob",
      });
      return response.data;
    } catch (error) {
      console.error("❌ Error exporting Excel:", error);
      return null;
    }
  },

  // ✅ Get report filters
  getReportFilters: async () => {
    try {
      const response = await api.get("/reports/filters");
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching report filters:", error);
      return { success: false, data: null };
    }
  },
};
