// src/components/staff/Staff.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { staffService } from "../../services/staffService";
import authService from "../../services/authService";

const Staff = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    staff_id: "",
    category: "academic",
    department_id: "",
    grade_level_id: "",
    step: 1,
    bank_name: "",
    account_number: "",
    pfa_name: "",
    rsa_pin: "",
    tax_id: "",
    nhf_number: "",
    date_employed: "",
    status: "active",
  });
  const [departments, setDepartments] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);

  // ✅ Fetch staff from Supabase
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await staffService.getAll();
        if (response.success) {
          setStaff(response.data || []);
        } else {
          setError("Failed to load staff");
        }
      } catch (error) {
        console.error("❌ Error fetching staff:", error);
        setError("Failed to load staff. Please refresh.");
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, []);

  // ✅ Fetch departments and grade levels
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch departments
        const deptResponse = await fetch("/api/departments");
        const deptData = await deptResponse.json();
        if (deptData.success) {
          setDepartments(deptData.data || []);
        } else {
          console.error("Failed to fetch departments:", deptData.message);
        }

        // Fetch grade levels
        const gradeResponse = await fetch("/api/grade-levels");
        const gradeData = await gradeResponse.json();
        if (gradeData.success) {
          setGradeLevels(gradeData.data || []);
        } else {
          console.error("Failed to fetch grade levels:", gradeData.message);
        }
      } catch (error) {
        console.error("Error fetching form data:", error);
      }
    };
    fetchData();
  }, []);

  // ✅ Fetch departments and grade levels
  useEffect(() => {
    const fetchData = async () => {
      try {
        const deptResponse = await fetch("/api/departments");
        const deptData = await deptResponse.json();
        if (deptData.success) {
          setDepartments(deptData.data || []);
        }

        const gradeResponse = await fetch("/api/grade-levels");
        const gradeData = await gradeResponse.json();
        if (gradeData.success) {
          setGradeLevels(gradeData.data || []);
        }
      } catch (error) {
        console.error("Error fetching form data:", error);
      }
    };
    fetchData();
  }, []);

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

  // ✅ Handle notification click
  const handleNotificationClick = (notification) => {
    if (notification.link) {
      navigate(notification.link);
    }
    // Mark as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)),
    );
  };

  // ✅ Get unread notification count
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // ✅ Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Handle category change
  const handleCategoryChange = (category) => {
    setFormData((prev) => ({
      ...prev,
      category,
      grade_level_id: "",
    }));
  };

  // ✅ Handle add staff
  const handleAddStaff = async (e) => {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");

      const response = await staffService.create(formData);
      if (response.success) {
        setSuccess("Staff added successfully!");
        setShowModal(false);
        setFormData({
          first_name: "",
          last_name: "",
          email: "",
          phone: "",
          staff_id: "",
          category: "academic",
          department_id: "",
          grade_level_id: "",
          step: 1,
          bank_name: "",
          account_number: "",
          pfa_name: "",
          rsa_pin: "",
          tax_id: "",
          nhf_number: "",
          date_employed: "",
          status: "active",
        });
        const refreshResponse = await staffService.getAll();
        if (refreshResponse.success) {
          setStaff(refreshResponse.data || []);
        }
      } else {
        setError(response.message || "Failed to add staff");
      }
    } catch (error) {
      console.error("Error adding staff:", error);
      setError("Failed to add staff. Please try again.");
    }
  };

  // ✅ Handle edit staff
  const handleEditStaff = (staffItem) => {
    setEditingStaff(staffItem);
    setFormData({
      first_name: staffItem.first_name || "",
      last_name: staffItem.last_name || "",
      email: staffItem.email || "",
      phone: staffItem.phone || "",
      staff_id: staffItem.staff_id || "",
      category: staffItem.category || "academic",
      department_id: staffItem.department_id || "",
      grade_level_id: staffItem.grade_level_id || "",
      step: staffItem.step || 1,
      bank_name: staffItem.bank_name || "",
      account_number: staffItem.account_number || "",
      pfa_name: staffItem.pfa_name || "",
      rsa_pin: staffItem.rsa_pin || "",
      tax_id: staffItem.tax_id || "",
      nhf_number: staffItem.nhf_number || "",
      date_employed: staffItem.date_employed || "",
      status: staffItem.status || "active",
    });
    setShowModal(true);
  };

  // ✅ Handle delete staff
  const handleDeleteStaff = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      setError("");
      const response = await staffService.delete(id);
      if (response.success) {
        setSuccess(`${name} deactivated successfully!`);
        const refreshResponse = await staffService.getAll();
        if (refreshResponse.success) {
          setStaff(refreshResponse.data || []);
        }
      } else {
        setError(response.message || "Failed to delete staff");
      }
    } catch (error) {
      console.error("Error deleting staff:", error);
      setError("Failed to delete staff. Please try again.");
    }
  };

  // ✅ Handle view staff
  const handleViewStaff = (staffItem) => {
    alert(
      `Staff Details:\n\nName: ${staffItem.first_name} ${staffItem.last_name}\nID: ${staffItem.staff_id}\nEmail: ${staffItem.email}\nDepartment: ${staffItem.departments?.name || "N/A"}\nCategory: ${staffItem.category}\nGrade: ${staffItem.grade_levels?.grade_level || "N/A"}\nStatus: ${staffItem.status}`,
    );
  };

  // ✅ Handle export staff
  const handleExportStaff = async () => {
    try {
      alert("Exporting staff list to Excel...");
    } catch (error) {
      console.error("Error exporting staff:", error);
      setError("Failed to export staff list");
    }
  };

  // ✅ Handle import staff
  const handleImportStaff = async () => {
    try {
      alert("Import staff from Excel/CSV...");
    } catch (error) {
      console.error("Error importing staff:", error);
      setError("Failed to import staff");
    }
  };

  // Helper functions
  const getInitials = () => {
    if (user.full_name) {
      const names = user.full_name.split(" ");
      if (names.length >= 2) {
        return names[0][0] + names[1][0];
      }
      return names[0][0] || "U";
    }
    return "U";
  };

  const getRoleName = () => {
    const role = user.role || "staff";
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
    active: item.path === "/staff",
  }));
  // Filter staff
  const filteredStaff = staff.filter((item) => {
    const fullName =
      `${item.first_name || ""} ${item.last_name || ""}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      item.staff_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      filterCategory === "all" || item.category === filterCategory;
    const matchesStatus =
      filterStatus === "all" || item.status === filterStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getCategoryBadge = (category) => {
    const badges = {
      academic: "bg-[#E6F1FB] text-[#0C447C]",
      "non-academic": "bg-[#E1F5EE] text-[#085041]",
      contract: "bg-[#FAEEDA] text-[#633806]",
    };
    return badges[category] || "bg-[#F5F5F7] text-[#4A4A5A]";
  };

  const getCategoryLabel = (category) => {
    const labels = {
      academic: "Academic",
      "non-academic": "Non-academic",
      contract: "Contract",
    };
    return labels[category] || category;
  };

  const getStatusBadge = (status) => {
    return status === "active"
      ? "bg-[#EAF3DE] text-[#27500A]"
      : "bg-[#FCEBEB] text-[#791F1F]";
  };

  const getStatusLabel = (status) => {
    return status === "active" ? "Active" : "Inactive";
  };

  const getFilteredGradeLevels = () => {
    const category = formData.category;
    return gradeLevels.filter(
      (g) => g.salary_structures?.category === category,
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#0A2B5E] border-t-[#E65100] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#4A4A5A]">Loading staff...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] font-['Inter',sans-serif]">
      <div className="flex min-h-screen relative">
        {/* ============================================================
                    SIDEBAR — Desktop
                ============================================================ */}
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
              <i className="fas fa-sign-out-alt" aria-hidden="true"></i>
              Logout
            </button>
          </div>
        </motion.div>

        {/* ============================================================
                    SIDEBAR — Mobile
                ============================================================ */}
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
                    <i className="fas fa-sign-out-alt" aria-hidden="true"></i>
                    Logout
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
          {/* Top Bar with Hamburger & Notifications */}
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
                <i className="fas fa-users text-[#E65100] mr-2"></i>
                Staff management
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

                {/* Notification Dropdown */}
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

          {/* Success & Error Messages */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
              <i className="fas fa-check-circle mr-2"></i>
              {success}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {error}
            </div>
          )}

          {/* Filters & Actions - Fixed overflow */}
          <div className="flex flex-wrap gap-2 mb-4">
            {/* Search - Fixed width */}
            <div className="flex-1 min-w-[180px] max-w-[320px] relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8A9A]"></i>
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
            >
              <option value="all">All categories</option>
              <option value="academic">Academic</option>
              <option value="non-academic">Non-academic</option>
              <option value="contract">Contract</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button
              onClick={() => setShowModal(true)}
              className="bg-[#185FA5] hover:bg-[#0C447C] text-white px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 whitespace-nowrap"
            >
              <i className="fas fa-plus"></i>
              Add
            </button>
            <button
              onClick={handleExportStaff}
              className="bg-[#00843D] hover:bg-[#005A2C] text-white px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 whitespace-nowrap"
            >
              <i className="fas fa-file-export"></i>
              Export
            </button>
            <button
              onClick={handleImportStaff}
              className="bg-[#0A2B5E] hover:bg-[#08224B] text-white px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 whitespace-nowrap"
            >
              <i className="fas fa-file-import"></i>
              Import
            </button>
          </div>

          {/* Staff Table */}
          <div className="bg-white border border-[#E8E8E8] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F5F5F7]">
                  <tr>
                    <th className="text-left px-4 py-3 text-[#4A4A5A] font-medium">
                      Staff ID
                    </th>
                    <th className="text-left px-4 py-3 text-[#4A4A5A] font-medium">
                      Name
                    </th>
                    <th className="text-left px-4 py-3 text-[#4A4A5A] font-medium hidden md:table-cell">
                      Department
                    </th>
                    <th className="text-left px-4 py-3 text-[#4A4A5A] font-medium hidden lg:table-cell">
                      Category
                    </th>
                    <th className="text-left px-4 py-3 text-[#4A4A5A] font-medium hidden sm:table-cell">
                      Grade
                    </th>
                    <th className="text-left px-4 py-3 text-[#4A4A5A] font-medium hidden lg:table-cell">
                      Bank
                    </th>
                    <th className="text-left px-4 py-3 text-[#4A4A5A] font-medium hidden xl:table-cell">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-[#4A4A5A] font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td
                        colSpan="8"
                        className="text-center py-8 text-[#8A8A9A]"
                      >
                        <i className="fas fa-users text-3xl block mb-2 text-[#E8E8E8]"></i>
                        No staff found matching your filters
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-[#E8E8E8] hover:bg-[#F5F5F7] transition"
                      >
                        <td className="px-4 py-3 text-[#0A2B5E] font-medium text-xs">
                          {item.staff_id}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-[#1A1A2E]">
                              {item.first_name} {item.last_name}
                            </div>
                            <div className="text-xs text-[#8A8A9A] hidden sm:block">
                              {item.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-[#4A4A5A] text-sm">
                          {item.departments?.name || "N/A"}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span
                            className={`text-[11px] px-2 py-1 rounded-full font-medium ${getCategoryBadge(item.category)}`}
                          >
                            {getCategoryLabel(item.category)}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-[#4A4A5A] text-sm">
                          {item.grade_levels?.grade_level || "N/A"} / Step{" "}
                          {item.grade_levels?.step || "N/A"}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-[#4A4A5A] text-sm">
                          {item.bank_name || "N/A"}
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          <span
                            className={`text-[11px] px-2 py-1 rounded-full font-medium ${getStatusBadge(item.status)}`}
                          >
                            {getStatusLabel(item.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewStaff(item)}
                              className="p-1.5 text-[#4A4A5A] hover:text-[#0A2B5E] hover:bg-[#E6F1FB] rounded transition"
                              title="View Staff"
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            <button
                              onClick={() => handleEditStaff(item)}
                              className="p-1.5 text-[#4A4A5A] hover:text-[#E65100] hover:bg-[#FFF3E0] rounded transition"
                              title="Edit Staff"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteStaff(
                                  item.id,
                                  `${item.first_name} ${item.last_name}`,
                                )
                              }
                              className="p-1.5 text-[#4A4A5A] hover:text-[#D32F2F] hover:bg-[#FFEBEE] rounded transition"
                              title="Delete Staff"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-4 py-3 border-t border-[#E8E8E8]">
              <span className="text-sm text-[#8A8A9A]">
                Showing {filteredStaff.length} of {staff.length} staff
              </span>
              <div className="flex gap-1">
                <button className="px-3 py-1 rounded text-sm text-[#4A4A5A] hover:bg-[#F5F5F7] transition">
                  ‹ Prev
                </button>
                <button className="px-3 py-1 rounded text-sm bg-[#185FA5] text-white">
                  1
                </button>
                <button className="px-3 py-1 rounded text-sm text-[#4A4A5A] hover:bg-[#F5F5F7] transition">
                  2
                </button>
                <button className="px-3 py-1 rounded text-sm text-[#4A4A5A] hover:bg-[#F5F5F7] transition">
                  3
                </button>
                <button className="px-3 py-1 rounded text-sm text-[#4A4A5A] hover:bg-[#F5F5F7] transition">
                  Next ›
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
                ADD/EDIT STAFF MODAL
            ============================================================ */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-[#1A1A2E]">
                  {editingStaff ? "Edit Staff" : "Add New Staff"}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingStaff(null);
                    setFormData({
                      first_name: "",
                      last_name: "",
                      email: "",
                      phone: "",
                      staff_id: "",
                      category: "academic",
                      department_id: "",
                      grade_level_id: "",
                      step: 1,
                      bank_name: "",
                      account_number: "",
                      pfa_name: "",
                      rsa_pin: "",
                      tax_id: "",
                      nhf_number: "",
                      date_employed: "",
                      status: "active",
                    });
                  }}
                  className="p-2 hover:bg-[#F5F5F7] rounded-lg transition"
                >
                  <i className="fas fa-times text-xl text-[#4A4A5A]"></i>
                </button>
              </div>

              <form onSubmit={handleAddStaff}>
                {/* Category Selection */}
                <div className="flex gap-2 mb-4">
                  {["academic", "non-academic", "contract"].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryChange(cat)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        formData.category === cat
                          ? "bg-[#185FA5] text-white"
                          : "bg-[#F5F5F7] text-[#4A4A5A] hover:bg-[#E8E8E8]"
                      }`}
                    >
                      {cat === "academic"
                        ? "📚 Academic"
                        : cat === "non-academic"
                          ? "🏢 Non-Academic"
                          : "📋 Contract"}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#4A4A5A] mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A4A5A] mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A4A5A] mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A4A5A] mb-1">
                      Phone
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A4A5A] mb-1">
                      Staff ID
                    </label>
                    <input
                      type="text"
                      name="staff_id"
                      value={formData.staff_id}
                      onChange={handleInputChange}
                      placeholder="Auto-generate if empty"
                      className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A4A5A] mb-1">
                      Department
                    </label>
                    <select
                      name="department_id"
                      value={formData.department_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] transition"
                    >
                      <option value="">Select department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A4A5A] mb-1">
                      Grade Level
                    </label>
                    <select
                      name="grade_level_id"
                      value={formData.grade_level_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] transition"
                    >
                      <option value="">Select grade level</option>
                      {getFilteredGradeLevels().map((grade) => (
                        <option key={grade.id} value={grade.id}>
                          {grade.salary_structures?.name} - GL{" "}
                          {grade.grade_level} / Step {grade.step}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A4A5A] mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      name="bank_name"
                      value={formData.bank_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A4A5A] mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      name="account_number"
                      value={formData.account_number}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A4A5A] mb-1">
                      PFA Name
                    </label>
                    <input
                      type="text"
                      name="pfa_name"
                      value={formData.pfa_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A4A5A] mb-1">
                      RSA PIN
                    </label>
                    <input
                      type="text"
                      name="rsa_pin"
                      value={formData.rsa_pin}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A4A5A] mb-1">
                      Tax ID (TIN)
                    </label>
                    <input
                      type="text"
                      name="tax_id"
                      value={formData.tax_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A4A5A] mb-1">
                      Date Employed
                    </label>
                    <input
                      type="date"
                      name="date_employed"
                      value={formData.date_employed}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A4A5A] mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] transition"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#E8E8E8]">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingStaff(null);
                      setFormData({
                        first_name: "",
                        last_name: "",
                        email: "",
                        phone: "",
                        staff_id: "",
                        category: "academic",
                        department_id: "",
                        grade_level_id: "",
                        step: 1,
                        bank_name: "",
                        account_number: "",
                        pfa_name: "",
                        rsa_pin: "",
                        tax_id: "",
                        nhf_number: "",
                        date_employed: "",
                        status: "active",
                      });
                    }}
                    className="px-4 py-2 border border-[#E8E8E8] rounded-lg text-sm font-medium text-[#4A4A5A] hover:bg-[#F5F5F7] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#185FA5] hover:bg-[#0C447C] text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
                  >
                    <i className="fas fa-save"></i>
                    {editingStaff ? "Update Staff" : "Save Staff"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Staff;
