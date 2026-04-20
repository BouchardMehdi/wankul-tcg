import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles.css";
import "../styles/Login.css";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../api/http";
import { playSoundEffect, playUiErrorSound, primeSound } from "../utils/sound";

export default function Login() {
  const navigate = useNavigate();
  const { setToken } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    void primeSound();

    try {
      const data = await apiFetch<{
        access_token?: string;
        token?: string;
        accessToken?: string;
      }>("/auth/login", {
        method: "POST",
        body: { username, password },
      });

      const token = data.access_token ?? data.token ?? data.accessToken;
      if (!token) throw new Error("Token manquant dans la réponse du serveur");

      setToken(token);
      playSoundEffect("auth.login-success");
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      playUiErrorSound();
      setError(err?.message || "Erreur inconnue");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-backLink">
          Retour a l'accueil
        </Link>

        <h1>Connexion</h1>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label>Nom d'utilisateur</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <div className="auth-actions-row">
            <button type="submit" className="btn-primary">
              Se connecter
            </button>

            <button
              type="button"
              className="btn-link"
              onClick={() => navigate("/forgot-password")}
            >
              Mot de passe oublié ?
            </button>
          </div>

          {error && <p className="error-text">{error}</p>}
        </form>

        <p className="auth-link">
          Pas encore de compte ?{" "}
          <span onClick={() => navigate("/register")}>S'inscrire</span>
        </p>
      </div>
    </div>
  );
}
