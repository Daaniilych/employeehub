import React, { Suspense, lazy } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useToast } from "./hooks/useToast";
import { ToastContainer } from "./components/Toast";
import Loading from "./components/Loading";
import PageTransition from "./components/PageTransition";

// Pages (route-based code splitting)
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CompanySetup = lazy(() => import("./pages/CompanySetup"));
const TimeTracking = lazy(() => import("./pages/TimeTracking"));
const Reports = lazy(() => import("./pages/Reports"));
const Members = lazy(() => import("./pages/Members"));
const Roles = lazy(() => import("./pages/Roles"));
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile"));
const Preferences = lazy(() => import("./pages/Preferences"));
const ScannerTerminal = lazy(() => import("./pages/ScannerTerminal"));

const RouteContent = ({ children }) => (
  <Suspense fallback={<Loading fullScreen text="Loading page..." />}>
    {children}
  </Suspense>
);

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Loading fullScreen text="Loading your workspace..." />;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, selectedCompany } = useAuth();

  if (loading) {
    return <Loading fullScreen text="Loading..." />;
  }

  if (isAuthenticated) {
    return selectedCompany ? (
      <Navigate to="/dashboard" />
    ) : (
      <Navigate to="/company-setup" />
    );
  }

  return children;
};

// Company Required Route
const CompanyRoute = ({ children }) => {
  const { selectedCompany, loading } = useAuth();

  if (loading) {
    return <Loading fullScreen text="Loading company data..." />;
  }

  return selectedCompany ? children : <Navigate to="/company-setup" />;
};

// Permission Required Route
const PermissionRoute = ({ children, permission, permissions }) => {
  const { hasPermission, selectedCompany, loading } = useAuth();

  if (loading) {
    return <Loading fullScreen text="Checking permissions..." />;
  }

  if (!selectedCompany) {
    return <Navigate to="/company-setup" />;
  }

  // Check single permission (backward compatibility)
  if (permission && !hasPermission(permission)) {
    return <Navigate to="/dashboard" />;
  }

  // Check multiple permissions (any of them - OR logic)
  if (permissions && Array.isArray(permissions)) {
    const hasAnyPermission = permissions.some((perm) => hasPermission(perm));
    if (!hasAnyPermission) {
      return <Navigate to="/dashboard" />;
    }
  }

  return children;
};

function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Routes */}
        <Route
          path="/"
          element={
            <PageTransition>
              <RouteContent>
                <Landing />
              </RouteContent>
            </PageTransition>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <PageTransition>
                <RouteContent>
                  <Login />
                </RouteContent>
              </PageTransition>
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <PageTransition>
                <RouteContent>
                  <Register />
                </RouteContent>
              </PageTransition>
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <PageTransition>
                <RouteContent>
                  <ForgotPassword />
                </RouteContent>
              </PageTransition>
            </PublicRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/company-setup"
          element={
            <ProtectedRoute>
              <PageTransition>
                <RouteContent>
                  <CompanySetup />
                </RouteContent>
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <CompanyRoute>
                <PageTransition>
                  <RouteContent>
                    <Dashboard />
                  </RouteContent>
                </PageTransition>
              </CompanyRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/time-tracking"
          element={
            <ProtectedRoute>
              <CompanyRoute>
                <PageTransition>
                  <RouteContent>
                    <TimeTracking />
                  </RouteContent>
                </PageTransition>
              </CompanyRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <PermissionRoute
                permissions={[
                  "view_reports",
                  "create_reports",
                ]}
              >
                <PageTransition>
                  <RouteContent>
                    <Reports />
                  </RouteContent>
                </PageTransition>
              </PermissionRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/members"
          element={
            <ProtectedRoute>
              <CompanyRoute>
                <PageTransition>
                  <RouteContent>
                    <Members />
                  </RouteContent>
                </PageTransition>
              </CompanyRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/roles"
          element={
            <ProtectedRoute>
              <PermissionRoute permissions={["view_roles", "manage_roles"]}>
                <PageTransition>
                  <RouteContent>
                    <Roles />
                  </RouteContent>
                </PageTransition>
              </PermissionRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <PermissionRoute
                permissions={[
                  "view_company_settings",
                  "edit_company_settings",
                  "manage_company",
                ]}
              >
                <PageTransition>
                  <RouteContent>
                    <Settings />
                  </RouteContent>
                </PageTransition>
              </PermissionRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <PageTransition>
                <RouteContent>
                  <Profile />
                </RouteContent>
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/preferences"
          element={
            <ProtectedRoute>
              <PageTransition>
                <RouteContent>
                  <Preferences />
                </RouteContent>
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/scanner-terminal"
          element={
            <ProtectedRoute>
              <CompanyRoute>
                <PermissionRoute permission="use_scanner_terminal">
                  <RouteContent>
                    <ScannerTerminal />
                  </RouteContent>
                </PermissionRoute>
              </CompanyRoute>
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AnimatePresence>
  );
}

// Toast Provider Wrapper
function ToastProvider({ children }) {
  const { toasts, removeToast } = useToast();

  return (
    <>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
