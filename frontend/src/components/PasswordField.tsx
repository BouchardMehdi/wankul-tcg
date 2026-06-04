import { useId, useState } from "react";
import "../styles/PasswordField.css";

type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  name?: string;
  placeholder?: string;
  required?: boolean;
};

function EyeIcon() {
  return (
    <svg
      className="auth-passwordIcon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2.25 12s3.35-6.25 9.75-6.25S21.75 12 21.75 12 18.4 18.25 12 18.25 2.25 12 2.25 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      className="auth-passwordIcon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M3.25 3.25 20.75 20.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M9.1 5.95A10.7 10.7 0 0 1 12 5.75c6.4 0 9.75 6.25 9.75 6.25a17.4 17.4 0 0 1-3.05 3.68"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.1 14.1A3 3 0 0 1 9.9 9.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6.1 7.65A17.2 17.2 0 0 0 2.25 12S5.6 18.25 12 18.25a10.5 10.5 0 0 0 4.2-.85"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  name,
  placeholder,
  required,
}: PasswordFieldProps) {
  const generatedId = useId();
  const inputId = name ? `password-${name}` : generatedId;
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="form-group">
      <label htmlFor={inputId}>{label}</label>
      <div className="auth-passwordField">
        <input
          id={inputId}
          className="auth-passwordInput"
          type={isVisible ? "text" : "password"}
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
        />
        <button
          type="button"
          className="auth-passwordToggle"
          aria-label={isVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          aria-pressed={isVisible}
          onClick={() => setIsVisible((current) => !current)}
        >
          {isVisible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}
