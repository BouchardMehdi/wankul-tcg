import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "./auth/AuthContext";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Menu from "./pages/Menu";
import Collection from "./pages/Collection";
import Booster from "./pages/Booster";
import Opening from "./pages/Opening";
import Settings from "./pages/Settings";
import Market from "./pages/Market";
import MarketCreate from "./pages/MarketCreate";
import QuickSell from "./pages/QuickSell";
import Admin from "./pages/Admin";
import CardDetails from "./pages/CardDetails";

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
    return <Navigate to="/menu" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/menu" replace /> : <Home />}
      />
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/menu" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/menu" replace /> : <Register />}
      />
      <Route
        path="/forgot-password"
        element={isAuthenticated ? <Navigate to="/menu" replace /> : <ForgotPassword />}
      />

      <Route
        path="/menu"
        element={
          <PrivateRoute>
            <Menu />
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
        element={<Navigate to={isAuthenticated ? "/menu" : "/"} replace />}
      />
    </Routes>
  );
}