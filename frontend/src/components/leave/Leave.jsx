// src/components/leave/Leave.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import leaveService from "../../services/leaveService";
import authService from "../../services/authService";

const Leave = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [summary, setSummary] = useState({
    totalRequests: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    totalDays: 0,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [formData, setFormData] = useState({
    staff_id: "",
    leave_type_id: "",
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // ✅ Notification state
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // ✅ Calculate total days using useMemo
  const calculatedDays = useMemo(() => {
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      if (start && end && end >= start) {
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      }
    }
    return 0;
  }, [formData.start_date, formData.end_date]);

  // ✅ Fetch leave data from Supabase
  useEffect(() => {
    const fetchLeaveData = async () => {
      try {
        setLoading(true);
        setError("");

        // Get leave types
        const typesResponse = await leaveService.getLeaveTypes();
        if (typesResponse.success) {
          setLeaveTypes(typesResponse.data || []);
        }

        // Get leave requests
        const requestsResponse = await leaveService.getAll();
        if (requestsResponse.success && requestsResponse.data) {
          setLeaveRequests(requestsResponse.data.requests || []);
          setSummary(
            requestsResponse.data.summary || {
              totalRequests: 0,
              pending: 0,
              approved: 0,
              rejected: 0,
              cancelled: 0,
              totalDays: 0,
            },
          );
        }

        // Fetch staff list for HR/Admin
        if (user.role === "hr_officer" || user.role === "admin") {
          const staffResponse = await fetch("/api/staff");
          const staffData = await staffResponse.json();
          if (staffData.success) {
            setStaffList(staffData.data || []);
          }
        }
      } catch (error) {
        console.error("Error fetching leave data:", error);
        setError("Failed to load leave data. Please refresh.");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaveData();
  }, [user.role]);

  // ✅ Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch(`/api/notifications?user_id=${user.id}`);
        const data = await response.json();
        if (data.success) {
          setNotifications(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };
    if (user.id) {
      fetchNotifications();
    }
  }, [user.id]);

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
        body: JSON.stringify({ user_id: user.id }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  }, [user.id]);

  // ✅ Handle search staff
  const handleSearchStaff = useCallback(
    (term) => {
      setSearchTerm(term);
      if (term.length > 2) {
        const found = staffList.find(
          (s) =>
            s.first_name?.toLowerCase().includes(term.toLowerCase()) ||
            s.last_name?.toLowerCase().includes(term.toLowerCase()) ||
            s.staff_id?.toLowerCase().includes(term.toLowerCase()),
        );
        if (found) {
          setSelectedStaff(found);
          setFormData((prev) => ({ ...prev, staff_id: found.id }));
        } else {
          setSelectedStaff(null);
          setFormData((prev) => ({ ...prev, staff_id: "" }));
        }
      } else {
        setSelectedStaff(null);
        setFormData((prev) => ({ ...prev, staff_id: "" }));
      }
    },
    [staffList],
  );

  // ✅ Handle form submission
  const handleSubmitRequest = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.leave_type_id) {
      setError("Please select a leave type");
      return;
    }
    if (!formData.start_date) {
      setError("Please select a start date");
      return;
    }
    if (!formData.end_date) {
      setError("Please select an end date");
      return;
    }

    // Check if staff is selected (for HR/Admin)
    if (
      (user.role === "hr_officer" || user.role === "admin") &&
      !formData.staff_id
    ) {
      setError("Please search and select a staff member");
      return;
    }

    // For staff role, use their own ID
    const targetStaffId =
      user.role === "staff" ? user.staff_id || user.id : formData.staff_id;

    if (!targetStaffId) {
      setError("Staff ID is required. Please contact HR.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const payload = {
        staff_id: targetStaffId,
        leave_type_id: formData.leave_type_id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason || "",
        user_id: user.id,
      };

      const response = await leaveService.create(payload);
      if (response.success) {
        setSuccess("Leave request submitted successfully!");
        setShowRequestForm(false);
        setFormData({
          staff_id: "",
          leave_type_id: "",
          start_date: "",
          end_date: "",
          reason: "",
        });
        setSelectedStaff(null);
        setSearchTerm("");
        // Refresh data
        const requestsResponse = await leaveService.getAll();
        if (requestsResponse.success && requestsResponse.data) {
          setLeaveRequests(requestsResponse.data.requests || []);
          setSummary(
            requestsResponse.data.summary || {
              totalRequests: 0,
              pending: 0,
              approved: 0,
              rejected: 0,
              cancelled: 0,
              totalDays: 0,
            },
          );
        }
      } else {
        setError(response.message || "Failed to submit leave request");
      }
    } catch (error) {
      console.error("Error submitting leave request:", error);
      setError("Failed to submit leave request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ Handle approve leave
  const handleApprove = useCallback(
    async (id) => {
      try {
        const response = await leaveService.approve(id, user.id);
        if (response.success) {
          setSuccess("Leave request approved!");
          // Refresh data
          const requestsResponse = await leaveService.getAll();
          if (requestsResponse.success && requestsResponse.data) {
            setLeaveRequests(requestsResponse.data.requests || []);
            setSummary(
              requestsResponse.data.summary || {
                totalRequests: 0,
                pending: 0,
                approved: 0,
                rejected: 0,
                cancelled: 0,
                totalDays: 0,
              },
            );
          }
        } else {
          setError(response.message || "Failed to approve leave");
        }
      } catch (error) {
        console.error("Error approving leave:", error);
        setError("Failed to approve leave. Please try again.");
      }
    },
    [user.id],
  );

  // ✅ Handle reject leave
  const handleReject = useCallback(
    async (id) => {
      try {
        const response = await leaveService.reject(id, {
          user_id: user.id,
          reason: "Rejected by HR",
        });
        if (response.success) {
          setSuccess("Leave request rejected!");
          // Refresh data
          const requestsResponse = await leaveService.getAll();
          if (requestsResponse.success && requestsResponse.data) {
            setLeaveRequests(requestsResponse.data.requests || []);
            setSummary(
              requestsResponse.data.summary || {
                totalRequests: 0,
                pending: 0,
                approved: 0,
                rejected: 0,
                cancelled: 0,
                totalDays: 0,
              },
            );
          }
        } else {
          setError(response.message || "Failed to reject leave");
        }
      } catch (error) {
        console.error("Error rejecting leave:", error);
        setError("Failed to reject leave. Please try again.");
      }
    },
    [user.id],
  );

  // Helper functions
  const getInitials = useCallback(() => {
    if (user.full_name) {
      const names = user.full_name.split(" ");
      if (names.length >= 2) {
        return names[0][0] + names[1][0];
      }
      return names[0][0] || "U";
    }
    return "U";
  }, [user.full_name]);

  const getRoleName = useCallback(() => {
    const role = user.role || "staff";
    const roles = {
      admin: "Admin",
      hr_officer: "HR Officer",
      bursar: "Bursar",
      vc: "Vice Chancellor",
      staff: "Staff",
    };
    return roles[role] || "Staff";
  }, [user.role]);

  const handleLogout = useCallback(() => {
    authService.logout();
  }, []);

  // Replace hardcoded navItems with:
  const navItems = authService.getNavItems().map((item) => ({
    ...item,
    active: item.path === "/leave",
  }));
  const getStatusBadge = useCallback((status) => {
    const badges = {
      pending: "bg-[#FAEEDA] text-[#633806]",
      approved: "bg-[#EAF3DE] text-[#27500A]",
      rejected: "bg-[#FCEBEB] text-[#791F1F]",
      cancelled: "bg-[#F5F5F7] text-[#4A4A5A]",
    };
    return badges[status] || badges.pending;
  }, []);

  const getStatusLabel = useCallback((status) => {
    const labels = {
      pending: "Pending",
      approved: "✅ Approved",
      rejected: "❌ Rejected",
      cancelled: "Cancelled",
    };
    return labels[status] || status;
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

  const cardVariants = useMemo(
    () => ({
      hidden: { opacity: 0, y: 20 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: "easeOut" },
      },
    }),
    [],
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#0A2B5E] border-t-[#E65100] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#4A4A5A]">Loading leave data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] font-['Inter',sans-serif]">
      <div className="flex min-h-screen relative">
        {/* Sidebar — Desktop */}
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
                  {user.email || ""}
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

        {/* Sidebar — Mobile */}
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
                        {user.email || ""}
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

        {/* ============================================================
                    MAIN CONTENT
                ============================================================ */}
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
                <i className="fas fa-calendar-alt text-[#E65100] mr-2"></i>
                Leave management
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
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
              <i className="fas fa-check-circle mr-2"></i> {success}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              <i className="fas fa-exclamation-circle mr-2"></i> {error}
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
              <div className="text-xs text-[#4A4A5A] mb-1">Total requests</div>
              <div className="text-xl font-bold text-[#1A1A2E]">
                {summary.totalRequests}
              </div>
            </motion.div>
            <motion.div
              variants={itemVariants}
              className="bg-white border border-[#E8E8E8] rounded-xl p-3"
            >
              <div className="text-xs text-[#4A4A5A] mb-1">
                Pending approval
              </div>
              <div className="text-xl font-bold text-[#F5A623]">
                {summary.pending}
              </div>
            </motion.div>
            <motion.div
              variants={itemVariants}
              className="bg-white border border-[#E8E8E8] rounded-xl p-3"
            >
              <div className="text-xs text-[#4A4A5A] mb-1">Approved</div>
              <div className="text-xl font-bold text-[#2E7D32]">
                {summary.approved}
              </div>
            </motion.div>
            <motion.div
              variants={itemVariants}
              className="bg-white border border-[#E8E8E8] rounded-xl p-3"
            >
              <div className="text-xs text-[#4A4A5A] mb-1">Rejected</div>
              <div className="text-xl font-bold text-[#D32F2F]">
                {summary.rejected}
              </div>
            </motion.div>
          </motion.div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Column - Leave Requests Table */}
            <div>
              <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5 mb-4"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-medium text-[#1A1A2E]">
                    Leave requests
                  </h2>
                  <button
                    onClick={() => {
                      setShowRequestForm(!showRequestForm);
                      setError("");
                      setSuccess("");
                    }}
                    className="bg-[#185FA5] hover:bg-[#0C447C] text-white px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2"
                  >
                    <i className="fas fa-plus"></i>
                    New request
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F5F5F7]">
                        <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                          Staff
                        </th>
                        <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                          Type
                        </th>
                        <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                          Days
                        </th>
                        <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                          Status
                        </th>
                        <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveRequests.length > 0 ? (
                        leaveRequests.map((item, index) => {
                          const staff = item.staff || {};
                          const leaveType = item.leave_type || {};
                          return (
                            <tr
                              key={index}
                              className="border-b border-[#E8E8E8] last:border-b-0 hover:bg-[#F5F5F7] transition"
                            >
                              <td className="px-3 py-2 text-[#1A1A2E]">
                                {staff.first_name || ""} {staff.last_name || ""}
                              </td>
                              <td className="px-3 py-2 text-[#4A4A5A]">
                                {leaveType.name || "N/A"}
                              </td>
                              <td className="px-3 py-2 text-[#4A4A5A]">
                                {item.total_days || 0}
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={`text-[10px] px-2 py-1 rounded-full font-medium ${getStatusBadge(item.status)}`}
                                >
                                  {getStatusLabel(item.status)}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                {item.status === "pending" &&
                                (user.role === "hr_officer" ||
                                  user.role === "admin") ? (
                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={() => handleApprove(item.id)}
                                      className="px-2 py-1 text-[10px] bg-[#0F6E56] hover:bg-[#0A5A45] text-white rounded transition font-medium"
                                      title="Approve"
                                    >
                                      ✓
                                    </button>
                                    <button
                                      onClick={() => handleReject(item.id)}
                                      className="px-2 py-1 text-[10px] bg-[#791F1F] hover:bg-[#631A1A] text-white rounded transition font-medium"
                                      title="Reject"
                                    >
                                      ✗
                                    </button>
                                  </div>
                                ) : (
                                  <button className="px-2 py-1 text-[10px] border border-[#E8E8E8] rounded text-[#4A4A5A] hover:bg-[#F5F5F7] transition">
                                    View
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan="5"
                            className="text-center py-4 text-[#8A8A9A]"
                          >
                            No leave requests found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>

              {/* Leave Types Configuration */}
              <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5"
              >
                <h2 className="text-sm font-medium text-[#1A1A2E] mb-4">
                  Leave types configuration
                </h2>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F5F5F7]">
                        <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                          Leave type
                        </th>
                        <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                          Days
                        </th>
                        <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                          Affects salary
                        </th>
                        <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                          Active
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveTypes.length > 0 ? (
                        leaveTypes.map((item, index) => (
                          <tr
                            key={index}
                            className="border-b border-[#E8E8E8] last:border-b-0 hover:bg-[#F5F5F7] transition"
                          >
                            <td className="px-3 py-2 text-[#1A1A2E]">
                              {item.name}
                            </td>
                            <td className="px-3 py-2 text-[#4A4A5A]">
                              {item.days_entitled}
                            </td>
                            <td className="px-3 py-2 text-[#4A4A5A]">
                              {item.affects_salary ? "Yes" : "No"}
                            </td>
                            <td className="px-3 py-2 text-[#00843D]">
                              {item.is_active ? "✅" : "❌"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="4"
                            className="text-center py-4 text-[#8A8A9A]"
                          >
                            No leave types configured
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </div>

            {/* Right Column — New Leave Request Form */}
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5"
            >
              <h2 className="text-sm font-medium text-[#1A1A2E] mb-4">
                {showRequestForm ? "New leave request" : "Request leave"}
              </h2>

              {showRequestForm ? (
                <form onSubmit={handleSubmitRequest} className="space-y-3">
                  {/* Staff Search — Only for HR/Admin */}
                  {(user.role === "hr_officer" || user.role === "admin") && (
                    <div>
                      <label className="block text-xs font-medium text-[#4A4A5A] mb-1">
                        Staff name / ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Search staff..."
                        value={searchTerm}
                        onChange={(e) => handleSearchStaff(e.target.value)}
                        className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
                      />
                      {selectedStaff && (
                        <div className="mt-1 text-xs text-[#0F6E56]">
                          <i className="fas fa-check-circle"></i> Selected:{" "}
                          {selectedStaff.first_name} {selectedStaff.last_name} (
                          {selectedStaff.staff_id})
                        </div>
                      )}
                      {!selectedStaff && searchTerm.length > 2 && (
                        <div className="mt-1 text-xs text-[#8A8A9A]">
                          No staff found. Try a different search.
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-[#4A4A5A] mb-1">
                      Leave type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.leave_type_id}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          leave_type_id: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
                      required
                    >
                      <option value="">Select leave type</option>
                      {leaveTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name} ({type.days_entitled} days)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#4A4A5A] mb-1">
                      Start date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          start_date: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#4A4A5A] mb-1">
                      End date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          end_date: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#4A4A5A] mb-1">
                      Total days
                    </label>
                    <input
                      type="text"
                      value={
                        calculatedDays > 0
                          ? `${calculatedDays} days`
                          : "Select dates"
                      }
                      readOnly
                      className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg bg-[#F5F5F7] text-[#4A4A5A] text-sm cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#4A4A5A] mb-1">
                      Reason
                    </label>
                    <textarea
                      rows="3"
                      placeholder="Brief reason for leave..."
                      value={formData.reason}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          reason: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm resize-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRequestForm(false);
                        setFormData({
                          staff_id: "",
                          leave_type_id: "",
                          start_date: "",
                          end_date: "",
                          reason: "",
                        });
                        setSelectedStaff(null);
                        setSearchTerm("");
                        setError("");
                        setSuccess("");
                      }}
                      className="flex-1 bg-[#F5F5F7] hover:bg-[#E8E8E8] text-[#4A4A5A] px-4 py-2 rounded-lg text-sm font-medium transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 bg-[#185FA5] hover:bg-[#0C447C] text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {submitting ? (
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
                          Submitting...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-check"></i>
                          Submit request
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-8 text-[#8A8A9A]">
                  <i className="fas fa-calendar-plus text-4xl block mb-3"></i>
                  <p>Click "New request" to submit a leave application</p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leave;
