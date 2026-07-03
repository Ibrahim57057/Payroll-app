// src/components/users/Users.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { userService } from "../../services/userService";
import authService from "../../services/authService";

const Users = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    role: "staff",
    staff_id: "",
    password: "",
  });
  const [selectedRole, setSelectedRole] = useState("hr_officer");
  const [permissions, setPermissions] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasFetched = useRef(false);

  // ✅ Role-based navigation
  const navItems = authService.getNavItems().map(item => ({
    ...item,
    active: item.path === "/users"
  }));

  // Default permissions for each role
  const DEFAULT_PERMISSIONS = {
    admin: {
      view_staff: true,
      add_edit_staff: true,
      process_payroll: true,
      approve_payroll: true,
      view_reports: true,
      manage_leave: true,
      manage_users: true,
      view_audit_log: true,
      edit_settings: true,
    },
    hr_officer: {
      view_staff: true,
      add_edit_staff: true,
      process_payroll: false,
      approve_payroll: false,
      view_reports: true,
      manage_leave: true,
      manage_users: false,
      view_audit_log: true,
      edit_settings: false,
    },
    bursar: {
      view_staff: true,
      add_edit_staff: false,
      process_payroll: true,
      approve_payroll: true,
      view_reports: true,
      manage_leave: false,
      manage_users: false,
      view_audit_log: true,
      edit_settings: false,
    },
    vc: {
      view_staff: true,
      add_edit_staff: false,
      process_payroll: false,
      approve_payroll: true,
      view_reports: true,
      manage_leave: false,
      manage_users: false,
      view_audit_log: false,
      edit_settings: false,
    },
    staff: {
      view_staff: false,
      add_edit_staff: false,
      process_payroll: false,
      approve_payroll: false,
      view_reports: false,
      manage_leave: true,
      manage_users: false,
      view_audit_log: false,
      edit_settings: false,
    },
  };

  // ✅ Fetch users from Supabase
  const fetchUsers = useCallback(async () => {
    if (hasFetched.current && loading) return;
    hasFetched.current = true;

    try {
      setLoading(true);
      setError("");

      console.log("🔄 Fetching users from Supabase...");
      const response = await userService.getAll();
      console.log("📦 Users response:", response);

      if (response.success) {
        const userData = Array.isArray(response.data) ? response.data : [];
        setUsers(userData);
        console.log(`✅ Loaded ${userData.length} users`);
      } else {
        console.error("❌ Failed to fetch users:", response.message);
        setError(response.message || "Failed to load users");
        setUsers([]);
      }
    } catch (error) {
      console.error("❌ Error fetching users:", error);
      setError(error.message || "Failed to load users. Please refresh.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Load users on mount
  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Load permissions when role changes
useEffect(() => {
  const loadPermissions = async () => {
    if (!selectedRole) return;

    const userWithRole = users.find(
      (u) => u.role === selectedRole && u.is_active !== false
    );

    if (userWithRole) {
      try {
        console.log(`🔍 Loading permissions for user ${userWithRole.id} with role ${selectedRole}`);
        const response = await userService.getPermissions(userWithRole.id);
        console.log("📦 Permissions response:", response);

        if (response.success && response.data?.permissions) {
          setPermissions(response.data.permissions);
          return;
        }
      } catch (error) {
        console.error("❌ Error loading permissions:", error);
      }
    }

    console.log(`📋 Using default permissions for role: ${selectedRole}`);
    // Define DEFAULT_PERMISSIONS inside the function
    const defaultPermissions = {
      admin: {
        view_staff: true,
        add_edit_staff: true,
        process_payroll: true,
        approve_payroll: true,
        view_reports: true,
        manage_leave: true,
        manage_users: true,
        view_audit_log: true,
        edit_settings: true,
      },
      hr_officer: {
        view_staff: true,
        add_edit_staff: true,
        process_payroll: false,
        approve_payroll: false,
        view_reports: true,
        manage_leave: true,
        manage_users: false,
        view_audit_log: true,
        edit_settings: false,
      },
      bursar: {
        view_staff: true,
        add_edit_staff: false,
        process_payroll: true,
        approve_payroll: true,
        view_reports: true,
        manage_leave: false,
        manage_users: false,
        view_audit_log: true,
        edit_settings: false,
      },
      vc: {
        view_staff: true,
        add_edit_staff: false,
        process_payroll: false,
        approve_payroll: true,
        view_reports: true,
        manage_leave: false,
        manage_users: false,
        view_audit_log: false,
        edit_settings: false,
      },
      staff: {
        view_staff: false,
        add_edit_staff: false,
        process_payroll: false,
        approve_payroll: false,
        view_reports: false,
        manage_leave: true,
        manage_users: false,
        view_audit_log: false,
        edit_settings: false,
      },
    };
    setPermissions(defaultPermissions[selectedRole] || defaultPermissions.staff);
  };

  loadPermissions();
}, [selectedRole, users]);


  // ✅ Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Reset form
  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      role: "staff",
      staff_id: "",
      password: "",
    });
    setEditingUser(null);
    setShowAddUser(false);
    setError("");
    setSuccessMessage("");
  };

  // ✅ Handle create user
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError("");
      setSuccessMessage("");

      if (!formData.full_name || !formData.email || !formData.password) {
        setError("Full name, email, and password are required");
        return;
      }

      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }

      if (
        users.some(
          (u) => u.email?.toLowerCase() === formData.email.toLowerCase()
        )
      ) {
        setError("A user with this email already exists");
        return;
      }

      const payload = {
        ...formData,
        created_by: user?.id,
      };

      console.log("📝 Creating user:", payload);
      const response = await userService.create(payload);
      console.log("📦 Create user response:", response);

      if (response.success) {
        setSuccessMessage("User created successfully!");
        hasFetched.current = false;
        await fetchUsers();
        resetForm();

        if (payload.role === selectedRole && response.data?.id) {
          const permResponse = await userService.getPermissions(
            response.data.id
          );
          if (permResponse.success && permResponse.data?.permissions) {
            setPermissions(permResponse.data.permissions);
          }
        }
      } else {
        setError(response.message || "Failed to create user");
      }
    } catch (error) {
      console.error("❌ Error creating user:", error);
      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to create user. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ Handle edit user
  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name || "",
      email: user.email || "",
      role: user.role || "staff",
      staff_id: user.staff_id || "",
      password: "",
    });
    setShowAddUser(true);
    setError("");
    setSuccessMessage("");
  };

  // ✅ Handle update user
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (isSubmitting || !editingUser) return;

    try {
      setIsSubmitting(true);
      setError("");
      setSuccessMessage("");

      if (!formData.full_name || !formData.email) {
        setError("Full name and email are required");
        return;
      }

      const existingUser = users.find(
        (u) =>
          u.email?.toLowerCase() === formData.email.toLowerCase() &&
          u.id !== editingUser.id
      );
      if (existingUser) {
        setError("A user with this email already exists");
        return;
      }

      const payload = {
        full_name: formData.full_name,
        email: formData.email,
        role: formData.role,
        staff_id: formData.staff_id,
        updated_by: user?.id,
      };

      if (formData.password) {
        if (formData.password.length < 6) {
          setError("Password must be at least 6 characters");
          return;
        }
        payload.password = formData.password;
      }

      console.log(`📝 Updating user ${editingUser.id}:`, payload);
      const response = await userService.update(editingUser.id, payload);
      console.log("📦 Update user response:", response);

      if (response.success) {
        setSuccessMessage("User updated successfully!");
        hasFetched.current = false;
        await fetchUsers();
        resetForm();

        if (payload.role === selectedRole) {
          const permResponse = await userService.getPermissions(editingUser.id);
          if (permResponse.success && permResponse.data?.permissions) {
            setPermissions(permResponse.data.permissions);
          }
        }
      } else {
        setError(response.message || "Failed to update user");
      }
    } catch (error) {
      console.error("❌ Error updating user:", error);
      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to update user. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ Handle update user role
  const handleUpdateUserRole = async (userId, newRole) => {
    if (!userId || !newRole) {
      setError("Invalid user or role");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      setSuccessMessage("");

      console.log(`🔄 Updating user ${userId} role to ${newRole}`);
      const response = await userService.update(userId, {
        role: newRole,
        updated_by: user?.id,
      });
      console.log("📦 Update role response:", response);

      if (response.success) {
        setSuccessMessage(
          `User role updated to ${getRoleLabel(newRole)} successfully!`
        );
        hasFetched.current = false;
        await fetchUsers();
        setSelectedRole(newRole);
      } else {
        setError(response.message || "Failed to update user role");
      }
    } catch (error) {
      console.error("❌ Error updating user role:", error);
      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to update user role. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ Handle toggle user status
  const handleToggleStatus = async (userId, currentStatus) => {
    if (!userId) return;

    const action = currentStatus ? "deactivate" : "activate";
    if (!window.confirm(`Are you sure you want to ${action} this user?`))
      return;

    try {
      setIsSubmitting(true);
      setError("");
      setSuccessMessage("");

      console.log(`🔄 ${action}ing user ${userId}`);
      const response = await userService.update(userId, {
        is_active: !currentStatus,
        updated_by: user?.id,
      });
      console.log(`📦 ${action} response:`, response);

      if (response.success) {
        setSuccessMessage(`User ${action}d successfully!`);
        hasFetched.current = false;
        await fetchUsers();
      } else {
        setError(response.message || `Failed to ${action} user`);
      }
    } catch (error) {
      console.error(`❌ Error ${action}ing user:`, error);
      setError(
        error.response?.data?.message ||
          error.message ||
          `Failed to ${action} user. Please try again.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ Handle delete user
  const handleDeleteUser = async (userId) => {
    if (!userId) return;

    if (
      !window.confirm(
        "Are you sure you want to deactivate this user? They will no longer be able to access the system."
      )
    )
      return;

    try {
      setIsSubmitting(true);
      setError("");
      setSuccessMessage("");

      console.log(`🗑️ Deleting user ${userId}`);
      const response = await userService.delete(userId);
      console.log("📦 Delete response:", response);

      if (response.success) {
        setSuccessMessage("User deactivated successfully!");
        hasFetched.current = false;
        await fetchUsers();
      } else {
        setError(response.message || "Failed to deactivate user");
      }
    } catch (error) {
      console.error("❌ Error deleting user:", error);
      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to deactivate user. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ Handle reset password
  const handleResetPassword = async (userId) => {
    if (!userId) return;

    const newPassword = prompt("Enter new password (min 6 characters):");
    if (newPassword === null) return;

    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      setSuccessMessage("");

      console.log(`🔑 Resetting password for user ${userId}`);
      const response = await userService.resetPassword(userId, newPassword);
      console.log("📦 Reset password response:", response);

      if (response.success) {
        setSuccessMessage("Password reset successfully!");
      } else {
        setError(response.message || "Failed to reset password");
      }
    } catch (error) {
      console.error("❌ Error resetting password:", error);
      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to reset password. Please try again."
      );
    } finally {
      setIsSubmitting(false);
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

  const getRoleBadge = (role) => {
    const badges = {
      admin: "bg-[#EEEDFE] text-[#3C3489]",
      hr_officer: "bg-[#E6F1FB] text-[#0C447C]",
      bursar: "bg-[#FAEEDA] text-[#633806]",
      vc: "bg-[#EAF3DE] text-[#27500A]",
      staff: "bg-[#E1F5EE] text-[#085041]",
    };
    return badges[role] || "bg-[#F5F5F7] text-[#4A4A5A]";
  };

  const getStatusBadge = (status) => {
    return status !== false
      ? "bg-[#EAF3DE] text-[#27500A]"
      : "bg-[#FCEBEB] text-[#791F1F]";
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: "Admin",
      hr_officer: "HR Officer",
      bursar: "Bursar",
      vc: "Vice Chancellor",
      staff: "Staff",
    };
    return labels[role] || role;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#0A2B5E] border-t-[#E65100] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#4A4A5A]">Loading users...</p>
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
            <div className="text-base font-semibold text-[#1A1A2E]">AATU Payroll</div>
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
                    <div className="text-base font-semibold text-[#1A1A2E]">AATU Payroll</div>
                    <div className="text-xs text-[#4A4A5A]">Management System</div>
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
                      <i className={`fas ${item.icon} w-5 text-center text-base`}></i>
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
                <i className="fas fa-shield-alt text-[#E65100] mr-2"></i>
                User management
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#E65100] flex items-center justify-center text-white text-sm font-semibold">
                {getInitials()}
              </div>
              <div className="text-sm font-medium text-[#1A1A2E] hidden sm:block">
                {getRoleName()}
              </div>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm flex items-center justify-between">
              <span><i className="fas fa-exclamation-circle mr-2"></i> {error}</span>
              <button onClick={() => setError("")} className="text-red-500 hover:text-red-700">
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm flex items-center justify-between">
              <span><i className="fas fa-check-circle mr-2"></i> {successMessage}</span>
              <button onClick={() => setSuccessMessage("")} className="text-green-500 hover:text-green-700">
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Column - Users Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-medium text-[#1A1A2E]">
                  System users ({users.filter(u => u.is_active !== false).length})
                </h2>
                <button
                  onClick={() => {
                    resetForm();
                    setShowAddUser(true);
                  }}
                  className="bg-[#185FA5] hover:bg-[#0C447C] text-white px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2"
                >
                  <i className="fas fa-plus"></i> Add user
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F5F5F7]">
                      <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">Name</th>
                      <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium hidden sm:table-cell">Email</th>
                      <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">Role</th>
                      <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium hidden md:table-cell">Status</th>
                      <th className="text-left px-3 py-2 text-[#4A4A5A] font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users && users.length > 0 ? (
                      users.map((item, index) => (
                        <tr
                          key={item.id || `user-${index}`}
                          className={`border-b border-[#E8E8E8] last:border-b-0 hover:bg-[#F5F5F7] transition ${
                            item.is_active === false ? "opacity-50" : ""
                          }`}
                        >
                          <td className="px-3 py-2 text-[#1A1A2E]">
                            {item.full_name || "Unknown"}
                          </td>
                          <td className="px-3 py-2 text-[#4A4A5A] hidden sm:table-cell">
                            {item.email || ""}
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={item.role || "staff"}
                              onChange={(e) =>
                                handleUpdateUserRole(item.id, e.target.value)
                              }
                              className={`text-[10px] px-2 py-1 rounded-full font-medium border-none focus:ring-2 focus:ring-[#E65100] ${getRoleBadge(
                                item.role || "staff"
                              )}`}
                              disabled={isSubmitting}
                            >
                              <option value="admin">Admin</option>
                              <option value="hr_officer">HR Officer</option>
                              <option value="bursar">Bursar</option>
                              <option value="vc">Vice Chancellor</option>
                              <option value="staff">Staff</option>
                            </select>
                          </td>
                          <td className="px-3 py-2 hidden md:table-cell">
                            <span
                              className={`text-[10px] px-2 py-1 rounded-full font-medium ${getStatusBadge(
                                item.is_active
                              )}`}
                            >
                              {item.is_active !== false ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1.5 flex-wrap">
                              <button
                                onClick={() => handleEditUser(item)}
                                className="p-1.5 text-[#185FA5] hover:text-[#0C447C] hover:bg-[#E6F1FB] rounded transition"
                                title="Edit User"
                                disabled={isSubmitting}
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                onClick={() =>
                                  handleToggleStatus(item.id, item.is_active !== false)
                                }
                                className={`p-1.5 rounded transition ${
                                  item.is_active !== false
                                    ? "text-[#2E7D32] hover:bg-[#E8F5E9]"
                                    : "text-[#D32F2F] hover:bg-[#FFEBEE]"
                                }`}
                                title={item.is_active !== false ? "Deactivate" : "Activate"}
                                disabled={isSubmitting}
                              >
                                <i className={`fas ${item.is_active !== false ? "fa-toggle-on" : "fa-toggle-off"}`}></i>
                              </button>
                              <button
                                onClick={() => handleResetPassword(item.id)}
                                className="p-1.5 text-[#4A4A5A] hover:text-[#E65100] hover:bg-[#FFF3E0] rounded transition"
                                title="Reset Password"
                                disabled={isSubmitting}
                              >
                                <i className="fas fa-key"></i>
                              </button>
                              <button
                                onClick={() => handleDeleteUser(item.id)}
                                className="p-1.5 text-[#4A4A5A] hover:text-[#D32F2F] hover:bg-[#FFEBEE] rounded transition"
                                title="Deactivate User"
                                disabled={isSubmitting}
                              >
                                <i className="fas fa-user-slash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center py-4 text-[#8A8A9A]">
                          No users found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Right Column */}
            <div>
              {/* Add / Edit User */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                className="bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5 mb-4"
              >
                <h2 className="text-sm font-medium text-[#1A1A2E] mb-4">
                  {showAddUser ? (editingUser ? "Edit user" : "Add new user") : "Add / edit user"}
                </h2>

                {showAddUser ? (
                  <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-[#4A4A5A] mb-1">Full name *</label>
                      <input
                        type="text"
                        name="full_name"
                        placeholder="e.g. John Doe"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#4A4A5A] mb-1">Email *</label>
                      <input
                        type="email"
                        name="email"
                        placeholder="e.g. john@tech-u.edu.ng"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
                        required
                        disabled={!!editingUser || isSubmitting}
                      />
                      {editingUser && <p className="text-xs text-[#8A8A9A] mt-1">Email cannot be changed</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#4A4A5A] mb-1">Staff ID (optional)</label>
                      <input
                        type="text"
                        name="staff_id"
                        placeholder="e.g. AATU/ICT/001"
                        value={formData.staff_id}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#4A4A5A] mb-1">Role *</label>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
                        required
                        disabled={isSubmitting}
                      >
                        <option value="admin">Admin (ICT)</option>
                        <option value="hr_officer">HR Officer</option>
                        <option value="bursar">Bursar</option>
                        <option value="vc">Vice Chancellor</option>
                        <option value="staff">Staff (self-service)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#4A4A5A] mb-1">
                        {editingUser ? "New Password (leave blank to keep current)" : "Password * (min 6 chars)"}
                      </label>
                      <input
                        type="password"
                        name="password"
                        placeholder={editingUser ? "Enter new password" : "Enter temporary password"}
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition bg-white text-sm"
                        required={!editingUser}
                        minLength={6}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="flex-1 bg-[#F5F5F7] hover:bg-[#E8E8E8] text-[#4A4A5A] px-4 py-2 rounded-lg text-sm font-medium transition"
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`flex-1 ${isSubmitting ? "bg-[#8A8A9A] cursor-not-allowed" : "bg-[#185FA5] hover:bg-[#0C447C]"} text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2`}
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-check"></i>
                            {editingUser ? "Update user" : "Create user"}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-8 text-[#8A8A9A]">
                    <i className="fas fa-user-plus text-4xl block mb-3"></i>
                    <p>Click "Add user" to create a new system user</p>
                  </div>
                )}
              </motion.div>

              {/* Role Permissions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
                className="bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5"
              >
                <h2 className="text-sm font-medium text-[#1A1A2E] mb-4">Role permissions</h2>

                <div className="text-xs text-[#4A4A5A] mb-3">
                  Showing permissions for: <strong className="text-[#1A1A2E]">{getRoleLabel(selectedRole)}</strong>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {["admin", "hr_officer", "bursar", "vc", "staff"].map((role) => (
                    <button
                      key={role}
                      onClick={() => setSelectedRole(role)}
                      className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition ${
                        selectedRole === role
                          ? getRoleBadge(role) + " ring-2 ring-[#E65100]"
                          : "bg-[#F5F5F7] text-[#4A4A5A] hover:bg-[#E8E8E8]"
                      }`}
                      disabled={isSubmitting}
                    >
                      {getRoleLabel(role)}
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  {permissions && Object.entries(permissions).length > 0 ? (
                    Object.entries(permissions).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex justify-between items-center py-2 border-b border-[#E8E8E8] last:border-b-0 text-xs"
                      >
                        <span className="text-[#1A1A2E]">
                          {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                        <div
                          className={`w-8 h-4 rounded-full cursor-pointer flex-shrink-0 transition ${
                            value ? "bg-[#185FA5]" : "bg-[#E8E8E8]"
                          } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                          onClick={async () => {
                            if (isSubmitting) return;

                            const userWithRole = users.find(
                              (u) => u.role === selectedRole && u.is_active !== false
                            );
                            if (!userWithRole) {
                              setError("No active user found with this role to update permissions");
                              return;
                            }

                            const newPermissions = { ...permissions, [key]: !value };

                            try {
                              setIsSubmitting(true);
                              const response = await userService.updatePermissions(
                                userWithRole.id,
                                newPermissions
                              );
                              if (response.success) {
                                setPermissions(newPermissions);
                                setSuccessMessage("Permission updated successfully!");
                              } else {
                                setError(response.message || "Failed to update permission");
                              }
                            } catch (error) {
                              console.error("❌ Error updating permission:", error);
                              setError(error.message || "Failed to update permission");
                            } finally {
                              setIsSubmitting(false);
                            }
                          }}
                          title="Click to toggle permission"
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded-full bg-white transition mt-0.5 ${
                              value ? "ml-4" : "ml-0.5"
                            }`}
                          ></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-[#8A8A9A] text-sm">
                      No permissions loaded for this role
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Users;