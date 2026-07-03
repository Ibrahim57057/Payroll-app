// src/components/audit/AuditLog.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { auditService } from "../../services/auditService";
import authService from "../../services/authService";

const AuditLog = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    logins: 0,
    payrollChanges: 0,
    staffChanges: 0,
  });
  const [filters, setFilters] = useState({
    search: "",
    module: "all",
    action: "all",
    user: "all",
    date: "",
  });
  const [exporting, setExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const hasFetched = useRef(false);

  // ✅ Notification state
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // ✅ Calculate stats from logs
  const calculateStats = useCallback((logs) => {
    const total = logs.length;
    const logins = logs.filter((item) => item.action === "LOGIN").length;
    const payrollChanges = logs.filter(
      (item) => item.module === "payroll",
    ).length;
    const staffChanges = logs.filter(
      (item) => item.module === "staff" || item.module === "users",
    ).length;

    setStats({ total, logins, payrollChanges, staffChanges });
  }, []);

  // ✅ Fetch audit logs from Supabase
  const fetchAuditLogs = useCallback(async () => {
    // Prevent multiple fetches
    if (hasFetched.current) return;
    hasFetched.current = true;

    try {
      setLoading(true);
      setError("");

      console.log("🔄 Fetching audit logs...");
      const response = await auditService.getLogs({ limit: 100 });
      console.log("📦 Audit logs response:", response);

      if (response.success) {
        const logsData = Array.isArray(response.data) ? response.data : [];
        setAuditLogs(logsData);
        calculateStats(logsData);
        console.log(`✅ Loaded ${logsData.length} audit logs`);
      } else {
        console.error("❌ Failed to fetch audit logs:", response.message);
        setError(response.message || "Failed to load audit logs");
        setAuditLogs([]);
      }
    } catch (error) {
      console.error("❌ Error fetching audit logs:", error);
      setError(error.message || "Failed to load audit logs. Please refresh.");
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  }, [calculateStats]);

  // Load audit logs on mount
  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // ✅ Refresh audit logs (for after mutations)
  const refreshAuditLogs = useCallback(() => {
    hasFetched.current = false;
    fetchAuditLogs();
  }, [fetchAuditLogs]);

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
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  // ✅ Handle notification click
  const handleNotificationClick = useCallback(
    (notification) => {
      if (notification.link) {
        navigate(notification.link);
      }
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, is_read: true } : n,
        ),
      );
    },
    [navigate],
  );

  // ✅ Mark all as read
  const markAllAsRead = useCallback(async () => {
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
  }, [user?.id]);

  // ✅ Calculate filtered logs using useMemo
  const filteredLogs = useMemo(() => {
    let filtered = [...auditLogs];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.description?.toLowerCase().includes(searchLower) ||
          item.users?.full_name?.toLowerCase().includes(searchLower) ||
          item.action?.toLowerCase().includes(searchLower),
      );
    }

    // Module filter
    if (filters.module !== "all") {
      filtered = filtered.filter((item) => item.module === filters.module);
    }

    // Action filter
    if (filters.action !== "all") {
      filtered = filtered.filter((item) => item.action === filters.action);
    }

    // User filter
    if (filters.user !== "all") {
      filtered = filtered.filter(
        (item) => item.users?.full_name === filters.user,
      );
    }

    // Date filter
    if (filters.date) {
      const filterDate = new Date(filters.date);
      filterDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(filterDate);
      nextDay.setDate(nextDay.getDate() + 1);

      filtered = filtered.filter((item) => {
        const itemDate = new Date(item.created_at);
        return itemDate >= filterDate && itemDate < nextDay;
      });
    }

    return filtered;
  }, [
    auditLogs,
    filters.search,
    filters.module,
    filters.action,
    filters.user,
    filters.date,
  ]);

  // ✅ Get paginated logs
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredLogs.slice(startIndex, endIndex);
  }, [filteredLogs, currentPage]);

  // ✅ Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  }, [filteredLogs.length]);

  // ✅ Handle filter changes
  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  }, []);

  // ✅ Reset filters - FIXED
  const handleResetFilters = useCallback(() => {
    setFilters({
      search: "",
      module: "all",
      action: "all",
      user: "all",
      date: "",
    });
    setCurrentPage(1);
    setSuccess("Filters reset successfully!");
    setTimeout(() => setSuccess(""), 3000);
  }, []);

  // ✅ Get unique users for filter dropdown
  const getUniqueUsers = useCallback(() => {
    const userMap = {};
    auditLogs.forEach((item) => {
      if (item.users?.full_name) {
        userMap[item.users.full_name] = true;
      }
    });
    return Object.keys(userMap);
  }, [auditLogs]);

  // ✅ Handle export logs - FIXED
  const handleExportLogs = async () => {
    try {
      setExporting(true);
      setError("");
      setSuccess("");

      // Build export params from filters
      const params = {};
      if (filters.module !== "all") params.module = filters.module;
      if (filters.action !== "all") params.action = filters.action;
      if (filters.date) params.startDate = filters.date;
      if (filters.search) params.search = filters.search;
      if (filters.user !== "all") params.user = filters.user;

      console.log("📤 Exporting logs with params:", params);

      const blob = await auditService.exportLogs(params);

      if (blob) {
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const dateStr = new Date().toISOString().split("T")[0];
        link.download = `audit_logs_${dateStr}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        setSuccess(
          `Audit logs exported successfully! (${filteredLogs.length} records)`,
        );
        setTimeout(() => setSuccess(""), 5000);
      } else {
        setError("Failed to export audit logs. No data available.");
      }
    } catch (error) {
      console.error("❌ Error exporting logs:", error);
      setError(
        error.message || "Failed to export audit logs. Please try again.",
      );
    } finally {
      setExporting(false);
    }
  };

  // ✅ Handle page change
  const handlePageChange = useCallback(
    (page) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
      }
    },
    [totalPages],
  );

  // Helper functions
  const getInitials = useCallback(() => {
    if (user?.full_name) {
      const names = user.full_name.split(" ");
      if (names.length >= 2) {
        return names[0][0] + names[1][0];
      }
      return names[0][0] || "U";
    }
    return "U";
  }, [user?.full_name]);

  const getRoleName = useCallback(() => {
    const role = user?.role || "staff";
    const roles = {
      admin: "Admin",
      hr_officer: "HR Officer",
      bursar: "Bursar",
      vc: "Vice Chancellor",
      staff: "Staff",
    };
    return roles[role] || "Staff";
  }, [user?.role]);

  const handleLogout = useCallback(() => {
    authService.logout();
    navigate("/login");
  }, [navigate]);

  // ✅ Role-based navigation
  const navItems = authService.getNavItems().map((item) => ({
    ...item,
    active: item.path === "/audit", // Change this to the current route
  }));
  const getActionBadge = useCallback((actionType) => {
    const action = actionType?.toLowerCase() || "";
    const badges = {
      create: "bg-[#EAF3DE] text-[#27500A]",
      update: "bg-[#E6F1FB] text-[#0C447C]",
      delete: "bg-[#FCEBEB] text-[#791F1F]",
      login: "bg-[#EEEDFE] text-[#3C3489]",
      approve: "bg-[#FAEEDA] text-[#633806]",
      email: "bg-[#E1F5EE] text-[#085041]",
      create_user: "bg-[#EAF3DE] text-[#27500A]",
      update_user: "bg-[#E6F1FB] text-[#0C447C]",
      delete_user: "bg-[#FCEBEB] text-[#791F1F]",
      reset_password: "bg-[#FAEEDA] text-[#633806]",
    };
    return badges[action] || "bg-[#F5F5F7] text-[#4A4A5A]";
  }, []);

  const getActionLabel = useCallback((action) => {
    const labels = {
      CREATE: "Created",
      UPDATE: "Updated",
      DELETE: "Deleted",
      LOGIN: "Login",
      APPROVE: "Approved",
      EMAIL: "Email",
      CREATE_USER: "Created User",
      UPDATE_USER: "Updated User",
      DELETE_USER: "Deleted User",
      RESET_PASSWORD: "Reset Password",
    };
    return labels[action] || action;
  }, []);

  const containerVariants = useMemo(
    () => ({
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: 0.1,
          delayChildren: 0.2,
        },
      },
    }),
    [],
  );

  const itemVariants = useMemo(
    () => ({
      hidden: { opacity: 0, y: 20 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: "easeOut" },
      },
    }),
    [],
  );

  // Format date
  const formatDate = useCallback((dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-NG", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#0A2B5E] border-t-[#E65100] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#4A4A5A]">Loading audit logs...</p>
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

        {/* Sidebar - Mobile */}
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
              <h1 className="text-xl font-medium text-[#1A1A2E]">
                <i className="fas fa-list-alt text-[#E65100] mr-2"></i>
                Audit log
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

          {/* Success & Error Messages */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm flex items-center justify-between">
              <span>
                <i className="fas fa-check-circle mr-2"></i> {success}
              </span>
              <button
                onClick={() => setSuccess("")}
                className="text-green-500 hover:text-green-700"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm flex items-center justify-between">
              <span>
                <i className="fas fa-exclamation-circle mr-2"></i> {error}
              </span>
              <button
                onClick={() => setError("")}
                className="text-red-500 hover:text-red-700"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}

          {/* Stats Cards */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
          >
            <motion.div
              variants={itemVariants}
              className="bg-white border border-[#E8E8E8] rounded-xl p-3"
            >
              <div className="text-xs text-[#4A4A5A] mb-1">Total actions</div>
              <div className="text-xl font-bold text-[#1A1A2E]">
                {stats.total}
              </div>
            </motion.div>
            <motion.div
              variants={itemVariants}
              className="bg-white border border-[#E8E8E8] rounded-xl p-3"
            >
              <div className="text-xs text-[#4A4A5A] mb-1">Logins</div>
              <div className="text-xl font-bold text-[#1A1A2E]">
                {stats.logins}
              </div>
            </motion.div>
            <motion.div
              variants={itemVariants}
              className="bg-white border border-[#E8E8E8] rounded-xl p-3"
            >
              <div className="text-xs text-[#4A4A5A] mb-1">Payroll changes</div>
              <div className="text-xl font-bold text-[#1A1A2E]">
                {stats.payrollChanges}
              </div>
            </motion.div>
            <motion.div
              variants={itemVariants}
              className="bg-white border border-[#E8E8E8] rounded-xl p-3"
            >
              <div className="text-xs text-[#4A4A5A] mb-1">Staff changes</div>
              <div className="text-xl font-bold text-[#1A1A2E]">
                {stats.staffChanges}
              </div>
            </motion.div>
          </motion.div>

          {/* Filters */}
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-wrap gap-3 mb-4"
          >
            <div className="flex-1 min-w-[180px] relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8A9A]"></i>
              <input
                type="text"
                placeholder="Search by user or action..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
              />
            </div>
            <select
              value={filters.module}
              onChange={(e) => handleFilterChange("module", e.target.value)}
              className="px-4 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
            >
              <option value="all">All modules</option>
              <option value="staff">Staff</option>
              <option value="payroll">Payroll</option>
              <option value="salary">Salary structure</option>
              <option value="leave">Leave</option>
              <option value="users">Users</option>
              <option value="settings">Settings</option>
              <option value="payslip">Payslip</option>
            </select>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange("action", e.target.value)}
              className="px-4 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
            >
              <option value="all">All actions</option>
              <option value="LOGIN">Login</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="APPROVE">Approve</option>
              <option value="EMAIL">Email</option>
              <option value="RESET_PASSWORD">Reset Password</option>
            </select>
            <select
              value={filters.user}
              onChange={(e) => handleFilterChange("user", e.target.value)}
              className="px-4 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
            >
              <option value="all">All users</option>
              {getUniqueUsers().map((userName) => (
                <option key={userName} value={userName}>
                  {userName}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => handleFilterChange("date", e.target.value)}
              className="px-4 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
            />
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 border border-[#E8E8E8] rounded-lg text-sm text-[#4A4A5A] hover:bg-[#F5F5F7] transition flex items-center gap-2"
            >
              <i className="fas fa-undo"></i>
              Reset
            </button>
            <button
              onClick={handleExportLogs}
              disabled={exporting || filteredLogs.length === 0}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                exporting || filteredLogs.length === 0
                  ? "bg-[#E8E8E8] text-[#8A8A9A] cursor-not-allowed"
                  : "bg-[#185FA5] hover:bg-[#0C447C] text-white"
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
                  Export ({filteredLogs.length})
                </>
              )}
            </button>
          </motion.div>

          {/* Activity Log Table */}
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5 overflow-x-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-medium text-[#1A1A2E]">
                Activity log — {filteredLogs.length} records
              </h2>
              <button
                onClick={refreshAuditLogs}
                className="text-sm text-[#185FA5] hover:text-[#0C447C] transition flex items-center gap-1"
              >
                <i className="fas fa-sync-alt"></i> Refresh
              </button>
            </div>

            {filteredLogs.length > 0 ? (
              <>
                <table className="w-full text-xs md:text-sm">
                  <thead>
                    <tr className="bg-[#F5F5F7]">
                      <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                        Time
                      </th>
                      <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                        User
                      </th>
                      <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium hidden sm:table-cell">
                        Module
                      </th>
                      <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                        Action
                      </th>
                      <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium hidden lg:table-cell">
                        Description
                      </th>
                      <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium hidden xl:table-cell">
                        IP
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.map((item, index) => (
                      <tr
                        key={item.id || index}
                        className="border-b border-[#E8E8E8] last:border-b-0 hover:bg-[#F5F5F7] transition"
                      >
                        <td className="px-3 py-2 whitespace-nowrap text-[#4A4A5A] text-xs">
                          {formatDate(item.created_at)}
                        </td>
                        <td className="px-3 py-2 text-[#1A1A2E] font-medium">
                          {item.users?.full_name || "System"}
                        </td>
                        <td className="px-3 py-2 text-[#4A4A5A] hidden sm:table-cell">
                          <span className="capitalize">{item.module}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`text-[10px] px-2 py-1 rounded-full font-medium ${getActionBadge(item.action)}`}
                          >
                            {getActionLabel(item.action)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[#4A4A5A] hidden lg:table-cell max-w-[300px] truncate">
                          {item.description}
                        </td>
                        <td className="px-3 py-2 text-[#8A8A9A] hidden xl:table-cell font-mono text-xs">
                          {item.ip_address || "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-4 pt-3 border-t border-[#E8E8E8]">
                    <span className="text-xs text-[#8A8A9A]">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                      {Math.min(
                        currentPage * itemsPerPage,
                        filteredLogs.length,
                      )}{" "}
                      of {filteredLogs.length} records
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`px-3 py-1 rounded text-xs border border-[#E8E8E8] transition ${
                          currentPage === 1
                            ? "text-[#8A8A9A] cursor-not-allowed"
                            : "text-[#4A4A5A] hover:bg-[#F5F5F7]"
                        }`}
                      >
                        ‹
                      </button>
                      {Array.from(
                        { length: Math.min(totalPages, 5) },
                        (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-3 py-1 rounded text-xs border transition ${
                                currentPage === pageNum
                                  ? "bg-[#185FA5] text-white border-[#185FA5]"
                                  : "text-[#4A4A5A] hover:bg-[#F5F5F7] border-[#E8E8E8]"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        },
                      )}
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-1 rounded text-xs border border-[#E8E8E8] transition ${
                          currentPage === totalPages
                            ? "text-[#8A8A9A] cursor-not-allowed"
                            : "text-[#4A4A5A] hover:bg-[#F5F5F7]"
                        }`}
                      >
                        ›
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-[#8A8A9A]">
                <i className="fas fa-inbox text-4xl block mb-3"></i>
                <p>No audit logs found matching your filters</p>
                <button
                  onClick={handleResetFilters}
                  className="mt-3 text-sm text-[#185FA5] hover:underline"
                >
                  <i className="fas fa-undo mr-1"></i> Reset filters
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AuditLog;
