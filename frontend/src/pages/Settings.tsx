import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

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
import { useAuth } from "../auth/AuthContext";

type SelectSettingKey = "collectionLayout";
type ToggleSettingKey = Exclude<keyof AppSettings, SelectSettingKey | "compactCollectionGrid">;

type SettingRow =
  | {
      key: ToggleSettingKey;
      title: string;
      desc: string;
      kind: "toggle";
      section: "general" | "market";
    }
  | {
      key: SelectSettingKey;
      title: string;
      desc: string;
      kind: "select";
      section: "general" | "market";
    };

const SETTING_ROWS: SettingRow[] = [
  {
    key: "skipOpeningAnimations",
    title: "Skip animations",
    desc: "Passe directement aux cartes ou au résumé pendant les openings.",
    kind: "toggle",
    section: "general",
  },
  {
    key: "autoFlipCards",
    title: "Auto flip cards",
    desc: "Fait défiler automatiquement les cartes révélées une par une.",
    kind: "toggle",
    section: "general",
  },
  {
    key: "fastReveal",
    title: "Fast reveal",
    desc: "Accélère les timings d'ouverture et les enchaînements des cartes.",
    kind: "toggle",
    section: "general",
  },
  {
    key: "disableHoloEffects",
    title: "Disable holo effects",
    desc: "Désactive les effets holo et une partie des effets visuels lourds.",
    kind: "toggle",
    section: "general",
  },
  {
    key: "showDuplicatesCounter",
    title: "Show duplicates counter",
    desc: "Affiche le compteur x2, x3, x4… sur les cartes possédées plusieurs fois.",
    kind: "toggle",
    section: "general",
  },
  {
    key: "collectionLayout",
    title: "Collection layout",
    desc: "Choisis la disposition de la grille de collection selon ton écran et ta préférence.",
    kind: "select",
    section: "general",
  },
  {
    key: "hideMissingCards",
    title: "Hide missing cards",
    desc: "Masque les cartes non débloquées dans la collection.",
    kind: "toggle",
    section: "general",
  },
  {
    key: "autoHighlightNewCards",
    title: "Auto highlight new cards",
    desc: "Met en avant dans la collection les nouvelles cartes obtenues lors de la dernière ouverture.",
    kind: "toggle",
    section: "general",
  },
  {
    key: "showDropRates",
    title: "Show drop rates",
    desc: "Affiche la distribution du butin et les pourcentages sur le dashboard.",
    kind: "toggle",
    section: "general",
  },
  {
    key: "confirmPurchases",
    title: "Confirm purchases",
    desc: "Demande une confirmation avant d'acheter un booster ou une display avec des crédits.",
    kind: "toggle",
    section: "general",
  },

  {
    key: "autoClaimMarketRewards",
    title: "Récupération automatique des récompenses",
    desc: "Récupère automatiquement les crédits et cartes gagnés quand une vente est terminée.",
    kind: "toggle",
    section: "market",
  },
  {
    key: "confirmQuickSell",
    title: "Confirmer avant une vente rapide",
    desc: "Affiche une confirmation avant de vendre une carte avec la vente rapide.",
    kind: "toggle",
    section: "market",
  },
  {
    key: "confirmCancelListing",
    title: "Confirmer avant l'annulation d'une annonce",
    desc: "Demande une confirmation avant d'annuler une annonce active du market.",
    kind: "toggle",
    section: "market",
  },
  {
    key: "confirmMarketBuy",
    title: "Confirmer avant un achat market",
    desc: "Affiche une confirmation avant d'acheter une annonce sur le market.",
    kind: "toggle",
    section: "market",
  },
  {
    key: "confirmBelowMarketSale",
    title: "Confirmer si le prix est très inférieur au marché",
    desc: "Demande une confirmation avant de créer une annonce bien en dessous du prix du marché.",
    kind: "toggle",
    section: "market",
  },
  {
    key: "confirmAboveMarketSale",
    title: "Confirmer si le prix est très supérieur au marché",
    desc: "Demande une confirmation avant de créer une annonce bien au-dessus du prix du marché.",
    kind: "toggle",
    section: "market",
  },
];

const SECTION_META = {
  general: {
    title: "Application",
    desc: "Préférences globales de l'app, de la collection et des openings.",
  },
  market: {
    title: "Market",
    desc: "Paramètres de sécurité et de comportement pour les achats et ventes.",
  },
} as const;

export default function Settings() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [settings, setSettings] = useState<AppSettings>(() => readAppSettings());

  useEffect(() => subscribeAppSettings(() => setSettings(readAppSettings())), []);

  const enabledCount = useMemo(
    () =>
      Object.entries(settings).filter(([key, value]) => {
        if (key === "collectionLayout" || key === "compactCollectionGrid") return false;
        return Boolean(value);
      }).length,
    [settings],
  );

  const generalRows = useMemo(
    () => SETTING_ROWS.filter((row) => row.section === "general"),
    [],
  );

  const marketRows = useMemo(
    () => SETTING_ROWS.filter((row) => row.section === "market"),
    [],
  );

  function toggle(key: ToggleSettingKey) {
    const next = !settings[key];
    const merged = { ...settings, [key]: next };
    setSettings(merged);
    writeAppSettings({ [key]: next });
  }

  function updateCollectionLayout(value: AppSettings["collectionLayout"]) {
    const merged = { ...settings, collectionLayout: value };
    setSettings(merged);
    writeAppSettings({ collectionLayout: value });
  }

  function resetAll() {
    setSettings(APP_SETTINGS_DEFAULTS);
    writeAppSettings(APP_SETTINGS_DEFAULTS);
  }

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  function renderRow(row: SettingRow) {
    if (row.kind === "select") {
      return (
        <div className="settingsRow" key={row.key}>
          <div className="settingsRow__content">
            <div className="settingsRow__title">{row.title}</div>
            <div className="settingsRow__desc">{row.desc}</div>
          </div>

          <div className="settingsRow__control">
            <select
              className="settingsSelect"
              value={settings.collectionLayout}
              onChange={(e) =>
                updateCollectionLayout(e.target.value as AppSettings["collectionLayout"])
              }
            >
              <option value="standard">Standard — 5 colonnes</option>
              <option value="compact">Compact — 6 colonnes</option>
              <option value="large">Large — 4 colonnes</option>
            </select>
          </div>
        </div>
      );
    }

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

            <div className="settingsSections">
              <div className="settingsSection">
                <div className="settingsSection__head">
                  <div className="settingsSection__title">{SECTION_META.general.title}</div>
                  <div className="settingsSection__desc">{SECTION_META.general.desc}</div>
                </div>

                <div className="settingsList">
                  {generalRows.map(renderRow)}
                </div>
              </div>

              <div className="settingsSection">
                <div className="settingsSection__head">
                  <div className="settingsSection__title">{SECTION_META.market.title}</div>
                  <div className="settingsSection__desc">{SECTION_META.market.desc}</div>
                </div>

                <div className="settingsList">
                  {marketRows.map(renderRow)}
                </div>
              </div>
            </div>

            <div className="settingsFooter">
              <button type="button" className="btn" onClick={resetAll}>
                Réinitialiser les paramètres
              </button>
            </div>

            <div className="settingsDangerZone">
              <div className="settingsDangerZone__title">Compte</div>
              <div className="settingsDangerZone__desc">
                Déconnecte-toi de l'application sur cet appareil.
              </div>

              <button
                type="button"
                className="btn settingsLogoutBtn"
                onClick={handleLogout}
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}