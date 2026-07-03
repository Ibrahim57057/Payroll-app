// src/services/api.js
import axios from "axios";

// ✅ Base URL - reads from environment variable or defaults to localhost
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ✅ Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 30000, // Default timeout: 30 seconds
});

// ✅ Helper method to set auth token
api.setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

// ✅ Helper method to clear auth data
api.clearAuth = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  delete api.defaults.headers.common["Authorization"];
};

// ✅ Helper method to check if user is authenticated
api.isAuthenticated = () => {
  const userStr = localStorage.getItem("user");
  if (!userStr) return false;
  try {
    const user = JSON.parse(userStr);
    return !!(user.token || user.access_token);
  } catch {
    return false;
  }
};

// ✅ Helper method to get current user
api.getCurrentUser = () => {
  const userStr = localStorage.getItem("user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

// ✅ Helper method to store user data
api.setUser = (userData) => {
  if (userData) {
    localStorage.setItem("user", JSON.stringify(userData));
    if (userData.token || userData.access_token) {
      api.setAuthToken(userData.token || userData.access_token);
    }
  }
};

// ✅ Helper method to get user role
api.getUserRole = () => {
  const user = api.getCurrentUser();
  return user?.role || "staff";
};

// ✅ Helper method to check if user has specific role
api.hasRole = (role) => {
  const userRole = api.getUserRole();
  return userRole === role;
};

// ✅ Helper method to check if user has any of the given roles
api.hasAnyRole = (roles) => {
  const userRole = api.getUserRole();
  return roles.includes(userRole);
};

// ✅ Helper method to create a request with custom timeout
api.withTimeout = (timeout) => {
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    timeout: timeout || 120000, // Default 2 minutes for long operations
  });
};

// ✅ Request interceptor - Add auth token to every request
api.interceptors.request.use(
  (config) => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        } else if (user.access_token) {
          config.headers.Authorization = `Bearer ${user.access_token}`;
        }
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }

    // ✅ Add timeout for specific endpoints
    if (config.url?.includes("/payroll/process")) {
      config.timeout = 120000; // 2 minutes for payroll processing
    } else if (config.url?.includes("/payroll/export")) {
      config.timeout = 60000; // 1 minute for exports
    } else if (config.url?.includes("/reports")) {
      config.timeout = 60000; // 1 minute for reports
    }

    if (import.meta.env.DEV) {
      console.log(
        `📤 ${config.method?.toUpperCase()} ${config.url} (timeout: ${config.timeout}ms)`,
      );
    }

    return config;
  },
  (error) => {
    console.error("❌ Request interceptor error:", error);
    return Promise.reject(error);
  },
);

// ✅ Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(
        `📥 ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`,
      );
    }
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      console.warn("⚠️ Unauthorized - Redirecting to login");
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      delete api.defaults.headers.common["Authorization"];
      if (
        !window.location.pathname.includes("/login") &&
        !window.location.pathname.includes("/signup")
      ) {
        window.location.href = "/login";
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.warn("⚠️ Forbidden - You don't have permission");
    }

    // Handle 404 Not Found
    if (error.response?.status === 404) {
      console.warn("⚠️ Not Found - The requested resource does not exist");
    }

    // Handle 400 Bad Request - Show validation errors
    if (error.response?.status === 400) {
      console.warn(
        "⚠️ Bad Request:",
        error.response?.data?.message || "Invalid request",
      );
    }

    // Handle 409 Conflict - Duplicate entry
    if (error.response?.status === 409) {
      console.warn(
        "⚠️ Conflict:",
        error.response?.data?.message || "Resource already exists",
      );
    }

    // Handle 500 Internal Server Error
    if (error.response?.status === 500) {
      console.error("❌ Server Error - Please try again later");
    }

    // Handle network errors
    if (error.code === "ERR_NETWORK") {
      console.error(
        "❌ Network error - Backend may be down. Please check if the server is running.",
      );
    }

    // Handle timeout errors
    if (error.code === "ECONNABORTED") {
      console.error(
        "❌ Request timeout - The operation took too long to complete",
      );
      // Provide user-friendly message for timeout
      if (error.config?.url?.includes("/payroll/process")) {
        error.message =
          "Payroll processing is taking longer than expected. Please check back in a few minutes.";
      } else {
        error.message = "The request timed out. Please try again.";
      }
    }

    // Handle cancel errors
    if (axios.isCancel(error)) {
      console.log("ℹ️ Request cancelled");
      return Promise.reject(error);
    }

    const errorMessage =
      error.response?.data?.message || error.message || "Unknown error";
    console.error(
      `❌ API Error [${error.response?.status || "NO_STATUS"}]:`,
      errorMessage,
    );

    return Promise.reject(error);
  },
);

export default api;
