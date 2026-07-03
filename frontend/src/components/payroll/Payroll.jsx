// src/components/payroll/Payroll.jsx
import React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { payrollService } from "../../services/payrollService";
import authService from "../../services/authService";

const Payroll = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [payrollData, setPayrollData] = useState([]);
  const [deductionSummary, setDeductionSummary] = useState([]);
  const [payrollRun, setPayrollRun] = useState(null);
  const [stats, setStats] = useState({
    totalStaff: 0,
    totalGross: 0,
    totalDeductions: 0,
    totalNet: 0,
  });
  const [currentMonth, setCurrentMonth] = useState("");
  const [currentYear, setCurrentYear] = useState("");
  const [payrollStatus, setPayrollStatus] = useState("not_started");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ✅ Role-based navigation
  const navItems = authService.getNavItems().map((item) => ({
    ...item,
    active: item.path === "/payroll",
  }));

  // ✅ Notification state
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // ✅ Fetch real data from Supabase
  useEffect(() => {
    const fetchPayrollData = async () => {
      try {
        setLoading(true);
        setError("");

        const month = new Date().toLocaleString("default", { month: "long" });
        const year = new Date().getFullYear();
        setCurrentMonth(month);
        setCurrentYear(year);

        // Get payroll summary for current month
        const summaryResponse = await payrollService.getSummary(month, year);
        if (summaryResponse.success && summaryResponse.data) {
          setPayrollRun(summaryResponse.data);

          // Process payslips to extract staff data properly
          const payslips = summaryResponse.data.payslips || [];
          const processedPayslips = payslips.map((item) => {
            const staff = item.staff || {};
            return {
              ...item,
              staff_id: staff.id,
              staff: {
                staff_id: staff.staff_id || "N/A",
                first_name: staff.first_name || "Unknown",
                last_name: staff.last_name || "",
                full_name:
                  staff.first_name && staff.last_name
                    ? `${staff.first_name} ${staff.last_name}`
                    : staff.full_name || "Unknown",
                category: staff.category || "N/A",
                email: staff.email || "",
              },
              status: item.status || "generated",
            };
          });

          setPayrollData(processedPayslips);
          const status = summaryResponse.data.status || "not_started";
          setPayrollStatus(status);
          setStats({
            totalStaff: processedPayslips.length || 0,
            totalGross: summaryResponse.data.total_gross || 0,
            totalDeductions: summaryResponse.data.total_deductions || 0,
            totalNet: summaryResponse.data.total_net || 0,
          });
        }

        // Get deduction summary
        const dedResponse = await payrollService.getDeductionSummary(
          month,
          year,
        );
        if (dedResponse.success && dedResponse.data) {
          setDeductionSummary(dedResponse.data.deductions || []);
        }
      } catch (error) {
        console.error("❌ Error fetching payroll data:", error);
        setError("Failed to load payroll data. Please refresh.");
      } finally {
        setLoading(false);
      }
    };

    fetchPayrollData();
  }, []);

  // ✅ Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch(`/api/notifications?user_id=${user?.id}`);
        const data = await response.json();
        if (data.success) {
          setNotifications(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };
    if (user?.id) {
      fetchNotifications();
    }
  }, [user?.id]);

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
      await fetch("/api/notifications/read-all", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user?.id }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  // In Payroll.jsx - Update the process payroll button
const handleProcessPayroll = async () => {
  try {
    setProcessing(true);
    setError("");
    setSuccess("Processing payroll... This may take a few moments.");

    const response = await payrollService.processPayroll({
      month: currentMonth,
      year: parseInt(currentYear),
      initiated_by: user?.id,
    });

    if (response.success) {
      setSuccess(response.message || "Payroll processed successfully!");
      setTimeout(() => window.location.reload(), 3000);
    } else {
      setError(response.message || "Failed to process payroll");
    }
  } catch (error) {
    console.error("❌ Error processing payroll:", error);
    setError(error.message || "Failed to process payroll. Please try again.");
  } finally {
    setProcessing(false);
  }
};

  // ✅ Handle approve payroll (Bursar)
  const handleApproveBursar = async () => {
    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      const response = await payrollService.approvePayroll(
        payrollRun?.id,
        user?.id,
      );
      if (response.success) {
        setSuccess("Payroll approved by Bursar successfully!");
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setError(response.message || "Failed to approve payroll");
      }
    } catch (error) {
      console.error("❌ Error approving payroll:", error);
      setError(error.message || "Failed to approve payroll. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  // ✅ Handle final approve payroll (VC)
  const handleApproveVC = async () => {
    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      const response = await payrollService.finalApprovePayroll(
        payrollRun?.id,
        user?.id,
      );
      if (response.success) {
        setSuccess("Payroll approved by VC successfully!");
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setError(response.message || "Failed to final approve payroll");
      }
    } catch (error) {
      console.error("❌ Error final approving payroll:", error);
      setError(
        error.message || "Failed to final approve payroll. Please try again.",
      );
    } finally {
      setProcessing(false);
    }
  };

  // ✅ Handle disburse payroll
  const handleDisburse = async () => {
    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      const response = await payrollService.disbursePayroll(payrollRun?.id);
      if (response.success) {
        setSuccess("Payroll disbursed successfully!");
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setError(response.message || "Failed to disburse payroll");
      }
    } catch (error) {
      console.error("❌ Error disbursing payroll:", error);
      setError(
        error.message || "Failed to disburse payroll. Please try again.",
      );
    } finally {
      setProcessing(false);
    }
  };

  // ✅ Handle Export Payroll to Excel
  const handleExportPayroll = async () => {
    try {
      setExporting(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/reports/payroll-summary/excel?month=${currentMonth}&year=${currentYear}`,
      );

      if (!response.ok) {
        throw new Error("Failed to export payroll");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `payroll_summary_${currentMonth}_${currentYear}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess(
        `Payroll exported successfully! (${payrollData.length} records)`,
      );
      setTimeout(() => setSuccess(""), 5000);
    } catch (error) {
      console.error("❌ Error exporting payroll:", error);
      setError(error.message || "Failed to export payroll. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  // Helper functions
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

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return "₦0";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: "bg-[#F5F5F7] text-[#4A4A5A]",
      computed: "bg-[#FAEEDA] text-[#633806]",
      bursar_approved: "bg-[#E6F1FB] text-[#0C447C]",
      vc_approved: "bg-[#EAF3DE] text-[#27500A]",
      disbursed: "bg-[#00843D] text-white",
      generated: "bg-[#EAF3DE] text-[#27500A]",
      paid: "bg-[#00843D] text-white",
      not_started: "bg-[#F5F5F7] text-[#4A4A5A]",
    };
    return badges[status] || badges.draft;
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: "Draft",
      computed: "Computed",
      bursar_approved: "Approved by Bursar",
      vc_approved: "Approved by VC",
      disbursed: "Disbursed",
      generated: "Ready",
      paid: "Paid",
      not_started: "Not Started",
    };
    return labels[status] || status;
  };

  const getWorkflowStep = (step) => {
    const steps = [
      "not_started",
      "draft",
      "computed",
      "bursar_approved",
      "vc_approved",
      "disbursed",
    ];
    const currentIndex = steps.indexOf(payrollStatus);
    const stepIndex = steps.indexOf(step);

    if (currentIndex >= stepIndex) return "done";
    if (currentIndex + 1 === stepIndex) return "active";
    return "pending";
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#0A2B5E] border-t-[#E65100] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#4A4A5A]">Loading payroll data...</p>
        </div>
      </div>
    );
  }

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
                <i className="fas fa-calculator text-[#E65100] mr-2"></i>
                Payroll processing — {currentMonth} {currentYear}
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

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm flex items-center justify-between">
              <span>
                <i className="fas fa-check-circle mr-2"></i>
                {success}
              </span>
              <button
                onClick={() => setSuccess("")}
                className="text-green-500 hover:text-green-700"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm flex items-center justify-between">
              <span>
                <i className="fas fa-exclamation-circle mr-2"></i>
                {error}
              </span>
              <button
                onClick={() => setError("")}
                className="text-red-500 hover:text-red-700"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}

          {/* Workflow Steps */}
          <div className="flex items-center flex-wrap gap-1 mb-6">
            {[
              {
                step: "not_started",
                label: "Not Started",
                icon: "fa-hourglass-start",
              },
              { step: "draft", label: "HR initiated", icon: "fa-user-check" },
              { step: "computed", label: "Computed", icon: "fa-calculator" },
              {
                step: "bursar_approved",
                label: "Bursar review",
                icon: "fa-check-double",
              },
              { step: "vc_approved", label: "VC approval", icon: "fa-gavel" },
              {
                step: "disbursed",
                label: "Disbursement",
                icon: "fa-university",
              },
            ].map((item, index) => {
              const status = getWorkflowStep(item.step);
              const isLast = index === 5;
              return (
                <React.Fragment key={item.step}>
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                      status === "done"
                        ? "bg-[#EAF3DE] text-[#27500A]"
                        : status === "active"
                          ? "bg-[#E6F1FB] text-[#0C447C] border border-[#B5D4F4]"
                          : "bg-[#F5F5F7] text-[#8A8A9A]"
                    }`}
                  >
                    <i
                      className={`fas ${item.icon} ${status === "done" ? "text-[#00843D]" : ""}`}
                    ></i>
                    {item.label}
                    {status === "done" && (
                      <i className="fas fa-check text-[#00843D] ml-1"></i>
                    )}
                    {status === "active" && (
                      <i className="fas fa-clock ml-1"></i>
                    )}
                  </div>
                  {!isLast && <span className="text-[#8A8A9A] text-sm">›</span>}
                </React.Fragment>
              );
            })}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total staff", value: stats.totalStaff },
              {
                label: "Total gross pay",
                value: formatCurrency(stats.totalGross),
              },
              {
                label: "Total deductions",
                value: formatCurrency(stats.totalDeductions),
              },
              { label: "Total net pay", value: formatCurrency(stats.totalNet) },
            ].map((stat, index) => (
              <div
                key={index}
                className="bg-white border border-[#E8E8E8] rounded-lg p-3"
              >
                <div className="text-xs text-[#4A4A5A] mb-1">{stat.label}</div>
                <div className="text-lg font-medium text-[#1A1A2E]">
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons - Role-based visibility */}
          {(payrollStatus === "not_started" || payrollStatus === "draft") && (
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={handleProcessPayroll}
                disabled={processing}
                className="bg-[#185FA5] hover:bg-[#0C447C] text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
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
                    Processing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-play"></i>
                    Process Payroll
                  </>
                )}
              </button>
            </div>
          )}

          {payrollStatus === "computed" &&
            (user?.role === "bursar" || user?.role === "admin") && (
              <div className="flex flex-wrap gap-3 mb-6">
                <button
                  onClick={handleApproveBursar}
                  disabled={processing}
                  className="bg-[#0F6E56] hover:bg-[#0A5A45] text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50"
                >
                  {processing ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-white"
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
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check-double"></i>
                      Approve & Forward to VC
                    </>
                  )}
                </button>
              </div>
            )}

          {payrollStatus === "bursar_approved" &&
            (user?.role === "vc" || user?.role === "admin") && (
              <div className="flex flex-wrap gap-3 mb-6">
                <button
                  onClick={handleApproveVC}
                  disabled={processing}
                  className="bg-[#0A2B5E] hover:bg-[#08224B] text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50"
                >
                  {processing ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-white"
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
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-gavel"></i>
                      Final Approve
                    </>
                  )}
                </button>
              </div>
            )}

          {payrollStatus === "vc_approved" &&
            (user?.role === "bursar" || user?.role === "admin") && (
              <div className="flex flex-wrap gap-3 mb-6">
                <button
                  onClick={handleDisburse}
                  disabled={processing}
                  className="bg-[#00843D] hover:bg-[#006D32] text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50"
                >
                  {processing ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-white"
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
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-university"></i>
                      Disburse Payroll
                    </>
                  )}
                </button>
              </div>
            )}

          {/* Status Badge */}
          {payrollStatus !== "not_started" && (
            <div className="mb-4">
              <span
                className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusBadge(payrollStatus)}`}
              >
                Status: {getStatusLabel(payrollStatus)}
              </span>
            </div>
          )}

          {/* Payroll Preview Table */}
          {payrollData.length > 0 && (
            <div className="bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5 mb-6 overflow-x-auto">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h2 className="text-sm font-medium text-[#1A1A2E]">
                  Payroll preview — {currentMonth} {currentYear}
                </h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleExportPayroll}
                    disabled={exporting}
                    className={`px-3 py-1.5 rounded-lg text-sm transition flex items-center gap-2 ${
                      exporting
                        ? "bg-[#E8E8E8] text-[#8A8A9A] cursor-not-allowed"
                        : "border border-[#E8E8E8] text-[#4A4A5A] hover:bg-[#F5F5F7]"
                    }`}
                  >
                    {exporting ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4"
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
                        Exporting...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-download"></i>
                        Export Excel
                      </>
                    )}
                  </button>
                </div>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F5F5F7]">
                    <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                      Staff ID
                    </th>
                    <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                      Name
                    </th>
                    <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium hidden sm:table-cell">
                      Category
                    </th>
                    <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium hidden md:table-cell">
                      Basic salary
                    </th>
                    <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium hidden lg:table-cell">
                      Allowances
                    </th>
                    <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                      Gross pay
                    </th>
                    <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium hidden md:table-cell">
                      Deductions
                    </th>
                    <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                      Net pay
                    </th>
                    <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payrollData.map((item, index) => {
                    const staff = item.staff || {};
                    return (
                      <tr
                        key={index}
                        className="border-b border-[#E8E8E8] last:border-b-0 hover:bg-[#F5F5F7] transition"
                      >
                        <td className="px-3 py-2 text-[#0A2B5E] text-xs font-medium">
                          {staff.staff_id || "N/A"}
                        </td>
                        <td className="px-3 py-2 text-[#1A1A2E] font-medium">
                          {staff.full_name || staff.first_name
                            ? `${staff.first_name || ""} ${staff.last_name || ""}`
                            : "Unknown"}
                        </td>
                        <td className="px-3 py-2 text-[#4A4A5A] hidden sm:table-cell">
                          <span
                            className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                              staff.category === "academic"
                                ? "bg-[#E6F1FB] text-[#0C447C]"
                                : staff.category === "non-academic"
                                  ? "bg-[#FAEEDA] text-[#633806]"
                                  : staff.category === "contract"
                                    ? "bg-[#EAF3DE] text-[#27500A]"
                                    : "bg-[#F5F5F7] text-[#4A4A5A]"
                            }`}
                          >
                            {staff.category || "N/A"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[#4A4A5A] hidden md:table-cell">
                          {formatCurrency(item.basic_salary)}
                        </td>
                        <td className="px-3 py-2 text-[#4A4A5A] hidden lg:table-cell">
                          {formatCurrency(item.total_allowances)}
                        </td>
                        <td className="px-3 py-2 text-[#1A1A2E] font-medium">
                          {formatCurrency(item.gross_pay)}
                        </td>
                        <td className="px-3 py-2 text-[#4A4A5A] hidden md:table-cell">
                          {formatCurrency(item.total_deductions)}
                        </td>
                        <td className="px-3 py-2 text-[#1A1A2E] font-medium">
                          {formatCurrency(item.net_pay)}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                              item.status === "disbursed" ||
                              item.status === "paid"
                                ? "bg-[#EAF3DE] text-[#27500A]"
                                : item.status === "generated" ||
                                    item.status === "computed"
                                  ? "bg-[#FAEEDA] text-[#633806]"
                                  : "bg-[#F5F5F7] text-[#4A4A5A]"
                            }`}
                          >
                            {item.status === "disbursed" ||
                            item.status === "paid"
                              ? "✅ Paid"
                              : item.status === "generated" ||
                                  item.status === "computed"
                                ? "Ready"
                                : item.status || "Pending"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="text-xs text-[#8A8A9A] mt-3">
                Showing {payrollData.length} of {payrollData.length} staff
              </div>
            </div>
          )}

          {payrollData.length === 0 &&
            (payrollStatus === "not_started" || payrollStatus === "draft") && (
              <div className="bg-white border border-[#E8E8E8] rounded-xl p-8 text-center">
                <i className="fas fa-calculator text-4xl text-[#E8E8E8] block mb-3"></i>
                <p className="text-[#8A8A9A]">
                  No payroll has been processed for {currentMonth} {currentYear}
                  .
                </p>
                <p className="text-xs text-[#8A8A9A] mt-1">
                  Click "Process Payroll" to generate payslips for all active
                  staff.
                </p>
              </div>
            )}

          {/* Deduction Summary */}
          {deductionSummary.length > 0 && (
            <div className="bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5 overflow-x-auto">
              <h2 className="text-sm font-medium text-[#1A1A2E] mb-4">
                Deduction summary — {currentMonth} {currentYear}
              </h2>

              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F5F5F7]">
                    <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                      Deduction type
                    </th>
                    <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                      Category
                    </th>
                    <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                      Total amount
                    </th>
                    <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                      No. of staff
                    </th>
                    <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                      Remittance due
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deductionSummary.map((item, index) => (
                    <tr
                      key={index}
                      className="border-b border-[#E8E8E8] last:border-b-0 hover:bg-[#F5F5F7] transition"
                    >
                      <td className="px-3 py-2 text-[#1A1A2E]">{item.name}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                            item.name.includes("PAYE") ||
                            item.name.includes("Pension") ||
                            item.name.includes("NHF") ||
                            item.name.includes("NHIS") ||
                            item.name.includes("NSITF")
                              ? "bg-[#E6F1FB] text-[#0C447C]"
                              : "bg-[#FAEEDA] text-[#633806]"
                          }`}
                        >
                          {item.name.includes("PAYE") ||
                          item.name.includes("Pension") ||
                          item.name.includes("NHF") ||
                          item.name.includes("NHIS") ||
                          item.name.includes("NSITF")
                            ? "Statutory"
                            : "Personal"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[#1A1A2E] font-medium">
                        {formatCurrency(item.total)}
                      </td>
                      <td className="px-3 py-2 text-[#4A4A5A]">
                        {item.staffCount}
                      </td>
                      <td className="px-3 py-2 text-[#4A4A5A]">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Payroll;
