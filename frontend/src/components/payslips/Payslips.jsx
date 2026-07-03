// src/components/payslips/Payslips.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { payslipService } from "../../services/payslipService";
import authService from "../../services/authService";

const Payslips = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("June");
  const [selectedYear, setSelectedYear] = useState("2026");
  const [payslipData, setPayslipData] = useState(null);
  const [payslipItems, setPayslipItems] = useState([]);
  const [error, setError] = useState("");
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showPayrollLink, setShowPayrollLink] = useState(false);

  // ✅ Notification state
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // ✅ Role-based navigation
  const navItems = authService.getNavItems().map((item) => ({
    ...item,
    active: item.path === "/payslips",
  }));

  // ✅ Fetch staff list
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await fetch("/api/staff");
        const data = await response.json();
        if (data.success) {
          setStaffList(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching staff:", error);
      }
    };
    fetchStaff();
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

  // ✅ Filter staff based on search term
  const filteredStaff =
    searchTerm.length === 0
      ? []
      : staffList.filter(
          (s) =>
            s.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.staff_id?.toLowerCase().includes(searchTerm.toLowerCase()),
        );

  // ✅ Show dropdown only when there are results
  const showDropdown = searchTerm.length > 0 && filteredStaff.length > 0;

  // ✅ Select staff from dropdown
  const handleSelectStaff = (staff) => {
    setSelectedStaff(staff);
    setSearchTerm(`${staff.first_name} ${staff.last_name} (${staff.staff_id})`);
    setError("");
    setShowPayrollLink(false);
  };

  // ✅ Clear search
  const handleClearSearch = () => {
    setSearchTerm("");
    setSelectedStaff(null);
    setError("");
    setShowPayrollLink(false);
  };

  // ✅ Fetch payslip when search is performed
  const handleViewPayslip = async () => {
    if (!selectedStaff) {
      setError("Please search and select a staff member");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setShowPayrollLink(false);
      setPayslipData(null);
      setPayslipItems([]);

      const staffId = selectedStaff.id;
      console.log("Fetching payslip for staffId:", staffId);

      if (!staffId) {
        setError("Invalid staff selected (missing ID)");
        setLoading(false);
        return;
      }

      if (!selectedMonth || !selectedYear) {
        setError("Please select a valid month and year");
        setLoading(false);
        return;
      }

      const response = await payslipService.getPreview(
        staffId,
        selectedMonth,
        selectedYear,
      );

      console.log("Payslip response:", response);

      if (response.success && response.data) {
        setPayslipData(response.data);
        setPayslipItems(response.data.payslip_items || []);
        setError("");
        setShowPayrollLink(false);
      } else {
        const errorMsg =
          response.message || "No payslip found for this staff member.";
        setError(errorMsg);

        // Check if error is about no payroll
        if (
          errorMsg.includes("No payroll found") ||
          errorMsg.includes("process payroll")
        ) {
          setShowPayrollLink(true);
        }
      }
    } catch (error) {
      console.error("Error fetching payslip:", error);
      const errorMsg =
        error.response?.data?.message ||
        "Failed to load payslip. Please try again.";
      setError(errorMsg);

      if (
        errorMsg.includes("No payroll found") ||
        errorMsg.includes("process payroll")
      ) {
        setShowPayrollLink(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Download PDF
  const handleDownloadPDF = async () => {
    if (!payslipData?.id) {
      alert("No payslip to download");
      return;
    }
    try {
      const pdfBlob = await payslipService.generatePDF(payslipData.id);
      if (pdfBlob) {
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `payslip_${payslipData.staff?.staff_id || "staff"}_${selectedMonth}_${selectedYear}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert("Failed to generate PDF");
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Failed to download PDF");
    }
  };

  // ✅ Handle Email Payslip
  const handleEmailPayslip = async () => {
    if (!payslipData?.id) {
      alert("No payslip to email");
      return;
    }
    try {
      const response = await payslipService.emailPayslip(
        payslipData.id,
        user?.id || user?.user_id,
      );
      if (response.success) {
        alert("Payslip emailed successfully to staff!");
      } else {
        alert(response.message || "Failed to email payslip");
      }
    } catch (error) {
      console.error("Error emailing payslip:", error);
      alert("Failed to email payslip");
    }
  };

  // ✅ Handle Print Payslip
  const handlePrintPayslip = () => {
    window.print();
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
    if (!amount) return "₦0.00";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  // Get staff display name
  const getStaffName = () => {
    if (!payslipData?.staff) return "No name";
    const staff = payslipData.staff;
    return (
      `${staff.first_name || ""} ${staff.last_name || ""}`.trim() || "No name"
    );
  };

  const getStaffDepartment = () => {
    return payslipData?.staff?.departments?.name || "N/A";
  };

  const getStaffFaculty = () => {
    return payslipData?.staff?.departments?.faculties?.name || "N/A";
  };

  const getGradeLevel = () => {
    const grade = payslipData?.staff?.grade_levels;
    if (!grade) return "N/A";
    return `GL ${grade.grade_level} / Step ${grade.step}`;
  };

  const getDesignation = () => {
    return payslipData?.staff?.grade_levels?.designation || "N/A";
  };

  const getBankName = () => {
    return payslipData?.staff?.bank_name || "N/A";
  };

  const getAccountNumber = () => {
    const acc = payslipData?.staff?.account_number || "";
    if (acc.length > 4) {
      return `${acc.slice(0, 2)}●●●●●●●●${acc.slice(-2)}`;
    }
    return acc || "N/A";
  };

  const getEarnings = () => {
    return payslipItems.filter(
      (item) => item.item_type === "earning" || item.item_type === "allowance",
    );
  };

  const getDeductions = () => {
    return payslipItems.filter((item) => item.item_type === "deduction");
  };

  // Get available months
  const months = [
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

  // Get available years
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

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
                <i className="fas fa-file-invoice text-[#E65100] mr-2"></i>
                Payslip viewer
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

          {/* Search Section */}
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5 mb-4"
          >
            <div className="flex flex-col gap-3">
              {/* Search input - full width */}
              <div className="relative w-full">
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8A9A]"></i>
                <input
                  type="text"
                  placeholder="Search staff name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
                />

                {/* Clear button */}
                {searchTerm.length > 0 && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8A9A] hover:text-[#1A1A2E] transition"
                  >
                    <i className="fas fa-times-circle"></i>
                  </button>
                )}

                {/* Dropdown */}
                {showDropdown && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-[#E8E8E8] rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                    {filteredStaff.map((staff) => (
                      <div
                        key={staff.id}
                        onClick={() => handleSelectStaff(staff)}
                        className="px-4 py-2.5 hover:bg-[#F5F5F7] cursor-pointer transition flex justify-between items-center border-b border-[#E8E8E8] last:border-b-0"
                      >
                        <span className="text-sm text-[#1A1A2E] font-medium">
                          {staff.first_name} {staff.last_name}
                        </span>
                        <span className="text-xs text-[#8A8A9A] bg-[#F5F5F7] px-2 py-0.5 rounded">
                          {staff.staff_id}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Filters row - responsive grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
                >
                  {months.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleViewPayslip}
                  disabled={loading}
                  className="w-full px-6 py-2.5 bg-[#185FA5] hover:bg-[#0C447C] text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
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
                  ) : (
                    <>
                      <i className="fas fa-search"></i>
                      View payslip
                    </>
                  )}
                </button>
              </div>

              {/* Selected staff indicator */}
              {selectedStaff && (
                <div className="mt-2 text-sm text-[#0F6E56] bg-[#EAF3DE] px-3 py-1.5 rounded-lg flex items-center gap-2">
                  <i className="fas fa-check-circle"></i>
                  <span>
                    Selected:{" "}
                    <strong>
                      {selectedStaff.first_name} {selectedStaff.last_name}
                    </strong>{" "}
                    ({selectedStaff.staff_id})
                  </span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm flex items-center justify-between flex-wrap gap-2">
              <span>
                <i className="fas fa-exclamation-circle mr-2"></i>
                {error}
              </span>
              {showPayrollLink && (
                <button
                  onClick={() => navigate("/payroll")}
                  className="px-3 py-1 bg-[#185FA5] hover:bg-[#0C447C] text-white rounded-lg text-xs font-medium transition flex items-center gap-1"
                >
                  <i className="fas fa-calculator"></i>
                  Go to Payroll
                </button>
              )}
            </div>
          )}

          {/* Payslip */}
          {payslipData && !loading && (
            <motion.div
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="bg-white border border-[#E8E8E8] rounded-xl p-6 max-w-2xl mx-auto"
            >
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                <button
                  onClick={handleDownloadPDF}
                  className="px-3 py-1.5 border border-[#E8E8E8] rounded-lg text-sm text-[#4A4A5A] hover:bg-[#F5F5F7] transition flex items-center gap-2"
                >
                  <i className="fas fa-download"></i>
                  Download PDF
                </button>
                <button
                  onClick={handleEmailPayslip}
                  className="px-3 py-1.5 border border-[#E8E8E8] rounded-lg text-sm text-[#4A4A5A] hover:bg-[#F5F5F7] transition flex items-center gap-2"
                >
                  <i className="fas fa-envelope"></i>
                  Email to staff
                </button>
                <button
                  onClick={handlePrintPayslip}
                  className="px-3 py-1.5 border border-[#E8E8E8] rounded-lg text-sm text-[#4A4A5A] hover:bg-[#F5F5F7] transition flex items-center gap-2"
                >
                  <i className="fas fa-print"></i>
                  Print
                </button>
              </div>

              {/* Payslip Content */}
              <div className="payslip-content">
                {/* Header */}
                <div className="border-b-2 border-[#185FA5] pb-4 mb-4">
                  <div className="text-base font-medium text-[#185FA5]">
                    Abiola Ajimobi Technical University (Tech-U)
                  </div>
                  <div className="text-xs text-[#4A4A5A]">
                    Developing Brains, Training Hands | Ibadan, Oyo State,
                    Nigeria
                  </div>
                </div>

                {/* Title */}
                <div className="text-sm font-medium text-[#1A1A2E] bg-[#F5F5F7] py-1.5 px-3 rounded-lg text-center mb-4">
                  PAYSLIP — {selectedMonth} {selectedYear}
                </div>

                {/* Staff Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mb-4 text-sm">
                  <div>
                    <span className="text-[#4A4A5A]">Staff name</span>
                    <span className="block font-medium text-[#1A1A2E]">
                      {getStaffName()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#4A4A5A]">Staff ID</span>
                    <span className="block font-medium text-[#1A1A2E]">
                      {payslipData?.staff?.staff_id || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#4A4A5A]">Department</span>
                    <span className="block font-medium text-[#1A1A2E]">
                      {getStaffDepartment()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#4A4A5A]">Faculty</span>
                    <span className="block font-medium text-[#1A1A2E]">
                      {getStaffFaculty()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#4A4A5A]">Grade level / Step</span>
                    <span className="block font-medium text-[#1A1A2E]">
                      {getGradeLevel()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#4A4A5A]">Designation</span>
                    <span className="block font-medium text-[#1A1A2E]">
                      {getDesignation()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#4A4A5A]">Bank</span>
                    <span className="block font-medium text-[#1A1A2E]">
                      {getBankName()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#4A4A5A]">Account number</span>
                    <span className="block font-medium text-[#1A1A2E]">
                      {getAccountNumber()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#4A4A5A]">Payment date</span>
                    <span className="block font-medium text-[#1A1A2E]">
                      28 {selectedMonth} {selectedYear}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#4A4A5A]">Tax ID (TIN)</span>
                    <span className="block font-medium text-[#1A1A2E]">
                      {payslipData?.staff?.tax_id || "N/A"}
                    </span>
                  </div>
                </div>

                {/* Earnings */}
                <div className="mb-3">
                  <div className="text-xs font-medium text-[#4A4A5A] uppercase tracking-wider border-b border-[#E8E8E8] pb-1 mb-1">
                    Earnings
                  </div>
                  {getEarnings().map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between py-1 text-sm border-b border-[#E8E8E8]"
                    >
                      <span>{item.item_name}</span>
                      <span>{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  {payslipData?.basic_salary && getEarnings().length === 0 && (
                    <div className="flex justify-between py-1 text-sm border-b border-[#E8E8E8]">
                      <span>Basic Salary</span>
                      <span>{formatCurrency(payslipData.basic_salary)}</span>
                    </div>
                  )}
                </div>

                {/* Gross Pay */}
                <div className="flex justify-between py-2 px-4 rounded-lg bg-[#F5F5F7] text-sm font-medium mb-3">
                  <span>Gross pay</span>
                  <span>{formatCurrency(payslipData?.gross_pay)}</span>
                </div>

                {/* Deductions */}
                <div className="mb-3">
                  <div className="text-xs font-medium text-[#4A4A5A] uppercase tracking-wider border-b border-[#E8E8E8] pb-1 mb-1">
                    Deductions
                  </div>
                  {getDeductions().map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between py-1 text-sm border-b border-[#E8E8E8]"
                    >
                      <span>{item.item_name}</span>
                      <span>{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>

                {/* Total Deductions */}
                <div className="flex justify-between py-2 px-4 rounded-lg bg-[#FCEBEB] text-[#791F1F] text-sm font-medium mb-2">
                  <span>Total deductions</span>
                  <span>{formatCurrency(payslipData?.total_deductions)}</span>
                </div>

                {/* Net Pay */}
                <div className="flex justify-between py-3 px-4 rounded-lg bg-[#185FA5] text-white text-base font-medium">
                  <span>Net pay</span>
                  <span>{formatCurrency(payslipData?.net_pay)}</span>
                </div>

                {/* Footer */}
                <div className="text-xs text-[#8A8A9A] text-center mt-4 pt-3 border-t border-[#E8E8E8]">
                  This payslip is computer generated and requires no signature.
                  <br />
                  For enquiries contact the Bursary department — Abiola Ajimobi
                  Technical University, Ibadan.
                </div>
              </div>
            </motion.div>
          )}

          {/* No payslip message */}
          {!payslipData && !loading && !error && (
            <div className="bg-white border border-[#E8E8E8] rounded-xl p-8 text-center max-w-2xl mx-auto">
              <i className="fas fa-file-invoice text-4xl text-[#E8E8E8] block mb-3"></i>
              <p className="text-[#8A8A9A]">
                Search for a staff member and month to view their payslip.
              </p>
              <p className="text-xs text-[#8A8A9A] mt-1">
                Make sure payroll has been processed for the selected month.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Payslips;
