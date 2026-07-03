// src/components/reports/Reports.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { reportService } from "../../services/reportService";
import authService from "../../services/authService";

// ✅ Helper functions for default values
const getDefaultMonth = () => {
  const now = new Date();
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return monthNames[now.getMonth()] || "June";
};

const getDefaultYear = () => {
  return new Date().getFullYear().toString();
};

const Reports = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(getDefaultMonth());
  const [selectedYear, setSelectedYear] = useState(getDefaultYear());
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [reportData, setReportData] = useState(null);
  const [activeReport, setActiveReport] = useState(null);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState([]);

  // ✅ Notification state
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // ✅ Fetch departments for filter
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await reportService.getReportFilters();
        if (response.success && response.data?.departments) {
          setDepartments(response.data.departments);
        }
      } catch (error) {
        console.error("Error fetching departments:", error);
      }
    };
    fetchDepartments();
  }, []);

  // ✅ Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const userId = user?.id || user?.user_id;
        if (!userId) return;
        const response = await fetch(`/api/notifications?user_id=${userId}`);
        const data = await response.json();
        if (data.success) {
          setNotifications(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };
    if (user?.id || user?.user_id) {
      fetchNotifications();
    }
  }, [user]);

  // ✅ Get unread count
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // ✅ Handle notification click
  const handleNotificationClick = (notification) => {
    if (notification.link) {
      navigate(notification.link);
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)),
    );
  };

  // ✅ Mark all as read
  const markAllAsRead = async () => {
    try {
      const userId = user?.id || user?.user_id;
      await fetch("/api/notifications/read-all", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const getInitials = () => {
    if (user?.full_name) {
      const names = user.full_name.split(" ");
      if (names.length >= 2) {
        return names[0][0] + names[1][0];
      }
      return names[0][0] || "U";
    }
    return "U";
  };

  const getRoleName = () => {
    const role = user?.role || "staff";
    const roles = {
      admin: "Admin",
      hr_officer: "HR Officer",
      bursar: "Bursar",
      vc: "Vice Chancellor",
      staff: "Staff",
    };
    return roles[role] || "Staff";
  };

  const handleLogout = () => {
    authService.logout();
  };

  // Replace hardcoded navItems with:
  const navItems = authService.getNavItems().map((item) => ({
    ...item,
    active: item.path === "/reports",
  }));
  const reports = [
    {
      id: 1,
      icon: "fa-file-alt",
      color: "ri-blue",
      name: "Monthly payroll summary",
      desc: "Full breakdown of all salaries, allowances and deductions for the month",
      endpoint: "payroll-summary",
    },
    {
      id: 2,
      icon: "fa-receipt",
      color: "ri-red",
      name: "PAYE remittance schedule",
      desc: "Tax deduction schedule for Oyo State IRS — due 10th of next month",
      endpoint: "paye",
    },
    {
      id: 3,
      icon: "fa-piggy-bank",
      color: "ri-green",
      name: "Pension remittance",
      desc: "Monthly pension schedule for PFA — due 7th of next month",
      endpoint: "pension",
    },
    {
      id: 4,
      icon: "fa-home",
      color: "ri-amber",
      name: "NHF remittance",
      desc: "National Housing Fund schedule for Federal Mortgage Bank",
      endpoint: "nhf",
    },
    {
      id: 5,
      icon: "fa-building",
      color: "ri-teal",
      name: "Department cost report",
      desc: "Salary cost breakdown per department and faculty",
      endpoint: "department-cost",
    },
    {
      id: 6,
      icon: "fa-calendar-alt",
      color: "ri-purple",
      name: "Annual PAYE (Form H1)",
      desc: "Annual tax declaration for Oyo State IRS — due 31 January",
      endpoint: "form-h1",
    },
    {
      id: 7,
      icon: "fa-user-plus",
      color: "ri-blue",
      name: "New staff report",
      desc: "List of all staff added to payroll this month",
      endpoint: "new-staff",
    },
    {
      id: 8,
      icon: "fa-minus-circle",
      color: "ri-green",
      name: "Deduction summary",
      desc: "Summary of all statutory and personal deductions for the month",
      endpoint: "deduction-summary",
    },
    {
      id: 9,
      icon: "fa-calendar-check",
      color: "ri-amber",
      name: "Leave report",
      desc: "Summary of all leave taken and balances per staff",
      endpoint: "leave",
    },
    {
      id: 10,
      icon: "fa-chart-line",
      color: "ri-teal",
      name: "Year-to-date earnings",
      desc: "Cumulative salary and deduction figures for each staff year to date",
      endpoint: "ytd-earnings",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" },
    },
  };

  const getColorClasses = (color) => {
    const colors = {
      "ri-blue": "bg-[#E6F1FB] text-[#185FA5]",
      "ri-green": "bg-[#EAF3DE] text-[#3B6D11]",
      "ri-amber": "bg-[#FAEEDA] text-[#633806]",
      "ri-red": "bg-[#FCEBEB] text-[#791F1F]",
      "ri-teal": "bg-[#E1F5EE] text-[#0F6E56]",
      "ri-purple": "bg-[#EEEDFE] text-[#3C3489]",
    };
    return colors[color] || "bg-[#F5F5F7] text-[#4A4A5A]";
  };

  // ✅ Format currency with proper abbreviation for large numbers
  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return "₦0";
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(numAmount) || numAmount === 0) return "₦0";

    // For display in cards, format with commas
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  };

  // ✅ Format number with abbreviation for overflow prevention
  const formatCompactCurrency = (amount) => {
    if (!amount || amount === 0) return "₦0";
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(numAmount) || numAmount === 0) return "₦0";

    // For very large numbers, use compact notation
    if (numAmount >= 10000000) {
      return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        notation: "compact",
        compactDisplay: "short",
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }).format(numAmount);
    }

    // For display in cards, format with commas
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  };

  const handleGenerateReport = async (report) => {
    try {
      setLoading(true);
      setError("");
      setActiveReport(report.id);
      setReportData(null);

      let params = {};
      if (report.endpoint === "form-h1" || report.endpoint === "ytd-earnings") {
        params = { year: selectedYear };
      } else if (
        report.endpoint === "new-staff" ||
        report.endpoint === "leave"
      ) {
        params = { month: selectedMonth, year: selectedYear };
        if (selectedDepartment !== "all") {
          params.department = selectedDepartment;
        }
      } else {
        params = { month: selectedMonth, year: selectedYear };
      }

      console.log(`📊 Generating ${report.endpoint} with params:`, params);

      let response;
      switch (report.endpoint) {
        case "payroll-summary":
          response = await reportService.getPayrollSummary(params);
          break;
        case "paye":
          response = await reportService.getPAYEReport(params);
          break;
        case "pension":
          response = await reportService.getPensionReport(params);
          break;
        case "nhf":
          response = await reportService.getNHFReport(params);
          break;
        case "department-cost":
          response = await reportService.getDepartmentCostReport(params);
          break;
        case "form-h1":
          response = await reportService.getFormH1(params);
          break;
        case "new-staff":
          response = await reportService.getNewStaffReport(params);
          break;
        case "deduction-summary":
          response = await reportService.getDeductionSummaryReport(params);
          break;
        case "leave":
          response = await reportService.getLeaveReport(params);
          break;
        case "ytd-earnings":
          setError(
            "Please select a specific staff member for YTD earnings report. This report is staff-specific.",
          );
          setLoading(false);
          return;
        default:
          setError("Report type not supported");
          setLoading(false);
          return;
      }

      console.log(`📊 ${report.endpoint} response:`, response);

      if (response.success) {
        setReportData(response.data);
      } else {
        setError(response.message || "Failed to generate report");
      }
    } catch (error) {
      console.error("Error generating report:", error);
      setError("Failed to generate report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Export Excel
  const handleExportExcel = async (report) => {
    try {
      setLoading(true);
      let params = {};
      if (report.endpoint === "form-h1" || report.endpoint === "ytd-earnings") {
        params = { year: selectedYear };
      } else {
        params = { month: selectedMonth, year: selectedYear };
      }

      const blob = await reportService.exportExcel(report.endpoint, params);
      if (blob) {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${report.endpoint}_${selectedMonth}_${selectedYear}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert("Failed to export Excel - No data available");
      }
    } catch (error) {
      console.error("Error exporting Excel:", error);
      alert("Failed to export Excel. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Render report content based on active report
  const renderReportContent = () => {
    if (!reportData) {
      return (
        <div className="text-center py-4 text-[#8A8A9A] text-sm">
          <i className="fas fa-spinner fa-spin mr-2"></i>
          Loading report data...
        </div>
      );
    }

    const report = reports.find((r) => r.id === activeReport);
    if (!report) return null;

    if (Array.isArray(reportData) && reportData.length === 0) {
      return (
        <div className="text-center py-4 text-[#8A8A9A] text-sm">
          No data found for this report
        </div>
      );
    }

    switch (report.endpoint) {
      case "payroll-summary":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-[#F5F5F7] rounded-lg p-2 text-center">
                <div className="text-[10px] text-[#4A4A5A] truncate">
                  Total Staff
                </div>
                <div className="text-base md:text-lg font-bold text-[#1A1A2E]">
                  {reportData.summary?.totalStaff || 0}
                </div>
              </div>
              <div className="bg-[#F5F5F7] rounded-lg p-2 text-center">
                <div className="text-[10px] text-[#4A4A5A] truncate">
                  Total Gross
                </div>
                <div className="text-sm md:text-base font-bold text-[#1A1A2E] truncate">
                  {formatCurrency(reportData.summary?.totalGross)}
                </div>
              </div>
              <div className="bg-[#F5F5F7] rounded-lg p-2 text-center">
                <div className="text-[10px] text-[#4A4A5A] truncate">
                  Total Deducted
                </div>
                <div className="text-sm md:text-base font-bold text-[#1A1A2E] truncate">
                  {formatCompactCurrency(reportData.summary?.totalDeductions)}
                </div>
              </div>
              <div className="bg-[#F5F5F7] rounded-lg p-2 text-center">
                <div className="text-[10px] text-[#4A4A5A] truncate">
                  Total Net
                </div>
                <div className="text-sm md:text-base font-bold text-[#1A1A2E] truncate">
                  {formatCompactCurrency(reportData.summary?.totalNet)}
                </div>
              </div>
            </div>
            <div className="text-xs text-[#8A8A9A] text-center">
              <span>
                Average Gross:{" "}
                {formatCompactCurrency(reportData.summary?.averageGross)}
              </span>
              <span className="mx-2">·</span>
              <span>
                Average Net:{" "}
                {formatCompactCurrency(reportData.summary?.averageNet)}
              </span>
            </div>
          </div>
        );

      case "paye":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#F5F5F7] rounded-lg p-2 text-center">
                <div className="text-[10px] text-[#4A4A5A] truncate">
                  Total PAYE
                </div>
                <div className="text-sm md:text-base font-bold text-[#1A1A2E] truncate">
                  {formatCompactCurrency(reportData.totalPAYE)}
                </div>
              </div>
              <div className="bg-[#F5F5F7] rounded-lg p-2 text-center">
                <div className="text-[10px] text-[#4A4A5A] truncate">
                  Effective Rate
                </div>
                <div className="text-sm md:text-base font-bold text-[#1A1A2E]">
                  {reportData.effectiveRate?.toFixed(2)}%
                </div>
              </div>
            </div>
            <p className="text-xs text-[#8A8A9A] text-center">
              Staff Count: {reportData.staffCount}
            </p>
          </div>
        );

      case "pension":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-1">
              <div className="bg-[#F5F5F7] rounded-lg p-1 text-center">
                <div className="text-[8px] text-[#4A4A5A] truncate">
                  Employee
                </div>
                <div className="text-xs font-bold text-[#1A1A2E] truncate">
                  {formatCompactCurrency(reportData.totalEmployeePension)}
                </div>
              </div>
              <div className="bg-[#F5F5F7] rounded-lg p-1 text-center">
                <div className="text-[8px] text-[#4A4A5A] truncate">
                  Employer
                </div>
                <div className="text-xs font-bold text-[#1A1A2E] truncate">
                  {formatCompactCurrency(reportData.totalEmployerPension)}
                </div>
              </div>
              <div className="bg-[#F5F5F7] rounded-lg p-1 text-center">
                <div className="text-[8px] text-[#4A4A5A] truncate">Total</div>
                <div className="text-xs font-bold text-[#1A1A2E] truncate">
                  {formatCompactCurrency(reportData.totalPension)}
                </div>
              </div>
            </div>
            <p className="text-xs text-[#8A8A9A] text-center">
              Staff Count: {reportData.staffCount}
            </p>
          </div>
        );

      case "nhf":
        return (
          <div className="space-y-4">
            <div className="bg-[#F5F5F7] rounded-lg p-2 text-center">
              <div className="text-[10px] text-[#4A4A5A] truncate">
                Total NHF
              </div>
              <div className="text-sm md:text-base font-bold text-[#1A1A2E] truncate">
                {formatCompactCurrency(reportData.totalNHF)}
              </div>
            </div>
            <p className="text-xs text-[#8A8A9A] text-center">
              Staff Count: {reportData.staffCount}
            </p>
          </div>
        );

      case "department-cost":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
              <div className="bg-[#F5F5F7] rounded-lg p-1 text-center">
                <div className="text-[8px] text-[#4A4A5A] truncate">Depts</div>
                <div className="text-xs font-bold text-[#1A1A2E]">
                  {reportData.summary?.totalDepartments || 0}
                </div>
              </div>
              <div className="bg-[#F5F5F7] rounded-lg p-1 text-center">
                <div className="text-[8px] text-[#4A4A5A] truncate">Staff</div>
                <div className="text-xs font-bold text-[#1A1A2E]">
                  {reportData.summary?.totalStaff || 0}
                </div>
              </div>
              <div className="bg-[#F5F5F7] rounded-lg p-1 text-center">
                <div className="text-[8px] text-[#4A4A5A] truncate">Gross</div>
                <div className="text-xs font-bold text-[#1A1A2E] truncate">
                  {formatCompactCurrency(reportData.summary?.totalGross)}
                </div>
              </div>
              <div className="bg-[#F5F5F7] rounded-lg p-1 text-center">
                <div className="text-[8px] text-[#4A4A5A] truncate">Net</div>
                <div className="text-xs font-bold text-[#1A1A2E] truncate">
                  {formatCompactCurrency(reportData.summary?.totalNet)}
                </div>
              </div>
            </div>
            <div className="max-h-40 overflow-y-auto">
              {reportData.departments?.slice(0, 5).map((dept, idx) => (
                <div
                  key={idx}
                  className="flex justify-between py-1 border-b border-[#E8E8E8] text-xs"
                >
                  <span className="truncate">{dept.department}</span>
                  <span className="font-medium">
                    {formatCompactCurrency(dept.totalGross)}
                  </span>
                </div>
              ))}
              {reportData.departments?.length > 5 && (
                <div className="text-[10px] text-[#8A8A9A] text-center mt-1">
                  +{reportData.departments.length - 5} more departments
                </div>
              )}
            </div>
          </div>
        );

      case "form-h1":
        // ✅ Check if reportData has data
        if (!reportData || reportData.totalPAYE === undefined) {
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#F5F5F7] rounded-lg p-2 text-center">
                  <div className="text-[10px] text-[#4A4A5A] truncate">
                    Year
                  </div>
                  <div className="text-sm md:text-base font-bold text-[#1A1A2E]">
                    {selectedYear}
                  </div>
                </div>
                <div className="bg-[#F5F5F7] rounded-lg p-2 text-center">
                  <div className="text-[10px] text-[#4A4A5A] truncate">
                    Total PAYE
                  </div>
                  <div className="text-sm md:text-base font-bold text-[#1A1A2E] truncate">
                    ₦0
                  </div>
                </div>
              </div>
              <p className="text-xs text-[#8A8A9A] text-center">
                No payroll data found for {selectedYear}
              </p>
            </div>
          );
        }

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#F5F5F7] rounded-lg p-2 text-center">
                <div className="text-[10px] text-[#4A4A5A] truncate">Year</div>
                <div className="text-sm md:text-base font-bold text-[#1A1A2E]">
                  {reportData.year || selectedYear}
                </div>
              </div>
              <div className="bg-[#F5F5F7] rounded-lg p-2 text-center">
                <div className="text-[10px] text-[#4A4A5A] truncate">
                  Total PAYE
                </div>
                <div className="text-sm md:text-base font-bold text-[#1A1A2E] truncate">
                  {formatCompactCurrency(reportData.totalPAYE || 0)}
                </div>
              </div>
            </div>
            <p className="text-xs text-[#8A8A9A] text-center">
              Staff Count: {reportData.staffCount || 0}
            </p>
            {reportData.details && reportData.details.length > 0 && (
              <div className="max-h-40 overflow-y-auto">
                {reportData.details.slice(0, 5).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between py-1 border-b border-[#E8E8E8] text-xs"
                  >
                    <span className="truncate">
                      {item.staff?.staff_id || "N/A"}
                    </span>
                    <span className="font-medium">
                      {formatCompactCurrency(item.totalPAYE)}
                    </span>
                  </div>
                ))}
                {reportData.details.length > 5 && (
                  <div className="text-[10px] text-[#8A8A9A] text-center mt-1">
                    +{reportData.details.length - 5} more staff
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case "new-staff":
        return (
          <div className="space-y-4">
            <div className="bg-[#F5F5F7] rounded-lg p-2 text-center">
              <div className="text-[10px] text-[#4A4A5A] truncate">
                New Staff Added
              </div>
              <div className="text-sm md:text-base font-bold text-[#1A1A2E]">
                {Array.isArray(reportData) ? reportData.length : 0}
              </div>
            </div>
            {Array.isArray(reportData) && reportData.length > 0 && (
              <div className="max-h-40 overflow-y-auto">
                {reportData.slice(0, 5).map((staff, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between py-1 border-b border-[#E8E8E8] text-xs"
                  >
                    <span className="truncate">
                      {staff.first_name} {staff.last_name}
                    </span>
                    <span className="text-[#8A8A9A] text-[10px]">
                      {staff.date_employed}
                    </span>
                  </div>
                ))}
                {reportData.length > 5 && (
                  <div className="text-[10px] text-[#8A8A9A] text-center mt-1">
                    +{reportData.length - 5} more staff
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case "deduction-summary":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#F5F5F7] rounded-lg p-2 text-center">
                <div className="text-[10px] text-[#4A4A5A] truncate">
                  Total Deductions
                </div>
                <div className="text-sm md:text-base font-bold text-[#1A1A2E] truncate">
                  {formatCompactCurrency(reportData.totalDeductions)}
                </div>
              </div>
              <div className="bg-[#F5F5F7] rounded-lg p-2 text-center">
                <div className="text-[10px] text-[#4A4A5A] truncate">Staff</div>
                <div className="text-sm md:text-base font-bold text-[#1A1A2E]">
                  {reportData.totalStaff || 0}
                </div>
              </div>
            </div>
            <div className="max-h-40 overflow-y-auto">
              {reportData.deductions?.slice(0, 4).map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between py-1 border-b border-[#E8E8E8] text-xs"
                >
                  <span className="truncate">{item.name}</span>
                  <span className="font-medium">
                    {formatCompactCurrency(item.total)}
                  </span>
                </div>
              ))}
              {reportData.deductions?.length > 4 && (
                <div className="text-[10px] text-[#8A8A9A] text-center mt-1">
                  +{reportData.deductions.length - 4} more
                </div>
              )}
            </div>
          </div>
        );

      case "leave":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
              <div className="bg-[#F5F5F7] rounded-lg p-1 text-center">
                <div className="text-[8px] text-[#4A4A5A] truncate">Total</div>
                <div className="text-xs font-bold text-[#1A1A2E]">
                  {reportData.summary?.totalRequests || 0}
                </div>
              </div>
              <div className="bg-[#F5F5F7] rounded-lg p-1 text-center">
                <div className="text-[8px] text-[#4A4A5A] truncate">
                  Pending
                </div>
                <div className="text-xs font-bold text-[#F5A623]">
                  {reportData.summary?.pending || 0}
                </div>
              </div>
              <div className="bg-[#F5F5F7] rounded-lg p-1 text-center">
                <div className="text-[8px] text-[#4A4A5A] truncate">
                  Approved
                </div>
                <div className="text-xs font-bold text-[#2E7D32]">
                  {reportData.summary?.approved || 0}
                </div>
              </div>
              <div className="bg-[#F5F5F7] rounded-lg p-1 text-center">
                <div className="text-[8px] text-[#4A4A5A] truncate">
                  Rejected
                </div>
                <div className="text-xs font-bold text-[#D32F2F]">
                  {reportData.summary?.rejected || 0}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <p className="text-xs text-[#8A8A9A] text-center">
            Report generated successfully
          </p>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] font-['Inter',sans-serif]">
      <div className="flex min-h-screen relative">
        {/* Sidebar - Desktop */}
        <motion.div
          initial={{ x: -60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="hidden md:flex w-[220px] bg-white border-r border-[#E8E8E8] py-4 sticky top-0 h-screen flex-shrink-0 overflow-y-auto flex-col z-30"
        >
          <div className="px-4 pb-5 border-b border-[#E8E8E8] mb-3">
            <div className="text-base font-semibold text-[#1A1A2E]">
              AATU Payroll
            </div>
            <div className="text-sm text-[#4A4A5A]">Management System</div>
          </div>

          {navItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.03, duration: 0.3 }}
              whileHover={{ x: 4, transition: { duration: 0.2 } }}
              onClick={() => item.path && navigate(item.path)}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer transition ${
                item.active
                  ? "text-[#0C447C] bg-[#E6F1FB] font-medium border-l-4 border-l-[#E65100]"
                  : "text-[#4A4A5A] hover:bg-[#F5F5F7] hover:text-[#1A1A2E]"
              }`}
            >
              <i className={`fas ${item.icon} w-5 text-center text-base`}></i>
              <span>{item.label}</span>
            </motion.div>
          ))}

          <div className="mt-auto pt-4 px-4 border-t border-[#E8E8E8]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#E65100] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                {getInitials()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-[#1A1A2E] truncate">
                  {getRoleName()}
                </div>
                <div className="text-[10px] text-[#8A8A9A] truncate">
                  {user?.email || ""}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full bg-[#E65100] hover:bg-[#BF360C] text-white px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center justify-center gap-2"
            >
              <i className="fas fa-sign-out-alt" aria-hidden="true"></i>
              Logout
            </button>
          </div>
        </motion.div>

        {/* Mobile Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                aria-hidden="true"
              />
              <motion.div
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="fixed top-0 left-0 w-[280px] h-full bg-white z-50 shadow-2xl overflow-y-auto flex flex-col md:hidden"
                role="dialog"
                aria-modal="true"
              >
                <div className="p-4 border-b border-[#E8E8E8] flex justify-between items-center flex-shrink-0">
                  <div>
                    <div className="text-base font-semibold text-[#1A1A2E]">
                      AATU Payroll
                    </div>
                    <div className="text-xs text-[#4A4A5A]">
                      Management System
                    </div>
                  </div>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-2 hover:bg-[#F5F5F7] rounded-lg transition"
                    aria-label="Close menu"
                  >
                    <i
                      className="fas fa-times text-xl text-[#4A4A5A]"
                      aria-hidden="true"
                    ></i>
                  </button>
                </div>

                <nav className="flex-1 py-2 overflow-y-auto">
                  {navItems.map((item, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        if (item.path) navigate(item.path);
                        setSidebarOpen(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 text-sm cursor-pointer transition ${
                        item.active
                          ? "text-[#0C447C] bg-[#E6F1FB] font-medium border-l-4 border-l-[#E65100]"
                          : "text-[#4A4A5A] hover:bg-[#F5F5F7] hover:text-[#1A1A2E]"
                      }`}
                    >
                      <i
                        className={`fas ${item.icon} w-5 text-center text-base`}
                      ></i>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </nav>

                <div className="flex-shrink-0 p-4 border-t border-[#E8E8E8]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-[#E65100] flex items-center justify-center text-white text-sm font-semibold">
                      {getInitials()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#1A1A2E]">
                        {getRoleName()}
                      </div>
                      <div className="text-xs text-[#8A8A9A]">
                        {user?.email || ""}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setSidebarOpen(false);
                    }}
                    className="w-full bg-[#E65100] hover:bg-[#BF360C] text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-sign-out-alt" aria-hidden="true"></i>
                    Logout
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1 p-4 md:p-8 min-w-0 overflow-x-hidden">
          {/* Top Bar */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-[#F5F5F7] rounded-lg transition text-[#4A4A5A] md:hidden"
                aria-label="Open menu"
              >
                <i className="fas fa-bars text-2xl"></i>
              </button>
              <h1 className="text-xl font-medium text-[#1A1A2E]">
                <i className="fas fa-chart-bar text-[#E65100] mr-2"></i>
                Reports
              </h1>
            </div>

            {/* Notification Bell */}
            <div className="flex items-center gap-3 md:gap-4 relative">
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 hover:bg-[#F5F5F7] rounded-lg transition"
                  aria-label="Notifications"
                >
                  <i className="fas fa-bell text-lg md:text-xl text-[#4A4A5A] hover:text-[#1A1A2E] transition"></i>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-[#E65100] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white border border-[#E8E8E8] rounded-xl shadow-lg z-50">
                    <div className="p-3 border-b border-[#E8E8E8] flex justify-between items-center">
                      <span className="text-sm font-medium text-[#1A1A2E]">
                        Notifications
                      </span>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-[#185FA5] hover:underline"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="divide-y divide-[#E8E8E8]">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-[#8A8A9A]">
                          <i className="fas fa-check-circle text-2xl block mb-2"></i>
                          All caught up! No notifications.
                        </div>
                      ) : (
                        notifications.map((notification, index) => (
                          <div
                            key={index}
                            onClick={() =>
                              handleNotificationClick(notification)
                            }
                            className={`p-3 hover:bg-[#F5F5F7] cursor-pointer transition ${
                              !notification.is_read ? "bg-[#F0F7FF]" : ""
                            }`}
                          >
                            <div className="flex gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-[#1A1A2E] font-medium truncate">
                                  {notification.title}
                                </p>
                                <p className="text-xs text-[#4A4A5A] line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-[10px] text-[#8A8A9A] mt-1">
                                  {new Date(
                                    notification.created_at,
                                  ).toLocaleDateString("en-NG", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                              {!notification.is_read && (
                                <div className="w-2 h-2 bg-[#E65100] rounded-full flex-shrink-0 mt-1"></div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div className="p-2 border-t border-[#E8E8E8] text-center">
                        <button
                          onClick={() => navigate("/audit")}
                          className="text-xs text-[#185FA5] hover:underline"
                        >
                          View all notifications
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#E65100] flex items-center justify-center text-white text-xs md:text-sm font-semibold">
                {getInitials()}
              </div>
              <div className="text-sm font-medium text-[#1A1A2E] hidden sm:block">
                {getRoleName()}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
            >
              <option value="January">January</option>
              <option value="February">February</option>
              <option value="March">March</option>
              <option value="April">April</option>
              <option value="May">May</option>
              <option value="June">June</option>
              <option value="July">July</option>
              <option value="August">August</option>
              <option value="September">September</option>
              <option value="October">October</option>
              <option value="November">November</option>
              <option value="December">December</option>
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-4 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
            >
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-4 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
            >
              <option value="all">All departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
            >
              <option value="all">All categories</option>
              <option value="academic">Academic</option>
              <option value="non-academic">Non-academic</option>
              <option value="contract">Contract</option>
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {error}
            </div>
          )}

          {/* Reports Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
          >
            {reports.map((report) => (
              <motion.div
                key={report.id}
                variants={itemVariants}
                whileHover={{
                  y: -4,
                  boxShadow: "0 8px 25px rgba(0,0,0,0.08)",
                  borderColor: "#185FA5",
                  transition: { duration: 0.2 },
                }}
                className={`bg-white border rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                  activeReport === report.id && reportData
                    ? "border-[#185FA5] shadow-md"
                    : "border-[#E8E8E8]"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-3 ${getColorClasses(report.color)}`}
                >
                  <i className={`fas ${report.icon}`}></i>
                </div>
                <div className="text-sm font-medium text-[#1A1A2E] mb-1">
                  {report.name}
                </div>
                <div className="text-xs text-[#4A4A5A] mb-3 leading-relaxed">
                  {report.desc}
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleGenerateReport(report)}
                    disabled={loading && activeReport === report.id}
                    className="px-3 py-1 text-[10px] bg-[#185FA5] hover:bg-[#0C447C] text-white rounded transition font-medium disabled:opacity-50 flex items-center gap-1"
                  >
                    {loading && activeReport === report.id ? (
                      <>
                        <svg
                          className="animate-spin h-3 w-3"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Loading...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-play"></i>
                        Generate
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleExportExcel(report)}
                    disabled={loading}
                    className="px-3 py-1 text-[10px] bg-[#0F6E56] hover:bg-[#0A5A45] text-white rounded transition font-medium disabled:opacity-50 flex items-center gap-1"
                  >
                    <i className="fas fa-file-excel"></i>
                    Excel
                  </button>
                </div>
                {activeReport === report.id && (
                  <div className="mt-3 pt-3 border-t border-[#E8E8E8]">
                    {renderReportContent()}
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
