import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

import { useAuth } from "./auth/AuthContext";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Collection from "./pages/Collection";
import Booster from "./pages/Booster";
import Gameplay from "./pages/Gameplay";
import Opening from "./pages/Opening";
import Settings from "./pages/Settings";
import Market from "./pages/Market";
import MarketCreate from "./pages/MarketCreate";
import QuickSell from "./pages/QuickSell";
import Admin from "./pages/Admin";
import CardDetails from "./pages/CardDetails";
import PwaPreferences from "./pages/PwaPreferences";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Maintenance from "./pages/Maintenance";
import { getSystemStatus, type SystemStatusResponse } from "./api/system";
import PwaNotificationManager from "./components/PwaNotificationManager";
import PwaCacheManager from "./components/PwaCacheManager";
import InAppNotificationCenter from "./components/InAppNotificationCenter";
import PwaSplash from "./components/PwaSplash";
import PwaStatusOverlay from "./components/PwaStatusOverlay";
import PwaUpdateGate, { getPwaUpdateState } from "./components/PwaUpdateGate";
import OnboardingTour from "./components/OnboardingTour";
import AppPopups from "./components/AppPopups";
import { installThemeSync } from "./utils/theme";

function ThemeSync() {
  useEffect(() => installThemeSync(), []);
  return null;
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AdminRoleRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated, isLoading, role } = useAuth();
  const location = useLocation();
  const [systemStatus, setSystemStatus] = useState<SystemStatusResponse | null>(null);
  const [systemLoading, setSystemLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function refreshSystemStatus(showLoader = false) {
      if (showLoader) {
        setSystemLoading(true);
      }

      try {
        const status = await getSystemStatus();
        if (mounted) setSystemStatus(status);
      } catch {
        if (mounted) {
          setSystemStatus({
            maintenanceMode: false,
            allowAdminBypass: true,
            message: "",
            eta: null,
            sealLabel: "",
            sealText: "",
            appVersion: "1.0.0",
            minSupportedAppVersion: "1.0.0",
            googleClientId: null,
          });
        }
      } finally {
        if (mounted) setSystemLoading(false);
      }
    }

    void refreshSystemStatus(true);
    const intervalId = window.setInterval(() => {
      void refreshSystemStatus(false);
    }, 60_000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  if (isLoading || systemLoading) {
    return <PwaSplash />;
  }

  if (getPwaUpdateState(systemStatus)) {
    return (
      <>
        <ThemeSync />
        <PwaUpdateGate status={systemStatus} />
      </>
    );
  }

  const maintenanceActive =
    systemStatus?.maintenanceMode === true &&
    role !== "admin" &&
    location.pathname !== "/login";

  if (maintenanceActive) {
    return (
      <>
        <ThemeSync />
        <Maintenance status={systemStatus} />
      </>
    );
  }

  return (
    <>
      <ThemeSync />
      <PwaNotificationManager />
      <PwaCacheManager />
      <InAppNotificationCenter />
      <PwaStatusOverlay />
      <OnboardingTour />
      <AppPopups />

      <Routes>
        <Route
          path="/"
          element={<Home />}
        />
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />}
        />
        <Route
          path="/forgot-password"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <ForgotPassword />}
        />

        <Route
          path="/menu"
          element={<Navigate to="/dashboard" replace />}
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/collection"
          element={
            <PrivateRoute>
              <Collection />
            </PrivateRoute>
          }
        />
        <Route
          path="/collection/card/:id"
          element={
            <PrivateRoute>
              <CardDetails />
            </PrivateRoute>
          }
        />
        <Route
          path="/booster"
          element={
            <PrivateRoute>
              <Booster />
            </PrivateRoute>
          }
        />
        <Route
          path="/gameplay"
          element={
            <PrivateRoute>
              <Gameplay />
            </PrivateRoute>
          }
        />
        <Route
          path="/opening"
          element={
            <PrivateRoute>
              <Opening />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route
          path="/pwa-preferences"
          element={
            <PrivateRoute>
              <PwaPreferences />
            </PrivateRoute>
          }
        />
        <Route
          path="/market"
          element={
            <PrivateRoute>
              <Market />
            </PrivateRoute>
          }
        />
        <Route
          path="/market/create"
          element={
            <PrivateRoute>
              <MarketCreate />
            </PrivateRoute>
          }
        />
        <Route
          path="/market/quick-sell"
          element={
            <PrivateRoute>
              <QuickSell />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoleRoute>
              <Admin />
            </AdminRoleRoute>
          }
        />

        <Route
          path="*"
          element={<NotFound />}
        />
      </Routes>
    </>
  );
}
