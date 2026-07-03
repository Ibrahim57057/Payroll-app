// src/components/dashboard/Dashboard.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { dashboardService } from "../../services/dashboardService";
import authService from "../../services/authService";

const Dashboard = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [stats, setStats] = useState({
    totalStaff: 0,
    activeStaff: 0,
    totalPayroll: 0,
    totalPayslips: 0,
    pendingLeave: 0,
    academicStaff: 0,
    nonAcademicStaff: 0,
    contractStaff: 0,
  });
  const [payrollStatus, setPayrollStatus] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [pendingActions, setPendingActions] = useState([]);

  // ✅ Get user role
  const userRole = user?.role || "staff";

  // ✅ Role-based navigation
  const navItems = authService.getNavItems().map((item) => ({
    ...item,
    active: item.path === "/dashboard",
  }));

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
    const roles = {
      admin: "Admin",
      hr_officer: "HR Officer",
      bursar: "Bursar",
      vc: "Vice Chancellor",
      staff: "Staff",
    };
    return roles[userRole] || "Staff";
  };

  const handleLogout = () => {
    authService.logout();
  };

  // ✅ Generate pending actions based on user role
  const generatePendingActions = (payrollData, statsData) => {
    const actions = [];

    // Only show payroll actions for relevant roles
    if (["admin", "bursar", "vc"].includes(userRole)) {
      if (payrollData && payrollData.length > 0) {
        const pendingPayroll = payrollData.find(
          (item) =>
            item.status === "computed" || item.status === "bursar_approved",
        );
        if (pendingPayroll) {
          actions.push({
            label: `${pendingPayroll.month} ${pendingPayroll.year} payroll - ${
              pendingPayroll.status === "computed"
                ? "Awaiting Bursar approval"
                : "Awaiting VC approval"
            }`,
            status: "Pending",
            type: "warn",
            action: "View Payroll",
            path: "/payroll",
          });
        }
      }
    }

    // Show leave actions for admin, HR, and staff
    if (["admin", "hr_officer"].includes(userRole)) {
      if (statsData && statsData.pendingLeave > 0) {
        actions.push({
          label: `${statsData.pendingLeave} leave request${
            statsData.pendingLeave > 1 ? "s" : ""
          } awaiting approval`,
          status: "Pending",
          type: "warn",
          action: "View Leave",
          path: "/leave",
        });
      }
    }

    if (actions.length === 0) {
      actions.push({
        label: "All caught up! No pending actions",
        status: "Complete",
        type: "success",
        action: null,
        path: null,
      });
    }

    setPendingActions(actions);
  };

  // ✅ Fetch data - CLEAR DATA FIRST on each load
  useEffect(() => {
    // Clear previous data when component mounts or user changes
    setPayrollStatus([]);
    setRecentActivity([]);
    setPendingActions([]);
    setStats({
      totalStaff: 0,
      activeStaff: 0,
      totalPayroll: 0,
      totalPayslips: 0,
      pendingLeave: 0,
      academicStaff: 0,
      nonAcademicStaff: 0,
      contractStaff: 0,
    });

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const userId = user?.id || user?.user_id;
        const currentUserRole = authService.getUserRole();

        // Fetch stats - Always fetch
        const statsRes = await dashboardService.getStats();
        if (statsRes.success) {
          setStats(statsRes.data);
        }

        // Fetch payroll status - only if user has access
        if (["admin", "hr_officer", "bursar", "vc"].includes(currentUserRole)) {
          const payrollRes = await dashboardService.getPayrollStatus();
          if (payrollRes.success) {
            setPayrollStatus(payrollRes.data || []);
          }
        } else {
          setPayrollStatus([]);
        }

        // Fetch recent activity - only for admin, HR, bursar
        if (["admin", "hr_officer", "bursar"].includes(currentUserRole)) {
          const activityRes = await dashboardService.getRecentActivity(5);
          if (activityRes.success) {
            setRecentActivity(activityRes.data || []);
          }
        } else {
          setRecentActivity([]);
        }

        // Fetch notifications
        if (userId) {
          try {
            const notifRes = await dashboardService.getNotifications(userId);
            if (notifRes.success) {
              setNotifications(notifRes.data || []);
            }
          } catch {
            // Silently fail - notifications are optional
          }
        }

        // Generate pending actions
        generatePendingActions(payrollStatus, statsRes.data || {});
      } catch {
        setError("Failed to load dashboard data. Please refresh.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, user?.user_id, userRole]); // Re-fetch when user changes

  // ✅ Handle notification click
  const handleNotificationClick = (notification) => {
    if (notification.link) {
      navigate(notification.link);
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)),
    );
  };

  // ✅ Handle pending action click
  const handlePendingActionClick = (action) => {
    if (action.path) {
      navigate(action.path);
    }
  };

  // ✅ Format currency
  const formatCurrency = (amount) => {
    if (!amount) return "₦0";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // ✅ Get unread notification count
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // ✅ Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#0A2B5E] border-t-[#E65100] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#4A4A5A]">Loading dashboard...</p>
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
              <i className="fas fa-sign-out-alt"></i> Logout
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
                    <i className="fas fa-times text-xl text-[#4A4A5A]"></i>
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
                    <i className="fas fa-sign-out-alt"></i> Logout
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
              <div>
                <div className="text-xl md:text-2xl font-semibold text-[#1A1A2E]">
                  Dashboard
                </div>
                <div className="text-xs md:text-sm text-[#8A8A9A] mt-0.5">
                  {new Date().toLocaleDateString("en-NG", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 md:gap-4 relative">
              {/* Notification Bell */}
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
                          onClick={() => {
                            setNotifications((prev) =>
                              prev.map((n) => ({ ...n, is_read: true })),
                            );
                          }}
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

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {error}
            </div>
          )}

          {/* Welcome */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-[#0A2B5E] to-[#0C447C] text-white rounded-xl p-4 md:p-6 mb-6"
          >
            <h2 className="text-xl md:text-2xl font-semibold">
              Welcome back, {user?.full_name || "User"}! 👋
            </h2>
            <p className="text-sm text-white/70 mt-1">
              {new Date().toLocaleDateString("en-NG", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </motion.div>

          {/* Stats - Role-based visibility */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
            {/* Total Staff - All roles */}
            <div
              onClick={() => {
                if (["admin", "hr_officer"].includes(userRole)) {
                  navigate("/staff");
                }
              }}
              className={`bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5 ${
                ["admin", "hr_officer"].includes(userRole)
                  ? "cursor-pointer hover:shadow-md transition-shadow"
                  : ""
              }`}
            >
              <div className="text-xs md:text-sm text-[#4A4A5A] mb-1">
                <i className="fas fa-users mr-2 text-[#8A8A9A]"></i> Total staff
              </div>
              <div className="text-2xl md:text-3xl font-bold text-[#1A1A2E]">
                {stats.totalStaff}
              </div>
              <div className="text-xs md:text-sm text-[#8A8A9A] mt-1">
                {stats.academicStaff} academic · {stats.nonAcademicStaff}{" "}
                non-academic · {stats.contractStaff} contract
              </div>
            </div>

            {/* Total Payroll - Admin, HR, Bursar, VC */}
            {["admin", "hr_officer", "bursar", "vc"].includes(userRole) && (
              <div
                onClick={() => navigate("/payroll")}
                className="bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="text-xs md:text-sm text-[#4A4A5A] mb-1">
                  <i className="fas fa-coins mr-2 text-[#8A8A9A]"></i> Total
                  payroll (June)
                </div>
                <div className="text-2xl md:text-3xl font-bold text-[#1A1A2E]">
                  {formatCurrency(stats.totalPayroll)}
                </div>
                <div className="text-xs md:text-sm text-[#8A8A9A] mt-1">
                  Processed 25 Jun 2026
                </div>
              </div>
            )}

            {/* Payslips - All roles */}
            <div
              onClick={() => navigate("/payslips")}
              className="bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="text-xs md:text-sm text-[#4A4A5A] mb-1">
                <i className="fas fa-file-invoice mr-2 text-[#8A8A9A]"></i>{" "}
                Payslips generated
              </div>
              <div className="text-2xl md:text-3xl font-bold text-[#1A1A2E]">
                {stats.totalPayslips}
              </div>
              <div className="text-xs md:text-sm text-[#8A8A9A] mt-1">
                All staff — June 2026
              </div>
            </div>

            {/* Leave Requests - Admin, HR, Staff */}
            {["admin", "hr_officer", "staff"].includes(userRole) && (
              <div
                onClick={() => navigate("/leave")}
                className="bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="text-xs md:text-sm text-[#4A4A5A] mb-1">
                  <i className="fas fa-calendar-alt mr-2 text-[#8A8A9A]"></i>{" "}
                  Leave requests
                </div>
                <div className="text-2xl md:text-3xl font-bold text-[#1A1A2E]">
                  {stats.pendingLeave}
                </div>
                <div className="text-xs md:text-sm text-[#F5A623] mt-1">
                  <i className="fas fa-exclamation-triangle mr-1"></i> Pending
                  approval
                </div>
              </div>
            )}
          </div>

          {/* Payroll approval + Recent activity - Role-based */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Payroll approval status - Admin, HR, Bursar, VC */}
            {["admin", "hr_officer", "bursar", "vc"].includes(userRole) && (
              <div className="bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm md:text-base font-medium text-[#1A1A2E]">
                    <i className="fas fa-clock mr-2 text-[#4A4A5A]"></i> Payroll
                    approval status
                  </div>
                  <button
                    onClick={() => navigate("/payroll")}
                    className="text-xs text-[#185FA5] hover:underline"
                  >
                    View All →
                  </button>
                </div>
                {payrollStatus.length === 0 ? (
                  <p className="text-sm text-[#8A8A9A]">
                    No payroll records found
                  </p>
                ) : (
                  payrollStatus.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center py-3 border-b border-[#E8E8E8] text-sm last:border-b-0"
                    >
                      <span className="text-[#4A4A5A]">
                        {item.month} {item.year} payroll
                      </span>
                      <span
                        className={`text-[10px] md:text-xs px-2 md:px-3 py-1 rounded-full font-medium ${
                          item.status === "disbursed"
                            ? "bg-[#EAF3DE] text-[#27500A]"
                            : item.status === "approved_vc"
                              ? "bg-[#E6F1FB] text-[#0C447C]"
                              : item.status === "bursar_approved"
                                ? "bg-[#E6F1FB] text-[#0C447C]"
                                : item.status === "computed"
                                  ? "bg-[#FAEEDA] text-[#633806]"
                                  : "bg-[#FCEBEB] text-[#791F1F]"
                        }`}
                      >
                        {item.status === "disbursed"
                          ? "Disbursed"
                          : item.status === "approved_vc"
                            ? "Approved by VC"
                            : item.status === "bursar_approved"
                              ? "Approved by Bursar"
                              : item.status === "computed"
                                ? "Computed"
                                : item.status === "draft"
                                  ? "Draft"
                                  : item.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Recent activity - Admin, HR, Bursar */}
            {["admin", "hr_officer", "bursar"].includes(userRole) && (
              <div className="bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm md:text-base font-medium text-[#1A1A2E]">
                    <i className="fas fa-bolt mr-2 text-[#4A4A5A]"></i> Recent
                    activity
                  </div>
                  <button
                    onClick={() => navigate("/audit")}
                    className="text-xs text-[#185FA5] hover:underline"
                  >
                    View All →
                  </button>
                </div>
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-[#8A8A9A]">No recent activity</p>
                ) : (
                  recentActivity.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 py-3 border-b border-[#E8E8E8] text-sm last:border-b-0"
                    >
                      <div
                        className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full mt-1.5 flex-shrink-0"
                        style={{
                          background:
                            item.action === "CREATE"
                              ? "#0A2B5E"
                              : item.action === "PAYROLL"
                                ? "#00843D"
                                : item.action === "LEAVE"
                                  ? "#F5A623"
                                  : "#8A8A9A",
                        }}
                      ></div>
                      <div>
                        <div className="text-xs md:text-sm text-[#4A4A5A]">
                          {item.description}
                        </div>
                        <div className="text-[10px] md:text-xs text-[#8A8A9A] mt-0.5">
                          <i className="fas fa-user mr-1"></i>
                          {item.users?.full_name || "Unknown"} ·{" "}
                          {new Date(item.created_at).toLocaleDateString(
                            "en-NG",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Faculty payroll cost - Admin, HR, Bursar, VC */}
          {["admin", "hr_officer", "bursar", "vc"].includes(userRole) && (
            <div className="bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5 mb-6">
              <div className="text-sm md:text-base font-medium text-[#1A1A2E] mb-4">
                <i className="fas fa-chart-bar mr-2 text-[#4A4A5A]"></i> Payroll
                cost by faculty — June 2026
              </div>
              {[
                {
                  label: "Natural & Applied Sciences",
                  value: "₦19.2M",
                  width: "78%",
                },
                { label: "Engineering", value: "₦17.8M", width: "72%" },
                {
                  label: "Environmental Sciences",
                  value: "₦7.4M",
                  width: "30%",
                },
                {
                  label: "Non-teaching departments",
                  value: "₦4.2M",
                  width: "17%",
                },
              ].map((item, index) => (
                <div key={index} className="mb-3 last:mb-0">
                  <div className="flex justify-between text-xs md:text-sm text-[#4A4A5A] mb-1.5">
                    <span>{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                  <div className="h-2 md:h-2.5 bg-[#F5F5F7] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: item.width }}
                      transition={{
                        duration: 0.8,
                        delay: index * 0.1,
                        ease: "easeOut",
                      }}
                      className="h-full rounded-full"
                      style={{ background: "#0A2B5E" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pending actions + Staff breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pending actions - All roles */}
            <div className="bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5">
              <div className="text-sm md:text-base font-medium text-[#1A1A2E] mb-4">
                <i className="fas fa-exclamation-triangle mr-2 text-[#4A4A5A]"></i>{" "}
                Pending actions
              </div>
              {pendingActions.length === 0 ? (
                <p className="text-sm text-[#8A8A9A]">
                  Loading pending actions...
                </p>
              ) : pendingActions.length === 1 &&
                pendingActions[0].label ===
                  "All caught up! No pending actions" ? (
                <div className="text-center py-4 text-sm text-[#8A8A9A]">
                  <i className="fas fa-check-circle text-2xl block mb-2 text-[#00843D]"></i>
                  All caught up! No pending actions.
                </div>
              ) : (
                pendingActions.map((item, index) => (
                  <div
                    key={index}
                    className={`flex justify-between items-center py-3 border-b border-[#E8E8E8] text-sm last:border-b-0 ${
                      item.path
                        ? "cursor-pointer hover:bg-[#F5F5F7] transition px-2 rounded"
                        : ""
                    }`}
                    onClick={() => item.path && handlePendingActionClick(item)}
                  >
                    <span className="text-[#4A4A5A]">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] md:text-xs px-2 md:px-3 py-1 rounded-full font-medium ${
                          item.type === "warn"
                            ? "bg-[#FAEEDA] text-[#633806]"
                            : item.type === "danger"
                              ? "bg-[#FCEBEB] text-[#791F1F]"
                              : item.type === "success"
                                ? "bg-[#EAF3DE] text-[#27500A]"
                                : "bg-[#E6F1FB] text-[#0C447C]"
                        }`}
                      >
                        {item.status}
                      </span>
                      {item.action && item.path && (
                        <span className="text-[10px] text-[#185FA5] font-medium">
                          {item.action} →
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Staff breakdown - Admin, HR */}
            {["admin", "hr_officer"].includes(userRole) && (
              <div className="bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5">
                <div className="text-sm md:text-base font-medium text-[#1A1A2E] mb-4">
                  <i className="fas fa-users mr-2 text-[#4A4A5A]"></i> Staff
                  breakdown
                </div>
                <div
                  onClick={() => navigate("/staff")}
                  className="cursor-pointer"
                >
                  {[
                    {
                      label: "Academic",
                      value: `${stats.academicStaff || 0} (${stats.totalStaff ? Math.round(((stats.academicStaff || 0) / stats.totalStaff) * 100) : 0}%)`,
                      width: `${stats.totalStaff ? Math.round(((stats.academicStaff || 0) / stats.totalStaff) * 100) : 0}%`,
                    },
                    {
                      label: "Non-academic",
                      value: `${stats.nonAcademicStaff || 0} (${stats.totalStaff ? Math.round(((stats.nonAcademicStaff || 0) / stats.totalStaff) * 100) : 0}%)`,
                      width: `${stats.totalStaff ? Math.round(((stats.nonAcademicStaff || 0) / stats.totalStaff) * 100) : 0}%`,
                    },
                    {
                      label: "Contract",
                      value: `${stats.contractStaff || 0} (${stats.totalStaff ? Math.round(((stats.contractStaff || 0) / stats.totalStaff) * 100) : 0}%)`,
                      width: `${stats.totalStaff ? Math.round(((stats.contractStaff || 0) / stats.totalStaff) * 100) : 0}%`,
                    },
                  ].map((item, index) => (
                    <div key={index} className="mb-3 last:mb-0">
                      <div className="flex justify-between text-xs md:text-sm text-[#4A4A5A] mb-1.5">
                        <span>{item.label}</span>
                        <span className="font-medium">{item.value}</span>
                      </div>
                      <div className="h-2 md:h-2.5 bg-[#F5F5F7] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: item.width }}
                          transition={{
                            duration: 0.8,
                            delay: index * 0.15,
                            ease: "easeOut",
                          }}
                          className="h-full rounded-full"
                          style={{ background: "#00843D" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
