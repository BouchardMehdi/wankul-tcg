import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import "../styles/Pwa.css";
import { readAppSettings, subscribeAppSettings } from "../utils/appSettings";
import {
  isPwaCacheSupported,
  requestPwaCacheStatus,
  subscribePwaCacheProgress,
  subscribePwaCacheStatus,
  type PwaCacheProgress,
  type PwaCacheStatus,
} from "../utils/pwaCache";

const SYNC_NOTICE_MS = 5200;

function formatSyncTime(timestamp?: number) {
  if (!timestamp) return "En attente";

  const diff = Math.max(0, Date.now() - timestamp);
  if (diff < 60_000) return "A l'instant";
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
  const [syncVisibleUntil, setSyncVisibleUntil] = useState(0);
  const [cacheStatus, setCacheStatus] = useState<PwaCacheStatus | null>(null);
  const [cacheProgress, setCacheProgress] = useState<PwaCacheProgress | null>(null);
  const previousOnline = useRef(online);

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

      if (nextOnline && !previousOnline.current) {
        setSyncVisibleUntil(Date.now() + SYNC_NOTICE_MS);
        requestPwaCacheStatus().catch(() => undefined);
      }

      previousOnline.current = nextOnline;
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
      setCacheProgress(progress);

      if (progress.total > 0 && progress.cached + progress.failed >= progress.total) {
        setSyncVisibleUntil(Date.now() + SYNC_NOTICE_MS);
        requestPwaCacheStatus().catch(() => undefined);
      }
    });

    requestPwaCacheStatus().catch(() => undefined);

    return () => {
      unsubscribeStatus();
      unsubscribeProgress();
    };
  }, []);

  useEffect(() => {
    if (!offlineHints || !online || Date.now() >= syncVisibleUntil) return;

    const timeout = window.setTimeout(() => {
      setSyncVisibleUntil(0);
    }, Math.max(800, syncVisibleUntil - Date.now()));

    return () => window.clearTimeout(timeout);
  }, [offlineHints, online, syncVisibleUntil]);

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
            Tu peux garder l'app ouverte, consulter les pages deja chargees et
            les images cachees. Les achats, ventes et openings reprendront des
            que le serveur sera joignable.
          </span>

          <div className="pwaOfflinePanel__stats">
            <span><b>{cacheStatus?.cardImageEntries ?? 0}</b> cartes cachees</span>
            <span><b>{cacheStatus?.shellEntries ?? 0}</b> fichiers app</span>
            <span><b>{formatSyncTime(cacheStatus?.timestamp)}</b> dernier sync</span>
          </div>
        </div>
        <div className="pwaOfflinePanel__actions">
          <Link to="/pwa-preferences">Statut PWA</Link>
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

  if (Date.now() < syncVisibleUntil) {
    return (
      <aside className="pwaSyncPanel" role="status" aria-live="polite">
        <div className="pwaSyncPanel__mark">OK</div>
        <div className="pwaSyncPanel__content">
          <strong>Donnees synchronisees</strong>
          <span>
            Connexion revenue. Cache PWA pret avec {cacheStatus?.cardImageEntries ?? 0}
            {" "}image(s) de cartes et {cacheStatus?.runtimeEntries ?? 0} asset(s) app.
          </span>
          {cacheProgress ? (
            <em>
              Derniere preparation: {cacheProgress.cached} ok, {cacheProgress.failed} erreur(s).
            </em>
          ) : null}
        </div>
        <button type="button" onClick={() => setSyncVisibleUntil(0)}>
          Fermer
        </button>
      </aside>
    );
  }

  return null;
}
