// src/components/settings/Settings.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import settingsService from "../../services/settingsService";
import authService from "../../services/authService";

// ✅ Toggle component
const ToggleSwitch = ({ enabled, onChange, label }) => {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`w-11 h-6 rounded-full cursor-pointer flex-shrink-0 transition-colors duration-200 relative ${
        enabled ? "bg-[#185FA5]" : "bg-[#E8E8E8]"
      }`}
      role="switch"
      aria-checked={enabled}
      aria-label={label}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
          enabled ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
};

const Settings = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(1);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [resettingPasswords, setResettingPasswords] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const hasFetched = useRef(false);

  // ✅ Role-based navigation
  const navItems = authService.getNavItems().map((item) => ({
    ...item,
    active: item.path === "/settings",
  }));

  // ✅ State for each settings group
  const [universityInfo, setUniversityInfo] = useState({
    name: "Abiola Ajimobi Technical University",
    shortName: "Tech-U",
    address: "Ibadan, Oyo State, Nigeria",
    website: "www.tech-u.edu.ng",
    motto: "Developing Brains, Training Hands",
    taxId: "FIRS-AATU-2017-001",
    pensionCode: "PEN-AATU-001",
    nhfCode: "NHF-AATU-001",
  });

  const [payrollSettings, setPayrollSettings] = useState({
    processingDate: "25th of every month",
    paymentDate: "28th of every month",
    currency: "Nigerian Naira (₦)",
    minimumWage: "75,000",
    incrementMonth: "January",
    payslipFooter: "This payslip is computer generated",
  });

  const [toggles, setToggles] = useState({
    payslipEmail: true,
    notifyBursar: true,
    notifyVC: true,
    remittanceReminders: true,
    leaveNotifications: true,
    failedLoginAlerts: false,
    forcePasswordChange: true,
    autoLogout: true,
    lockAccount: true,
    twoFactorAuth: false,
  });

  // ✅ Notification state
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // ✅ Backup data
  const [backups, setBackups] = useState([
    {
      id: 1,
      name: "Auto backup — 25 Jun 2026, 2:00am",
      desc: "Automatic daily backup — 1,392 staff records",
      date: "25 Jun 2026",
    },
    {
      id: 2,
      name: "Auto backup — 24 Jun 2026, 2:00am",
      desc: "Automatic daily backup — 1,390 staff records",
      date: "24 Jun 2026",
    },
    {
      id: 3,
      name: "Manual backup — 23 Jun 2026, 9:15am",
      desc: "Triggered by Admin before payroll run",
      date: "23 Jun 2026",
    },
  ]);

  // ✅ Fetch settings from Supabase
  const fetchSettings = useCallback(async () => {
    // Prevent multiple fetches
    if (hasFetched.current) return;
    hasFetched.current = true;

    try {
      setLoading(true);
      setError("");

      console.log("🔄 Fetching settings...");
      const response = await settingsService.getAll();
      console.log("📦 Settings response:", response);

      if (response.success && response.data && response.data.length > 0) {
        const settingsMap = {};
        response.data.forEach((item) => {
          try {
            settingsMap[item.key] = JSON.parse(item.value);
          } catch {
            settingsMap[item.key] = item.value;
          }
        });

        // Update university info
        if (settingsMap.university) {
          setUniversityInfo(settingsMap.university);
        }

        // Update payroll settings
        if (settingsMap.payroll) {
          setPayrollSettings(settingsMap.payroll);
        }

        // Update notification toggles
        if (settingsMap.notifications) {
          setToggles((prev) => ({ ...prev, ...settingsMap.notifications }));
        }

        // Update security toggles
        if (settingsMap.security) {
          setToggles((prev) => ({ ...prev, ...settingsMap.security }));
        }

        console.log("✅ Settings loaded successfully");
      } else {
        // No settings found, initialize defaults
        console.log("⚠️ No settings found, initializing defaults...");
        setInitializing(true);
        const initResult = await settingsService.initializeDefaults();
        setInitializing(false);

        if (initResult.success) {
          console.log("✅ Default settings initialized");
          // Refresh settings after initialization
          hasFetched.current = false;
          await fetchSettings();
          return;
        } else {
          setError("Failed to initialize settings. Please try again.");
        }
      }
    } catch (error) {
      console.error("❌ Error fetching settings:", error);
      setError(error.message || "Failed to load settings. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load settings on mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

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

  // ✅ Clear messages after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess("");
        setError("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // ✅ Handle toggle changes
  const handleToggle = useCallback((key) => {
    setToggles((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  // ✅ Handle university info changes
  const handleUniversityChange = useCallback((key, value) => {
    setUniversityInfo((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ✅ Handle payroll settings changes
  const handlePayrollChange = useCallback((key, value) => {
    setPayrollSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ✅ Save university settings
  const saveUniversitySettings = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      console.log("📝 Saving university settings:", universityInfo);
      const response = await settingsService.update(
        "university",
        universityInfo,
      );
      console.log("📦 Save response:", response);

      if (response.success) {
        setSuccess("University settings saved successfully!");
      } else {
        setError(response.message || "Failed to save settings");
      }
    } catch (error) {
      console.error("❌ Error saving university settings:", error);
      setError(error.message || "Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ✅ Save payroll settings
  const savePayrollSettings = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      console.log("📝 Saving payroll settings:", payrollSettings);
      const response = await settingsService.update("payroll", payrollSettings);
      console.log("📦 Save response:", response);

      if (response.success) {
        setSuccess("Payroll settings saved successfully!");
      } else {
        setError(response.message || "Failed to save settings");
      }
    } catch (error) {
      console.error("❌ Error saving payroll settings:", error);
      setError(error.message || "Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ✅ Save notification settings
  const saveNotificationSettings = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const notificationSettings = {
        payslipEmail: toggles.payslipEmail,
        notifyBursar: toggles.notifyBursar,
        notifyVC: toggles.notifyVC,
        remittanceReminders: toggles.remittanceReminders,
        leaveNotifications: toggles.leaveNotifications,
        failedLoginAlerts: toggles.failedLoginAlerts,
      };

      console.log("📝 Saving notification settings:", notificationSettings);
      const response = await settingsService.update(
        "notifications",
        notificationSettings,
      );
      console.log("📦 Save response:", response);

      if (response.success) {
        setSuccess("Notification settings saved successfully!");
      } else {
        setError(response.message || "Failed to save settings");
      }
    } catch (error) {
      console.error("❌ Error saving notification settings:", error);
      setError(error.message || "Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ✅ Save security settings
  const saveSecuritySettings = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const securitySettings = {
        forcePasswordChange: toggles.forcePasswordChange,
        autoLogout: toggles.autoLogout,
        lockAccount: toggles.lockAccount,
        twoFactorAuth: toggles.twoFactorAuth,
      };

      console.log("📝 Saving security settings:", securitySettings);
      const response = await settingsService.update(
        "security",
        securitySettings,
      );
      console.log("📦 Save response:", response);

      if (response.success) {
        setSuccess("Security settings saved successfully!");
      } else {
        setError(response.message || "Failed to save settings");
      }
    } catch (error) {
      console.error("❌ Error saving security settings:", error);
      setError(error.message || "Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ✅ Handle manual backup
  const handleManualBackup = async () => {
    try {
      setBackingUp(true);
      setError("");
      setSuccess("");

      console.log("🔄 Triggering manual backup...");

      const response = await fetch("/api/settings/backup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token || ""}`,
        },
        body: JSON.stringify({ user_id: user?.id }),
      });

      const data = await response.json();
      console.log("📦 Backup response:", data);

      if (data.success) {
        // Add new backup to the list
        const newBackup = {
          id: backups.length + 1,
          name: `Manual backup — ${new Date().toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" })}, ${new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}`,
          desc: `Triggered by ${user?.full_name || "Admin"} - ${data.data?.totalRecords || "All"} records backed up`,
          date: new Date().toLocaleDateString("en-NG", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
        };
        setBackups([newBackup, ...backups]);
        setSuccess(data.message || "Manual backup completed successfully!");
        setTimeout(() => setSuccess(""), 5000);
      } else {
        setError(data.message || "Failed to trigger backup");
      }
    } catch (error) {
      console.error("❌ Error triggering backup:", error);
      setError(error.message || "Failed to trigger backup. Please try again.");
    } finally {
      setBackingUp(false);
    }
  };

  // ✅ Handle download backup
  const handleDownloadBackup = async (backupName) => {
    try {
      setError("");
      setSuccess("");

      console.log(`📥 Downloading backup: ${backupName}`);

      const response = await fetch("/api/settings/backup/download", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token || ""}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `Failed to download backup (Status: ${response.status})`,
        );
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const dateStr = new Date().toISOString().split("T")[0];
      link.download = `backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setSuccess("Backup downloaded successfully!");
      setTimeout(() => setSuccess(""), 5000);
    } catch (error) {
      console.error("❌ Error downloading backup:", error);
      setError(error.message || "Failed to download backup. Please try again.");
    }
  };

  // ✅ Handle reset all passwords
  const handleResetAllPasswords = async () => {
    if (
      !window.confirm(
        "⚠️ Are you sure you want to reset ALL user passwords? This will generate temporary passwords for all users.",
      )
    ) {
      return;
    }

    if (
      !window.confirm(
        "⚠️⚠️ FINAL WARNING: This action cannot be undone. All users will need to use temporary passwords. Are you absolutely sure?",
      )
    ) {
      return;
    }

    try {
      setResettingPasswords(true);
      setError("");
      setSuccess("");

      console.log("🔄 Resetting all user passwords...");

      const response = await fetch("/api/settings/reset-all-passwords", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token || ""}`,
        },
        body: JSON.stringify({ user_id: user?.id }),
      });

      const data = await response.json();
      console.log("📦 Reset passwords response:", data);

      if (data.success) {
        setSuccess(
          data.message ||
            `Password reset emails sent to ${data.data?.resetCount || 0} users!`,
        );
        setTimeout(() => setSuccess(""), 5000);
      } else {
        setError(data.message || "Failed to reset passwords");
      }
    } catch (error) {
      console.error("❌ Error resetting passwords:", error);
      setError(error.message || "Failed to reset passwords. Please try again.");
    } finally {
      setResettingPasswords(false);
    }
  };

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

  // Loading state
  if (loading || initializing) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#0A2B5E] border-t-[#E65100] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#4A4A5A]">
            {initializing ? "Initializing settings..." : "Loading settings..."}
          </p>
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
                <i className="fas fa-cog text-[#E65100] mr-2"></i>
                System settings
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

          {/* Tabs */}
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-wrap gap-1 mb-4 border-b border-[#E8E8E8]"
          >
            {[
              "University info",
              "Payroll settings",
              "Notifications",
              "Backup & security",
            ].map((label, index) => (
              <button
                key={index}
                onClick={() => setActiveTab(index + 1)}
                className={`px-4 py-2 text-sm font-medium transition ${
                  activeTab === index + 1
                    ? "text-[#185FA5] border-b-2 border-[#185FA5]"
                    : "text-[#4A4A5A] hover:text-[#1A1A2E]"
                }`}
              >
                {label}
              </button>
            ))}
          </motion.div>

          {/* ============================================================
                        TAB 1: University Info
                    ============================================================ */}
          {activeTab === 1 && (
            <motion.div
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5"
            >
              <h2 className="text-sm font-medium text-[#1A1A2E] mb-4">
                University information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#4A4A5A] mb-1">
                    University name
                  </label>
                  <input
                    type="text"
                    value={universityInfo.name || ""}
                    onChange={(e) =>
                      handleUniversityChange("name", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4A4A5A] mb-1">
                    Short name
                  </label>
                  <input
                    type="text"
                    value={universityInfo.shortName || ""}
                    onChange={(e) =>
                      handleUniversityChange("shortName", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4A4A5A] mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={universityInfo.address || ""}
                    onChange={(e) =>
                      handleUniversityChange("address", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4A4A5A] mb-1">
                    Website
                  </label>
                  <input
                    type="text"
                    value={universityInfo.website || ""}
                    onChange={(e) =>
                      handleUniversityChange("website", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4A4A5A] mb-1">
                    Motto
                  </label>
                  <input
                    type="text"
                    value={universityInfo.motto || ""}
                    onChange={(e) =>
                      handleUniversityChange("motto", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4A4A5A] mb-1">
                    Tax ID (TIN)
                  </label>
                  <input
                    type="text"
                    value={universityInfo.taxId || ""}
                    onChange={(e) =>
                      handleUniversityChange("taxId", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4A4A5A] mb-1">
                    Pension employer code
                  </label>
                  <input
                    type="text"
                    value={universityInfo.pensionCode || ""}
                    onChange={(e) =>
                      handleUniversityChange("pensionCode", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4A4A5A] mb-1">
                    NHF employer code
                  </label>
                  <input
                    type="text"
                    value={universityInfo.nhfCode || ""}
                    onChange={(e) =>
                      handleUniversityChange("nhfCode", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
                  />
                </div>
              </div>

              <button
                onClick={saveUniversitySettings}
                disabled={saving}
                className="mt-4 bg-[#185FA5] hover:bg-[#0C447C] text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
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
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i>
                    Save changes
                  </>
                )}
              </button>
            </motion.div>
          )}

          {/* ============================================================
                        TAB 2: Payroll Settings
                    ============================================================ */}
          {activeTab === 2 && (
            <motion.div
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5"
            >
              <h2 className="text-sm font-medium text-[#1A1A2E] mb-4">
                Payroll configuration
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#4A4A5A] mb-1">
                    Payroll processing date
                  </label>
                  <select
                    value={
                      payrollSettings.processingDate || "25th of every month"
                    }
                    onChange={(e) =>
                      handlePayrollChange("processingDate", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
                  >
                    <option>15th of every month</option>
                    <option>20th of every month</option>
                    <option>25th of every month</option>
                    <option>Last working day</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4A4A5A] mb-1">
                    Salary payment date
                  </label>
                  <select
                    value={payrollSettings.paymentDate || "28th of every month"}
                    onChange={(e) =>
                      handlePayrollChange("paymentDate", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
                  >
                    <option>25th of every month</option>
                    <option>28th of every month</option>
                    <option>30th of every month</option>
                    <option>Last working day</option>
                    <option>1st of next month</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4A4A5A] mb-1">
                    Default currency
                  </label>
                  <select
                    value={payrollSettings.currency || "Nigerian Naira (₦)"}
                    onChange={(e) =>
                      handlePayrollChange("currency", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
                  >
                    <option>Nigerian Naira (₦)</option>
                    <option>US Dollar ($)</option>
                    <option>British Pound (£)</option>
                    <option>Euro (€)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4A4A5A] mb-1">
                    Minimum wage floor (₦)
                  </label>
                  <input
                    type="number"
                    value={
                      payrollSettings.minimumWage?.replace(/,/g, "") || "75000"
                    }
                    onChange={(e) =>
                      handlePayrollChange("minimumWage", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
                    placeholder="Enter minimum wage"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4A4A5A] mb-1">
                    Annual increment month
                  </label>
                  <select
                    value={payrollSettings.incrementMonth || "January"}
                    onChange={(e) =>
                      handlePayrollChange("incrementMonth", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
                  >
                    <option>January</option>
                    <option>February</option>
                    <option>March</option>
                    <option>April</option>
                    <option>May</option>
                    <option>June</option>
                    <option>July</option>
                    <option>August</option>
                    <option>September</option>
                    <option>October</option>
                    <option>November</option>
                    <option>December</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4A4A5A] mb-1">
                    Payslip footer note
                  </label>
                  <input
                    type="text"
                    value={
                      payrollSettings.payslipFooter ||
                      "This payslip is computer generated"
                    }
                    onChange={(e) =>
                      handlePayrollChange("payslipFooter", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
                    placeholder="Enter payslip footer note"
                  />
                </div>
              </div>

              <button
                onClick={savePayrollSettings}
                disabled={saving}
                className="mt-4 bg-[#185FA5] hover:bg-[#0C447C] text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
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
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i>
                    Save changes
                  </>
                )}
              </button>
            </motion.div>
          )}

          {/* ============================================================
                        TAB 3: Notifications
                    ============================================================ */}
          {activeTab === 3 && (
            <motion.div
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5"
            >
              <h2 className="text-sm font-medium text-[#1A1A2E] mb-4">
                Notification settings
              </h2>

              <div className="space-y-1">
                <div className="flex justify-between items-center py-3 border-b border-[#E8E8E8]">
                  <div>
                    <div className="text-sm font-medium text-[#1A1A2E]">
                      Email staff when payslip is ready
                    </div>
                    <div className="text-xs text-[#4A4A5A]">
                      Send email to each staff when their payslip is generated
                    </div>
                  </div>
                  <ToggleSwitch
                    enabled={toggles.payslipEmail}
                    onChange={() => handleToggle("payslipEmail")}
                    label="Email staff when payslip is ready"
                  />
                </div>
                <div className="flex justify-between items-center py-3 border-b border-[#E8E8E8]">
                  <div>
                    <div className="text-sm font-medium text-[#1A1A2E]">
                      Notify Bursar when HR initiates payroll
                    </div>
                    <div className="text-xs text-[#4A4A5A]">
                      Alert the Bursar to review and approve
                    </div>
                  </div>
                  <ToggleSwitch
                    enabled={toggles.notifyBursar}
                    onChange={() => handleToggle("notifyBursar")}
                    label="Notify Bursar when HR initiates payroll"
                  />
                </div>
                <div className="flex justify-between items-center py-3 border-b border-[#E8E8E8]">
                  <div>
                    <div className="text-sm font-medium text-[#1A1A2E]">
                      Notify VC when Bursar approves payroll
                    </div>
                    <div className="text-xs text-[#4A4A5A]">
                      Alert the VC for final authorization
                    </div>
                  </div>
                  <ToggleSwitch
                    enabled={toggles.notifyVC}
                    onChange={() => handleToggle("notifyVC")}
                    label="Notify VC when Bursar approves payroll"
                  />
                </div>
                <div className="flex justify-between items-center py-3 border-b border-[#E8E8E8]">
                  <div>
                    <div className="text-sm font-medium text-[#1A1A2E]">
                      Remittance due date reminders
                    </div>
                    <div className="text-xs text-[#4A4A5A]">
                      Remind Bursar 3 days before PAYE and pension due dates
                    </div>
                  </div>
                  <ToggleSwitch
                    enabled={toggles.remittanceReminders}
                    onChange={() => handleToggle("remittanceReminders")}
                    label="Remittance due date reminders"
                  />
                </div>
                <div className="flex justify-between items-center py-3 border-b border-[#E8E8E8]">
                  <div>
                    <div className="text-sm font-medium text-[#1A1A2E]">
                      Leave request notifications
                    </div>
                    <div className="text-xs text-[#4A4A5A]">
                      Notify HR when a staff submits a leave request
                    </div>
                  </div>
                  <ToggleSwitch
                    enabled={toggles.leaveNotifications}
                    onChange={() => handleToggle("leaveNotifications")}
                    label="Leave request notifications"
                  />
                </div>
                <div className="flex justify-between items-center py-3">
                  <div>
                    <div className="text-sm font-medium text-[#1A1A2E]">
                      Failed login alerts
                    </div>
                    <div className="text-xs text-[#4A4A5A]">
                      Alert Admin on multiple failed login attempts
                    </div>
                  </div>
                  <ToggleSwitch
                    enabled={toggles.failedLoginAlerts}
                    onChange={() => handleToggle("failedLoginAlerts")}
                    label="Failed login alerts"
                  />
                </div>
              </div>

              <button
                onClick={saveNotificationSettings}
                disabled={saving}
                className="mt-4 bg-[#185FA5] hover:bg-[#0C447C] text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
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
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i>
                    Save changes
                  </>
                )}
              </button>
            </motion.div>
          )}

          {/* ============================================================
                        TAB 4: Backup & Security
                    ============================================================ */}
          {activeTab === 4 && (
            <div className="space-y-4">
              <motion.div
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5"
              >
                <h2 className="text-sm font-medium text-[#1A1A2E] mb-4">
                  Backup management
                </h2>

                <div className="bg-[#E6F1FB] rounded-lg p-3 mb-4 flex items-start gap-2 text-sm text-[#0C447C]">
                  <i className="fas fa-info-circle mt-0.5"></i>
                  Supabase automatically backs up your database daily. You can
                  also trigger a manual backup at any time below.
                </div>

                <div className="space-y-2">
                  {backups.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center py-2 border-b border-[#E8E8E8] last:border-b-0"
                    >
                      <div>
                        <div className="text-sm font-medium text-[#1A1A2E]">
                          {item.name}
                        </div>
                        <div className="text-xs text-[#4A4A5A]">
                          {item.desc}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadBackup(item.name)}
                        className="px-3 py-1 border border-[#E8E8E8] rounded text-xs text-[#4A4A5A] hover:bg-[#F5F5F7] transition flex items-center gap-1"
                      >
                        <i className="fas fa-download"></i>
                        Download
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleManualBackup}
                  disabled={backingUp}
                  className="mt-4 bg-[#185FA5] hover:bg-[#0C447C] text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {backingUp ? (
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
                      Backing up...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-database"></i>
                      Trigger manual backup now
                    </>
                  )}
                </button>
              </motion.div>

              <motion.div
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5"
              >
                <h2 className="text-sm font-medium text-[#1A1A2E] mb-4">
                  Security settings
                </h2>

                <div className="space-y-1">
                  <div className="flex justify-between items-center py-3 border-b border-[#E8E8E8]">
                    <div className="text-sm font-medium text-[#1A1A2E]">
                      Force password change on first login
                    </div>
                    <ToggleSwitch
                      enabled={toggles.forcePasswordChange}
                      onChange={() => handleToggle("forcePasswordChange")}
                      label="Force password change on first login"
                    />
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-[#E8E8E8]">
                    <div className="text-sm font-medium text-[#1A1A2E]">
                      Auto logout after 30 minutes inactivity
                    </div>
                    <ToggleSwitch
                      enabled={toggles.autoLogout}
                      onChange={() => handleToggle("autoLogout")}
                      label="Auto logout after 30 minutes inactivity"
                    />
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-[#E8E8E8]">
                    <div className="text-sm font-medium text-[#1A1A2E]">
                      Lock account after 5 failed login attempts
                    </div>
                    <ToggleSwitch
                      enabled={toggles.lockAccount}
                      onChange={() => handleToggle("lockAccount")}
                      label="Lock account after 5 failed login attempts"
                    />
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <div className="text-sm font-medium text-[#1A1A2E]">
                      Two-factor authentication for admin
                    </div>
                    <ToggleSwitch
                      enabled={toggles.twoFactorAuth}
                      onChange={() => handleToggle("twoFactorAuth")}
                      label="Two-factor authentication for admin"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-4">
                  <button
                    onClick={saveSecuritySettings}
                    disabled={saving}
                    className="bg-[#185FA5] hover:bg-[#0C447C] text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
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
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save"></i>
                        Save security settings
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleResetAllPasswords}
                    disabled={resettingPasswords}
                    className="bg-[#791F1F] hover:bg-[#631A1A] text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resettingPasswords ? (
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
                        Resetting...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-exclamation-triangle"></i>
                        Reset all user passwords
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
