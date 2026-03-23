import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles.css";
import "../styles/Login.css";
import { forgotPassword, resetPassword } from "../api/auth";

type Step = "request" | "reset";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("request");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const res = await forgotPassword({ identifier });
      setMessage(
        res.message ||
          "Si un compte correspond, un code de réinitialisation a été envoyé."
      );
      setStep("reset");
    } catch (err: any) {
      setError(err?.message || "Erreur inconnue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const res = await resetPassword({
        identifier,
        code,
        newPassword,
      });

      setMessage(res.message || "Mot de passe mis à jour avec succès.");
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1200);
    } catch (err: any) {
      setError(err?.message || "Erreur inconnue");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {step === "request" ? (
          <>
            <h1>Mot de passe oublié</h1>

            <form onSubmit={handleRequestCode} className="auth-form">
              <div className="form-group">
                <label>Email ou nom d'utilisateur</label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>

              {message && <p className="success-text">{message}</p>}
              {error && <p className="error-text">{error}</p>}

              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? "Envoi..." : "Recevoir un code"}
              </button>
            </form>

            <p className="auth-link">
              Retour à la connexion{" "}
              <span onClick={() => navigate("/login")}>Se connecter</span>
            </p>
          </>
        ) : (
          <>
            <h1>Réinitialiser le mot de passe</h1>

            <form onSubmit={handleResetPassword} className="auth-form">
              <div className="form-group">
                <label>Email ou nom d'utilisateur</label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>

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

              <div className="form-group">
                <label>Nouveau mot de passe</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>

              {message && <p className="success-text">{message}</p>}
              {error && <p className="error-text">{error}</p>}

              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? "Validation..." : "Réinitialiser"}
              </button>
            </form>

            <p className="auth-link">
              Retour à la connexion{" "}
              <span onClick={() => navigate("/login")}>Se connecter</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}