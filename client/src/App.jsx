import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth.js";
import RegisterPage from "./pages/RegisterPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import EmployeeDashboard from "./pages/EmployeeDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";

/**
 * Route guard that redirects unauthenticated users to /login.
 * Optionally checks for a specific role.
 */
function ProtectedRoute({ user, userProfile, loading, requiredRole, children }) {
  if (loading) {
    return <div className="loading-screen">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  /* Show loading screen if authenticated but profile is still resolving */
  if (user && !userProfile) {
    return <div className="loading-screen">Loading…</div>;
  }

  if (requiredRole && userProfile?.role !== requiredRole) {
    /* Redirect to correct dashboard if role doesn't match */
    const target = userProfile?.role === "admin" ? "/admin" : "/dashboard";
    return <Navigate to={target} replace />;
  }

  return children;
}

/**
 * Root App component — handles auth state and route definitions.
 */
export default function App() {
  const { user, userProfile, setUserProfile, loading, logout } = useAuth();

  /* Redirect authenticated users away from auth pages */
  function AuthRoute({ children }) {
    if (loading) {
      return <div className="loading-screen">Loading…</div>;
    }

    if (user && userProfile) {
      const target = userProfile.role === "admin" ? "/admin" : "/dashboard";
      return <Navigate to={target} replace />;
    }

    /* Show loading screen if authenticated but profile is still resolving */
    if (user && !userProfile) {
      return <div className="loading-screen">Loading…</div>;
    }

    return children;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth routes */}
        <Route
          path="/register"
          element={
            <AuthRoute>
              <RegisterPage onProfileCreated={setUserProfile} />
            </AuthRoute>
          }
        />
        <Route
          path="/login"
          element={
            <AuthRoute>
              <LoginPage onProfileCreated={setUserProfile} />
            </AuthRoute>
          }
        />

        {/* Protected employee route */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute
              user={user}
              userProfile={userProfile}
              loading={loading}
              requiredRole="employee"
            >
              <EmployeeDashboard userProfile={userProfile} onLogout={logout} />
            </ProtectedRoute>
          }
        />

        {/* Protected admin route */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute
              user={user}
              userProfile={userProfile}
              loading={loading}
              requiredRole="admin"
            >
              <AdminDashboard userProfile={userProfile} onLogout={logout} />
            </ProtectedRoute>
          }
        />

        {/* Catch-all: redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
