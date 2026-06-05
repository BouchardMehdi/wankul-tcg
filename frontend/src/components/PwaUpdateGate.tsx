import { useMemo, useState } from "react";
import type { SystemStatusResponse } from "../api/system";
import { CURRENT_APP_VERSION, isAppVersionOlder } from "../utils/appVersion";
import { requestPwaUpdate } from "../utils/pwaUpdate";
import "../styles/Pwa.css";

type PwaUpdateGateProps = {
  status: SystemStatusResponse | null;
};

export function getPwaUpdateState(status: SystemStatusResponse | null) {
  if (!status?.appVersion) {
    return null;
  }

  const latestVersion = status.appVersion;
  const minSupportedVersion = status.minSupportedAppVersion || latestVersion;
  const updateAvailable = isAppVersionOlder(CURRENT_APP_VERSION, latestVersion);
  const updateRequired = isAppVersionOlder(CURRENT_APP_VERSION, minSupportedVersion);

  if (!updateAvailable && !updateRequired) {
    return null;
  }

  return {
    latestVersion,
    minSupportedVersion,
    updateRequired,
  };
}

export default function PwaUpdateGate({ status }: PwaUpdateGateProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const updateState = useMemo(() => getPwaUpdateState(status), [status]);

  if (!updateState) {
    return null;
  }

  async function handleUpdate() {
    setIsUpdating(true);
    await requestPwaUpdate();
  }

  return (
    <main className="pwaUpdatePage" aria-labelledby="pwa-update-title">
      <section className="pwaUpdateCard">
        <div className="pwaUpdateCard__badge">
          {updateState.updateRequired ? "Mise à jour requise" : "Nouvelle version"}
        </div>

        <div className="pwaUpdateCard__pack" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <p className="pwaUpdateCard__eyebrow">Wankul TCG évolue</p>
        <h1 id="pwa-update-title">
          Mets l'app à jour pour continuer la chasse.
        </h1>
        <p className="pwaUpdateCard__text">
          Une nouvelle version est prête. Elle évite les vieux fichiers en cache et garantit que
          l'app installée utilise les dernières cartes, pages et règles de sécurité.
        </p>

        <div className="pwaUpdateCard__versions" aria-label="Versions de l'application">
          <span>
            Version installée <strong>{CURRENT_APP_VERSION}</strong>
          </span>
          <span>
            Version disponible <strong>{updateState.latestVersion}</strong>
          </span>
        </div>

        {updateState.updateRequired ? (
          <p className="pwaUpdateCard__notice">
            Cette version est trop ancienne pour continuer. La mise à jour est obligatoire.
          </p>
        ) : null}

        <button className="btn btn--primary pwaUpdateCard__button" onClick={handleUpdate} disabled={isUpdating}>
          {isUpdating ? "Mise à jour..." : "Mettre à jour l'app"}
        </button>
      </section>
    </main>
  );
}
