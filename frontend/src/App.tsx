import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

import Menu from "./pages/Menu";
import Collection from "./pages/Collection";
import Booster from "./pages/Booster";
import Opening from "./pages/Opening";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="container">Chargement...</div>;
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={isAuthenticated ? <Navigate to="/menu" replace /> : <Home />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/menu" replace /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/menu" replace /> : <Register />} />

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

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}