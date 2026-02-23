import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Menu from "./pages/Menu";
import Collection from "./pages/Collection";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ padding: 40 }}>Chargement...</div>;
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Home />} />

      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/menu" replace /> : <Login />
        }
      />

      <Route
        path="/register"
        element={
          isAuthenticated ? <Navigate to="/menu" replace /> : <Register />
        }
      />

      {/* Private */}
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

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
