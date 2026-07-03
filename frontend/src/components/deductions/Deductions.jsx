// src/components/deductions/Deductions.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import deductionService from "../../services/deductionService";
import authService from "../../services/authService";

const Deductions = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allDeductions, setAllDeductions] = useState([]);
  const [statutoryDeductions, setStatutoryDeductions] = useState([]);
  const [personalDeductions, setPersonalDeductions] = useState([]);
  const [taxBands, setTaxBands] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [showAddPersonal, setShowAddPersonal] = useState(false);
  const [editingPersonal, setEditingPersonal] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const hasFetched = useRef(false);

  // ✅ Role-based navigation
  const navItems = authService.getNavItems().map((item) => ({
    ...item,
    active: item.path === "/deductions",
  }));

  // ✅ Notification state
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // ✅ Add Personal Deduction Form State
  const [formData, setFormData] = useState({
    staff_id: "",
    deduction_type_id: "",
    override_value: "",
  });

  // ✅ New Personal Deduction Type
  const [newPersonalDeduction, setNewPersonalDeduction] = useState({
    name: "",
    value: "",
    category: "personal",
    value_type: "fixed",
    is_statutory: false,
  });

  // ✅ Fetch deduction data from Supabase
  const fetchDeductionData = useCallback(async () => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      console.log("🔄 Fetching deduction types...");

      // Fetch deduction types using the service
      const response = await deductionService.getDeductionTypes();
      console.log("📦 Deduction types response:", response);

      if (response.success) {
        const data = response.data || [];
        setAllDeductions(data);

        // Filter based on category from database
        const statutory = data.filter(
          (item) => item.category === "statutory" || item.is_statutory === true,
        );
        const personal = data.filter(
          (item) =>
            item.category === "personal" ||
            (item.is_statutory === false && item.category !== "statutory"),
        );

        console.log(
          `✅ Statutory: ${statutory.length}, Personal: ${personal.length}`,
        );
        setStatutoryDeductions(statutory);
        setPersonalDeductions(personal);
      } else {
        console.error("❌ Failed to load deduction types:", response.message);
        setError(response.message || "Failed to load deduction types");
      }

      // Fetch tax bands using the service
      console.log("🔄 Fetching tax bands...");
      const taxResponse = await deductionService.getTaxBands();
      console.log("📦 Tax bands response:", taxResponse);
      if (taxResponse.success) {
        setTaxBands(taxResponse.data || []);
      }

      // Fetch staff list using the service
      console.log("🔄 Fetching staff list...");
      const staffResponse = await deductionService.getStaffList();
      console.log("📦 Staff response:", staffResponse);
      if (staffResponse.success) {
        setStaffList(staffResponse.data || []);
      } else {
        console.error("❌ Failed to fetch staff list:", staffResponse.message);
        // Don't set error for staff list, just keep it empty
      }
    } catch (error) {
      console.error("❌ Error fetching deduction data:", error);
      setError(error.message || "Failed to load deduction data");
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Load data on mount
  useEffect(() => {
    fetchDeductionData();
  }, [fetchDeductionData]);

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

  // ✅ Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Handle add personal deduction type - UPDATED to use deductionService
  const handleAddPersonalDeduction = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        name: newPersonalDeduction.name,
        value: parseFloat(newPersonalDeduction.value) || 0,
        category: "personal",
        value_type: newPersonalDeduction.value_type,
        is_statutory: false,
      };

      console.log("📝 Adding personal deduction:", payload);
      const response = await deductionService.createDeductionType(payload);
      console.log("📦 Add response:", response);

      if (response.success) {
        setSuccess("✅ Personal deduction added successfully!");
        setShowAddPersonal(false);
        setNewPersonalDeduction({
          name: "",
          value: "",
          category: "personal",
          value_type: "fixed",
          is_statutory: false,
        });
        // Refresh data
        hasFetched.current = false;
        await fetchDeductionData();
      } else {
        setError(response.message || "Failed to add deduction");
      }
    } catch (error) {
      console.error("Error adding personal deduction:", error);
      setError(error.message || "Failed to add deduction. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ✅ Handle edit personal deduction
  const handleEditPersonalDeduction = (item) => {
    setEditingPersonal(item);
    setNewPersonalDeduction({
      name: item.name,
      value: item.value,
      category: item.category || "personal",
      value_type: item.value_type || "fixed",
      is_statutory: item.is_statutory || false,
    });
    setShowAddPersonal(true);
  };

  // ✅ Handle update personal deduction - UPDATED to use deductionService
  const handleUpdatePersonalDeduction = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        name: newPersonalDeduction.name,
        value: parseFloat(newPersonalDeduction.value) || 0,
        value_type: newPersonalDeduction.value_type,
      };

      console.log(
        `📝 Updating personal deduction ${editingPersonal.id}:`,
        payload,
      );
      const response = await deductionService.updateDeductionType(
        editingPersonal.id,
        payload,
      );
      console.log("📦 Update response:", response);

      if (response.success) {
        setSuccess("✅ Personal deduction updated successfully!");
        setShowAddPersonal(false);
        setEditingPersonal(null);
        setNewPersonalDeduction({
          name: "",
          value: "",
          category: "personal",
          value_type: "fixed",
          is_statutory: false,
        });
        // Refresh data
        hasFetched.current = false;
        await fetchDeductionData();
      } else {
        setError(response.message || "Failed to update deduction");
      }
    } catch (error) {
      console.error("Error updating personal deduction:", error);
      setError(
        error.message || "Failed to update deduction. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  // ✅ Handle assign deduction to staff
  const handleAssignDeduction = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (!formData.staff_id || !formData.deduction_type_id) {
        setError("Please select both staff and deduction type");
        setSaving(false);
        return;
      }

      const payload = {
        staff_id: formData.staff_id,
        deduction_type_id: formData.deduction_type_id,
        override_value: formData.override_value
          ? parseFloat(formData.override_value)
          : null,
      };

      console.log("📝 Assigning deduction:", payload);
      const response = await deductionService.assignDeduction(payload);
      console.log("📦 Assign response:", response);

      if (response.success) {
        setSuccess("✅ Deduction assigned to staff successfully!");
        setFormData({
          staff_id: "",
          deduction_type_id: "",
          override_value: "",
        });
      } else {
        setError(response.message || "Failed to assign deduction");
      }
    } catch (error) {
      console.error("Error assigning deduction:", error);
      setError(
        error.message || "Failed to assign deduction. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  // ✅ Handle remove deduction from staff - UPDATED to use deductionService
  const handleRemoveDeduction = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" deduction?`))
      return;
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      console.log(`🗑️ Removing deduction ${id}:`, name);
      const response = await deductionService.deleteDeductionType(id);
      console.log("📦 Delete response:", response);

      if (response.success) {
        setSuccess(`✅ "${name}" removed successfully!`);
        // Refresh data
        hasFetched.current = false;
        await fetchDeductionData();
      } else {
        setError(response.message || "Failed to remove deduction");
      }
    } catch (error) {
      console.error("Error removing deduction:", error);
      setError(
        error.message || "Failed to remove deduction. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  // ✅ Handle save tax bands
  const handleSaveTaxBands = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const inputs = document.querySelectorAll(".tax-band-input");
      const updates = [];
      inputs.forEach((input) => {
        const id = input.dataset.id;
        const rate = parseFloat(input.value);
        if (id && rate && !isNaN(rate)) {
          updates.push({ id, rate });
        }
      });

      if (updates.length === 0) {
        setError("No valid changes to save");
        setSaving(false);
        return;
      }

      let allSuccess = true;
      let failedCount = 0;

      for (const update of updates) {
        try {
          const response = await deductionService.updateTaxBand(update.id, {
            rate: update.rate,
          });
          if (!response.success) {
            allSuccess = false;
            failedCount++;
            console.error(
              `Failed to update tax band ${update.id}:`,
              response.message,
            );
          }
        } catch (error) {
          allSuccess = false;
          failedCount++;
          console.error(`Error updating tax band ${update.id}:`, error);
        }
      }

      if (allSuccess) {
        setSuccess("✅ Tax bands updated successfully!");
        // Refresh tax bands
        const taxResponse = await deductionService.getTaxBands();
        if (taxResponse.success) {
          setTaxBands(taxResponse.data || []);
        }
      } else {
        setError(
          `Updated ${updates.length - failedCount} of ${updates.length} tax bands. ${failedCount} failed.`,
        );
      }
    } catch (error) {
      console.error("Error saving tax bands:", error);
      setError(error.message || "Failed to save tax bands. Please try again.");
    } finally {
      setSaving(false);
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

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#0A2B5E] border-t-[#E65100] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#4A4A5A]">Loading deductions...</p>
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
                <i className="fas fa-minus-circle text-[#E65100] mr-2"></i>
                Deductions management
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

              <div className="w-10 h-10 rounded-full bg-[#E65100] flex items-center justify-center text-white text-sm font-semibold">
                {getInitials()}
              </div>
              <div className="text-sm font-medium text-[#1A1A2E] hidden sm:block">
                {getRoleName()}
              </div>
            </div>
          </div>

          {/* Error/Success Messages */}
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

          {/* Info Banner */}
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="bg-[#FAEEDA] rounded-lg p-3 mb-4 flex items-center gap-2 text-sm text-[#633806]"
          >
            <i className="fas fa-exclamation-triangle"></i>
            Statutory deductions are mandatory by Nigerian law. Personal
            deductions are staff-specific and can be added or removed per staff.
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="bg-white border border-[#E8E8E8] rounded-lg p-3">
              <div className="text-xs text-[#4A4A5A] mb-1">
                Total Deductions
              </div>
              <div className="text-lg font-medium text-[#1A1A2E]">
                {allDeductions.length}
              </div>
            </div>
            <div className="bg-white border border-[#E8E8E8] rounded-lg p-3">
              <div className="text-xs text-[#4A4A5A] mb-1">Statutory</div>
              <div className="text-lg font-medium text-[#1A1A2E]">
                {statutoryDeductions.length}
              </div>
            </div>
            <div className="bg-white border border-[#E8E8E8] rounded-lg p-3">
              <div className="text-xs text-[#4A4A5A] mb-1">Personal</div>
              <div className="text-lg font-medium text-[#1A1A2E]">
                {personalDeductions.length}
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Column */}
            <div>
              {/* Statutory Deductions */}
              <motion.div
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5 mb-4"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-medium text-[#1A1A2E]">
                    Statutory deductions
                    <span className="text-xs text-[#8A8A9A] ml-2 font-normal">
                      Government mandated
                    </span>
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F5F5F7]">
                        <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                          Deduction
                        </th>
                        <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                          Rate
                        </th>
                        <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                          Who pays
                        </th>
                        <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {statutoryDeductions.length === 0 ? (
                        <tr>
                          <td
                            colSpan="4"
                            className="text-center py-4 text-[#8A8A9A]"
                          >
                            <i className="fas fa-database text-2xl block mb-2"></i>
                            No statutory deductions found
                          </td>
                        </tr>
                      ) : (
                        statutoryDeductions.map((item, index) => (
                          <tr
                            key={index}
                            className="border-b border-[#E8E8E8] last:border-b-0 hover:bg-[#F5F5F7] transition"
                          >
                            <td className="px-3 py-2 text-[#1A1A2E]">
                              {item.name}
                            </td>
                            <td className="px-3 py-2 text-[#4A4A5A]">
                              {item.value_type === "percentage"
                                ? `${item.value}%`
                                : `₦${item.value}`}
                            </td>
                            <td className="px-3 py-2 text-[#4A4A5A]">
                              {item.is_statutory ? "Employee" : "Employer"}
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-[11px] px-2 py-1 rounded-full font-medium bg-[#EAF3DE] text-[#27500A]">
                                {item.is_statutory ? "Active" : "Inactive"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>

              {/* PAYE Tax Bands */}
              <motion.div
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-medium text-[#1A1A2E]">
                    PAYE tax bands
                  </h2>
                  <button
                    onClick={handleSaveTaxBands}
                    disabled={saving}
                    className="bg-[#185FA5] hover:bg-[#0C447C] text-white px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
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
                        <i className="fas fa-save"></i>
                        Save
                      </>
                    )}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F5F5F7]">
                        <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                          Annual income range
                        </th>
                        <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                          Rate (%)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {taxBands.length === 0 ? (
                        <tr>
                          <td
                            colSpan="2"
                            className="text-center py-4 text-[#8A8A9A]"
                          >
                            <i className="fas fa-chart-bar text-2xl block mb-2"></i>
                            No tax bands configured
                          </td>
                        </tr>
                      ) : (
                        taxBands.map((item, index) => (
                          <tr
                            key={index}
                            className="border-b border-[#E8E8E8] last:border-b-0 hover:bg-[#F5F5F7] transition"
                          >
                            <td className="px-3 py-2 text-[#4A4A5A]">
                              ₦{item.min_income?.toLocaleString() || 0} - ₦
                              {item.max_income?.toLocaleString() || "∞"}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                data-id={item.id}
                                defaultValue={item.rate}
                                className="tax-band-input w-20 px-2 py-1 border border-[#E8E8E8] rounded text-sm bg-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent transition"
                                min="0"
                                max="100"
                                step="0.5"
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </div>

            {/* Right Column */}
            <div>
              {/* Personal Deductions */}
              <motion.div
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5 mb-4"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-medium text-[#1A1A2E]">
                    Personal deductions
                  </h2>
                  <button
                    onClick={() => {
                      setEditingPersonal(null);
                      setNewPersonalDeduction({
                        name: "",
                        value: "",
                        category: "personal",
                        value_type: "fixed",
                        is_statutory: false,
                      });
                      setShowAddPersonal(true);
                    }}
                    className="bg-[#185FA5] hover:bg-[#0C447C] text-white px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2"
                  >
                    <i className="fas fa-plus"></i>
                    Add
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F5F5F7]">
                        <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                          Deduction
                        </th>
                        <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                          Type
                        </th>
                        <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                          Amount
                        </th>
                        <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {personalDeductions.length === 0 ? (
                        <tr>
                          <td
                            colSpan="4"
                            className="text-center py-4 text-[#8A8A9A]"
                          >
                            <i className="fas fa-user-minus text-2xl block mb-2"></i>
                            No personal deductions found. Click "Add" to create
                            one.
                          </td>
                        </tr>
                      ) : (
                        personalDeductions.map((item, index) => (
                          <tr
                            key={index}
                            className="border-b border-[#E8E8E8] last:border-b-0 hover:bg-[#F5F5F7] transition"
                          >
                            <td className="px-3 py-2 text-[#1A1A2E]">
                              {item.name}
                            </td>
                            <td className="px-3 py-2 text-[#4A4A5A]">
                              {item.value_type === "percentage"
                                ? "Percentage"
                                : "Fixed"}
                            </td>
                            <td className="px-3 py-2 text-[#4A4A5A]">
                              {item.value_type === "percentage"
                                ? `${item.value}%`
                                : `₦${item.value?.toLocaleString() || 0}`}
                            </td>
                            <td className="px-3 py-2">
                              <button
                                onClick={() =>
                                  handleEditPersonalDeduction(item)
                                }
                                className="p-1.5 text-[#4A4A5A] hover:text-[#E65100] hover:bg-[#FFF3E0] rounded transition"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                onClick={() =>
                                  handleRemoveDeduction(item.id, item.name)
                                }
                                className="p-1.5 text-[#4A4A5A] hover:text-[#D32F2F] hover:bg-[#FFEBEE] rounded transition ml-1"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>

              {/* Assign Personal Deduction */}
              <motion.div
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5"
              >
                <h2 className="text-sm font-medium text-[#1A1A2E] mb-4">
                  Assign personal deduction to staff
                </h2>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[#4A4A5A] mb-1">
                      Search staff
                    </label>
                    <select
                      name="staff_id"
                      value={formData.staff_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
                    >
                      <option value="">Select staff</option>
                      {staffList.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.first_name} {staff.last_name} ({staff.staff_id}
                          )
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#4A4A5A] mb-1">
                      Deduction type
                    </label>
                    <select
                      name="deduction_type_id"
                      value={formData.deduction_type_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
                    >
                      <option value="">Select deduction type</option>
                      {personalDeductions && personalDeductions.length > 0 ? (
                        personalDeductions.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} (
                            {item.value_type === "percentage"
                              ? `${item.value}%`
                              : `₦${item.value}`}
                            )
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>
                          No personal deductions available
                        </option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#4A4A5A] mb-1">
                      Override amount (₦) — optional
                    </label>
                    <input
                      type="number"
                      name="override_value"
                      value={formData.override_value}
                      onChange={handleInputChange}
                      placeholder="Leave blank to use default amount"
                      className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
                      min="0"
                    />
                  </div>
                  <button
                    onClick={handleAssignDeduction}
                    disabled={saving || personalDeductions.length === 0}
                    className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                      saving || personalDeductions.length === 0
                        ? "bg-[#E8E8E8] text-[#8A8A9A] cursor-not-allowed"
                        : "bg-[#185FA5] hover:bg-[#0C447C] text-white"
                    }`}
                  >
                    {saving ? (
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
                        <i className="fas fa-check"></i>
                        Assign deduction
                      </>
                    )}
                  </button>
                  {personalDeductions.length === 0 && (
                    <p className="text-xs text-[#E65100] text-center">
                      Please add a personal deduction first before assigning.
                    </p>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Personal Deduction Modal */}
      <AnimatePresence>
        {showAddPersonal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-xl w-full max-w-md p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-[#1A1A2E]">
                  {editingPersonal
                    ? "Edit Personal Deduction"
                    : "Add Personal Deduction"}
                </h2>
                <button
                  onClick={() => {
                    setShowAddPersonal(false);
                    setEditingPersonal(null);
                  }}
                  className="p-2 hover:bg-[#F5F5F7] rounded-lg transition"
                >
                  <i className="fas fa-times text-xl text-[#4A4A5A]"></i>
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editingPersonal) {
                    handleUpdatePersonalDeduction();
                  } else {
                    handleAddPersonalDeduction();
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-[#4A4A5A] mb-1">
                    Deduction Name *
                  </label>
                  <input
                    type="text"
                    value={newPersonalDeduction.name}
                    onChange={(e) =>
                      setNewPersonalDeduction({
                        ...newPersonalDeduction,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#4A4A5A] mb-1">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPersonalDeduction.value}
                    onChange={(e) =>
                      setNewPersonalDeduction({
                        ...newPersonalDeduction,
                        value: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] transition"
                    required
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#4A4A5A] mb-1">
                    Value Type
                  </label>
                  <select
                    value={newPersonalDeduction.value_type}
                    onChange={(e) =>
                      setNewPersonalDeduction({
                        ...newPersonalDeduction,
                        value_type: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] transition"
                  >
                    <option value="fixed">Fixed Amount (₦)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[#E8E8E8]">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddPersonal(false);
                      setEditingPersonal(null);
                    }}
                    className="px-4 py-2 border border-[#E8E8E8] rounded-lg text-sm font-medium text-[#4A4A5A] hover:bg-[#F5F5F7] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-[#185FA5] hover:bg-[#0C447C] text-white rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
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
                        <i className="fas fa-save"></i>
                        {editingPersonal ? "Update Deduction" : "Add Deduction"}
                      </>
                    )}
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

export default Deductions;
