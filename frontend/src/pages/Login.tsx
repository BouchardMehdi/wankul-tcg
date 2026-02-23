import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles.css";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { setToken } = useAuth(); // ✅ IMPORTANT

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:3000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || `Erreur de connexion (${res.status})`);
      }

      const token = data.access_token ?? data.token ?? data.accessToken;
      if (!token) {
        throw new Error("Token manquant dans la réponse du serveur");
      }

      // ✅ NE PAS écrire direct localStorage
      // ✅ Mets à jour le state du AuthContext
      setToken(token);

      // ✅ replace pour éviter retour arrière vers login
      navigate("/menu", { replace: true });
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Connexion</h1>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label>Nom d'utilisateur</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="btn-primary">
            Se connecter
          </button>
        </form>

        <p className="auth-link">
          Pas encore de compte ?{" "}
          <span onClick={() => navigate("/register")}>S'inscrire</span>
        </p>
      </div>
    </div>
  );
}
