// src/components/auth/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye,
  faEyeSlash,
  faSignInAlt,
  faUserPlus,
  faLock as faLockIcon,
  faTextHeight,
  faMoon,
  faSun,
  faCheckCircle,
} from "@fortawesome/free-solid-svg-icons";
import { useTheme } from "../../context/ThemeContext";
import authService from "../../services/authService";

// Tech-U Logo
import TechULogo from "../../assets/tech-u-logo.png";

const Login = () => {
  const {
    isDark,
    toggleTheme,
    toggleFontSize,
    toggleHighContrast,
    highContrast,
  } = useTheme();
  const navigate = useNavigate();

  // Form state
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    staffId: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "staff",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // ✅ Redirect based on user role
  const redirectBasedOnRole = (user) => {
    const role = user?.role || "staff";

    const roleRedirects = {
      admin: "/users",
      hr_officer: "/staff",
      bursar: "/payroll",
      vc: "/reports",
      staff: "/dashboard",
    };

    const redirectPath = roleRedirects[role] || "/dashboard";
    navigate(redirectPath);
  };

  // ✅ Handle Sign In
  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await authService.login(
        formData.email,
        formData.password,
      );

      if (response.success) {
        redirectBasedOnRole(response.user);
      } else {
        setError(response.message || "Login failed");
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      setError(error.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Sign Up
  const handleSignUp = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }

      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters");
        setLoading(false);
        return;
      }

      const signupData = {
        full_name: formData.fullName,
        staff_id: formData.staffId,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      };

      console.log("📤 Sending signup data:", {
        ...signupData,
        password: "***",
      });

      const response = await authService.signup(signupData);

      if (response.success) {
        setSuccess("✅ Account created successfully! Please sign in.");
        setFormData({
          fullName: "",
          staffId: "",
          email: "",
          password: "",
          confirmPassword: "",
          role: "staff",
        });
        setTimeout(() => {
          setIsSignUp(false);
          setSuccess("");
        }, 3000);
      } else {
        setError(response.message || "Sign up failed");
      }
    } catch (error) {
      console.error("❌ Signup error:", error);
      setError(error.message || "Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (isSignUp) {
      await handleSignUp();
    } else {
      await handleSignIn();
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError("");
    setSuccess("");
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
        isDark ? "bg-[#1A1A2E]" : "bg-white"
      }`}
    >
      <div
        className={`rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-lg border transition-colors duration-300 ${
          isDark
            ? "bg-[#252540] border-[#404060]"
            : "bg-[#F5F5F7] border-[#E8E8E8]"
        }`}
      >
        {/* Accessibility Toolbar */}
        <div
          className="flex justify-end gap-2 mb-4"
          role="toolbar"
          aria-label="Accessibility controls"
        >
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg border transition ${
              isDark
                ? "border-[#404060] hover:bg-[#1A1A2E] text-[#B0B0B8]"
                : "border-[#E8E8E8] hover:bg-white text-[#4A4A5A]"
            }`}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            <FontAwesomeIcon
              icon={isDark ? faSun : faMoon}
              className="text-lg"
            />
          </button>

          <button
            onClick={toggleFontSize}
            className={`p-2 rounded-lg border transition ${
              isDark
                ? "border-[#404060] hover:bg-[#1A1A2E] text-[#B0B0B8]"
                : "border-[#E8E8E8] hover:bg-white text-[#4A4A5A]"
            }`}
            aria-label="Toggle font size"
          >
            <FontAwesomeIcon icon={faTextHeight} className="text-lg" />
          </button>

          <button
            onClick={toggleHighContrast}
            className={`p-2 rounded-lg border transition ${
              isDark
                ? "border-[#404060] hover:bg-[#1A1A2E] text-[#B0B0B8]"
                : "border-[#E8E8E8] hover:bg-white text-[#4A4A5A]"
            } ${highContrast ? "bg-[#FFF3E0] dark:bg-[#E65100]/30" : ""}`}
            aria-label={
              highContrast
                ? "Disable high contrast mode"
                : "Enable high contrast mode"
            }
          >
            <FontAwesomeIcon icon={faMoon} className="text-lg" />
          </button>
        </div>

        {/* Logo Section */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <img
              src={TechULogo}
              alt="Abiola Ajimobi Technical University (Tech-U) Logo"
              className="w-20 h-20 object-contain"
            />
          </div>
          <h1
            className={`text-lg font-semibold ${isDark ? "text-[#E65100]" : "text-[#0A2B5E]"}`}
          >
            Abiola Ajimobi Technical University
          </h1>
          <p
            className={`text-sm font-medium ${isDark ? "text-[#00843D]" : "text-[#D4AF37]"}`}
          >
            <FontAwesomeIcon icon={faLockIcon} className="text-[10px] mr-1" />
            Developing Brains, Training Hands
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex rounded-lg overflow-hidden border border-[#E8E8E8] dark:border-[#404060] mb-6">
          <button
            onClick={() => setIsSignUp(false)}
            className={`flex-1 py-2 text-sm font-medium transition ${
              !isSignUp
                ? `bg-[#0A2B5E] dark:bg-[#E65100] text-white`
                : `bg-transparent ${isDark ? "text-[#B0B0B8] hover:text-white" : "text-[#4A4A5A] hover:text-[#0A2B5E]"}`
            }`}
          >
            <FontAwesomeIcon icon={faSignInAlt} className="mr-2" />
            Sign In
          </button>
          <button
            onClick={() => setIsSignUp(true)}
            className={`flex-1 py-2 text-sm font-medium transition ${
              isSignUp
                ? `bg-[#0A2B5E] dark:bg-[#E65100] text-white`
                : `bg-transparent ${isDark ? "text-[#B0B0B8] hover:text-white" : "text-[#4A4A5A] hover:text-[#0A2B5E]"}`
            }`}
          >
            <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
            Sign Up
          </button>
        </div>

        {/* Welcome Text */}
        <h2
          className={`text-xl font-semibold ${isDark ? "text-[#EDEDF0]" : "text-[#1A1A2E]"}`}
        >
          {isSignUp ? "Create Account" : "Welcome Back"}
        </h2>
        <p
          className={`text-sm mb-6 ${isDark ? "text-[#B0B0B8]" : "text-[#4A4A5A]"}`}
        >
          {isSignUp
            ? "Join the AATU Payroll System"
            : "Sign in to your account to continue"}
        </p>

        {/* Error Message */}
        {error && (
          <div
            className={`px-4 py-3 rounded-lg mb-4 text-sm ${
              isDark
                ? "bg-red-900/20 border border-red-800 text-red-400"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            <FontAwesomeIcon icon={faLockIcon} className="mr-2" />
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div
            className={`px-4 py-3 rounded-lg mb-4 text-sm ${
              isDark
                ? "bg-green-900/20 border border-green-800 text-green-400"
                : "bg-green-50 border border-green-200 text-green-700"
            }`}
          >
            <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Full Name - Sign Up only */}
          {isSignUp && (
            <div className="mb-4">
              <label
                className={`block text-sm font-medium mb-1 ${isDark ? "text-[#B0B0B8]" : "text-[#4A4A5A]"}`}
              >
                Full Name <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="e.g. Dr. Adewale Okon"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2B5E] dark:focus:ring-[#E65100] focus:border-transparent transition ${
                  isDark
                    ? "bg-[#1A1A2E] border-[#404060] text-[#EDEDF0] placeholder-[#6B6B7B]"
                    : "bg-white border-[#E8E8E8] text-[#1A1A2E] placeholder-[#8A8A9A]"
                }`}
                required={isSignUp}
              />
            </div>
          )}

          {/* Staff ID - Sign Up only */}
          {isSignUp && (
            <div className="mb-4">
              <label
                className={`block text-sm font-medium mb-1 ${isDark ? "text-[#B0B0B8]" : "text-[#4A4A5A]"}`}
              >
                Staff ID <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                name="staffId"
                value={formData.staffId}
                onChange={handleChange}
                placeholder="e.g. AATU/ACAD/2024/001"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2B5E] dark:focus:ring-[#E65100] focus:border-transparent transition ${
                  isDark
                    ? "bg-[#1A1A2E] border-[#404060] text-[#EDEDF0] placeholder-[#6B6B7B]"
                    : "bg-white border-[#E8E8E8] text-[#1A1A2E] placeholder-[#8A8A9A]"
                }`}
                required={isSignUp}
              />
            </div>
          )}

          {/* Role - Sign Up only */}
          {isSignUp && (
            <div className="mb-4">
              <label
                className={`block text-sm font-medium mb-1 ${isDark ? "text-[#B0B0B8]" : "text-[#4A4A5A]"}`}
              >
                Role <span className="text-red-500 ml-1">*</span>
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2B5E] dark:focus:ring-[#E65100] focus:border-transparent transition appearance-none ${
                  isDark
                    ? "bg-[#1A1A2E] border-[#404060] text-[#EDEDF0]"
                    : "bg-white border-[#E8E8E8] text-[#1A1A2E]"
                }`}
                required={isSignUp}
              >
                <option value="staff">Staff</option>
                <option value="hr_officer">HR Officer</option>
                <option value="bursar">Bursar</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}

          {/* Email - Both */}
          <div className="mb-4">
            <label
              className={`block text-sm font-medium mb-1 ${isDark ? "text-[#B0B0B8]" : "text-[#4A4A5A]"}`}
            >
              Email Address <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. admin@tech-u.edu.ng"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2B5E] dark:focus:ring-[#E65100] focus:border-transparent transition ${
                isDark
                  ? "bg-[#1A1A2E] border-[#404060] text-[#EDEDF0] placeholder-[#6B6B7B]"
                  : "bg-white border-[#E8E8E8] text-[#1A1A2E] placeholder-[#8A8A9A]"
              }`}
              required
            />
          </div>

          {/* Password - Both */}
          <div className="mb-4">
            <label
              className={`block text-sm font-medium mb-1 ${isDark ? "text-[#B0B0B8]" : "text-[#4A4A5A]"}`}
            >
              Password <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={
                  isSignUp
                    ? "Create a password (min 6 characters)"
                    : "Enter your password"
                }
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2B5E] dark:focus:ring-[#E65100] focus:border-transparent transition ${
                  isDark
                    ? "bg-[#1A1A2E] border-[#404060] text-[#EDEDF0] placeholder-[#6B6B7B]"
                    : "bg-white border-[#E8E8E8] text-[#1A1A2E] placeholder-[#8A8A9A]"
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 transition ${
                  isDark
                    ? "text-[#6B6B7B] hover:text-[#B0B0B8]"
                    : "text-[#8A8A9A] hover:text-[#4A4A5A]"
                }`}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <FontAwesomeIcon
                  icon={showPassword ? faEyeSlash : faEye}
                  className="text-lg"
                />
              </button>
            </div>
            {isSignUp && (
              <p
                className={`text-xs mt-1 ${isDark ? "text-[#6B6B7B]" : "text-[#8A8A9A]"}`}
              >
                Password must be at least 6 characters
              </p>
            )}
          </div>

          {/* Confirm Password - Sign Up only */}
          {isSignUp && (
            <div className="mb-4">
              <label
                className={`block text-sm font-medium mb-1 ${isDark ? "text-[#B0B0B8]" : "text-[#4A4A5A]"}`}
              >
                Confirm Password <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type={showPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2B5E] dark:focus:ring-[#E65100] focus:border-transparent transition ${
                  isDark
                    ? "bg-[#1A1A2E] border-[#404060] text-[#EDEDF0] placeholder-[#6B6B7B]"
                    : "bg-white border-[#E8E8E8] text-[#1A1A2E] placeholder-[#8A8A9A]"
                }`}
                required={isSignUp}
              />
            </div>
          )}

          {/* Remember Me - Sign In only */}
          {!isSignUp && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
              <label
                className={`flex items-center gap-2 text-sm cursor-pointer ${isDark ? "text-[#B0B0B8]" : "text-[#4A4A5A]"}`}
              >
                <input
                  type="checkbox"
                  className="accent-[#0A2B5E] dark:accent-[#E65100] w-4 h-4"
                />
                Remember me
              </label>
              <a
                href="#"
                className={`text-sm font-medium hover:underline ${isDark ? "text-[#E65100]" : "text-[#0A2B5E]"}`}
              >
                Forgot password?
              </a>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0A2B5E] dark:bg-[#E65100] hover:bg-[#08224B] dark:hover:bg-[#BF360C] text-white font-semibold py-3 rounded-lg transition duration-200 flex items-center justify-center gap-3 min-h-[48px] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-white"
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
                {isSignUp ? "Creating Account..." : "Signing in..."}
              </>
            ) : (
              <>
                <FontAwesomeIcon
                  icon={isSignUp ? faUserPlus : faSignInAlt}
                  className="text-lg"
                />
                {isSignUp ? "Create Account" : "Sign In"}
              </>
            )}
          </button>
        </form>

        {/* Toggle between Sign In and Sign Up */}
        <div className="text-center mt-4">
          <p
            className={`text-sm ${isDark ? "text-[#B0B0B8]" : "text-[#4A4A5A]"}`}
          >
            {isSignUp ? "Already have an account?" : "Don't have an account?"}
            <button
              onClick={toggleMode}
              className={`ml-2 font-medium hover:underline ${isDark ? "text-[#E65100]" : "text-[#0A2B5E]"}`}
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </div>

        <hr
          className={`my-6 ${isDark ? "border-[#404060]" : "border-[#E8E8E8]"}`}
        />

        <p
          className={`text-center text-xs ${isDark ? "text-[#6B6B7B]" : "text-[#8A8A9A]"}`}
        >
          <FontAwesomeIcon icon={faLockIcon} className="mr-1" />
          Secure login — all sessions are encrypted and monitored.
          <br />
          Contact ICT unit if you have trouble logging in.
        </p>
      </div>
    </div>
  );
};

export default Login;
