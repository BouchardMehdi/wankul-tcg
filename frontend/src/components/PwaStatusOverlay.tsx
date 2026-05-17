import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import "../styles/Pwa.css";
import { readAppSettings, subscribeAppSettings } from "../utils/appSettings";
import {
  isPwaCacheSupported,
  requestPwaCacheStatus,
  subscribePwaCacheProgress,
  subscribePwaCacheStatus,
  type PwaCacheStatus,
} from "../utils/pwaCache";

function formatSyncTime(timestamp?: number) {
  if (!timestamp) return "En attente";

  const diff = Math.max(0, Date.now() - timestamp);
  if (diff < 60_000) return "À l'instant";
  if (diff < 3_600_000) return `Il y a ${Math.round(diff / 60_000)} min`;
  return `Il y a ${Math.round(diff / 3_600_000)} h`;
}

export default function PwaStatusOverlay() {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [offlineHints, setOfflineHints] = useState(
    () => readAppSettings().pwaOfflineHints,
  );
  const [hiddenUntil, setHiddenUntil] = useState(0);
  const [cacheStatus, setCacheStatus] = useState<PwaCacheStatus | null>(null);

  useEffect(
    () =>
      subscribeAppSettings(() => {
        setOfflineHints(readAppSettings().pwaOfflineHints);
      }),
    [],
  );

  useEffect(() => {
    const updateOnline = () => {
      const nextOnline = navigator.onLine;
      setOnline(nextOnline);

      if (nextOnline) {
        requestPwaCacheStatus().catch(() => undefined);
      }
    };

    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);

    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => {
    if (!isPwaCacheSupported()) return;

    const unsubscribeStatus = subscribePwaCacheStatus((status) => {
      setCacheStatus(status);
    });
    const unsubscribeProgress = subscribePwaCacheProgress((progress) => {
      if (progress.total > 0 && progress.cached + progress.failed >= progress.total) {
        requestPwaCacheStatus().catch(() => undefined);
      }
    });

    requestPwaCacheStatus().catch(() => undefined);

    return () => {
      unsubscribeStatus();
      unsubscribeProgress();
    };
  }, []);

  if (!offlineHints || Date.now() < hiddenUntil) {
    return null;
  }

  if (!online) {
    return (
      <aside className="pwaOfflinePanel pwaOfflinePanel--expanded" role="status" aria-live="polite">
        <div className="pwaOfflinePanel__mark">OFF</div>
        <div className="pwaOfflinePanel__content">
          <strong>Mode hors ligne actif</strong>
          <span>
            Tu peux garder l'app ouverte, consulter les pages déjà chargées et
            les images déjà préparées. Les achats, ventes et openings reprendront dès
            que le serveur sera joignable.
          </span>

          <div className="pwaOfflinePanel__stats">
            <span><b>{cacheStatus?.cardImageEntries ?? 0}</b> cartes prêtes</span>
            <span><b>{cacheStatus?.shellEntries ?? 0}</b> éléments prêts</span>
            <span><b>{formatSyncTime(cacheStatus?.timestamp)}</b> dernière mise à jour</span>
          </div>
        </div>
        <div className="pwaOfflinePanel__actions">
          <Link to="/pwa-preferences">État de l'app</Link>
          <button type="button" onClick={() => window.location.reload()}>
            Reessayer
          </button>
          <button type="button" onClick={() => setHiddenUntil(Date.now() + 15 * 60_000)}>
            Masquer
          </button>
        </div>
      </aside>
    );
  }

  return null;
}
