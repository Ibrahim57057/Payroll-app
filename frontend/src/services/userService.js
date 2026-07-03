// src/services/userService.js
import api from "./api";
import authService from "./authService";

export const userService = {
  // ✅ Get all users
  getAll: async () => {
    try {
      const response = await api.get("/users");
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching users:", error);
      return { success: false, data: [] };
    }
  },

  // ✅ Get user by ID
  getById: async (id) => {
    try {
      const response = await api.get(`/users/${id}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error fetching user ${id}:`, error);
      return { success: false, data: null };
    }
  },

  // ✅ Create user
  create: async (userData) => {
    try {
      const currentUser = authService.getCurrentUser();
      const response = await api.post("/users", {
        ...userData,
        created_by: currentUser?.id,
      });
      console.log("✅ User created successfully");
      return response.data;
    } catch (error) {
      console.error("❌ Error creating user:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to create user",
      };
    }
  },

  // ✅ Update user
  update: async (id, userData) => {
    try {
      const currentUser = authService.getCurrentUser();
      
      // Check if id is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return {
          success: false,
          message: "Invalid user ID format",
        };
      }

      const response = await api.put(`/users/${id}`, {
        ...userData,
        updated_by: currentUser?.id,
      });
      console.log("✅ User updated successfully");
      return response.data;
    } catch (error) {
      console.error(`❌ Error updating user ${id}:`, error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to update user",
      };
    }
  },

  // ✅ Delete user (Soft Delete)
  delete: async (id) => {
    try {
      const currentUser = authService.getCurrentUser();
      
      // Check if id is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return {
          success: false,
          message: "Invalid user ID format",
        };
      }

      const response = await api.delete(`/users/${id}`, {
        data: { deleted_by: currentUser?.id },
      });
      console.log("✅ User deleted successfully");
      return response.data;
    } catch (error) {
      console.error(`❌ Error deleting user ${id}:`, error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to delete user",
      };
    }
  },

  // ✅ Reset user password
  resetPassword: async (id, newPassword) => {
    try {
      const currentUser = authService.getCurrentUser();
      
      // Check if id is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return {
          success: false,
          message: "Invalid user ID format",
        };
      }

      const response = await api.post(`/users/${id}/reset-password`, {
        password: newPassword,
        reset_by: currentUser?.id,
      });
      console.log("✅ Password reset successfully");
      return response.data;
    } catch (error) {
      console.error(`❌ Error resetting password for user ${id}:`, error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to reset password",
      };
    }
  },

  // ✅ Get user permissions
  getPermissions: async (userId) => {
    try {
      // Check if userId is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        return { 
          success: false, 
          data: [],
          message: "Invalid user ID format",
        };
      }

      const response = await api.get(`/users/${userId}/permissions`);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching permissions:", error);
      return { success: false, data: [] };
    }
  },

  // ✅ Update user permissions
  updatePermissions: async (userId, permissions) => {
    try {
      const currentUser = authService.getCurrentUser();
      
      // Check if userId is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        return {
          success: false,
          message: "Invalid user ID format",
        };
      }

      const response = await api.put(`/users/${userId}/permissions`, {
        permissions,
        updated_by: currentUser?.id,
      });
      console.log("✅ Permissions updated successfully");
      return response.data;
    } catch (error) {
      console.error("❌ Error updating permissions:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to update permissions",
      };
    }
  },

  // ✅ Toggle user status (Activate/Deactivate)
  toggleStatus: async (id, isActive) => {
    try {
      const currentUser = authService.getCurrentUser();
      
      // Check if id is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return {
          success: false,
          message: "Invalid user ID format",
        };
      }

      const response = await api.put(`/users/${id}`, {
        is_active: isActive,
        updated_by: currentUser?.id,
      });
      console.log(`✅ User ${isActive ? 'activated' : 'deactivated'} successfully`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error toggling user status ${id}:`, error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to update user status",
      };
    }
  },

  // ✅ Get current user profile
  getProfile: async () => {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser?.id) {
        return { success: false, data: null };
      }
      const response = await api.get(`/users/${currentUser.id}`);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching user profile:", error);
      return { success: false, data: null };
    }
  },

  // ✅ Update user profile
  updateProfile: async (userData) => {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser?.id) {
        return { success: false, message: "No user logged in" };
      }
      const response = await api.put(`/users/${currentUser.id}`, {
        ...userData,
        updated_by: currentUser.id,
      });
      console.log("✅ Profile updated successfully");
      return response.data;
    } catch (error) {
      console.error("❌ Error updating profile:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to update profile",
      };
    }
  },
};

export default userService;