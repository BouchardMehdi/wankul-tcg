import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles.css";
import "../styles/Register.css";
import { apiFetch } from "../api/http";

export default function Register() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [step, setStep] = useState<"register" | "verify">("register");
  const [code, setCode] = useState("");

  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await apiFetch("/auth/register", {
        method: "POST",
        body: { username, email, password },
      });

      setStep("verify");
    } catch (err: any) {
      setError(err?.message || "Erreur inconnue");
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await apiFetch("/auth/verify", {
        method: "POST",
        body: { email, code },
      });

      navigate("/login");
    } catch (err: any) {
      setError(err?.message || "Erreur inconnue");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {step === "register" ? (
          <>
            <h1>Inscription</h1>

            <form onSubmit={handleRegister} className="auth-form">
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
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label>Mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              {error && <p className="error-text">{error}</p>}

              <button type="submit" className="btn-primary">
                S'inscrire
              </button>
            </form>

            <p className="auth-link">
              Déjà un compte ?{" "}
              <span onClick={() => navigate("/login")}>Se connecter</span>
            </p>
          </>
        ) : (
          <>
            <h1>Vérification Email</h1>

            <form onSubmit={handleVerify} className="auth-form">
              <div className="form-group">
                <label>Code à 6 chiffres</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  required
                  inputMode="numeric"
                />
              </div>

              {error && <p className="error-text">{error}</p>}

              <button type="submit" className="btn-primary">
                Vérifier
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}