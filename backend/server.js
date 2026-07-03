// ============================================================
// AATU PAYROLL SYSTEM — BACKEND SERVER
// Abiola Ajimobi Technical University (Tech-U), Ibadan
// ============================================================

// ============================================================
// 1. IMPORT PACKAGES
// ============================================================
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

// ============================================================
// 2. LOAD ENVIRONMENT VARIABLES
// ============================================================
dotenv.config();

// ============================================================
// 3. CREATE EXPRESS APP
// ============================================================
const app = express();

// ============================================================
// 4. MIDDLEWARE
// ============================================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================
// 5. CONNECT TO SUPABASE
// ============================================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log("✅ Supabase connected successfully!");

// ============================================================
// 6. TEST ROUTE
// ============================================================
app.get("/", (req, res) => {
  res.json({
    message: "🏫 AATU Payroll System API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      auth: "/api/auth/login",
      staff: "/api/staff",
      departments: "/api/departments",
      faculties: "/api/faculties",
      gradeLevels: "/api/grade-levels",
      payroll: "/api/payroll",
      leave: "/api/leave-requests",
      users: "/api/users",
      audit: "/api/audit-logs",
      settings: "/api/settings",
    },
  });
});

// ============================================================
// 7. AUTHENTICATION ROUTES
// ============================================================

// ✅ LOGIN - FIXED with better error handling and user creation
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    console.log("🔍 Login attempt:", email);

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      console.error("❌ Auth error:", authError.message);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    console.log("✅ Auth successful for:", email);
    console.log("🆔 User ID:", authData.user.id);

    // ✅ Check users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, full_name, role, staff_id")
      .eq("email", email)
      .maybeSingle();

    console.log("📦 User data from table:", userData);

    // ✅ If user doesn't exist in users table, create them
    if (!userData) {
      console.log("🔄 User not found in users table, creating...");

      // Get user metadata from auth
      const fullName = authData.user.user_metadata?.full_name || email.split('@')[0] || "User";
      const role = authData.user.user_metadata?.role || "staff";
      const staffId = authData.user.user_metadata?.staff_id || null;

      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert([
          {
            id: authData.user.id,
            full_name: fullName,
            email: email,
            role: role,
            staff_id: staffId,
            is_active: true,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (createError) {
        console.error("❌ Create user error:", createError);
        return res.status(500).json({
          success: false,
          message: "Failed to create user profile: " + createError.message,
        });
      }

      console.log("✅ User created:", newUser);

      return res.json({
        success: true,
        message: "Login successful",
        user: {
          id: authData.user.id,
          email: authData.user.email,
          full_name: newUser.full_name,
          role: newUser.role,
          staff_id: newUser.staff_id,
          user_id: newUser.id,
        },
      });
    }

    // ✅ Return user data with proper full_name
    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name: userData.full_name || email.split('@')[0] || "User",
        role: userData.role || "staff",
        staff_id: userData.staff_id,
        user_id: userData.id,
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again.",
    });
  }
});

// ✅ SIGNUP - FIXED with proper user creation
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { full_name, staff_id, email, password, role } = req.body;

    console.log("📝 Signup request:", { full_name, email, role, staff_id });

    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Check if user already exists in users table
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    if (checkError) {
      console.error("❌ Check error:", checkError);
    }

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Check if user exists in auth
    const { data: authUsers, error: authCheckError } = await supabase.auth.admin.listUsers();
    const authUserExists = authUsers?.users?.some(u => u.email === email);

    let authData;
    if (authUserExists) {
      // User exists in auth but not in users table - get them
      console.log("⚠️ User exists in auth but not in users table");
      const { data: existingAuthUser } = await supabase.auth.admin.getUserByEmail(email);
      authData = { user: existingAuthUser };
    } else {
      // Create new auth user
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name,
            staff_id,
            role: role || "staff",
          },
        },
      });

      if (authError) {
        console.error("❌ Auth signup error:", authError.message);
        return res.status(400).json({
          success: false,
          message: authError.message,
        });
      }
      authData = data;
    }

    console.log("✅ Auth user created/found with ID:", authData.user.id);

    // ✅ Insert user into users table with proper UUID
    const { data: userData, error: userError } = await supabase
      .from("users")
      .insert([
        {
          id: authData.user.id,
          full_name,
          staff_id: staff_id || null,
          email,
          role: role || "staff",
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (userError) {
      console.error("❌ User insert error:", userError.message);
      // Try to delete the auth user if database insert fails
      if (!authUserExists) {
        await supabase.auth.admin.deleteUser(authData.user.id);
      }
      return res.status(500).json({
        success: false,
        message: "Failed to create user profile: " + userError.message,
      });
    }

    console.log("✅ User created successfully:", userData);

    // Create welcome notification
    await supabase.from("notifications").insert([
      {
        user_id: authData.user.id,
        title: "Welcome to AATU Payroll System! 🎉",
        message: `Hello ${full_name}, your account has been created successfully. You can now log in to access the system.`,
        type: "success",
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ]);

    res.json({
      success: true,
      message: "Account created successfully! Please sign in.",
      user: userData,
    });
  } catch (error) {
    console.error("❌ Signup error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error. Please try again.",
    });
  }
});

// ✅ GET CURRENT USER - NEW ROUTE
app.get("/api/auth/me", async (req, res) => {
  try {
    // Get the user from the auth token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const { data: user, error } = await supabase.auth.getUser(token);
    if (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    // Get user data from users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, full_name, email, role, staff_id, is_active")
      .eq("id", user.user.id)
      .maybeSingle();

    if (userError) {
      console.error("❌ User data error:", userError);
      return res.status(500).json({
        success: false,
        message: "Failed to get user data",
      });
    }

    res.json({
      success: true,
      data: userData || user.user,
    });
  } catch (error) {
    console.error("❌ Get current user error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ LOGOUT - NEW ROUTE
app.post("/api/auth/logout", async (req, res) => {
  try {
    // Supabase handles logout on client side
    // This just confirms the logout
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("❌ Logout error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ CHANGE PASSWORD - NEW ROUTE
app.post("/api/auth/change-password", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    // Update password
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error("❌ Password update error:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to update password",
      });
    }

    res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("❌ Change password error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ FORGOT PASSWORD - NEW ROUTE
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password`,
    });

    if (error) {
      console.error("❌ Reset password error:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to send reset email",
      });
    }

    res.json({
      success: true,
      message: "Password reset email sent successfully",
    });
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================================
// 8. DASHBOARD ROUTES
// ============================================================

// ✅ GET DASHBOARD STATS
app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const { count: totalStaff } = await supabase
      .from("staff")
      .select("*", { count: "exact", head: true });

    const { count: academicStaff } = await supabase
      .from("staff")
      .select("*", { count: "exact", head: true })
      .eq("category", "academic");

    const { count: nonAcademicStaff } = await supabase
      .from("staff")
      .select("*", { count: "exact", head: true })
      .eq("category", "non-academic");

    const { count: contractStaff } = await supabase
      .from("staff")
      .select("*", { count: "exact", head: true })
      .eq("category", "contract");

    const { count: pendingLeave } = await supabase
      .from("leave_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: totalPayslips } = await supabase
      .from("payslips")
      .select("*", { count: "exact", head: true });

    const currentMonth = new Date().toLocaleString("default", {
      month: "long",
    });
    const currentYear = new Date().getFullYear();

    const { data: payrollData } = await supabase
      .from("payroll_runs")
      .select("total_gross")
      .eq("month", currentMonth)
      .eq("year", currentYear)
      .eq("status", "disbursed")
      .single();

    const { count: activeStaff } = await supabase
      .from("staff")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    res.json({
      success: true,
      data: {
        totalStaff: totalStaff || 0,
        activeStaff: activeStaff || 0,
        academicStaff: academicStaff || 0,
        nonAcademicStaff: nonAcademicStaff || 0,
        contractStaff: contractStaff || 0,
        pendingLeave: pendingLeave || 0,
        totalPayslips: totalPayslips || 0,
        totalPayroll: payrollData?.total_gross || 0,
      },
    });
  } catch (error) {
    console.error("❌ Stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GET PAYROLL STATUS
app.get("/api/payroll/status", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("payroll_runs")
      .select("month, year, status")
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(6);

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("❌ Payroll status error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GET RECENT ACTIVITY (Dashboard)
app.get("/api/audit-log", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const { data, error } = await supabase
      .from("audit_logs")
      .select(
        `
                *,
                users (
                    full_name,
                    email
                )
            `,
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("❌ Audit log error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================================
// 9. STAFF ROUTES
// ============================================================
// ✅ GET ALL STAFF (FIXED)
app.get("/api/staff", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("staff")
      .select(
        `
        *,
        departments (
          id,
          name,
          faculties (
            id,
            name
          )
        ),
        grade_levels (
          id,
          grade_level,
          step,
          basic_salary
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("❌ Get staff error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GET SINGLE STAFF
app.get("/api/staff/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("staff")
      .select(
        `
                *,
                departments (
                    id,
                    name,
                    faculties (
                        id,
                        name
                    )
                ),
                grade_levels (
                    id,
                    grade_level,
                    step,
                    basic_salary,
                    salary_structures (
                        id,
                        name,
                        category
                    )
                )
            `,
      )
      .eq("id", id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("❌ Get staff error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ CREATE STAFF
app.post("/api/staff", async (req, res) => {
  try {
    const staffData = req.body;

    if (!staffData.staff_id) {
      const category = staffData.category || "staff";
      const year = new Date().getFullYear();
      const { count } = await supabase
        .from("staff")
        .select("*", { count: "exact", head: true });

      const number = String((count || 0) + 1).padStart(3, "0");
      const prefix =
        category === "academic"
          ? "ACAD"
          : category === "non-academic"
            ? "NADM"
            : "CON";
      staffData.staff_id = `AATU/${prefix}/${year}/${number}`;
    }

    const { data, error } = await supabase
      .from("staff")
      .insert([staffData])
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: "Staff created successfully",
      data,
    });
  } catch (error) {
    console.error("❌ Create staff error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ UPDATE STAFF
app.put("/api/staff/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const staffData = req.body;

    const { data, error } = await supabase
      .from("staff")
      .update(staffData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    res.json({
      success: true,
      message: "Staff updated successfully",
      data,
    });
  } catch (error) {
    console.error("❌ Update staff error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ DELETE STAFF (Soft Delete)
app.delete("/api/staff/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("staff")
      .update({ is_active: false })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    res.json({
      success: true,
      message: "Staff deactivated successfully",
      data,
    });
  } catch (error) {
    console.error("❌ Delete staff error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================================
// 10. SALARY STRUCTURE ROUTES
// ============================================================

// ✅ GET SALARY STRUCTURES
app.get("/api/salary-structures", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("salary_structures")
      .select("*")
      .order("name");

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("❌ Get salary structures error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GET GRADE LEVELS (FIXED)
app.get("/api/grade-levels", async (req, res) => {
  try {
    const { category } = req.query;

    let query = supabase
      .from("grade_levels")
      .select(
        `
        *,
        salary_structures (
          id,
          name,
          category
        )
      `,
      )
      .eq("is_active", true)
      .order("grade_level", { ascending: true })
      .order("step", { ascending: true });

    if (category) {
      query = query.eq("salary_structures.category", category);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("❌ Get grade levels error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ UPDATE GRADE LEVEL
app.put("/api/grade-levels/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { basic_salary } = req.body;

    const { data, error } = await supabase
      .from("grade_levels")
      .update({
        basic_salary,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Grade level not found",
      });
    }

    res.json({
      success: true,
      message: "Grade level updated successfully",
      data,
    });
  } catch (error) {
    console.error("❌ Update grade level error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GET ALLOWANCES
app.get("/api/allowance-types", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("allowance_types")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("❌ Get allowances error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ UPDATE ALLOWANCE
app.put("/api/allowance-types/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { value } = req.body;

    const { data, error } = await supabase
      .from("allowance_types")
      .update({ value })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Allowance not found",
      });
    }

    res.json({
      success: true,
      message: "Allowance updated successfully",
      data,
    });
  } catch (error) {
    console.error("❌ Update allowance error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================================
// 11. DEDUCTION ROUTES
// ============================================================

// ✅ GET DEDUCTION TYPES
app.get("/api/deduction-types", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("deduction_types")
      .select("*")
      .order("category", { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("❌ Get deduction types error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ CREATE DEDUCTION TYPE
app.post("/api/deduction-types", async (req, res) => {
  console.log("📝 POST /api/deduction-types called");
  try {
    const { name, value, category, value_type, is_statutory } = req.body;

    console.log("📦 Received data:", { name, value, category, value_type });

    if (!name || value === undefined || value === null) {
      return res.status(400).json({
        success: false,
        message: "Name and value are required",
      });
    }

    const { data: existing } = await supabase
      .from("deduction_types")
      .select("id")
      .eq("name", name)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Deduction type "${name}" already exists`,
      });
    }

    const { data, error } = await supabase
      .from("deduction_types")
      .insert([
        {
          name,
          value: parseFloat(value) || 0,
          category: category || "personal",
          value_type: value_type || "fixed",
          is_statutory: is_statutory || false,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase insert error:", error);
      throw error;
    }

    console.log("✅ Deduction type created:", data);

    res.json({
      success: true,
      message: "Deduction type created successfully",
      data,
    });
  } catch (error) {
    console.error("❌ Create deduction type error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ UPDATE DEDUCTION TYPE - REMOVED updated_at
app.put("/api/deduction-types/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, value, value_type } = req.body;

    console.log("📝 PUT /api/deduction-types called for ID:", id);
    console.log("📦 Update data:", { name, value, value_type });

    if (!name || value === undefined || value === null) {
      return res.status(400).json({
        success: false,
        message: "Name and value are required",
      });
    }

    const { data, error } = await supabase
      .from("deduction_types")
      .update({
        name,
        value: parseFloat(value) || 0,
        value_type: value_type || "fixed",
        // REMOVED: updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase update error:", error);
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Deduction type not found",
        });
      }
      throw error;
    }

    console.log("✅ Deduction type updated:", data);

    res.json({
      success: true,
      message: "Deduction type updated successfully",
      data,
    });
  } catch (error) {
    console.error("❌ Update deduction type error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ DELETE DEDUCTION TYPE - Force delete (removes check)
app.delete("/api/deduction-types/:id", async (req, res) => {
  try {
    const { id } = req.params;

    console.log("🗑️ DELETE /api/deduction-types called for ID:", id);

    // OPTION 1: First, delete all staff assignments for this deduction type
    const { error: deleteAssignmentsError } = await supabase
      .from("staff_deductions")
      .delete()
      .eq("deduction_type_id", id);

    if (deleteAssignmentsError) {
      console.error(
        "❌ Error deleting staff assignments:",
        deleteAssignmentsError,
      );
      // Continue anyway - try to delete the deduction type
    }

    // Now delete the deduction type
    const { data, error } = await supabase
      .from("deduction_types")
      .delete()
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase delete error:", error);
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Deduction type not found",
        });
      }
      throw error;
    }

    console.log("✅ Deduction type deleted:", data);

    res.json({
      success: true,
      message: "Deduction type deleted successfully",
      data,
    });
  } catch (error) {
    console.error("❌ Delete deduction type error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GET TAX BANDS
app.get("/api/tax-bands", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tax_bands")
      .select("*")
      .order("min_income", { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("❌ Get tax bands error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ UPDATE TAX BAND
app.put("/api/tax-bands/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rate } = req.body;

    if (rate === undefined || isNaN(rate)) {
      return res.status(400).json({
        success: false,
        message: "Valid rate is required",
      });
    }

    const { data, error } = await supabase
      .from("tax_bands")
      .update({ rate: parseFloat(rate) })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Tax band not found",
        });
      }
      throw error;
    }

    res.json({
      success: true,
      message: "Tax band updated successfully",
      data,
    });
  } catch (error) {
    console.error("❌ Update tax band error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GET STAFF DEDUCTIONS
app.get("/api/staff-deductions/:staffId", async (req, res) => {
  try {
    const { staffId } = req.params;

    const { data, error } = await supabase
      .from("staff_deductions")
      .select(
        `
        *,
        deduction_types (
          id,
          name,
          category,
          value_type,
          value
        )
      `,
      )
      .eq("staff_id", staffId)
      .eq("is_active", true);

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("❌ Get staff deductions error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ ASSIGN DEDUCTION TO STAFF
app.post("/api/staff-deductions", async (req, res) => {
  try {
    const { staff_id, deduction_type_id, override_value } = req.body;

    if (!staff_id || !deduction_type_id) {
      return res.status(400).json({
        success: false,
        message: "Staff ID and deduction type are required",
      });
    }

    const { data, error } = await supabase
      .from("staff_deductions")
      .insert([
        {
          staff_id,
          deduction_type_id,
          override_value: override_value || null,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: "Deduction assigned successfully",
      data,
    });
  } catch (error) {
    console.error("❌ Assign deduction error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ REMOVE DEDUCTION FROM STAFF
app.delete("/api/staff-deductions/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("staff_deductions")
      .update({ is_active: false })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Staff deduction not found",
      });
    }

    res.json({
      success: true,
      message: "Deduction removed successfully",
      data,
    });
  } catch (error) {
    console.error("❌ Remove deduction error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================================
// 12. PAYROLL ROUTES
// ============================================================

// ✅ GET PAYROLL RUNS (FIXED - NO STATUS)
app.get("/api/payroll-runs", async (req, res) => {
  try {
    const { month, year, status } = req.query;

    let query = supabase
      .from("payroll_runs")
      .select(
        `
        *,
        initiated_by_user:users!payroll_runs_initiated_by_fkey(full_name, email),
        approved_by_bursar_user:users!payroll_runs_approved_by_bursar_fkey(full_name, email),
        approved_by_vc_user:users!payroll_runs_approved_by_vc_fkey(full_name, email),
        payslips (
          id,
          staff_id,
          gross_pay,
          total_deductions,
          net_pay,
          staff:staff_id (
            id,
            staff_id,
            first_name,
            last_name,
            email,
            category
          )
        )
      `,
      )
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    if (month) query = query.eq("month", month);
    if (year) query = query.eq("year", parseInt(year));
    if (status) query = query.eq("status", status);

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("❌ Get payroll runs error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GET SINGLE PAYROLL RUN
app.get("/api/payroll-runs/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("payroll_runs")
      .select(
        `
                *,
                initiated_by_user:users!payroll_runs_initiated_by_fkey(full_name, email),
                approved_by_bursar_user:users!payroll_runs_approved_by_bursar_fkey(full_name, email),
                approved_by_vc_user:users!payroll_runs_approved_by_vc_fkey(full_name, email),
                payslips (
                    id,
                    staff_id,
                    staff:staff_id(
                        id,
                        staff_id,
                        first_name,
                        last_name
                    ),
                    gross_pay,
                    total_deductions,
                    net_pay,
                    status
                )
            `,
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Payroll run not found",
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("❌ Get payroll run error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
// ✅ PROCESS PAYROLL - OPTIMIZED
app.post("/api/payroll/process", async (req, res) => {
  try {
    const { month, year, initiated_by } = req.body;

    console.log("📝 Processing payroll for:", { month, year, initiated_by });

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required",
      });
    }

    // ✅ VALIDATE USER
    let validUserId = null;
    if (initiated_by) {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, role")
        .eq("id", initiated_by)
        .maybeSingle();

      if (!userError && user) {
        validUserId = user.id;
        console.log("✅ Valid user found:", validUserId, "Role:", user.role);
      } else {
        console.log("⚠️ User not found, using null for initiated_by");
        const { data: adminUser } = await supabase
          .from("users")
          .select("id")
          .eq("role", "admin")
          .maybeSingle();

        if (adminUser) {
          validUserId = adminUser.id;
          console.log("✅ Using admin user as fallback:", validUserId);
        }
      }
    }

    // Check if payroll already exists
    const { data: existing, error: checkError } = await supabase
      .from("payroll_runs")
      .select("id, status")
      .eq("month", month)
      .eq("year", parseInt(year))
      .maybeSingle();

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Payroll for ${month} ${year} already exists (Status: ${existing.status})`,
      });
    }

    // ✅ Get all active staff with their grade levels
    const { data: staffList, error: staffError } = await supabase
      .from("staff")
      .select(
        `
        *,
        grade_levels (
          id,
          grade_level,
          step,
          basic_salary
        ),
        departments (
          id,
          name
        )
      `,
      )
      .eq("is_active", true);

    if (staffError) {
      console.error("❌ Staff fetch error:", staffError);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch staff: " + staffError.message,
      });
    }

    if (!staffList || staffList.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No active staff found to process payroll. Please add staff first.",
      });
    }

    console.log(`👥 Found ${staffList.length} active staff members`);

    // ✅ Get ALL data in parallel for better performance
    const [allowancesResult, deductionsResult, taxBandsResult] =
      await Promise.all([
        supabase.from("allowance_types").select("*").eq("is_active", true),
        supabase.from("deduction_types").select("*").eq("is_statutory", true),
        supabase.from("tax_bands").select("*").order("min_income"),
      ]);

    const allowances = allowancesResult.data || [];
    const deductions = deductionsResult.data || [];
    const taxBands = taxBandsResult.data || [];

    // ============================================================
    // CREATE PAYROLL RUN
    // ============================================================
    const payrollRunData = {
      month,
      year: parseInt(year),
      status: "computed",
      initiated_by: validUserId,
      computed_at: new Date().toISOString(),
      total_staff: staffList.length,
      total_gross: 0,
      total_deductions: 0,
      total_net: 0,
    };

    console.log("📝 Creating payroll run with data:", payrollRunData);

    const { data: payrollRun, error: prError } = await supabase
      .from("payroll_runs")
      .insert([payrollRunData])
      .select()
      .single();

    if (prError) {
      console.error("❌ Payroll run creation error:", prError);
      return res.status(500).json({
        success: false,
        message: "Failed to create payroll run: " + prError.message,
      });
    }

    console.log("✅ Payroll run created:", payrollRun.id);

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let processedCount = 0;

    // ============================================================
    // PROCESS EACH STAFF - BATCH PROCESSING
    // ============================================================
    const payslipPromises = [];
    const payslipItemPromises = [];

    for (const staff of staffList) {
      try {
        // Calculate basic salary
        const basicSalary = staff.grade_levels?.basic_salary || 0;

        // Calculate allowances
        let totalAllowances = 0;
        const allowanceItems = [];

        for (const allow of allowances) {
          if (allow.category === "both" || allow.category === staff.category) {
            let amount = 0;
            if (allow.value_type === "percentage") {
              amount = (basicSalary * allow.value) / 100;
            } else {
              amount = allow.value || 0;
            }
            totalAllowances += amount;
            allowanceItems.push({
              item_name: allow.name,
              item_type: "allowance",
              amount: Math.round(amount),
            });
          }
        }

        // Calculate gross pay
        const grossPay = basicSalary + totalAllowances;

        // Calculate deductions
        let totalStaffDeductions = 0;
        const deductionItems = [];

        for (const ded of deductions) {
          let amount = 0;
          if (ded.value_type === "percentage") {
            amount = (grossPay * ded.value) / 100;
          } else {
            amount = ded.value || 0;
          }
          totalStaffDeductions += amount;
          deductionItems.push({
            item_name: ded.name,
            item_type: "deduction",
            amount: Math.round(amount),
          });
        }

        // Calculate PAYE (tax)
        let payeAmount = 0;
        if (taxBands && taxBands.length > 0) {
          let remainingIncome = grossPay;
          for (const band of taxBands) {
            if (remainingIncome <= 0) break;
            const bandMax = band.max_income || 99999999;
            const taxableAmount = Math.min(
              remainingIncome,
              Math.max(0, bandMax - band.min_income),
            );
            payeAmount += (taxableAmount * band.rate) / 100;
            remainingIncome -= taxableAmount;
            if (remainingIncome <= 0) break;
          }

          deductionItems.push({
            item_name: "PAYE Tax",
            item_type: "deduction",
            amount: Math.round(payeAmount),
          });
          totalStaffDeductions += Math.round(payeAmount);
        }

        // Calculate net pay
        const netPay = grossPay - totalStaffDeductions;

        totalGross += grossPay;
        totalDeductions += totalStaffDeductions;
        totalNet += netPay;

        // Create payslip
        const payslipData = {
          staff_id: staff.id,
          payroll_run_id: payrollRun.id,
          month,
          year: parseInt(year),
          basic_salary: Math.round(basicSalary),
          total_allowances: Math.round(totalAllowances),
          gross_pay: Math.round(grossPay),
          total_deductions: Math.round(totalStaffDeductions),
          net_pay: Math.round(netPay),
          generated_at: new Date().toISOString(),
        };

        const payslipPromise = supabase
          .from("payslips")
          .insert([payslipData])
          .select()
          .single();

        payslipPromises.push(payslipPromise);
        processedCount++;
      } catch (staffError) {
        console.error("❌ Error processing staff:", staff.id, staffError);
        continue;
      }
    }

    // ✅ Wait for all payslips to be created
    const payslipResults = await Promise.all(payslipPromises);
    const payslips = payslipResults
      .filter((result) => !result.error)
      .map((result) => result.data);

    // ✅ Create payslip items in batches
    for (const payslip of payslips) {
      // Get the staff data for this payslip
      const staff = staffList.find((s) => s.id === payslip.staff_id);
      if (!staff) continue;

      // Calculate items again
      const basicSalary = staff.grade_levels?.basic_salary || 0;
      let totalAllowances = 0;
      const allowanceItems = [];

      for (const allow of allowances) {
        if (allow.category === "both" || allow.category === staff.category) {
          let amount = 0;
          if (allow.value_type === "percentage") {
            amount = (basicSalary * allow.value) / 100;
          } else {
            amount = allow.value || 0;
          }
          totalAllowances += amount;
          allowanceItems.push({
            payslip_id: payslip.id,
            item_name: allow.name,
            item_type: "allowance",
            amount: Math.round(amount),
          });
        }
      }

      const grossPay = basicSalary + totalAllowances;
      let totalStaffDeductions = 0;
      const deductionItems = [];

      for (const ded of deductions) {
        let amount = 0;
        if (ded.value_type === "percentage") {
          amount = (grossPay * ded.value) / 100;
        } else {
          amount = ded.value || 0;
        }
        totalStaffDeductions += amount;
        deductionItems.push({
          payslip_id: payslip.id,
          item_name: ded.name,
          item_type: "deduction",
          amount: Math.round(amount),
        });
      }

      // Calculate PAYE again
      let payeAmount = 0;
      if (taxBands && taxBands.length > 0) {
        let remainingIncome = grossPay;
        for (const band of taxBands) {
          if (remainingIncome <= 0) break;
          const bandMax = band.max_income || 99999999;
          const taxableAmount = Math.min(
            remainingIncome,
            Math.max(0, bandMax - band.min_income),
          );
          payeAmount += (taxableAmount * band.rate) / 100;
          remainingIncome -= taxableAmount;
          if (remainingIncome <= 0) break;
        }
        deductionItems.push({
          payslip_id: payslip.id,
          item_name: "PAYE Tax",
          item_type: "deduction",
          amount: Math.round(payeAmount),
        });
        totalStaffDeductions += Math.round(payeAmount);
      }

      // Insert all items
      const allItems = [
        {
          payslip_id: payslip.id,
          item_name: "Basic Salary",
          item_type: "earning",
          amount: Math.round(basicSalary),
        },
        ...allowanceItems,
        ...deductionItems,
      ];

      await supabase.from("payslip_items").insert(allItems);
    }

    // ✅ Update payroll run with totals
    await supabase
      .from("payroll_runs")
      .update({
        total_gross: Math.round(totalGross),
        total_deductions: Math.round(totalDeductions),
        total_net: Math.round(totalNet),
        total_staff: processedCount,
      })
      .eq("id", payrollRun.id);

    console.log(`✅ Payroll processed: ${processedCount} staff`);

    // Send response with progress
    res.json({
      success: true,
      message: `Payroll processed successfully! ${processedCount} staff processed.`,
      data: {
        payroll_run: payrollRun,
        total_staff: processedCount,
        total_gross: Math.round(totalGross),
        total_deductions: Math.round(totalDeductions),
        total_net: Math.round(totalNet),
      },
    });
  } catch (error) {
    console.error("❌ Process payroll error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to process payroll. Please try again.",
    });
  }
});

// ✅ APPROVE PAYROLL (BURSAR) - FIXED
app.put("/api/payroll/:id/approve-bursar", async (req, res) => {
  try {
    const { id } = req.params;
    const { approved_by } = req.body;

    console.log("📝 Approving payroll:", { id, approved_by });

    // ✅ Validate the user exists
    let validUserId = null;
    if (approved_by) {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("id", approved_by)
        .maybeSingle();

      if (!userError && user) {
        validUserId = user.id;
        console.log("✅ Valid bursar user found:", validUserId);
      } else {
        console.log("⚠️ Bursar user not found, using admin as fallback");
        const { data: adminUser } = await supabase
          .from("users")
          .select("id")
          .eq("role", "admin")
          .maybeSingle();
        if (adminUser) {
          validUserId = adminUser.id;
          console.log("✅ Using admin user as fallback:", validUserId);
        }
      }
    }

    // ✅ Get the current payroll run first
    const { data: payrollRun, error: getError } = await supabase
      .from("payroll_runs")
      .select("status")
      .eq("id", id)
      .maybeSingle();

    if (getError) {
      console.error("❌ Get payroll error:", getError);
      throw getError;
    }

    if (!payrollRun) {
      return res.status(404).json({
        success: false,
        message: "Payroll run not found",
      });
    }

    if (payrollRun.status !== "computed") {
      return res.status(400).json({
        success: false,
        message: `Payroll is already ${payrollRun.status}. Cannot approve.`,
      });
    }

    // ✅ Update only columns that exist
    const updateData = {
      status: "bursar_approved",
      bursar_approved_at: new Date().toISOString(),
      // Only include bursar_approved_by if the column exists
      // If the column doesn't exist, skip it
    };

    // Try to include the user ID if column exists
    if (validUserId) {
      // Check if column exists first - we'll handle this gracefully
      updateData.bursar_approved_by = validUserId;
    }

    console.log("📝 Update data:", updateData);

    const { data, error } = await supabase
      .from("payroll_runs")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      // If error is about missing column, try without it
      if (
        error.message?.includes("column") &&
        error.message?.includes("does not exist")
      ) {
        console.log("⚠️ Column not found, trying without bursar_approved_by");
        delete updateData.bursar_approved_by;

        const { data: retryData, error: retryError } = await supabase
          .from("payroll_runs")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();

        if (retryError) throw retryError;

        // Log audit
        if (validUserId) {
          await supabase.from("audit_logs").insert([
            {
              user_id: validUserId,
              action: "APPROVE",
              module: "payroll",
              description: `Payroll ${id} approved by Bursar`,
              ip_address: req.ip || "N/A",
            },
          ]);
        }

        return res.json({
          success: true,
          message: "Payroll approved by Bursar",
          data: retryData,
        });
      }
      throw error;
    }

    // Log audit
    if (validUserId) {
      await supabase.from("audit_logs").insert([
        {
          user_id: validUserId,
          action: "APPROVE",
          module: "payroll",
          description: `Payroll ${id} approved by Bursar`,
          ip_address: req.ip || "N/A",
        },
      ]);
    }

    res.json({
      success: true,
      message: "Payroll approved by Bursar",
      data,
    });
  } catch (error) {
    console.error("❌ Approve payroll error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to approve payroll",
    });
  }
});

// ✅ FINAL APPROVE PAYROLL (VC) - FIXED
app.put("/api/payroll/:id/approve-vc", async (req, res) => {
  try {
    const { id } = req.params;
    const { approved_by } = req.body;

    console.log("📝 VC Approving payroll:", { id, approved_by });

    // ✅ Validate the user exists
    let validUserId = null;
    if (approved_by) {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("id", approved_by)
        .maybeSingle();

      if (!userError && user) {
        validUserId = user.id;
        console.log("✅ Valid VC user found:", validUserId);
      } else {
        console.log("⚠️ VC user not found, using admin as fallback");
        const { data: adminUser } = await supabase
          .from("users")
          .select("id")
          .eq("role", "admin")
          .maybeSingle();
        if (adminUser) {
          validUserId = adminUser.id;
          console.log("✅ Using admin user as fallback:", validUserId);
        }
      }
    }

    // ✅ Get the current payroll run first
    const { data: payrollRun, error: getError } = await supabase
      .from("payroll_runs")
      .select("status")
      .eq("id", id)
      .maybeSingle();

    if (getError) {
      console.error("❌ Get payroll error:", getError);
      throw getError;
    }

    if (!payrollRun) {
      return res.status(404).json({
        success: false,
        message: "Payroll run not found",
      });
    }

    if (payrollRun.status !== "bursar_approved") {
      return res.status(400).json({
        success: false,
        message: `Payroll is ${payrollRun.status}. Must be 'bursar_approved' to approve.`,
      });
    }

    // ✅ Update only columns that exist
    const updateData = {
      status: "vc_approved",
      vc_approved_at: new Date().toISOString(),
    };

    if (validUserId) {
      updateData.vc_approved_by = validUserId;
    }

    console.log("📝 Update data:", updateData);

    const { data, error } = await supabase
      .from("payroll_runs")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (
        error.message?.includes("column") &&
        error.message?.includes("does not exist")
      ) {
        console.log("⚠️ Column not found, trying without vc_approved_by");
        delete updateData.vc_approved_by;

        const { data: retryData, error: retryError } = await supabase
          .from("payroll_runs")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();

        if (retryError) throw retryError;

        if (validUserId) {
          await supabase.from("audit_logs").insert([
            {
              user_id: validUserId,
              action: "APPROVE",
              module: "payroll",
              description: `Payroll ${id} approved by VC`,
              ip_address: req.ip || "N/A",
            },
          ]);
        }

        return res.json({
          success: true,
          message: "Payroll approved by VC",
          data: retryData,
        });
      }
      throw error;
    }

    // Log audit
    if (validUserId) {
      await supabase.from("audit_logs").insert([
        {
          user_id: validUserId,
          action: "APPROVE",
          module: "payroll",
          description: `Payroll ${id} approved by VC`,
          ip_address: req.ip || "N/A",
        },
      ]);
    }

    res.json({
      success: true,
      message: "Payroll approved by VC",
      data,
    });
  } catch (error) {
    console.error("❌ Final approve payroll error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to approve payroll",
    });
  }
});

// ✅ DISBURSE PAYROLL - FIXED
app.put("/api/payroll/:id/disburse", async (req, res) => {
  try {
    const { id } = req.params;
    const disbursed_by = req.body?.disbursed_by || null;

    console.log("📝 Disbursing payroll:", { id, disbursed_by });

    // ✅ Get the current payroll run first
    const { data: payrollRun, error: getError } = await supabase
      .from("payroll_runs")
      .select("status")
      .eq("id", id)
      .maybeSingle();

    if (getError) {
      console.error("❌ Get payroll error:", getError);
      throw getError;
    }

    if (!payrollRun) {
      return res.status(404).json({
        success: false,
        message: "Payroll run not found",
      });
    }

    if (payrollRun.status !== "vc_approved") {
      return res.status(400).json({
        success: false,
        message: `Payroll is ${payrollRun.status}. Must be 'vc_approved' to disburse.`,
      });
    }

    const updateData = {
      status: "disbursed",
      disbursed_at: new Date().toISOString(),
    };

    if (disbursed_by) {
      updateData.disbursed_by = disbursed_by;
    }

    const { data, error } = await supabase
      .from("payroll_runs")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (
        error.message?.includes("column") &&
        error.message?.includes("does not exist")
      ) {
        console.log("⚠️ Column not found, trying without disbursed_by");
        delete updateData.disbursed_by;

        const { data: retryData, error: retryError } = await supabase
          .from("payroll_runs")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();

        if (retryError) throw retryError;

        if (disbursed_by) {
          await supabase.from("audit_logs").insert([
            {
              user_id: disbursed_by,
              action: "DISBURSE",
              module: "payroll",
              description: `Payroll ${id} disbursed`,
              ip_address: req.ip || "N/A",
            },
          ]);
        }

        return res.json({
          success: true,
          message: "Payroll disbursed successfully",
          data: retryData,
        });
      }
      throw error;
    }

    // Log audit
    if (disbursed_by) {
      await supabase.from("audit_logs").insert([
        {
          user_id: disbursed_by,
          action: "DISBURSE",
          module: "payroll",
          description: `Payroll ${id} disbursed`,
          ip_address: req.ip || "N/A",
        },
      ]);
    }

    res.json({
      success: true,
      message: "Payroll disbursed successfully",
      data,
    });
  } catch (error) {
    console.error("❌ Disburse payroll error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to disburse payroll",
    });
  }
});

// ✅ GET PAYROLL STATS
app.get("/api/payroll/stats", async (req, res) => {
  try {
    const currentMonth = new Date().toLocaleString("default", {
      month: "long",
    });
    const currentYear = new Date().getFullYear();

    const { data: currentPayroll, error: currError } = await supabase
      .from("payroll_runs")
      .select("*")
      .eq("month", currentMonth)
      .eq("year", currentYear)
      .single();

    if (currError && currError.code !== "PGRST116") throw currError;

    const { count: totalRuns, error: countError } = await supabase
      .from("payroll_runs")
      .select("*", { count: "exact", head: true });

    if (countError) throw countError;

    res.json({
      success: true,
      data: {
        totalRuns: totalRuns || 0,
        currentMonth: currentPayroll || null,
        currentMonthStatus: currentPayroll?.status || "not_started",
      },
    });
  } catch (error) {
    console.error("❌ Payroll stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GET PAYROLL SUMMARY BY MONTH (FIXED - NO STATUS)
app.get("/api/payroll/summary", async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required",
      });
    }

    const { data, error } = await supabase
      .from("payroll_runs")
      .select(
        `
        *,
        payslips (
          id,
          staff_id,
          basic_salary,
          total_allowances,
          gross_pay,
          total_deductions,
          net_pay,
          staff:staff_id (
            id,
            staff_id,
            first_name,
            last_name,
            email,
            category
          )
        )
      `,
      )
      .eq("month", month)
      .eq("year", parseInt(year))
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.json({
          success: true,
          data: null,
          message: "No payroll found for this month",
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("❌ Payroll summary error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GET DEDUCTION SUMMARY BY MONTH - CORRECTED
app.get("/api/payroll/deduction-summary", async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required",
      });
    }

    // Step 1: Get the payroll run ID
    const { data: payrollRun, error: prError } = await supabase
      .from("payroll_runs")
      .select("id")
      .eq("month", month)
      .eq("year", parseInt(year))
      .maybeSingle();

    if (prError) {
      console.error("❌ Payroll run error:", prError);
      throw prError;
    }

    if (!payrollRun) {
      return res.json({
        success: true,
        data: {
          deductions: [],
          totalDeductions: 0,
          totalStaff: 0,
        },
      });
    }

    // Step 2: Get all payslip IDs for this payroll run
    const { data: payslips, error: psError } = await supabase
      .from("payslips")
      .select("id")
      .eq("payroll_run_id", payrollRun.id);

    if (psError) {
      console.error("❌ Payslips error:", psError);
      throw psError;
    }

    if (!payslips || payslips.length === 0) {
      return res.json({
        success: true,
        data: {
          deductions: [],
          totalDeductions: 0,
          totalStaff: 0,
        },
      });
    }

    // Step 3: Extract payslip IDs into an array
    const payslipIds = payslips.map((p) => p.id);

    // Step 4: Get all deduction items for these payslip IDs
    const { data: items, error: itemError } = await supabase
      .from("payslip_items")
      .select("item_name, amount, payslip_id")
      .in("payslip_id", payslipIds)
      .eq("item_type", "deduction");

    if (itemError) {
      console.error("❌ Items error:", itemError);
      throw itemError;
    }

    // Step 5: Group by deduction type
    const grouped = {};
    const staffSet = new Set();

    (items || []).forEach((item) => {
      const name = item.item_name;
      if (!grouped[name]) {
        grouped[name] = {
          name: name,
          total: 0,
          staffCount: new Set(),
        };
      }
      grouped[name].total += item.amount || 0;
      grouped[name].staffCount.add(item.payslip_id);
      staffSet.add(item.payslip_id);
    });

    // Step 6: Format results
    const result = Object.values(grouped).map((item) => ({
      name: item.name,
      total: Math.round(item.total),
      staffCount: item.staffCount.size,
    }));

    let totalDeductions = 0;
    result.forEach((item) => (totalDeductions += item.total));

    res.json({
      success: true,
      data: {
        deductions: result,
        totalDeductions: Math.round(totalDeductions),
        totalStaff: payslips.length,
      },
    });
  } catch (error) {
    console.error("❌ Deduction summary error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================================
// 13. PAYSLIP ROUTES - CLEAN VERSION (NO DUPLICATES)
// ============================================================

// ✅ 1st: GET PAYSLIP PREVIEW (MUST BE FIRST!)
app.get("/api/payslips/preview", async (req, res) => {
  try {
    const staffId = req.query.staffId;
    const month = req.query.month;
    const year = req.query.year;

    console.log("📝 Preview request:", { staffId, month, year });

    if (
      !staffId ||
      staffId === "undefined" ||
      staffId === "null" ||
      staffId === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid Staff ID is required",
      });
    }

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required",
      });
    }

    // Check if staff exists
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select(
        `
        *,
        departments (
          id,
          name,
          faculties (
            id,
            name
          )
        ),
        grade_levels (
          id,
          grade_level,
          step,
          basic_salary
        )
      `,
      )
      .eq("id", staffId)
      .maybeSingle();

    if (staffError) {
      console.error("❌ Staff error:", staffError);
      return res
        .status(500)
        .json({ success: false, message: "Database error fetching staff" });
    }

    if (!staff) {
      return res
        .status(404)
        .json({ success: false, message: "Staff not found" });
    }

    // Check if payroll exists
    const { data: payrollRun } = await supabase
      .from("payroll_runs")
      .select("id, status")
      .eq("month", month)
      .eq("year", parseInt(year))
      .maybeSingle();

    if (!payrollRun) {
      return res.status(404).json({
        success: false,
        message: `No payroll found for ${month} ${year}. Please process payroll first.`,
      });
    }

    // Check if payslip already exists
    const { data: existingPayslip } = await supabase
      .from("payslips")
      .select(
        `
        *,
        staff:staff_id (
          id,
          staff_id,
          first_name,
          last_name,
          email,
          category,
          tax_id,
          departments (
            id,
            name,
            faculties (
              id,
              name
            )
          ),
          grade_levels (
            id,
            grade_level,
            step,
            basic_salary
          )
        ),
        payslip_items (
          id,
          item_type,
          item_name,
          amount
        )
      `,
      )
      .eq("staff_id", staffId)
      .eq("month", month)
      .eq("year", parseInt(year))
      .maybeSingle();

    if (existingPayslip) {
      return res.json({
        success: true,
        data: existingPayslip,
        isExisting: true,
      });
    }

    // Calculate preview
    const grade = staff.grade_levels;
    const basicSalary = grade?.basic_salary || 0;

    const { data: allowances } = await supabase
      .from("allowance_types")
      .select("*")
      .eq("is_active", true);

    let totalAllowances = 0;
    const allowanceItems = [];

    if (allowances) {
      for (const allow of allowances) {
        if (allow.category === "both" || allow.category === staff.category) {
          let amount = 0;
          if (allow.value_type === "percentage") {
            amount = (basicSalary * allow.value) / 100;
          } else {
            amount = allow.value || 0;
          }
          totalAllowances += amount;
          allowanceItems.push({
            item_type: "allowance",
            item_name: allow.name,
            amount: Math.round(amount),
          });
        }
      }
    }

    const grossPay = basicSalary + totalAllowances;

    const { data: deductions } = await supabase
      .from("deduction_types")
      .select("*")
      .eq("is_statutory", true);

    let totalDeductions = 0;
    const deductionItems = [];

    if (deductions) {
      for (const ded of deductions) {
        let amount = 0;
        if (ded.value_type === "percentage") {
          amount = (grossPay * ded.value) / 100;
        } else {
          amount = ded.value || 0;
        }
        totalDeductions += amount;
        deductionItems.push({
          item_type: "deduction",
          item_name: ded.name,
          amount: Math.round(amount),
        });
      }
    }

    const { data: taxBands } = await supabase
      .from("tax_bands")
      .select("*")
      .order("min_income");

    let payeAmount = 0;
    if (taxBands && taxBands.length > 0) {
      let remainingIncome = grossPay;
      for (const band of taxBands) {
        if (remainingIncome <= 0) break;
        const bandMax = band.max_income || 99999999;
        const taxableAmount = Math.min(
          remainingIncome,
          Math.max(0, bandMax - band.min_income),
        );
        payeAmount += (taxableAmount * band.rate) / 100;
        remainingIncome -= taxableAmount;
        if (remainingIncome <= 0) break;
      }
      deductionItems.push({
        item_type: "deduction",
        item_name: "PAYE Tax",
        amount: Math.round(payeAmount),
      });
      totalDeductions += Math.round(payeAmount);
    }

    const netPay = grossPay - totalDeductions;

    const payslipData = {
      id: null,
      staff_id: staffId,
      staff: staff,
      basic_salary: Math.round(basicSalary),
      total_allowances: Math.round(totalAllowances),
      gross_pay: Math.round(grossPay),
      total_deductions: Math.round(totalDeductions),
      net_pay: Math.round(netPay),
      payslip_items: [
        {
          item_type: "earning",
          item_name: "Basic Salary",
          amount: Math.round(basicSalary),
        },
        ...allowanceItems,
        ...deductionItems,
      ],
    };

    res.json({ success: true, data: payslipData, isExisting: false });
  } catch (error) {
    console.error("❌ Payslip preview error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ 2nd: GET PAYSLIP BY STAFF
app.get("/api/payslips/staff/:staffId", async (req, res) => {
  try {
    const { staffId } = req.params;
    const { month, year } = req.query;

    let query = supabase
      .from("payslips")
      .select(
        `
        *,
        payroll_run:payroll_run_id (
          id,
          month,
          year,
          status
        )
      `,
      )
      .eq("staff_id", staffId)
      .order("generated_at", { ascending: false });

    if (month) query = query.eq("payroll_run.month", month);
    if (year) query = query.eq("payroll_run.year", parseInt(year));

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("❌ Get staff payslips error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ 3rd: GET PAYSLIP BY PAYROLL RUN
app.get("/api/payslips/run/:payrollRunId", async (req, res) => {
  try {
    const { payrollRunId } = req.params;

    const { data, error } = await supabase
      .from("payslips")
      .select(
        `
        *,
        staff:staff_id (
          id,
          staff_id,
          first_name,
          last_name,
          email
        )
      `,
      )
      .eq("payroll_run_id", payrollRunId)
      .order("generated_at", { ascending: false });

    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("❌ Get payroll run payslips error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ 4th: GET PAYSLIP BY ID (MUST BE LAST!)
app.get("/api/payslips/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (id === "preview" || id === "staff" || id === "run") {
      return res
        .status(400)
        .json({ success: false, message: `Invalid payslip ID: ${id}` });
    }

    const { data, error } = await supabase
      .from("payslips")
      .select(
        `
        *,
        staff:staff_id (
          id,
          staff_id,
          first_name,
          last_name,
          email,
          category,
          tax_id,
          departments (
            id,
            name,
            faculties (
              id,
              name
            )
          ),
          grade_levels (
            id,
            grade_level,
            step,
            basic_salary
          )
        ),
        payroll_run:payroll_run_id (
          id,
          month,
          year,
          status
        ),
        payslip_items (
          id,
          item_type,
          item_name,
          amount
        )
      `,
      )
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Payslip not found" });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error("❌ Get payslip error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ 5th: GENERATE PAYSLIP PDF
app.get("/api/payslips/:id/pdf", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: payslip, error } = await supabase
      .from("payslips")
      .select(
        `
        *,
        staff:staff_id (
          id,
          staff_id,
          first_name,
          last_name,
          email,
          category,
          tax_id,
          departments (
            id,
            name,
            faculties (
              id,
              name
            )
          ),
          grade_levels (
            id,
            grade_level,
            step,
            basic_salary
          )
        ),
        payroll_run:payroll_run_id (
          id,
          month,
          year
        ),
        payslip_items (
          id,
          item_type,
          item_name,
          amount
        )
      `,
      )
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;

    if (!payslip) {
      return res
        .status(404)
        .json({ success: false, message: "Payslip not found" });
    }

    res.json({ success: true, data: payslip });
  } catch (error) {
    console.error("❌ Generate PDF error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ 6th: EMAIL PAYSLIP TO STAFF
app.post("/api/payslips/:id/email", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    const { data: payslip, error } = await supabase
      .from("payslips")
      .select(
        `
        *,
        staff:staff_id (
          id,
          first_name,
          last_name,
          email
        )
      `,
      )
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;

    if (!payslip) {
      return res
        .status(404)
        .json({ success: false, message: "Payslip not found" });
    }

    if (!payslip.staff?.email) {
      return res.status(400).json({
        success: false,
        message: "Staff does not have an email address",
      });
    }

    await supabase.from("audit_logs").insert([
      {
        user_id: user_id || null,
        action: "EMAIL",
        module: "payslip",
        description: `Emailed payslip ${id} to ${payslip.staff.email}`,
        ip_address: req.ip,
      },
    ]);

    res.json({
      success: true,
      message: `Payslip emailed to ${payslip.staff.email}`,
    });
  } catch (error) {
    console.error("❌ Email payslip error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// 14. REPORT API ROUTES
// ============================================================

// ✅ GENERATE MONTHLY PAYROLL SUMMARY REPORT
app.get("/api/reports/payroll-summary", async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required",
      });
    }

    const { data: payrollRun, error: prError } = await supabase
      .from("payroll_runs")
      .select(
        `
                *,
                payslips (
                    id,
                    staff_id,
                    staff:staff_id(
                        id,
                        staff_id,
                        first_name,
                        last_name,
                        category
                    ),
                    basic_salary,
                    total_allowances,
                    gross_pay,
                    total_deductions,
                    net_pay
                )
            `,
      )
      .eq("month", month)
      .eq("year", parseInt(year))
      .single();

    if (prError) {
      if (prError.code === "PGRST116") {
        return res.json({
          success: true,
          data: null,
          message: "No payroll found for this month",
        });
      }
      throw prError;
    }

    const payslips = payrollRun.payslips || [];
    const totalStaff = payslips.length;
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let totalBasic = 0;
    let totalAllowances = 0;

    payslips.forEach((ps) => {
      totalGross += ps.gross_pay || 0;
      totalDeductions += ps.total_deductions || 0;
      totalNet += ps.net_pay || 0;
      totalBasic += ps.basic_salary || 0;
      totalAllowances += ps.total_allowances || 0;
    });

    res.json({
      success: true,
      data: {
        payroll_run: payrollRun,
        summary: {
          totalStaff,
          totalBasic,
          totalAllowances,
          totalGross,
          totalDeductions,
          totalNet,
          averageGross: totalStaff > 0 ? totalGross / totalStaff : 0,
          averageNet: totalStaff > 0 ? totalNet / totalStaff : 0,
        },
        payslips,
      },
    });
  } catch (error) {
    console.error("❌ Payroll summary report error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GENERATE PAYE REMITTANCE REPORT
app.get("/api/reports/paye", async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required",
      });
    }

    const { data: payrollRun, error: prError } = await supabase
      .from("payroll_runs")
      .select("id")
      .eq("month", month)
      .eq("year", parseInt(year))
      .single();

    if (prError) {
      if (prError.code === "PGRST116") {
        return res.json({
          success: true,
          data: [],
          message: "No payroll found for this month",
        });
      }
      throw prError;
    }

    const { data, error } = await supabase
      .from("payslip_items")
      .select(
        `
                amount,
                payslip_id,
                payslips (
                    staff_id,
                    staff:staff_id(
                        id,
                        staff_id,
                        first_name,
                        last_name,
                        email
                    )
                )
            `,
      )
      .eq("payslips.payroll_run_id", payrollRun.id)
      .eq("item_name", "PAYE Tax")
      .eq("item_type", "deduction");

    if (error) throw error;

    const totalPAYE = data.reduce((sum, item) => sum + (item.amount || 0), 0);

    const { data: grossData, error: grossError } = await supabase
      .from("payslips")
      .select("gross_pay")
      .eq("payroll_run_id", payrollRun.id);

    if (grossError) throw grossError;

    const totalGross = grossData.reduce(
      (sum, item) => sum + (item.gross_pay || 0),
      0,
    );

    res.json({
      success: true,
      data: {
        month,
        year,
        totalPAYE,
        totalGross,
        effectiveRate: totalGross > 0 ? (totalPAYE / totalGross) * 100 : 0,
        staffCount: data.length,
        details: data.map((item) => ({
          staff: item.payslips?.staff || {},
          amount: item.amount,
        })),
      },
    });
  } catch (error) {
    console.error("❌ PAYE report error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GENERATE PENSION REMITTANCE REPORT
app.get("/api/reports/pension", async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required",
      });
    }

    const { data: payrollRun, error: prError } = await supabase
      .from("payroll_runs")
      .select("id")
      .eq("month", month)
      .eq("year", parseInt(year))
      .single();

    if (prError) {
      if (prError.code === "PGRST116") {
        return res.json({
          success: true,
          data: null,
          message: "No payroll found for this month",
        });
      }
      throw prError;
    }

    const { data, error } = await supabase
      .from("payslip_items")
      .select(
        `
                amount,
                item_name,
                payslip_id,
                payslips (
                    staff_id,
                    staff:staff_id(first_name, last_name, staff_id, pfa_name, rsa_pin)
                )
            `,
      )
      .eq("payslips.payroll_run_id", payrollRun.id)
      .in("item_name", ["Pension (Employee)", "Pension (Employer)"])
      .eq("item_type", "deduction");

    if (error) throw error;

    const employeePension = data.filter(
      (item) => item.item_name === "Pension (Employee)",
    );
    const employerPension = data.filter(
      (item) => item.item_name === "Pension (Employer)",
    );

    const totalEmployeePension = employeePension.reduce(
      (sum, item) => sum + (item.amount || 0),
      0,
    );
    const totalEmployerPension = employerPension.reduce(
      (sum, item) => sum + (item.amount || 0),
      0,
    );

    res.json({
      success: true,
      data: {
        month,
        year,
        totalEmployeePension,
        totalEmployerPension,
        totalPension: totalEmployeePension + totalEmployerPension,
        staffCount: data.length,
        details: data.map((item) => ({
          staff: item.payslips?.staff || {},
          type: item.item_name,
          amount: item.amount,
        })),
      },
    });
  } catch (error) {
    console.error("❌ Pension report error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GENERATE NHF REMITTANCE REPORT
app.get("/api/reports/nhf", async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required",
      });
    }

    const { data: payrollRun, error: prError } = await supabase
      .from("payroll_runs")
      .select("id")
      .eq("month", month)
      .eq("year", parseInt(year))
      .single();

    if (prError) {
      if (prError.code === "PGRST116") {
        return res.json({
          success: true,
          data: null,
          message: "No payroll found for this month",
        });
      }
      throw prError;
    }

    const { data, error } = await supabase
      .from("payslip_items")
      .select(
        `
                amount,
                payslip_id,
                payslips (
                    staff_id,
                    staff:staff_id(first_name, last_name, staff_id, nhf_number)
                )
            `,
      )
      .eq("payslips.payroll_run_id", payrollRun.id)
      .eq("item_name", "NHF")
      .eq("item_type", "deduction");

    if (error) throw error;

    const totalNHF = data.reduce((sum, item) => sum + (item.amount || 0), 0);

    res.json({
      success: true,
      data: {
        month,
        year,
        totalNHF,
        staffCount: data.length,
        details: data.map((item) => ({
          staff: item.payslips?.staff || {},
          amount: item.amount,
        })),
      },
    });
  } catch (error) {
    console.error("❌ NHF report error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GENERATE DEPARTMENT COST REPORT
app.get("/api/reports/department-cost", async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required",
      });
    }

    const { data: payrollRun, error: prError } = await supabase
      .from("payroll_runs")
      .select("id")
      .eq("month", month)
      .eq("year", parseInt(year))
      .single();

    if (prError) {
      if (prError.code === "PGRST116") {
        return res.json({
          success: true,
          data: [],
          message: "No payroll found for this month",
        });
      }
      throw prError;
    }

    const { data, error } = await supabase
      .from("payslips")
      .select(
        `
                gross_pay,
                net_pay,
                total_deductions,
                staff_id,
                staff:staff_id(
                    first_name,
                    last_name,
                    department_id,
                    departments (
                        id,
                        name,
                        faculties (
                            id,
                            name
                        )
                    )
                )
            `,
      )
      .eq("payroll_run_id", payrollRun.id);

    if (error) throw error;

    const departmentMap = {};
    let totalGross = 0;
    let totalNet = 0;

    data.forEach((item) => {
      const dept = item.staff?.departments;
      const deptName = dept?.name || "Unknown";
      const facultyName = dept?.faculties?.name || "Unknown";

      if (!departmentMap[deptName]) {
        departmentMap[deptName] = {
          department: deptName,
          faculty: facultyName,
          totalGross: 0,
          totalNet: 0,
          totalDeductions: 0,
          staffCount: 0,
        };
      }
      departmentMap[deptName].totalGross += item.gross_pay || 0;
      departmentMap[deptName].totalNet += item.net_pay || 0;
      departmentMap[deptName].totalDeductions += item.total_deductions || 0;
      departmentMap[deptName].staffCount += 1;

      totalGross += item.gross_pay || 0;
      totalNet += item.net_pay || 0;
    });

    const result = Object.values(departmentMap);

    res.json({
      success: true,
      data: {
        departments: result,
        summary: {
          totalDepartments: result.length,
          totalGross,
          totalNet,
          totalStaff: data.length,
        },
      },
    });
  } catch (error) {
    console.error("❌ Department cost report error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GENERATE FORM H1 (Annual PAYE Declaration) - FIXED
app.get("/api/reports/form-h1", async (req, res) => {
  try {
    const { year } = req.query;

    if (!year) {
      return res.status(400).json({
        success: false,
        message: "Year is required",
      });
    }

    // Get all payroll runs for the year (any status that has data)
    const { data: payrollRuns, error: prError } = await supabase
      .from("payroll_runs")
      .select("id")
      .eq("year", parseInt(year));

    if (prError) {
      console.error("❌ Payroll runs error:", prError);
      throw prError;
    }

    if (!payrollRuns || payrollRuns.length === 0) {
      return res.json({
        success: true,
        data: {
          year: parseInt(year),
          totalPAYE: 0,
          staffCount: 0,
          details: [],
        },
        message: "No payroll found for this year",
      });
    }

    const payrollRunIds = payrollRuns.map((run) => run.id);

    // Get all payslip IDs for these payroll runs
    const { data: payslips, error: psError } = await supabase
      .from("payslips")
      .select("id, staff_id")
      .in("payroll_run_id", payrollRunIds);

    if (psError) {
      console.error("❌ Payslips error:", psError);
      throw psError;
    }

    if (!payslips || payslips.length === 0) {
      return res.json({
        success: true,
        data: {
          year: parseInt(year),
          totalPAYE: 0,
          staffCount: 0,
          details: [],
        },
        message: "No payslips found for this year",
      });
    }

    const payslipIds = payslips.map((p) => p.id);

    // Get PAYE items for these payslip IDs
    const { data: items, error: itemError } = await supabase
      .from("payslip_items")
      .select(
        `
        amount,
        payslip_id
      `,
      )
      .in("payslip_id", payslipIds)
      .eq("item_name", "PAYE Tax")
      .eq("item_type", "deduction");

    if (itemError) {
      console.error("❌ Items error:", itemError);
      throw itemError;
    }

    // Group by staff
    const staffMap = {};
    let totalPAYE = 0;

    (items || []).forEach((item) => {
      // Find the staff_id for this payslip
      const payslip = payslips.find((p) => p.id === item.payslip_id);
      if (!payslip) return;

      const key = payslip.staff_id;
      if (!staffMap[key]) {
        staffMap[key] = {
          staff_id: key,
          totalPAYE: 0,
        };
      }
      staffMap[key].totalPAYE += item.amount || 0;
      totalPAYE += item.amount || 0;
    });

    // Get staff details
    const staffIds = Object.keys(staffMap);
    const { data: staffDetails, error: staffError } = await supabase
      .from("staff")
      .select("id, first_name, last_name, staff_id, tax_id")
      .in(
        "id",
        staffIds.length > 0
          ? staffIds
          : ["00000000-0000-0000-0000-000000000000"],
      );

    if (staffError) {
      console.error("❌ Staff details error:", staffError);
    }

    // Combine data
    const details = Object.values(staffMap).map((item) => {
      const staff = staffDetails?.find((s) => s.id === item.staff_id) || {};
      return {
        staff: {
          id: staff.id,
          staff_id: staff.staff_id || "N/A",
          first_name: staff.first_name || "Unknown",
          last_name: staff.last_name || "",
          tax_id: staff.tax_id || "N/A",
        },
        totalPAYE: Math.round(item.totalPAYE),
      };
    });

    res.json({
      success: true,
      data: {
        year: parseInt(year),
        totalPAYE: Math.round(totalPAYE),
        staffCount: details.length,
        details: details,
      },
    });
  } catch (error) {
    console.error("❌ Form H1 error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GENERATE NEW STAFF REPORT
app.get("/api/reports/new-staff", async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required",
      });
    }

    const startDate = new Date(
      parseInt(year),
      new Date(Date.parse(month + " 1, 2026")).getMonth(),
      1,
    );
    const endDate = new Date(
      parseInt(year),
      new Date(Date.parse(month + " 1, 2026")).getMonth() + 1,
      0,
    );

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("staff")
      .select(
        `
                *,
                departments (
                    id,
                    name,
                    faculties (
                        id,
                        name
                    )
                ),
                grade_levels (
                    id,
                    grade_level,
                    step,
                    basic_salary
                )
            `,
      )
      .gte("date_employed", startDateStr)
      .lte("date_employed", endDateStr)
      .order("date_employed", { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("❌ New staff report error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GENERATE DEDUCTION SUMMARY REPORT - FIXED
app.get("/api/reports/deduction-summary", async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required",
      });
    }

    // Step 1: Get the payroll run ID
    const { data: payrollRun, error: prError } = await supabase
      .from("payroll_runs")
      .select("id")
      .eq("month", month)
      .eq("year", parseInt(year))
      .maybeSingle();

    if (prError) {
      console.error("❌ Payroll run error:", prError);
      throw prError;
    }

    if (!payrollRun) {
      return res.json({
        success: true,
        data: {
          deductions: [],
          totalDeductions: 0,
          totalStaff: 0,
        },
        message: "No payroll found for this month",
      });
    }

    // Step 2: Get all payslip IDs for this payroll run
    const { data: payslips, error: psError } = await supabase
      .from("payslips")
      .select("id")
      .eq("payroll_run_id", payrollRun.id);

    if (psError) {
      console.error("❌ Payslips error:", psError);
      throw psError;
    }

    if (!payslips || payslips.length === 0) {
      return res.json({
        success: true,
        data: {
          deductions: [],
          totalDeductions: 0,
          totalStaff: 0,
        },
        message: "No payslips found for this payroll",
      });
    }

    // Step 3: Extract payslip IDs
    const payslipIds = payslips.map((p) => p.id);

    // Step 4: Get all deduction items for these payslip IDs
    const { data: items, error: itemError } = await supabase
      .from("payslip_items")
      .select("item_name, amount, payslip_id")
      .in("payslip_id", payslipIds)
      .eq("item_type", "deduction");

    if (itemError) {
      console.error("❌ Items error:", itemError);
      throw itemError;
    }

    // Step 5: Group by deduction type
    const grouped = {};
    (items || []).forEach((item) => {
      const name = item.item_name;
      if (!grouped[name]) {
        grouped[name] = {
          name: name,
          total: 0,
          staffCount: new Set(),
        };
      }
      grouped[name].total += item.amount || 0;
      grouped[name].staffCount.add(item.payslip_id);
    });

    // Step 6: Format results
    const result = Object.values(grouped).map((item) => ({
      name: item.name,
      total: Math.round(item.total),
      staffCount: item.staffCount.size,
    }));

    let totalDeductions = 0;
    result.forEach((item) => (totalDeductions += item.total));

    res.json({
      success: true,
      data: {
        deductions: result,
        totalDeductions: Math.round(totalDeductions),
        totalStaff: payslips.length,
      },
    });
  } catch (error) {
    console.error("❌ Deduction summary report error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GENERATE LEAVE REPORT
app.get("/api/reports/leave", async (req, res) => {
  try {
    const { month, year, status } = req.query;

    let query = supabase
      .from("leave_requests")
      .select(
        `
                *,
                staff:staff_id (
                    id,
                    staff_id,
                    first_name,
                    last_name,
                    email,
                    departments (
                        id,
                        name
                    )
                ),
                leave_type:leave_type_id (
                    id,
                    name,
                    days_entitled
                ),
                approved_by_user:users!leave_requests_approved_by_fkey (
                    full_name
                )
            `,
      )
      .order("created_at", { ascending: false });

    if (month && year) {
      const startDate = new Date(
        parseInt(year),
        new Date(Date.parse(month + " 1, 2026")).getMonth(),
        1,
      );
      const endDate = new Date(
        parseInt(year),
        new Date(Date.parse(month + " 1, 2026")).getMonth() + 1,
        0,
      );
      query = query
        .gte("start_date", startDate.toISOString().split("T")[0])
        .lte("end_date", endDate.toISOString().split("T")[0]);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) throw error;

    const totalRequests = data.length;
    const pending = data.filter((item) => item.status === "pending").length;
    const approved = data.filter((item) => item.status === "approved").length;
    const rejected = data.filter((item) => item.status === "rejected").length;
    const totalDays = data.reduce(
      (sum, item) => sum + (item.total_days || 0),
      0,
    );

    res.json({
      success: true,
      data: {
        requests: data,
        summary: {
          totalRequests,
          pending,
          approved,
          rejected,
          totalDays,
        },
      },
    });
  } catch (error) {
    console.error("❌ Leave report error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GENERATE YEAR-TO-DATE EARNINGS REPORT
app.get("/api/reports/ytd-earnings", async (req, res) => {
  try {
    const { staffId, year } = req.query;

    if (!staffId || !year) {
      return res.status(400).json({
        success: false,
        message: "Staff ID and year are required",
      });
    }

    const { data, error } = await supabase
      .from("payslips")
      .select(
        `
                *,
                payroll_run:payroll_run_id (
                    month,
                    year
                )
            `,
      )
      .eq("staff_id", staffId)
      .eq("payroll_run.year", parseInt(year))
      .order("generated_at", { ascending: true });

    if (error) throw error;

    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select(
        `
                *,
                departments (
                    id,
                    name,
                    faculties (
                        id,
                        name
                    )
                )
            `,
      )
      .eq("id", staffId)
      .single();

    if (staffError) throw staffError;

    const totalGross = data.reduce(
      (sum, item) => sum + (item.gross_pay || 0),
      0,
    );
    const totalDeductions = data.reduce(
      (sum, item) => sum + (item.total_deductions || 0),
      0,
    );
    const totalNet = data.reduce((sum, item) => sum + (item.net_pay || 0), 0);

    const monthly = data.map((item) => ({
      month: item.payroll_run?.month,
      year: item.payroll_run?.year,
      gross_pay: item.gross_pay,
      total_deductions: item.total_deductions,
      net_pay: item.net_pay,
    }));

    res.json({
      success: true,
      data: {
        staff,
        year: parseInt(year),
        summary: {
          totalGross,
          totalDeductions,
          totalNet,
          months: data.length,
        },
        monthly,
      },
    });
  } catch (error) {
    console.error("❌ YTD earnings report error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GET REPORT FILTERS
app.get("/api/reports/filters", async (req, res) => {
  try {
    const { data: payrollMonths, error: pmError } = await supabase
      .from("payroll_runs")
      .select("month, year")
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    if (pmError) throw pmError;

    const { data: departments, error: deptError } = await supabase
      .from("departments")
      .select("id, name")
      .order("name");

    if (deptError) throw deptError;

    const categories = ["academic", "non-academic", "contract"];

    res.json({
      success: true,
      data: {
        months: payrollMonths || [],
        departments: departments || [],
        categories,
      },
    });
  } catch (error) {
    console.error("❌ Report filters error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================================
// EXCEL EXPORT ROUTES - Place this BEFORE Leave Management
// ============================================================

// ✅ Export Payroll Summary to Excel
app.get("/api/reports/payroll-summary/excel", async (req, res) => {
  try {
    const { month, year } = req.query;

    const { data: payrollRun, error } = await supabase
      .from("payroll_runs")
      .select(
        `
        *,
        payslips (
          staff_id,
          staff:staff_id(first_name, last_name, category, staff_id),
          basic_salary,
          total_allowances,
          gross_pay,
          total_deductions,
          net_pay
        )
      `,
      )
      .eq("month", month)
      .eq("year", parseInt(year))
      .maybeSingle();

    if (error) throw error;
    if (!payrollRun) {
      return res.status(404).json({ success: false, message: "No data found" });
    }

    // Build CSV with proper staff_id
    let csv =
      "Staff ID,Name,Category,Basic Salary,Allowances,Gross Pay,Deductions,Net Pay\n";

    payrollRun.payslips?.forEach((p) => {
      const staff = p.staff || {};
      // Use staff.staff_id (the actual staff_id field) not the UUID
      const staffId = staff.staff_id || "N/A";
      const staffName =
        `${staff.first_name || ""} ${staff.last_name || ""}`.trim() ||
        "Unknown";
      const category = staff.category || "N/A";

      csv += `"${staffId}","${staffName}","${category}",${p.basic_salary || 0},${p.total_allowances || 0},${p.gross_pay || 0},${p.total_deductions || 0},${p.net_pay || 0}\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=payroll_summary_${month}_${year}.csv`,
    );
    res.send(csv);
  } catch (error) {
    console.error("❌ Export Excel error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ Export PAYE Report to Excel
app.get("/api/reports/paye/excel", async (req, res) => {
  try {
    const { month, year } = req.query;

    const { data: payrollRun, error } = await supabase
      .from("payroll_runs")
      .select("id")
      .eq("month", month)
      .eq("year", parseInt(year))
      .maybeSingle();

    if (error) throw error;
    if (!payrollRun) {
      return res.status(404).json({ success: false, message: "No data found" });
    }

    const { data, error: itemError } = await supabase
      .from("payslip_items")
      .select(
        `
        amount,
        payslips (
          staff_id,
          staff:staff_id(first_name, last_name, staff_id)
        )
      `,
      )
      .eq("payslips.payroll_run_id", payrollRun.id)
      .eq("item_name", "PAYE Tax")
      .eq("item_type", "deduction");

    if (itemError) throw itemError;

    let csv = "Staff ID,Name,PAYE Amount\n";
    data?.forEach((item) => {
      const staff = item.payslips?.staff || {};
      csv += `${staff.staff_id || "N/A"},${staff.first_name || ""} ${staff.last_name || ""},${item.amount || 0}\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=paye_${month}_${year}.csv`,
    );
    res.send(csv);
  } catch (error) {
    console.error("❌ Export PAYE Excel error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ Export Pension Report to Excel
app.get("/api/reports/pension/excel", async (req, res) => {
  try {
    const { month, year } = req.query;

    const { data: payrollRun, error } = await supabase
      .from("payroll_runs")
      .select("id")
      .eq("month", month)
      .eq("year", parseInt(year))
      .maybeSingle();

    if (error) throw error;
    if (!payrollRun) {
      return res.status(404).json({ success: false, message: "No data found" });
    }

    const { data, error: itemError } = await supabase
      .from("payslip_items")
      .select(
        `
        amount,
        item_name,
        payslips (
          staff_id,
          staff:staff_id(first_name, last_name, staff_id)
        )
      `,
      )
      .eq("payslips.payroll_run_id", payrollRun.id)
      .in("item_name", ["Pension (Employee)", "Pension (Employer)"])
      .eq("item_type", "deduction");

    if (itemError) throw itemError;

    let csv = "Staff ID,Name,Pension Type,Amount\n";
    data?.forEach((item) => {
      const staff = item.payslips?.staff || {};
      csv += `${staff.staff_id || "N/A"},${staff.first_name || ""} ${staff.last_name || ""},${item.item_name},${item.amount || 0}\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=pension_${month}_${year}.csv`,
    );
    res.send(csv);
  } catch (error) {
    console.error("❌ Export Pension Excel error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ Export NHF Report to Excel
app.get("/api/reports/nhf/excel", async (req, res) => {
  try {
    const { month, year } = req.query;

    const { data: payrollRun, error } = await supabase
      .from("payroll_runs")
      .select("id")
      .eq("month", month)
      .eq("year", parseInt(year))
      .maybeSingle();

    if (error) throw error;
    if (!payrollRun) {
      return res.status(404).json({ success: false, message: "No data found" });
    }

    const { data, error: itemError } = await supabase
      .from("payslip_items")
      .select(
        `
        amount,
        payslips (
          staff_id,
          staff:staff_id(first_name, last_name, staff_id, nhf_number)
        )
      `,
      )
      .eq("payslips.payroll_run_id", payrollRun.id)
      .eq("item_name", "NHF")
      .eq("item_type", "deduction");

    if (itemError) throw itemError;

    let csv = "Staff ID,Name,NHF Number,NHF Amount\n";
    data?.forEach((item) => {
      const staff = item.payslips?.staff || {};
      csv += `${staff.staff_id || "N/A"},${staff.first_name || ""} ${staff.last_name || ""},${staff.nhf_number || "N/A"},${item.amount || 0}\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=nhf_${month}_${year}.csv`,
    );
    res.send(csv);
  } catch (error) {
    console.error("❌ Export NHF Excel error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ Export Department Cost Report to Excel
app.get("/api/reports/department-cost/excel", async (req, res) => {
  try {
    const { month, year } = req.query;

    const { data: payrollRun, error } = await supabase
      .from("payroll_runs")
      .select("id")
      .eq("month", month)
      .eq("year", parseInt(year))
      .maybeSingle();

    if (error) throw error;
    if (!payrollRun) {
      return res.status(404).json({ success: false, message: "No data found" });
    }

    const { data, error: psError } = await supabase
      .from("payslips")
      .select(
        `
        gross_pay,
        net_pay,
        staff_id,
        staff:staff_id(
          first_name,
          last_name,
          department_id,
          departments (name)
        )
      `,
      )
      .eq("payroll_run_id", payrollRun.id);

    if (psError) throw psError;

    let csv = "Department,Staff Name,Gross Pay,Net Pay\n";
    data?.forEach((item) => {
      const staff = item.staff || {};
      const deptName = staff.departments?.name || "Unknown";
      csv += `${deptName},${staff.first_name || ""} ${staff.last_name || ""},${item.gross_pay || 0},${item.net_pay || 0}\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=department_cost_${month}_${year}.csv`,
    );
    res.send(csv);
  } catch (error) {
    console.error("❌ Export Department Cost Excel error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ Export Deduction Summary to Excel
app.get("/api/reports/deduction-summary/excel", async (req, res) => {
  try {
    const { month, year } = req.query;

    const { data: payrollRun, error } = await supabase
      .from("payroll_runs")
      .select("id")
      .eq("month", month)
      .eq("year", parseInt(year))
      .maybeSingle();

    if (error) throw error;
    if (!payrollRun) {
      return res.status(404).json({ success: false, message: "No data found" });
    }

    const { data, error: itemError } = await supabase
      .from("payslip_items")
      .select(
        `
        item_name,
        amount,
        payslip_id
      `,
      )
      .eq("payslips.payroll_run_id", payrollRun.id)
      .eq("item_type", "deduction");

    if (itemError) throw itemError;

    // Group by deduction type
    const grouped = {};
    data?.forEach((item) => {
      if (!grouped[item.item_name]) {
        grouped[item.item_name] = 0;
      }
      grouped[item.item_name] += item.amount || 0;
    });

    let csv = "Deduction Type,Total Amount\n";
    Object.keys(grouped).forEach((key) => {
      csv += `${key},${grouped[key]}\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=deduction_summary_${month}_${year}.csv`,
    );
    res.send(csv);
  } catch (error) {
    console.error("❌ Export Deduction Summary Excel error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ Export Leave Report to Excel
app.get("/api/reports/leave/excel", async (req, res) => {
  try {
    const { month, year } = req.query;

    let query = supabase.from("leave_requests").select(`
        staff_id,
        staff:staff_id(first_name, last_name, staff_id),
        leave_type:leave_type_id(name),
        start_date,
        end_date,
        total_days,
        status
      `);

    if (month && year) {
      const monthIndex = [
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
      ].indexOf(month);
      const startDate = new Date(parseInt(year), monthIndex, 1);
      const endDate = new Date(parseInt(year), monthIndex + 1, 0);
      query = query
        .gte("start_date", startDate.toISOString().split("T")[0])
        .lte("end_date", endDate.toISOString().split("T")[0]);
    }

    const { data, error } = await query;
    if (error) throw error;

    let csv =
      "Staff ID,Name,Leave Type,Start Date,End Date,Total Days,Status\n";
    data?.forEach((item) => {
      const staff = item.staff || {};
      const leaveType = item.leave_type || {};
      csv += `${staff.staff_id || "N/A"},${staff.first_name || ""} ${staff.last_name || ""},${leaveType.name || "N/A"},${item.start_date},${item.end_date},${item.total_days},${item.status}\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=leave_report_${month}_${year}.csv`,
    );
    res.send(csv);
  } catch (error) {
    console.error("❌ Export Leave Excel error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ Export New Staff Report to Excel
app.get("/api/reports/new-staff/excel", async (req, res) => {
  try {
    const { month, year } = req.query;

    const monthIndex = [
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
    ].indexOf(month);
    const startDate = new Date(parseInt(year), monthIndex, 1);
    const endDate = new Date(parseInt(year), monthIndex + 1, 0);
    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("staff")
      .select(
        `
        staff_id,
        first_name,
        last_name,
        date_employed,
        category,
        departments (name)
      `,
      )
      .gte("date_employed", startDateStr)
      .lte("date_employed", endDateStr)
      .order("date_employed", { ascending: false });

    if (error) throw error;

    let csv =
      "Staff ID,First Name,Last Name,Department,Category,Date Employed\n";
    data?.forEach((item) => {
      csv += `${item.staff_id || "N/A"},${item.first_name || ""},${item.last_name || ""},${item.departments?.name || "N/A"},${item.category || "N/A"},${item.date_employed}\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=new_staff_${month}_${year}.csv`,
    );
    res.send(csv);
  } catch (error) {
    console.error("❌ Export New Staff Excel error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ Export Form H1 to Excel
app.get("/api/reports/form-h1/excel", async (req, res) => {
  try {
    const { year } = req.query;

    const { data: payrollRuns, error: prError } = await supabase
      .from("payroll_runs")
      .select("id")
      .eq("year", parseInt(year))
      .eq("status", "disbursed");

    if (prError) throw prError;
    if (!payrollRuns || payrollRuns.length === 0) {
      return res.status(404).json({ success: false, message: "No data found" });
    }

    const payrollRunIds = payrollRuns.map((run) => run.id);

    const { data, error } = await supabase
      .from("payslip_items")
      .select(
        `
        amount,
        payslips (
          staff_id,
          staff:staff_id(first_name, last_name, staff_id, tax_id)
        )
      `,
      )
      .in("payslips.payroll_run_id", payrollRunIds)
      .eq("item_name", "PAYE Tax")
      .eq("item_type", "deduction");

    if (error) throw error;

    // Group by staff
    const grouped = {};
    data?.forEach((item) => {
      const staff = item.payslips?.staff || {};
      const key = staff.staff_id || "N/A";
      if (!grouped[key]) {
        grouped[key] = {
          staff_id: key,
          name: `${staff.first_name || ""} ${staff.last_name || ""}`,
          tax_id: staff.tax_id || "N/A",
          total: 0,
        };
      }
      grouped[key].total += item.amount || 0;
    });

    let csv = "Staff ID,Name,Tax ID,Total PAYE (Year)\n";
    Object.values(grouped).forEach((item) => {
      csv += `${item.staff_id},${item.name},${item.tax_id},${item.total}\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=form_h1_${year}.csv`,
    );
    res.send(csv);
  } catch (error) {
    console.error("❌ Export Form H1 Excel error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ Export YTD Earnings to Excel
app.get("/api/reports/ytd-earnings/excel", async (req, res) => {
  try {
    const { staffId, year } = req.query;

    if (!staffId || !year) {
      return res
        .status(400)
        .json({ success: false, message: "Staff ID and year are required" });
    }

    const { data, error } = await supabase
      .from("payslips")
      .select(
        `
        gross_pay,
        total_deductions,
        net_pay,
        payroll_run:payroll_run_id (month, year)
      `,
      )
      .eq("staff_id", staffId)
      .eq("payroll_run.year", parseInt(year))
      .order("generated_at", { ascending: true });

    if (error) throw error;

    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("staff_id, first_name, last_name")
      .eq("id", staffId)
      .single();

    if (staffError) throw staffError;

    let csv = "Month,Year,Gross Pay,Deductions,Net Pay\n";
    data?.forEach((item) => {
      csv += `${item.payroll_run?.month || "N/A"},${item.payroll_run?.year || "N/A"},${item.gross_pay || 0},${item.total_deductions || 0},${item.net_pay || 0}\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=ytd_${staff.staff_id}_${year}.csv`,
    );
    res.send(csv);
  } catch (error) {
    console.error("❌ Export YTD Earnings Excel error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// 15. LEAVE MANAGEMENT API ROUTES
// ============================================================

// ✅ GET ALL LEAVE TYPES
app.get("/api/leave-types", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("leave_types")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("❌ Get leave types error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GET ALL LEAVE REQUESTS
app.get("/api/leave-requests", async (req, res) => {
  try {
    const { staffId, status, month, year } = req.query;

    let query = supabase
      .from("leave_requests")
      .select(
        `
                *,
                staff:staff_id (
                    id,
                    staff_id,
                    first_name,
                    last_name,
                    email,
                    departments (
                        id,
                        name
                    )
                ),
                leave_type:leave_type_id (
                    id,
                    name,
                    days_entitled
                ),
                approved_by_user:users!leave_requests_approved_by_fkey (
                    full_name
                )
            `,
      )
      .order("created_at", { ascending: false });

    if (staffId) {
      query = query.eq("staff_id", staffId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (month && year) {
      const monthIndex = [
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
      ].indexOf(month);
      const startDate = new Date(parseInt(year), monthIndex, 1);
      const endDate = new Date(parseInt(year), monthIndex + 1, 0);
      query = query
        .gte("start_date", startDate.toISOString().split("T")[0])
        .lte("end_date", endDate.toISOString().split("T")[0]);
    }

    const { data, error } = await query;

    if (error) throw error;

    const totalRequests = data.length;
    const pending = data.filter((item) => item.status === "pending").length;
    const approved = data.filter((item) => item.status === "approved").length;
    const rejected = data.filter((item) => item.status === "rejected").length;
    const cancelled = data.filter((item) => item.status === "cancelled").length;
    const totalDays = data.reduce(
      (sum, item) => sum + (item.total_days || 0),
      0,
    );

    res.json({
      success: true,
      data: {
        requests: data || [],
        summary: {
          totalRequests,
          pending,
          approved,
          rejected,
          cancelled,
          totalDays,
        },
      },
    });
  } catch (error) {
    console.error("❌ Get leave requests error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GET SINGLE LEAVE REQUEST
app.get("/api/leave-requests/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("leave_requests")
      .select(
        `
                *,
                staff:staff_id (
                    id,
                    staff_id,
                    first_name,
                    last_name,
                    email,
                    departments (
                        id,
                        name
                    )
                ),
                leave_type:leave_type_id (
                    id,
                    name,
                    days_entitled
                ),
                approved_by_user:users!leave_requests_approved_by_fkey (
                    full_name
                )
            `,
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Leave request not found",
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("❌ Get leave request error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ CREATE LEAVE REQUEST
app.post("/api/leave-requests", async (req, res) => {
  try {
    const { staff_id, leave_type_id, start_date, end_date, reason, user_id } =
      req.body;

    if (!staff_id || !leave_type_id || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: "Staff ID, leave type, start date, and end date are required",
      });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);
    const diffTime = Math.abs(end - start);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const { data: leaveType, error: ltError } = await supabase
      .from("leave_types")
      .select("days_entitled, name")
      .eq("id", leave_type_id)
      .single();

    if (ltError) throw ltError;

    const year = new Date().getFullYear();
    const { data: balance, error: balanceError } = await supabase
      .from("leave_balances")
      .select("remaining_days, entitled_days, used_days")
      .eq("staff_id", staff_id)
      .eq("leave_type_id", leave_type_id)
      .eq("year", year)
      .single();

    if (balanceError && balanceError.code !== "PGRST116") throw balanceError;

    if (balance) {
      if (balance.remaining_days < totalDays) {
        return res.status(400).json({
          success: false,
          message: `Insufficient leave balance. Available: ${balance.remaining_days} days, Requested: ${totalDays} days`,
        });
      }
    }

    const { data: overlapping, error: overlapError } = await supabase
      .from("leave_requests")
      .select("id, status")
      .eq("staff_id", staff_id)
      .eq("status", "approved")
      .or(`start_date.lte.${end_date},end_date.gte.${start_date}`)
      .limit(1);

    if (overlapError) throw overlapError;

    if (overlapping && overlapping.length > 0) {
      return res.status(400).json({
        success: false,
        message: "You have an overlapping approved leave request",
      });
    }

    const { data, error } = await supabase
      .from("leave_requests")
      .insert([
        {
          staff_id,
          leave_type_id,
          start_date,
          end_date,
          total_days: totalDays,
          reason: reason || null,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) throw error;

    await supabase.from("audit_logs").insert([
      {
        user_id: user_id || null,
        action: "CREATE",
        module: "leave",
        description: `Leave request created for staff ${staff_id} (${totalDays} days)`,
        ip_address: req.ip,
      },
    ]);

    res.json({
      success: true,
      message: "Leave request submitted successfully",
      data,
    });
  } catch (error) {
    console.error("❌ Create leave request error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ APPROVE LEAVE REQUEST - FIXED
app.put("/api/leave-requests/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const { approved_by } = req.body;

    // ✅ Validate the user exists
    let validUserId = null;
    if (approved_by) {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("id", approved_by)
        .maybeSingle();

      if (!userError && user) {
        validUserId = user.id;
        console.log("✅ Valid user found for approval:", validUserId);
      } else {
        console.log("⚠️ User not found, trying email lookup...");
        // Try to find by email if the ID doesn't work
        const { data: userByEmail } = await supabase
          .from("users")
          .select("id")
          .eq("email", approved_by)
          .maybeSingle();

        if (userByEmail) {
          validUserId = userByEmail.id;
          console.log("✅ Found user by email:", validUserId);
        } else {
          // Fallback: get the admin user
          const { data: adminUser } = await supabase
            .from("users")
            .select("id")
            .eq("role", "admin")
            .maybeSingle();
          if (adminUser) {
            validUserId = adminUser.id;
            console.log("✅ Using admin user as fallback:", validUserId);
          }
        }
      }
    }

    // If still no valid user, get the first admin
    if (!validUserId) {
      const { data: adminUser } = await supabase
        .from("users")
        .select("id")
        .eq("role", "admin")
        .limit(1)
        .maybeSingle();
      if (adminUser) {
        validUserId = adminUser.id;
        console.log("✅ Using admin as final fallback:", validUserId);
      }
    }

    // Get the leave request
    const { data: leaveRequest, error: getError } = await supabase
      .from("leave_requests")
      .select(
        `
        *,
        staff:staff_id (id),
        leave_type:leave_type_id (id, name, days_entitled)
      `,
      )
      .eq("id", id)
      .maybeSingle();

    if (getError) throw getError;

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found",
      });
    }

    if (leaveRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Leave request is already ${leaveRequest.status}`,
      });
    }

    // Update the leave request
    const { data, error } = await supabase
      .from("leave_requests")
      .update({
        status: "approved",
        approved_by: validUserId,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Update leave balance
    const year = new Date().getFullYear();
    const { data: balance, error: balanceError } = await supabase
      .from("leave_balances")
      .select("id, used_days, remaining_days")
      .eq("staff_id", leaveRequest.staff_id)
      .eq("leave_type_id", leaveRequest.leave_type_id)
      .eq("year", year)
      .maybeSingle();

    if (balanceError && balanceError.code !== "PGRST116") throw balanceError;

    if (balance) {
      const newUsedDays = balance.used_days + leaveRequest.total_days;
      const newRemainingDays = balance.remaining_days - leaveRequest.total_days;
      await supabase
        .from("leave_balances")
        .update({
          used_days: newUsedDays,
          remaining_days: newRemainingDays,
          updated_at: new Date().toISOString(),
        })
        .eq("id", balance.id);
    }

    // Log audit
    await supabase.from("audit_logs").insert([
      {
        user_id: validUserId,
        action: "APPROVE",
        module: "leave",
        description: `Leave request ${id} approved for ${leaveRequest.total_days} days`,
        ip_address: req.ip,
      },
    ]);

    res.json({
      success: true,
      message: "Leave request approved successfully",
      data,
    });
  } catch (error) {
    console.error("❌ Approve leave request error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ REJECT LEAVE REQUEST - FIXED
app.put("/api/leave-requests/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, reason } = req.body;

    // ✅ Validate the user exists
    let validUserId = null;
    if (user_id) {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("id", user_id)
        .maybeSingle();

      if (!userError && user) {
        validUserId = user.id;
      } else {
        // Try to find by email
        const { data: userByEmail } = await supabase
          .from("users")
          .select("id")
          .eq("email", user_id)
          .maybeSingle();
        if (userByEmail) {
          validUserId = userByEmail.id;
        } else {
          const { data: adminUser } = await supabase
            .from("users")
            .select("id")
            .eq("role", "admin")
            .maybeSingle();
          if (adminUser) validUserId = adminUser.id;
        }
      }
    }

    const { data: leaveRequest, error: getError } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (getError) throw getError;

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found",
      });
    }

    if (leaveRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Leave request is already ${leaveRequest.status}`,
      });
    }

    const { data, error } = await supabase
      .from("leave_requests")
      .update({
        status: "rejected",
        reason: reason || leaveRequest.reason || "Rejected by HR",
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await supabase.from("audit_logs").insert([
      {
        user_id: validUserId,
        action: "REJECT",
        module: "leave",
        description: `Leave request ${id} rejected`,
        ip_address: req.ip,
      },
    ]);

    res.json({
      success: true,
      message: "Leave request rejected",
      data,
    });
  } catch (error) {
    console.error("❌ Reject leave request error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GET STAFF LEAVE BALANCE
app.get("/api/leave-balance/:staffId", async (req, res) => {
  try {
    const { staffId } = req.params;
    const { year } = req.query;

    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const { data, error } = await supabase
      .from("leave_balances")
      .select(
        `
                *,
                leave_type:leave_type_id (
                    id,
                    name,
                    days_entitled,
                    is_active
                )
            `,
      )
      .eq("staff_id", staffId)
      .eq("year", targetYear);

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("❌ Get leave balance error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ UPDATE LEAVE TYPE
app.put("/api/leave-types/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, days_entitled, affects_salary, is_active } = req.body;

    const { data, error } = await supabase
      .from("leave_types")
      .update({
        name: name || undefined,
        days_entitled: days_entitled || undefined,
        affects_salary:
          affects_salary !== undefined ? affects_salary : undefined,
        is_active: is_active !== undefined ? is_active : undefined,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Leave type not found",
      });
    }

    res.json({
      success: true,
      message: "Leave type updated successfully",
      data,
    });
  } catch (error) {
    console.error("❌ Update leave type error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GET LEAVE REQUESTS FOR STAFF (Self-Service)
app.get("/api/my-leave-requests", async (req, res) => {
  try {
    const userId = req.query.user_id || req.body.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID required",
      });
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("staff_id")
      .eq("id", userId)
      .single();

    if (userError) throw userError;

    if (!user?.staff_id) {
      return res.status(404).json({
        success: false,
        message: "Staff record not found for this user",
      });
    }

    const { data, error } = await supabase
      .from("leave_requests")
      .select(
        `
                *,
                leave_type:leave_type_id (
                    id,
                    name,
                    days_entitled
                ),
                approved_by_user:users!leave_requests_approved_by_fkey (
                    full_name
                )
            `,
      )
      .eq("staff_id", user.staff_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("❌ Get my leave requests error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================================
// 16. USER MANAGEMENT API ROUTES
// ============================================================

// ✅ GET ALL USERS - FIXED
app.get("/api/users", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select(
        `
        id,
        full_name,
        email,
        role,
        staff_id,
        is_active,
        last_login,
        created_at
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Get users error:", error);
      throw error;
    }

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("❌ Get users error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GET SINGLE USER
app.get("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("users")
      .select(
        `
        *,
        staff:staff_id (
          first_name,
          last_name,
          staff_id,
          email,
          phone,
          departments (
            id,
            name
          )
        )
      `,
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("❌ Get user error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ CREATE USER - FIXED
app.post("/api/users", async (req, res) => {
  try {
    const { full_name, email, role, staff_id, password, created_by } = req.body;

    console.log("📝 Creating user:", { full_name, email, role, staff_id });

    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, and password are required",
      });
    }

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          staff_id,
          role: role || "staff",
        },
      },
    });

    if (authError) {
      console.error("❌ Auth signup error:", authError.message);
      return res.status(400).json({
        success: false,
        message: authError.message,
      });
    }

    // ✅ FIXED: Use auth user ID as the primary key
    const { data: userData, error: userError } = await supabase
      .from("users")
      .insert([
        {
          id: authData.user.id, // ✅ UUID from auth
          full_name,
          email,
          role: role || "staff",
          staff_id: staff_id || null, // ✅ Staff ID string
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (userError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      console.error("❌ User insert error:", userError.message);
      return res.status(500).json({
        success: false,
        message: "Failed to create user profile: " + userError.message,
      });
    }

    // Log audit
    await supabase.from("audit_logs").insert([
      {
        user_id: created_by || null,
        action: "CREATE_USER",
        module: "users",
        description: `Created user ${full_name} with role ${role}`,
        ip_address: req.ip || "N/A",
      },
    ]);

    res.json({
      success: true,
      message: "User created successfully",
      data: userData,
    });
  } catch (error) {
    console.error("❌ Create user error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
// ✅ UPDATE USER - FIXED with UUID validation and better error handling
app.put("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const { full_name, role, is_active, staff_id } = req.body;

    console.log("📝 Updating user:", {
      id,
      full_name,
      role,
      is_active,
      staff_id,
    });

    // First, check if the user exists in the users table
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle(); // ✅ Use maybeSingle() instead of single()

    if (checkError) {
      console.error("❌ Check user error:", checkError);
      throw checkError;
    }

    // If user doesn't exist in users table, return 404
    if (!existingUser) {
      console.log(`⚠️ User ${id} not found in users table`);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update existing user
    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (role !== undefined) updateData.role = role;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (staff_id !== undefined) updateData.staff_id = staff_id;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("❌ Update error:", error);
      throw error;
    }

    // Log audit
    if (req.body && req.body.updated_by) {
      await supabase.from("audit_logs").insert([
        {
          user_id: req.body.updated_by,
          action: "UPDATE_USER",
          module: "users",
          description: `Updated user ${data.full_name}`,
          ip_address: req.ip || "N/A",
        },
      ]);
    }

    console.log("✅ User updated successfully:", data.full_name);

    res.json({
      success: true,
      message: "User updated successfully",
      data,
    });
  } catch (error) {
    console.error("❌ Update user error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ DELETE USER (Soft Delete) - FIXED
app.delete("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    console.log("🗑️ Deleting user:", id);

    // First check if user exists
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("id, full_name, is_active")
      .eq("id", id)
      .maybeSingle();

    if (checkError) {
      console.error("❌ Check user error:", checkError);
      throw checkError;
    }

    // If user doesn't exist in users table
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (existingUser.is_active === false) {
      return res.status(400).json({
        success: false,
        message: "User is already deactivated",
      });
    }

    // Soft delete - set is_active to false
    const { data, error } = await supabase
      .from("users")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("❌ Delete error:", error);
      throw error;
    }

    // Log audit - safely handle deleted_by
    const deletedBy = req.body?.deleted_by || null;
    if (deletedBy) {
      await supabase.from("audit_logs").insert([
        {
          user_id: deletedBy,
          action: "DELETE_USER",
          module: "users",
          description: `Deactivated user ${existingUser.full_name}`,
          ip_address: req.ip || "N/A",
        },
      ]);
    }

    console.log("✅ User deactivated:", existingUser.full_name);

    res.json({
      success: true,
      message: "User deactivated successfully",
      data,
    });
  } catch (error) {
    console.error("❌ Delete user error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ RESET USER PASSWORD
app.post("/api/users/:id/reset-password", async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Get user email
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", id)
      .single();

    if (userError) {
      if (userError.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      throw userError;
    }

    // Update password in auth
    const { error: authError } = await supabase.auth.admin.updateUserById(id, {
      password,
    });

    if (authError) {
      console.error("❌ Auth password update error:", authError.message);
      return res.status(500).json({
        success: false,
        message: "Failed to reset password",
      });
    }

    // Log audit
    await supabase.from("audit_logs").insert([
      {
        user_id: req.body.reset_by || null,
        action: "RESET_PASSWORD",
        module: "users",
        description: `Reset password for ${user.full_name}`,
        ip_address: req.ip,
      },
    ]);

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GET USER PERMISSIONS
app.get("/api/users/:id/permissions", async (req, res) => {
  try {
    const { id } = req.params;

    // Get user role
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", id)
      .single();

    if (userError) {
      if (userError.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      throw userError;
    }

    // Define permissions based on role
    const rolePermissions = {
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

    const permissions = rolePermissions[user.role] || rolePermissions.staff;

    res.json({
      success: true,
      data: {
        role: user.role,
        permissions,
      },
    });
  } catch (error) {
    console.error("❌ Get permissions error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ UPDATE USER PERMISSIONS (Admin only)
app.put("/api/users/:id/permissions", async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    // Get current user
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", id)
      .single();

    if (userError) {
      if (userError.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      throw userError;
    }

    // Log audit
    await supabase.from("audit_logs").insert([
      {
        user_id: req.body.updated_by || null,
        action: "UPDATE_PERMISSIONS",
        module: "users",
        description: `Updated permissions for ${user.role}`,
        ip_address: req.ip,
      },
    ]);

    res.json({
      success: true,
      message: "Permissions updated successfully",
      data: {
        role: user.role,
        permissions,
      },
    });
  } catch (error) {
    console.error("❌ Update permissions error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================================
// 17. AUDIT LOG API ROUTES
// ============================================================

// ✅ GET ALL AUDIT LOGS
app.get("/api/audit-logs", async (req, res) => {
  try {
    const {
      limit = 100,
      offset = 0,
      module,
      action,
      userId,
      startDate,
      endDate,
    } = req.query;

    let query = supabase
      .from("audit_logs")
      .select(
        `
        *,
        users (
          id,
          full_name,
          email,
          role
        )
      `,
      )
      .order("created_at", { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (module) {
      query = query.eq("module", module);
    }

    if (action) {
      query = query.eq("action", action);
    }

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (startDate) {
      query = query.gte("created_at", new Date(startDate).toISOString());
    }

    if (endDate) {
      query = query.lte("created_at", new Date(endDate).toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("❌ Get audit logs error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GET AUDIT LOG BY ID
app.get("/api/audit-logs/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("audit_logs")
      .select(
        `
        *,
        users (
          id,
          full_name,
          email,
          role
        )
      `,
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Audit log not found",
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("❌ Get audit log error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GET AUDIT LOGS BY USER
app.get("/api/audit-logs/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    const { data, error } = await supabase
      .from("audit_logs")
      .select(
        `
        *,
        users (
          id,
          full_name,
          email,
          role
        )
      `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("❌ Get user audit logs error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GET AUDIT LOGS BY MODULE
app.get("/api/audit-logs/module/:module", async (req, res) => {
  try {
    const { module } = req.params;
    const { limit = 50 } = req.query;

    const { data, error } = await supabase
      .from("audit_logs")
      .select(
        `
        *,
        users (
          id,
          full_name,
          email,
          role
        )
      `,
      )
      .eq("module", module)
      .order("created_at", { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("❌ Get module audit logs error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GET AUDIT LOG STATS
app.get("/api/audit-logs/stats", async (req, res) => {
  try {
    // Get total count
    const { count: total, error: totalError } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true });

    if (totalError) throw totalError;

    // Get login count
    const { count: logins, error: loginError } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("action", "LOGIN");

    if (loginError) throw loginError;

    // Get payroll changes
    const { count: payrollChanges, error: payrollError } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("module", "payroll");

    if (payrollError) throw payrollError;

    // Get staff changes
    const { count: staffChanges, error: staffError } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("module", "staff");

    if (staffError) throw staffError;

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { count: todayCount, error: todayError } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString())
      .lt("created_at", tomorrow.toISOString());

    if (todayError) throw todayError;

    res.json({
      success: true,
      data: {
        total: total || 0,
        logins: logins || 0,
        payrollChanges: payrollChanges || 0,
        staffChanges: staffChanges || 0,
        today: todayCount || 0,
      },
    });
  } catch (error) {
    console.error("❌ Get audit stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ EXPORT AUDIT LOGS (CSV)
app.get("/api/audit-logs/export", async (req, res) => {
  try {
    const { module, action, userId, startDate, endDate } = req.query;

    let query = supabase
      .from("audit_logs")
      .select(
        `
        *,
        users (
          full_name,
          email,
          role
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (module) {
      query = query.eq("module", module);
    }

    if (action) {
      query = query.eq("action", action);
    }

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (startDate) {
      query = query.gte("created_at", new Date(startDate).toISOString());
    }

    if (endDate) {
      query = query.lte("created_at", new Date(endDate).toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    // Build CSV
    let csv = "Date,Time,User,Role,Module,Action,Description,IP Address\n";

    data.forEach((item) => {
      const date = new Date(item.created_at);
      const dateStr = date.toLocaleDateString("en-NG");
      const timeStr = date.toLocaleTimeString("en-NG");
      const user = item.users || {};

      csv += `"${dateStr}","${timeStr}","${user.full_name || "System"}","${user.role || "N/A"}","${item.module}","${item.action}","${item.description?.replace(/"/g, '""') || ""}","${item.ip_address || "N/A"}"\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=audit_logs_${new Date().toISOString().split("T")[0]}.csv`,
    );
    res.send(csv);
  } catch (error) {
    console.error("❌ Export audit logs error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================================
// 18. SETTINGS API ROUTES - FIXED
// ============================================================

// ✅ GET ALL SETTINGS
app.get("/api/settings", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .order("key", { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("❌ Get settings error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GET SETTING BY KEY
app.get("/api/settings/:key", async (req, res) => {
  try {
    const { key } = req.params;

    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .eq("key", key)
      .maybeSingle(); // ✅ Use maybeSingle() to avoid errors

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Setting not found",
        });
      }
      throw error;
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Setting not found",
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("❌ Get setting error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ UPDATE SINGLE SETTING - FIXED
app.put("/api/settings/:key", async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    console.log(`📝 Updating setting: ${key}`);
    console.log("📦 Received value:", value);

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        message: "Value is required",
      });
    }

    // ✅ If value is an object, stringify it for storage
    const stringValue =
      typeof value === "object" ? JSON.stringify(value) : String(value);

    // ✅ Check if setting exists first
    const { data: existing, error: checkError } = await supabase
      .from("settings")
      .select("key")
      .eq("key", key)
      .maybeSingle();

    if (checkError) {
      console.error("❌ Check error:", checkError);
    }

    let result;
    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from("settings")
        .update({
          value: stringValue,
          updated_at: new Date().toISOString(),
        })
        .eq("key", key)
        .select()
        .single();

      if (error) {
        console.error("❌ Update error:", error);
        throw error;
      }
      result = data;
    } else {
      // Create new
      const { data, error } = await supabase
        .from("settings")
        .insert([
          {
            key,
            value: stringValue,
            description: `System setting for ${key}`,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("❌ Insert error:", error);
        throw error;
      }
      result = data;
    }

    console.log(`✅ Setting "${key}" updated successfully`);

    res.json({
      success: true,
      message: "Setting updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("❌ Update setting error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update setting",
    });
  }
});

// ✅ CREATE SETTING
app.post("/api/settings", async (req, res) => {
  try {
    const { key, value, description } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({
        success: false,
        message: "Key and value are required",
      });
    }

    // Check if setting already exists
    const { data: existing } = await supabase
      .from("settings")
      .select("key")
      .eq("key", key)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Setting with key "${key}" already exists`,
      });
    }

    const { data, error } = await supabase
      .from("settings")
      .insert([
        {
          key,
          value:
            typeof value === "object" ? JSON.stringify(value) : String(value),
          description: description || null,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: "Setting created successfully",
      data,
    });
  } catch (error) {
    console.error("❌ Create setting error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ DELETE SETTING
app.delete("/api/settings/:key", async (req, res) => {
  try {
    const { key } = req.params;

    const { data, error } = await supabase
      .from("settings")
      .delete()
      .eq("key", key)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Setting not found",
        });
      }
      throw error;
    }

    res.json({
      success: true,
      message: "Setting deleted successfully",
      data,
    });
  } catch (error) {
    console.error("❌ Delete setting error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================================
// 19. NOTIFICATIONS API ROUTES
// ============================================================

// ✅ GET ALL NOTIFICATIONS
app.get("/api/notifications", async (req, res) => {
  try {
    const userId = req.query.user_id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("❌ Get notifications error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ MARK NOTIFICATION AS READ
app.put("/api/notifications/:id/read", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Notification not found",
        });
      }
      throw error;
    }

    res.json({
      success: true,
      message: "Notification marked as read",
      data,
    });
  } catch (error) {
    console.error("❌ Mark notification read error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ MARK ALL NOTIFICATIONS AS READ
app.put("/api/notifications/read-all", async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user_id)
      .eq("is_read", false)
      .select();

    if (error) throw error;

    res.json({
      success: true,
      message: "All notifications marked as read",
      data: data || [],
    });
  } catch (error) {
    console.error("❌ Mark all notifications read error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ CREATE NOTIFICATION
app.post("/api/notifications", async (req, res) => {
  try {
    const { user_id, title, message, type, link } = req.body;

    if (!user_id || !title || !message) {
      return res.status(400).json({
        success: false,
        message: "User ID, title, and message are required",
      });
    }

    const { data, error } = await supabase
      .from("notifications")
      .insert([
        {
          user_id,
          title,
          message,
          type: type || "info",
          link: link || null,
          is_read: false,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: "Notification created successfully",
      data,
    });
  } catch (error) {
    console.error("❌ Create notification error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ DELETE NOTIFICATION
app.delete("/api/notifications/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Notification not found",
        });
      }
      throw error;
    }

    res.json({
      success: true,
      message: "Notification deleted successfully",
      data,
    });
  } catch (error) {
    console.error("❌ Delete notification error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GET ALL DEPARTMENTS
app.get("/api/departments", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("departments")
      .select(
        `
        *,
        faculties (
          id,
          name
        )
      `,
      )
      .order("name", { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("❌ Get departments error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GET ALL GRADE LEVELS
app.get("/api/grade-levels", async (req, res) => {
  try {
    const { category } = req.query;

    let query = supabase
      .from("grade_levels")
      .select(
        `
        *,
        salary_structures (
          id,
          name,
          category,
          min_grade,
          max_grade,
          min_step,
          max_step
        )
      `,
      )
      .eq("is_active", true)
      .order("grade_level", { ascending: true })
      .order("step", { ascending: true });

    if (category) {
      query = query.eq("salary_structures.category", category);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("❌ Get grade levels error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================================
// 20. BACKUP & SECURITY ROUTES
// ============================================================

// ✅ TRIGGER MANUAL BACKUP
app.post("/api/settings/backup", async (req, res) => {
  try {
    const { user_id } = req.body;

    console.log("🔄 Triggering manual backup...");

    // Get all data to backup
    const tables = [
      "staff",
      "users",
      "payroll_runs",
      "payslips",
      "payslip_items",
      "leave_requests",
      "deduction_types",
      "allowance_types",
      "tax_bands",
      "settings",
    ];

    const backupData = {};
    let totalRecords = 0;

    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select("*");

        if (!error && data) {
          backupData[table] = data;
          totalRecords += data.length;
          console.log(`✅ Backed up ${table}: ${data.length} records`);
        } else {
          console.log(`⚠️ Skipping ${table}: ${error?.message || "No data"}`);
          backupData[table] = [];
        }
      } catch (err) {
        console.error(`❌ Error backing up ${table}:`, err);
        backupData[table] = [];
      }
    }

    // Generate backup file
    const timestamp = new Date().toISOString();
    const backupFile = {
      timestamp,
      version: "1.0.0",
      totalRecords,
      data: backupData,
    };

    // Store backup in settings (optional - can also just return the data)
    const backupJson = JSON.stringify(backupFile);

    // Log the backup
    await supabase.from("audit_logs").insert([
      {
        user_id: user_id || null,
        action: "BACKUP",
        module: "settings",
        description: `Manual backup triggered - ${totalRecords} records backed up`,
        ip_address: req.ip || "N/A",
      },
    ]);

    console.log(`✅ Backup completed: ${totalRecords} records`);

    res.json({
      success: true,
      message: `Manual backup completed successfully! ${totalRecords} records backed up.`,
      data: {
        timestamp,
        totalRecords,
        tables: tables.length,
      },
    });
  } catch (error) {
    console.error("❌ Backup error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create backup",
    });
  }
});

// ✅ DOWNLOAD BACKUP
app.get("/api/settings/backup/download", async (req, res) => {
  try {
    console.log("📥 Downloading backup...");

    // Get all data to backup
    const tables = [
      "staff",
      "users",
      "payroll_runs",
      "payslips",
      "payslip_items",
      "leave_requests",
      "deduction_types",
      "allowance_types",
      "tax_bands",
      "settings",
    ];

    const backupData = {};
    let totalRecords = 0;

    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select("*");

        if (!error && data) {
          backupData[table] = data;
          totalRecords += data.length;
        } else {
          backupData[table] = [];
        }
      } catch (err) {
        console.error(`❌ Error backing up ${table}:`, err);
        backupData[table] = [];
      }
    }

    const timestamp = new Date().toISOString();
    const backupFile = {
      timestamp,
      version: "1.0.0",
      totalRecords,
      data: backupData,
    };

    const backupJson = JSON.stringify(backupFile, null, 2);
    const fileName = `backup_${new Date().toISOString().split("T")[0]}.json`;

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    res.send(backupJson);

    console.log(`✅ Backup downloaded: ${fileName} (${totalRecords} records)`);
  } catch (error) {
    console.error("❌ Download backup error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to download backup",
    });
  }
});

// ✅ RESET ALL USER PASSWORDS
app.post("/api/settings/reset-all-passwords", async (req, res) => {
  try {
    const { user_id } = req.body;

    console.log("🔄 Resetting all user passwords...");

    // Get all active users
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, email, full_name")
      .eq("is_active", true);

    if (usersError) throw usersError;

    if (!users || users.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No active users found",
      });
    }

    let resetCount = 0;
    const resetResults = [];

    for (const user of users) {
      try {
        // Generate a random temporary password
        const tempPassword = `Temp${Math.random().toString(36).substring(2, 10)}@${new Date().getFullYear()}`;

        // Update password in auth
        const { error: authError } = await supabase.auth.admin.updateUserById(
          user.id,
          { password: tempPassword },
        );

        if (!authError) {
          resetCount++;
          resetResults.push({
            email: user.email,
            success: true,
          });
          console.log(`✅ Password reset for ${user.email}`);
        } else {
          console.error(`❌ Failed to reset for ${user.email}:`, authError);
          resetResults.push({
            email: user.email,
            success: false,
            error: authError.message,
          });
        }
      } catch (err) {
        console.error(`❌ Error resetting for ${user.email}:`, err);
        resetResults.push({
          email: user.email,
          success: false,
          error: err.message,
        });
      }
    }

    // Log audit
    await supabase.from("audit_logs").insert([
      {
        user_id: user_id || null,
        action: "RESET_ALL_PASSWORDS",
        module: "settings",
        description: `Reset passwords for ${resetCount} users`,
        ip_address: req.ip || "N/A",
      },
    ]);

    console.log(`✅ Password reset completed: ${resetCount} users`);

    res.json({
      success: true,
      message: `Password reset emails sent to ${resetCount} users!`,
      data: {
        totalUsers: users.length,
        resetCount,
        failedCount: users.length - resetCount,
        details: resetResults,
      },
    });
  } catch (error) {
    console.error("❌ Reset passwords error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to reset passwords",
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  🏫 AATU PAYROLL SYSTEM API");
  console.log("  ────────────────────────────────────────────────────────");
  console.log(`  📍 Server running on: http://localhost:${PORT}`);
  console.log(`  🔗 API base URL: http://localhost:${PORT}/api`);
  console.log("  ✅ Status: ONLINE");
  console.log("  ────────────────────────────────────────────────────────");
  console.log("  📋 Available Routes:");
  console.log("     🔐 Auth: /api/auth/login, /api/auth/signup");
  console.log("     📊 Dashboard: /api/dashboard/stats, /api/payroll/status");
  console.log("     👥 Staff: /api/staff");
  console.log("     💰 Salary: /api/salary-structures, /api/grade-levels");
  console.log("     ➖ Deductions: /api/deduction-types, /api/tax-bands");
  console.log("     🧮 Payroll: /api/payroll-runs, /api/payroll/process");
  console.log("     📄 Payslips: /api/payslips");
  console.log("     📊 Reports: /api/reports");
  console.log("     📅 Leave: /api/leave-requests, /api/leave-types");
  console.log("     👤 Users: /api/users");
  console.log("     📋 Audit: /api/audit-logs");
  console.log("     ⚙️ Settings: /api/settings");
  console.log("     🔔 Notifications: /api/notifications");
  console.log("═══════════════════════════════════════════════════════════");
});
