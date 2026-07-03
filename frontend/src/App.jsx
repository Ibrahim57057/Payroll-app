// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import Login from "./components/auth/Login";
import Dashboard from "./components/dashboard/Dashboard";
import Staff from "./components/staff/Staff";
import SalaryStructure from "./components/salary/SalaryStructure";
import Deductions from "./components/deductions/Deductions";
import Payroll from "./components/payroll/Payroll";
import Payslips from "./components/payslips/Payslips";
import Reports from "./components/reports/Reports";
import Leave from "./components/leave/Leave";
import Users from "./components/users/Users";
import AuditLog from "./components/audit/AuditLog";
import Settings from "./components/settings/Settings";
import authService from "./services/authService";

// ✅ Protected Route Component with Role-Based Access
const ProtectedRoute = ({ children, allowedRoles }) => {
  const user = authService.getCurrentUser();
  const userRole = user?.role || "staff";

  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    console.warn(
      `⚠️ Access denied: ${userRole} tried to access restricted page`,
    );
    return <Navigate to="/dashboard" />;
  }

  return children;
};

function App() {
  const isAuthenticated = authService.isAuthenticated();

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Dashboard - All roles */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute
                allowedRoles={["admin", "hr_officer", "bursar", "vc", "staff"]}
              >
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Staff - Admin and HR only */}
          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={["admin", "hr_officer"]}>
                <Staff />
              </ProtectedRoute>
            }
          />

          {/* Salary - Admin, HR, Bursar */}
          <Route
            path="/salary"
            element={
              <ProtectedRoute allowedRoles={["admin", "hr_officer", "bursar"]}>
                <SalaryStructure />
              </ProtectedRoute>
            }
          />

          {/* Deductions - Admin, HR, Bursar */}
          <Route
            path="/deductions"
            element={
              <ProtectedRoute allowedRoles={["admin", "hr_officer", "bursar"]}>
                <Deductions />
              </ProtectedRoute>
            }
          />

          {/* Payroll - Admin, HR, Bursar, VC */}
          <Route
            path="/payroll"
            element={
              <ProtectedRoute
                allowedRoles={["admin", "hr_officer", "bursar", "vc"]}
              >
                <Payroll />
              </ProtectedRoute>
            }
          />

          {/* Payslips - All roles */}
          <Route
            path="/payslips"
            element={
              <ProtectedRoute
                allowedRoles={["admin", "hr_officer", "bursar", "vc", "staff"]}
              >
                <Payslips />
              </ProtectedRoute>
            }
          />

          {/* Reports - Admin, HR, Bursar, VC */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute
                allowedRoles={["admin", "hr_officer", "bursar", "vc"]}
              >
                <Reports />
              </ProtectedRoute>
            }
          />

          {/* Leave - Admin, HR, Staff */}
          <Route
            path="/leave"
            element={
              <ProtectedRoute allowedRoles={["admin", "hr_officer", "staff"]}>
                <Leave />
              </ProtectedRoute>
            }
          />

          {/* Users - Admin only */}
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Users />
              </ProtectedRoute>
            }
          />

          {/* Audit - Admin, HR, Bursar */}
          <Route
            path="/audit"
            element={
              <ProtectedRoute allowedRoles={["admin", "hr_officer", "bursar"]}>
                <AuditLog />
              </ProtectedRoute>
            }
          />

          {/* Settings - Admin only */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Settings />
              </ProtectedRoute>
            }
          />

          {/* Root path */}
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
