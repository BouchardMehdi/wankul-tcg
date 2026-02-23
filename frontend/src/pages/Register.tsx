import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles.css";

export default function Register() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"register" | "verify">("register");
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:3000/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Erreur d'inscription");
      }

      setStep("verify");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:3000/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Code invalide");
      }

      navigate("/login");
    } catch (err: any) {
      setError(err.message);
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
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                S'inscrire
              </button>
            </form>

            <p className="auth-link">
              Déjà un compte ?{" "}
              <span onClick={() => navigate("/login")}>
                Se connecter
              </span>
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
