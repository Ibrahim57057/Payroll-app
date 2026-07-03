// src/services/authService.js
import api from "./api";

const authService = {
  // ✅ Login user with email and password
 login: async (email, password) => {
  try {
    const response = await api.post("/auth/login", { email, password });

    if (response.data.success) {
      const userData = response.data.user;
      // ✅ Make sure full_name is stored correctly
      localStorage.setItem("user", JSON.stringify(userData));
      console.log("✅ Login successful:", userData);
      return { success: true, user: userData };
    } else {
      return {
        success: false,
        message: response.data.message || "Login failed",
      };
    }
  } catch (error) {
    console.error("❌ Login error:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Login failed. Please try again.",
    };
  }
}, // src/services/authService.js - Updated signup method

// src/services/authService.js - Updated signup method

// ✅ Signup new user
signup: async (userData) => {
  try {
    console.log("📝 Signup attempt:", userData.email);
    
    const response = await api.post("/auth/signup", userData);

    console.log("📦 Signup response:", response.data);

    if (response.data.success) {
      console.log("✅ Signup successful:", response.data.message);
      return { 
        success: true, 
        message: response.data.message,
        user: response.data.user 
      };
    } else {
      return {
        success: false,
        message: response.data.message || "Signup failed",
      };
    }
  } catch (error) {
    console.error(
      "❌ Signup error:",
      error.response?.data?.message || error.message,
    );
    return {
      success: false,
      message:
        error.response?.data?.message || "Signup failed. Please try again.",
    };
  }
},

// ✅ Logout user
  logout: () => {
    api.clearAuth();
    localStorage.removeItem("user");
    console.log("✅ Logged out successfully");
    if (!window.location.pathname.includes("/login")) {
      window.location.href = "/login";
    }
  },

  // ✅ Get current user from localStorage
  getCurrentUser: () => {
    try {
      const user = localStorage.getItem("user");
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  // ✅ Check if user is authenticated
  isAuthenticated: () => {
    const user = authService.getCurrentUser();
    return user !== null && user !== "{}" && user !== undefined;
  },

  // ✅ Get user role
  getUserRole: () => {
    const user = authService.getCurrentUser();
    return user?.role || "staff";
  },

  // ✅ Get user ID
  getUserId: () => {
    const user = authService.getCurrentUser();
    return user?.id || user?.user_id || null;
  },

  // ✅ Get user email
  getUserEmail: () => {
    const user = authService.getCurrentUser();
    return user?.email || null;
  },

  // ✅ Get user full name
  getUserFullName: () => {
    const user = authService.getCurrentUser();
    return user?.full_name || user?.fullName || "User";
  },

  // ✅ Check if user has specific role
  hasRole: (role) => {
    const userRole = authService.getUserRole();
    return userRole === role;
  },

  // ✅ Check if user has any of the given roles
  hasAnyRole: (roles) => {
    const userRole = authService.getUserRole();
    return roles.includes(userRole);
  },

  // ✅ Update user data in localStorage
  updateUser: (updates) => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      return updatedUser;
    }
    return null;
  },

  // ✅ Get auth token
  getToken: () => {
    const user = authService.getCurrentUser();
    return user?.token || user?.access_token || null;
  },

  // ✅ Refresh user data from server
  refreshUser: async () => {
    const user = authService.getCurrentUser();
    if (!user?.id) return null;

    try {
      const response = await api.get(`/users/${user.id}`);
      if (response.data.success) {
        const updatedUser = { ...user, ...response.data.data };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        return updatedUser;
      }
      return null;
    } catch (error) {
      console.error("❌ Error refreshing user data:", error);
      return null;
    }
  },

  // ✅ Get navigation items based on user role
  getNavItems: () => {
    const role = authService.getUserRole();

    const allNavItems = [
      { icon: "fa-home", label: "Dashboard", path: "/dashboard" },
      { icon: "fa-users", label: "Staff", path: "/staff" },
      { icon: "fa-coins", label: "Salary structure", path: "/salary" },
      { icon: "fa-minus-circle", label: "Deductions", path: "/deductions" },
      { icon: "fa-calculator", label: "Payroll", path: "/payroll" },
      { icon: "fa-file-invoice", label: "Payslips", path: "/payslips" },
      { icon: "fa-chart-bar", label: "Reports", path: "/reports" },
      { icon: "fa-calendar-alt", label: "Leave", path: "/leave" },
      { icon: "fa-shield-alt", label: "Users", path: "/users" },
      { icon: "fa-list-alt", label: "Audit log", path: "/audit" },
      { icon: "fa-cog", label: "Settings", path: "/settings" },
    ];

    const rolePermissions = {
      admin: [
        "Dashboard",
        "Staff",
        "Salary structure",
        "Deductions",
        "Payroll",
        "Payslips",
        "Reports",
        "Leave",
        "Users",
        "Audit log",
        "Settings",
      ],
      hr_officer: [
        "Dashboard",
        "Staff",
        "Salary structure",
        "Deductions",
        "Payroll",
        "Payslips",
        "Reports",
        "Leave",
      ],
      bursar: [
        "Dashboard",
        "Salary structure",
        "Deductions",
        "Payroll",
        "Payslips",
        "Reports",
        "Audit log",
      ],
      vc: ["Dashboard", "Reports", "Payroll", "Payslips"],
      staff: ["Dashboard", "Payslips", "Leave"],
    };

    const allowedLabels = rolePermissions[role] || rolePermissions.staff;
    return allNavItems.filter((item) => allowedLabels.includes(item.label));
  },

  // ✅ Check if user can access a specific page
  canAccess: (page) => {
    const navItems = authService.getNavItems();
    return navItems.some((item) => item.path === page);
  },

  // ✅ Get allowed pages for current user
  getAllowedPages: () => {
    return authService.getNavItems().map((item) => item.path);
  },
};

export default authService;
