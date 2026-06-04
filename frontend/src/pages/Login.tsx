import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles.css";
import "../styles/Login.css";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../api/http";
import { playSoundEffect, playUiErrorSound, primeSound } from "../utils/sound";
import GoogleAuthButton from "../components/GoogleAuthButton";
import PasswordField from "../components/PasswordField";

type LoginSessionResponse = {
  access_token?: string;
  refresh_token?: string;
  token?: string;
  accessToken?: string;
};

export default function Login() {
  const navigate = useNavigate();
  const { setToken } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const completeLogin = (data: LoginSessionResponse) => {
    const token = data.access_token ?? data.token ?? data.accessToken;
    if (!token) throw new Error("Token manquant dans la réponse du serveur");

    setToken(token, data.refresh_token);
    playSoundEffect("auth.login-success");
    navigate("/dashboard", { replace: true });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    void primeSound();

    try {
      const data = await apiFetch<LoginSessionResponse>("/auth/login", {
        method: "POST",
        body: { username, password },
        auth: false,
      });

      completeLogin(data);
    } catch (err: any) {
      playUiErrorSound();
      setError(err?.message || "Erreur inconnue");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-backLink">
          Retour à l'accueil
        </Link>

        <h1>Connexion</h1>

        <GoogleAuthButton
          text="signin_with"
          onSuccess={(session) => {
            setError("");
            completeLogin(session);
          }}
          onError={(message) => {
            playUiErrorSound();
            setError(message);
          }}
        />

        <div className="auth-divider">
          <span>ou avec ton compte Wankul</span>
        </div>

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

          <PasswordField
            label="Mot de passe"
            name="login"
            value={password}
            onChange={setPassword}
            required
            autoComplete="current-password"
          />

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
