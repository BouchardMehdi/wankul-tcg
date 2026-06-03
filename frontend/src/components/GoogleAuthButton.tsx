import { useEffect, useRef, useState } from "react";
import { apiFetch, type PlayerSessionResponse } from "../api/http";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleButtonText = "signin_with" | "signup_with" | "continue_with";

type GoogleAuthButtonProps = {
  text?: GoogleButtonText;
  onSuccess: (session: PlayerSessionResponse & { bonusAmount?: number }) => void;
  onError: (message: string) => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              shape?: "pill" | "rectangular" | "circle" | "square";
              text?: GoogleButtonText;
              width?: number;
            }
          ) => void;
        };
      };
    };
  }
}

const GOOGLE_SCRIPT_ID = "google-identity-services";
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? "";

function loadGoogleIdentityScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Google indisponible.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Impossible de charger Google."));
    document.head.appendChild(script);
  });
}

export default function GoogleAuthButton({
  text = "continue_with",
  onSuccess,
  onError,
}: GoogleAuthButtonProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onError, onSuccess]);

  useEffect(() => {
    if (!googleClientId) return;

    let cancelled = false;

    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !buttonRef.current || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            if (!response.credential) {
              onErrorRef.current("Connexion Google annulée.");
              return;
            }

            setIsLoading(true);
            try {
              const session = await apiFetch<PlayerSessionResponse & { bonusAmount?: number }>(
                "/auth/google",
                {
                  method: "POST",
                  body: { credential: response.credential },
                  auth: false,
                }
              );
              onSuccessRef.current(session);
            } catch (error: any) {
              onErrorRef.current(error?.message || "Connexion Google impossible.");
            } finally {
              setIsLoading(false);
            }
          },
        });

        buttonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text,
          width: buttonRef.current.clientWidth || 320,
        });
        setIsReady(true);
      })
      .catch((error: Error) => {
        if (!cancelled) onErrorRef.current(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!googleClientId) {
    return (
      <button type="button" className="auth-googleFallback" disabled>
        Google non configuré
      </button>
    );
  }

  return (
    <div className="auth-googleShell" aria-busy={isLoading || !isReady}>
      <div ref={buttonRef} className="auth-googleButton" />
      {(isLoading || !isReady) && (
        <span className="auth-googleLoading">
          {isLoading ? "Connexion Google..." : "Chargement Google..."}
        </span>
      )}
    </div>
  );
}
