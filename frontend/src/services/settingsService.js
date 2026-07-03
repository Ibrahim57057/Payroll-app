// src/services/settingsService.js
import api from "./api";

const settingsService = {
  // ✅ Get all settings
  getAll: async () => {
    try {
      const response = await api.get("/settings");
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching settings:", error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || "Failed to fetch settings",
      };
    }
  },

  // ✅ Get setting by key
  getByKey: async (key) => {
    if (!key) {
      console.error("❌ Key is required");
      return { success: false, data: null, message: "Key is required" };
    }

    try {
      const response = await api.get(`/settings/${key}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error fetching setting ${key}:`, error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || "Failed to fetch setting",
      };
    }
  },

  // ✅ Update or Create setting (Upsert) - FIXED
  update: async (key, value) => {
    if (!key) {
      console.error("❌ Key is required");
      return { success: false, message: "Key is required" };
    }

    if (value === undefined || value === null) {
      console.error("❌ Value is required");
      return { success: false, message: "Value is required" };
    }

    try {
      // ✅ If value is an object, keep it as an object (don't stringify)
      // The backend will handle the JSON parsing
      const payload = typeof value === "object" ? value : String(value);

      console.log(`📝 Updating/Creating setting "${key}"`);
      console.log("📦 Payload:", payload);

      const response = await api.put(`/settings/${key}`, { value: payload });
      console.log(`✅ Setting "${key}" updated successfully`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error updating setting ${key}:`, error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to update setting",
      };
    }
  },

  // ✅ Update multiple settings
  updateMultiple: async (settings) => {
    if (!settings || typeof settings !== "object") {
      console.error("❌ Settings object is required");
      return { success: false, message: "Settings object is required" };
    }

    try {
      // ✅ Send settings as is - backend will handle JSON
      const response = await api.put("/settings", { settings });
      console.log("✅ Settings updated successfully");
      return response.data;
    } catch (error) {
      console.error("❌ Error updating settings:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to update settings",
      };
    }
  },

  // ✅ Create setting
  create: async (key, value, description = "") => {
    if (!key) {
      console.error("❌ Key is required");
      return { success: false, message: "Key is required" };
    }

    if (value === undefined || value === null) {
      console.error("❌ Value is required");
      return { success: false, message: "Value is required" };
    }

    try {
      const payload =
        typeof value === "object" ? JSON.stringify(value) : String(value);
      const response = await api.post("/settings", {
        key,
        value: payload,
        description: description || `System setting for ${key}`,
      });
      console.log(`✅ Setting "${key}" created successfully`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error creating setting ${key}:`, error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to create setting",
      };
    }
  },

  // ✅ Delete setting
  delete: async (key) => {
    if (!key) {
      console.error("❌ Key is required");
      return { success: false, message: "Key is required" };
    }

    try {
      const response = await api.delete(`/settings/${key}`);
      console.log(`✅ Setting "${key}" deleted successfully`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error deleting setting ${key}:`, error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to delete setting",
      };
    }
  },

  // ✅ Check if setting exists
  exists: async (key) => {
    if (!key) {
      console.error("❌ Key is required");
      return { success: false, exists: false };
    }

    try {
      const response = await api.get(`/settings/${key}`);
      return { success: true, exists: true, data: response.data };
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: true, exists: false };
      }
      console.error(`❌ Error checking setting ${key}:`, error);
      return { success: false, exists: false };
    }
  },

  // ✅ Initialize default settings
  initializeDefaults: async () => {
    try {
      console.log("🔄 Initializing default settings...");

      const defaultSettings = {
        university: {
          name: "Abiola Ajimobi Technical University",
          shortName: "Tech-U",
          address: "Ibadan, Oyo State, Nigeria",
          website: "www.tech-u.edu.ng",
          motto: "Developing Brains, Training Hands",
          taxId: "FIRS-AATU-2017-001",
          pensionCode: "PEN-AATU-001",
          nhfCode: "NHF-AATU-001",
        },
        payroll: {
          processingDate: "25th of every month",
          paymentDate: "28th of every month",
          currency: "Nigerian Naira (₦)",
          minimumWage: "75,000",
          incrementMonth: "January",
          payslipFooter: "This payslip is computer generated",
        },
        notifications: {
          payslipEmail: true,
          notifyBursar: true,
          notifyVC: true,
          remittanceReminders: true,
          leaveNotifications: true,
          failedLoginAlerts: false,
        },
        security: {
          forcePasswordChange: true,
          autoLogout: true,
          lockAccount: true,
          twoFactorAuth: false,
        },
      };

      const results = [];
      for (const [key, value] of Object.entries(defaultSettings)) {
        try {
          const existsCheck = await settingsService.exists(key);
          if (existsCheck.exists) {
            console.log(`ℹ️ Setting "${key}" already exists, skipping...`);
            results.push({ key, success: true, message: "Already exists" });
            continue;
          }

          const response = await settingsService.create(
            key,
            value,
            `System setting for ${key}`,
          );
          results.push({ key, success: response.success, data: response.data });
        } catch (error) {
          console.error(`❌ Failed to initialize ${key}:`, error);
          results.push({ key, success: false, error: error.message });
        }
      }

      console.log("✅ Default settings initialized:", results);
      return { success: true, data: results };
    } catch (error) {
      console.error("❌ Error initializing default settings:", error);
      return {
        success: false,
        error: error.message || "Failed to initialize defaults",
      };
    }
  },

  // ✅ Get setting value with type parsing
  getValue: async (key) => {
    if (!key) {
      console.error("❌ Key is required");
      return { success: false, value: null };
    }

    try {
      const response = await api.get(`/settings/${key}`);
      if (response.data.success && response.data.data) {
        let value = response.data.data.value;
        try {
          value = JSON.parse(value);
        } catch {
          // If not JSON, keep as string
        }
        return { success: true, value };
      }
      return { success: false, value: null };
    } catch (error) {
      console.error(`❌ Error getting setting ${key}:`, error);
      return {
        success: false,
        value: null,
        message: error.response?.data?.message || "Failed to get setting",
      };
    }
  },

  // ✅ Get all settings as key-value map
  getSettingsMap: async () => {
    try {
      const response = await api.get("/settings");
      if (response.data.success && response.data.data) {
        const settingsMap = {};
        response.data.data.forEach((item) => {
          try {
            settingsMap[item.key] = JSON.parse(item.value);
          } catch {
            settingsMap[item.key] = item.value;
          }
        });
        return { success: true, data: settingsMap };
      }
      return { success: false, data: null };
    } catch (error) {
      console.error("❌ Error getting settings map:", error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || "Failed to get settings",
      };
    }
  },
};

export default settingsService;
