// src/components/salary/SalaryStructure.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { salaryService } from "../../services/salaryService";
import authService from "../../services/authService";

const SalaryStructure = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("conuass");
  const [gradeLevels, setGradeLevels] = useState([]);
  const [allowances, setAllowances] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  // ✅ Format currency
  const formatCurrency = (amount) => {
    if (!amount) return "—";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // ✅ Fetch grade levels using salaryService
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        setSuccess("");

        // Get all grade levels using salaryService
        const response = await salaryService.getGradeLevels();
        if (response.success) {
          setGradeLevels(response.data || []);
        } else {
          setError("Failed to load grade levels");
        }

        // Get allowances using salaryService
        const allowResponse = await salaryService.getAllowances();
        if (allowResponse.success) {
          setAllowances(allowResponse.data || []);
        }
      } catch (error) {
        console.error("Error fetching salary data:", error);
        setError("Failed to load data. Please refresh.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ✅ Filter grade levels by salary structure
  const getConuassLevels = () => {
    // CONUASS: grade_level 1-7, step 1-6
    return gradeLevels.filter(
      (g) =>
        g.grade_level >= 1 && g.grade_level <= 7 && g.step >= 1 && g.step <= 6,
    );
  };

  const getContissLevels = () => {
    // CONTISS II: grade_level 1-15, step 1-8
    return gradeLevels.filter(
      (g) =>
        g.grade_level >= 1 && g.grade_level <= 15 && g.step >= 1 && g.step <= 8,
    );
  };

  const conuassLevels = getConuassLevels();
  const contissLevels = getContissLevels();

  // ✅ Group by grade level
  const groupByGrade = (levels) => {
    const grouped = {};
    levels.forEach((item) => {
      if (!grouped[item.grade_level]) {
        grouped[item.grade_level] = [];
      }
      grouped[item.grade_level].push(item);
    });
    return grouped;
  };

  const conuassGrouped = groupByGrade(conuassLevels);
  const contissGrouped = groupByGrade(contissLevels);

  // ✅ Get unique grade levels for display
  const conuassGrades = Object.keys(conuassGrouped)
    .map(Number)
    .sort((a, b) => a - b);
  const contissGrades = Object.keys(contissGrouped)
    .map(Number)
    .sort((a, b) => a - b);

  // ✅ Get max steps for each structure (using hardcoded max values)
  const conuassMaxSteps = 6; // CONUASS has 6 steps
  const contissMaxSteps = 8; // CONTISS II has 8 steps

  // ✅ Get basic salary for a specific grade and step
  const getSalary = (levels, grade, step) => {
    const found = levels.find(
      (l) => l.grade_level === grade && l.step === step,
    );
    return found ? found.basic_salary : null;
  };

  // ✅ Handle save grade level updates
  const handleSaveGradeLevel = async (type) => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const inputs = document.querySelectorAll(`.${type}-input`);
      const updates = [];

      inputs.forEach((input) => {
        const id = input.dataset.id;
        const value = parseInt(input.value.replace(/,/g, ""));
        if (id && value) {
          updates.push({ id, basic_salary: value });
        }
      });

      if (updates.length === 0) {
        setError("No changes to save");
        setSaving(false);
        return;
      }

      for (const update of updates) {
        await salaryService.updateGradeLevel(update.id, {
          basic_salary: update.basic_salary,
        });
      }

      setSuccess(
        `✅ ${type.toUpperCase()} salary structure updated successfully!`,
      );

      // Refresh data
      const response = await salaryService.getGradeLevels();
      if (response.success) {
        setGradeLevels(response.data || []);
      }
    } catch (error) {
      console.error("Error saving grade levels:", error);
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ✅ Render salary table
  const renderSalaryTable = (levels, grades, maxSteps, title, type) => {
    if (grades.length === 0) {
      return (
        <div className="text-center py-8 text-[#8A8A9A]">
          No {title} grade levels found. Please add them to the database.
        </div>
      );
    }

    const levelLabel = type === "conuass" ? "GL" : "Level";

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[#F5F5F7]">
              <th className="px-4 py-2 text-left text-[#4A4A5A] font-medium border border-[#E8E8E8]">
                Grade Level
              </th>
              {Array.from({ length: maxSteps }, (_, i) => {
                const stepNum = i + 1;
                return (
                  <th
                    key={stepNum}
                    className="px-4 py-2 text-center text-[#4A4A5A] font-medium border border-[#E8E8E8]"
                  >
                    Step {stepNum}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {grades.map((grade) => (
              <tr key={grade} className="hover:bg-[#F5F5F7] transition">
                <td className="px-4 py-2 font-medium text-[#1A1A2E] border border-[#E8E8E8]">
                  {levelLabel} {grade}
                </td>
                {Array.from({ length: maxSteps }, (_, i) => {
                  const step = i + 1;
                  const salary = getSalary(levels, grade, step);
                  const item = levels.find(
                    (l) => l.grade_level === grade && l.step === step,
                  );
                  return (
                    <td
                      key={step}
                      className="px-4 py-2 text-center border border-[#E8E8E8]"
                    >
                      <input
                        type="text"
                        defaultValue={salary ? formatCurrency(salary) : ""}
                        data-id={item?.id || ""}
                        className={`${type}-input w-full px-2 py-1 border border-[#E8E8E8] rounded text-sm bg-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent transition text-center`}
                        placeholder="—"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
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

  // Replace hardcoded navItems with:
  const navItems = authService.getNavItems().map((item) => ({
    ...item,
    active: item.path === "/salary",
  }));
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#0A2B5E] border-t-[#E65100] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#4A4A5A]">Loading salary structure...</p>
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
                <i className="fas fa-coins text-[#E65100] mr-2"></i>
                Salary structure
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <i className="fas fa-bell text-xl text-[#4A4A5A] cursor-pointer hover:text-[#1A1A2E] transition"></i>
              <div className="w-10 h-10 rounded-full bg-[#E65100] flex items-center justify-center text-white text-sm font-semibold">
                {getInitials()}
              </div>
              <div className="text-sm font-medium text-[#1A1A2E] hidden sm:block">
                {getRoleName()}
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-[#E6F1FB] rounded-lg p-3 mb-4 text-sm text-[#0C447C] flex items-start gap-2">
            <i className="fas fa-info-circle mt-0.5"></i>
            <span>
              All salary amounts are editable. Changes take effect from the next
              payroll run. All edits are logged in the audit trail.
            </span>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
              <i className="fas fa-check-circle mr-2"></i>
              {success}
            </div>
          )}

          {/* Stats Cards - Using hardcoded values for display */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="bg-white border border-[#E8E8E8] rounded-lg p-3">
              <div className="text-xs text-[#4A4A5A] mb-1">
                CONUASS grade levels
              </div>
              <div className="text-lg font-medium text-[#1A1A2E]">
                {conuassGrades.length} levels × {conuassMaxSteps} steps
              </div>
            </div>
            <div className="bg-white border border-[#E8E8E8] rounded-lg p-3">
              <div className="text-xs text-[#4A4A5A] mb-1">
                CONTISS II grade levels
              </div>
              <div className="text-lg font-medium text-[#1A1A2E]">
                {contissGrades.length} levels × {contissMaxSteps} steps
              </div>
            </div>
            <div className="bg-white border border-[#E8E8E8] rounded-lg p-3">
              <div className="text-xs text-[#4A4A5A] mb-1">
                Total allowances
              </div>
              <div className="text-lg font-medium text-[#1A1A2E]">
                {allowances.length}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-1 mb-6 border-b border-[#E8E8E8]">
            <button
              onClick={() => setActiveTab("conuass")}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === "conuass"
                  ? "text-[#185FA5] border-b-2 border-[#185FA5]"
                  : "text-[#4A4A5A] hover:text-[#1A1A2E]"
              }`}
            >
              CONUASS (Academic)
            </button>
            <button
              onClick={() => setActiveTab("contiss")}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === "contiss"
                  ? "text-[#185FA5] border-b-2 border-[#185FA5]"
                  : "text-[#4A4A5A] hover:text-[#1A1A2E]"
              }`}
            >
              CONTISS II (Non-academic)
            </button>
            <button
              onClick={() => setActiveTab("allowances")}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === "allowances"
                  ? "text-[#185FA5] border-b-2 border-[#185FA5]"
                  : "text-[#4A4A5A] hover:text-[#1A1A2E]"
              }`}
            >
              Allowances ({allowances.length})
            </button>
          </div>

          {/* CONUASS Tab */}
          {activeTab === "conuass" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-medium text-[#1A1A2E]">
                  CONUASS — basic salary table (₦/month)
                </h2>
                <button
                  onClick={() => handleSaveGradeLevel("conuass")}
                  disabled={saving}
                  className="bg-[#185FA5] hover:bg-[#0C447C] text-white px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50"
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
              </div>

              {renderSalaryTable(
                conuassLevels,
                conuassGrades,
                conuassMaxSteps,
                "CONUASS",
                "conuass",
              )}
            </motion.div>
          )}

          {/* CONTISS II Tab */}
          {activeTab === "contiss" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-medium text-[#1A1A2E]">
                  CONTISS II — basic salary table (₦/month)
                </h2>
                <button
                  onClick={() => handleSaveGradeLevel("contiss")}
                  disabled={saving}
                  className="bg-[#185FA5] hover:bg-[#0C447C] text-white px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50"
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
              </div>

              {renderSalaryTable(
                contissLevels,
                contissGrades,
                contissMaxSteps,
                "CONTISS II",
                "contiss",
              )}
            </motion.div>
          )}

          {/* Allowances Tab */}
          {activeTab === "allowances" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-white border border-[#E8E8E8] rounded-xl p-4 md:p-5"
            >
              <h2 className="text-sm font-medium text-[#1A1A2E] mb-4">
                Allowance types
              </h2>

              {allowances.length === 0 ? (
                <div className="text-center py-8 text-[#8A8A9A]">
                  No allowances configured.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F5F5F7]">
                        <th className="px-4 py-2 text-left text-[#4A4A5A] font-medium border border-[#E8E8E8]">
                          Allowance
                        </th>
                        <th className="px-4 py-2 text-left text-[#4A4A5A] font-medium border border-[#E8E8E8]">
                          Category
                        </th>
                        <th className="px-4 py-2 text-center text-[#4A4A5A] font-medium border border-[#E8E8E8]">
                          Rate
                        </th>
                        <th className="px-4 py-2 text-center text-[#4A4A5A] font-medium border border-[#E8E8E8]">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {allowances.map((allow, index) => (
                        <tr
                          key={index}
                          className="hover:bg-[#F5F5F7] transition"
                        >
                          <td className="px-4 py-2 text-[#1A1A2E] border border-[#E8E8E8]">
                            {allow.name}
                          </td>
                          <td className="px-4 py-2 text-[#4A4A5A] border border-[#E8E8E8]">
                            {allow.category}
                          </td>
                          <td className="px-4 py-2 text-center text-[#1A1A2E] border border-[#E8E8E8]">
                            {allow.value_type === "percentage"
                              ? `${allow.value}%`
                              : formatCurrency(allow.value)}
                          </td>
                          <td className="px-4 py-2 text-center border border-[#E8E8E8]">
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                allow.is_active
                                  ? "bg-[#EAF3DE] text-[#27500A]"
                                  : "bg-[#F5F5F7] text-[#4A4A5A]"
                              }`}
                            >
                              {allow.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalaryStructure;
