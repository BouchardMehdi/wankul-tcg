import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import "../styles/Pwa.css";
import { readAppSettings, subscribeAppSettings } from "../utils/appSettings";

export default function PwaStatusOverlay() {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [offlineHints, setOfflineHints] = useState(
    () => readAppSettings().pwaOfflineHints,
  );
  const [dismissedOnlineAt, setDismissedOnlineAt] = useState(0);

  useEffect(
    () =>
      subscribeAppSettings(() => {
        setOfflineHints(readAppSettings().pwaOfflineHints);
      }),
    [],
  );

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);

    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);

    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  if (!offlineHints || online || Date.now() - dismissedOnlineAt < 3000) {
    return null;
  }

  return (
    <aside className="pwaOfflinePanel" role="status" aria-live="polite">
      <div className="pwaOfflinePanel__mark">OFF</div>
      <div className="pwaOfflinePanel__content">
        <strong>Mode hors ligne</strong>
        <span>
          Le shell de l'app et les images deja cachees restent accessibles. Les
          achats, ventes et openings reprendront avec le serveur.
        </span>
      </div>
      <div className="pwaOfflinePanel__actions">
        <Link to="/pwa-preferences">Cache PWA</Link>
        <button type="button" onClick={() => window.location.reload()}>
          Reessayer
        </button>
        <button type="button" onClick={() => setDismissedOnlineAt(Date.now())}>
          Masquer
        </button>
      </div>
    </aside>
  );
}
