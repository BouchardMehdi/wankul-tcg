import { useEffect, useMemo, useState } from "react";

import "../styles.css";
import "../styles/Menu.css";
import "../styles/Settings.css";

import AppNavbar from "../components/AppNavbar";

import {
  APP_SETTINGS_DEFAULTS,
  readAppSettings,
  subscribeAppSettings,
  writeAppSettings,
  type AppSettings,
} from "../utils/appSettings";

type SettingRow = {
  key: keyof AppSettings;
  title: string;
  desc: string;
};

const SETTING_ROWS: SettingRow[] = [
  {
    key: "skipOpeningAnimations",
    title: "Skip animations",
    desc: "Passe directement aux cartes ou au résumé pendant les openings.",
  },
  {
    key: "autoFlipCards",
    title: "Auto flip cards",
    desc: "Fait défiler automatiquement les cartes révélées une par une.",
  },
  {
    key: "fastReveal",
    title: "Fast reveal",
    desc: "Accélère les timings d'ouverture et les enchaînements des cartes.",
  },
  {
    key: "disableHoloEffects",
    title: "Disable holo effects",
    desc: "Désactive les effets holo et une partie des effets visuels lourds.",
  },
  {
    key: "showDuplicatesCounter",
    title: "Show duplicates counter",
    desc: "Affiche le compteur x2, x3, x4… sur les cartes possédées plusieurs fois.",
  },
  {
    key: "compactCollectionGrid",
    title: "Compact collection grid",
    desc: "Réduit la taille des cartes pour afficher davantage d'éléments à l'écran.",
  },
  {
    key: "hideMissingCards",
    title: "Hide missing cards",
    desc: "Masque les cartes non débloquées dans la collection.",
  },
  {
    key: "autoHighlightNewCards",
    title: "Auto highlight new cards",
    desc: "Met en avant dans la collection les nouvelles cartes obtenues lors de la dernière ouverture.",
  },
  {
    key: "showDropRates",
    title: "Show drop rates",
    desc: "Affiche la distribution du butin et les pourcentages sur le dashboard.",
  },
  {
    key: "confirmPurchases",
    title: "Confirm purchases",
    desc: "Demande une confirmation avant d'acheter un booster ou une display avec des crédits.",
  },
];

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(() => readAppSettings());

  useEffect(() => subscribeAppSettings(() => setSettings(readAppSettings())), []);

  const enabledCount = useMemo(
    () => Object.values(settings).filter(Boolean).length,
    [settings],
  );

  function toggle(key: keyof AppSettings) {
    const next = !settings[key];
    const merged = { ...settings, [key]: next };
    setSettings(merged);
    writeAppSettings({ [key]: next });
  }

  function resetAll() {
    setSettings(APP_SETTINGS_DEFAULTS);
    writeAppSettings(APP_SETTINGS_DEFAULTS);
  }

  return (
    <div className="app-shell">
      <AppNavbar currentPage="settings" />

      <section className="container settingsPage">
        <div className="panel settingsPanel">
          <div className="panel-inner">
            <div className="section-title settingsHeading">
              <div>
                <h2>Paramètres</h2>
                <p className="small">Préférences locales de l'application.</p>
              </div>

              <div className="settingsSummary small">
                <b>{enabledCount}</b> option{enabledCount > 1 ? "s" : ""} activée{enabledCount > 1 ? "s" : ""}
              </div>
            </div>

            <div className="settingsList">
              {SETTING_ROWS.map((row) => {
                const checked = settings[row.key];
                return (
                  <div className="settingsRow" key={row.key}>
                    <div className="settingsRow__content">
                      <div className="settingsRow__title">{row.title}</div>
                      <div className="settingsRow__desc">{row.desc}</div>
                    </div>

                    <button
                      type="button"
                      className={`skipToggleBtn ${checked ? "is-on" : "is-off"}`}
                      onClick={() => toggle(row.key)}
                      aria-pressed={checked}
                    >
                      <span className="skipToggleBtn__track">
                        <span className="skipToggleBtn__thumb" />
                      </span>
                      <span className="skipToggleBtn__label">{checked ? "Activé" : "Désactivé"}</span>
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="settingsFooter">
              <button type="button" className="btn" onClick={resetAll}>
                Réinitialiser les paramètres
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}