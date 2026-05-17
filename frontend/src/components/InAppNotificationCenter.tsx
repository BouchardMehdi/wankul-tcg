import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

import "../styles/InAppNotifications.css";

import SmartImage from "./SmartImage";
import {
  emitInAppNotification,
  type InAppNotificationAction,
  type InAppNotificationPayload,
} from "../utils/inAppNotifications";
import { playSoundEffect } from "../utils/sound";

type NotificationItem = {
  id: string;
  payload: InAppNotificationPayload;
  createdAt: number;
  durationMs: number;
};

const MAX_VISIBLE_NOTIFICATIONS = 4;

function buildToastId(payload: InAppNotificationPayload) {
  return payload.tag || `${payload.kind || "generic"}-${Date.now()}`;
}

function getAccentClass(payload: InAppNotificationPayload) {
  switch (payload.accent) {
    case "gold":
      return "is-gold";
    case "violet":
      return "is-violet";
    case "pink":
      return "is-pink";
    case "cyan":
    default:
      return "is-cyan";
  }
}

function getEyebrow(payload: InAppNotificationPayload) {
  switch (payload.kind) {
    case "market-reward":
      return "Vente conclue";
    case "watchlist-price":
    case "watchlist-listing":
    case "watchlist-deal":
      return "Carte en veille";
    case "free-openings-ready":
      return "Ouverture servie";
    case "free-openings-soon":
      return "Recharge proche";
    case "stale-listing":
      return "Annonce froide";
    case "daily-market-recap":
      return "Bilan du jour";
    default:
      return "Wankul TCG";
  }
}

function getKindClass(payload: InAppNotificationPayload) {
  switch (payload.kind) {
    case "market-reward":
      return "kind-market-reward";
    case "watchlist-price":
    case "watchlist-listing":
    case "watchlist-deal":
      return "kind-watchlist-price";
    case "free-openings-ready":
      return "kind-free-openings-ready";
    case "free-openings-soon":
      return "kind-free-openings-soon";
    case "stale-listing":
      return "kind-stale-listing";
    case "daily-market-recap":
      return "kind-daily-market-recap";
    default:
      return "kind-generic";
  }
}

function getMonogram(payload: InAppNotificationPayload) {
  switch (payload.kind) {
    case "market-reward":
      return "MK";
    case "watchlist-price":
      return "WL";
    case "watchlist-listing":
      return "WL";
    case "watchlist-deal":
      return "HOT";
    case "free-openings-ready":
      return "GO";
    case "free-openings-soon":
      return "UP";
    case "stale-listing":
      return "SL";
    case "daily-market-recap":
      return "RC";
    default:
      return "WT";
  }
}

function getFlavorText(payload: InAppNotificationPayload) {
  switch (payload.kind) {
    case "market-reward":
      return "Une vente vient de tomber et le gain t'attend";
    case "watchlist-price":
      return "Le bon moment pour tenter ta carte cible";
    case "watchlist-listing":
      return "Une annonce vient de matcher ta watchlist";
    case "watchlist-deal":
      return "Une vraie bonne affaire vient d arriver";
    case "free-openings-ready":
      return "Le frisson de l'ouverture peut repartir tout de suite";
    case "free-openings-soon":
      return "Ta prochaine charge approche à grands pas";
    case "stale-listing":
      return "Ton annonce mérite peut-être un petit coup de boost";
    case "daily-market-recap":
      return "Le marché du jour résumé en un clin d'œil";
    default:
      return "Nouvelle alerte dans ton univers Wankul";
  }
}

function getStamp(payload: InAppNotificationPayload) {
  switch (payload.kind) {
    case "market-reward":
      return "Gain";
    case "watchlist-price":
      return "Cible";
    case "watchlist-listing":
      return "Trouvee";
    case "watchlist-deal":
      return "Deal";
    case "free-openings-ready":
      return "Ouverture";
    case "free-openings-soon":
      return "Bientot";
    case "stale-listing":
      return "Relance";
    case "daily-market-recap":
      return "Bilan";
    default:
      return "Alerte";
  }
}

function playToastSound(payload: InAppNotificationPayload) {
  if (typeof document !== "undefined" && document.visibilityState !== "visible") {
    return;
  }

  switch (payload.kind) {
    case "market-reward":
      playSoundEffect("market.reward");
      break;
    case "watchlist-price":
    case "watchlist-listing":
      playSoundEffect("market.buy");
      break;
    case "watchlist-deal":
      playSoundEffect("market.reward");
      break;
    case "free-openings-ready":
      playSoundEffect("opening.new-card");
      break;
    case "free-openings-soon":
      playSoundEffect("ui.toggle-on");
      break;
    case "stale-listing":
      playSoundEffect("ui.denied");
      break;
    default:
      playSoundEffect("ui.toggle-on");
      break;
  }
}

export default function InAppNotificationCenter() {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const pushMessageHandler = (event: MessageEvent) => {
      if (event.data?.type !== "wankul:push" || !event.data?.payload) {
        return;
      }

      const payload = event.data.payload as InAppNotificationPayload;
      emitInAppNotification(payload);
    };

    const customNotificationHandler = (event: Event) => {
      const customEvent = event as CustomEvent<InAppNotificationPayload>;
      const payload = customEvent.detail;

      if (!payload?.title || !payload?.body) {
        return;
      }

      playToastSound(payload);

      setItems((current) => {
        const nextId = buildToastId(payload);
        const durationMs = payload.requireInteraction ? 9000 : 6000;
        const existingWithoutSameTag = current.filter((item) => item.id !== nextId);
        const nextItems = [
          {
            id: nextId,
            payload,
            createdAt: Date.now(),
            durationMs,
          },
          ...existingWithoutSameTag,
        ];
        return nextItems.slice(0, MAX_VISIBLE_NOTIFICATIONS);
      });
    };

    navigator.serviceWorker?.addEventListener("message", pushMessageHandler);
    window.addEventListener(
      "wankul:in-app-notification",
      customNotificationHandler as EventListener,
    );

    return () => {
      navigator.serviceWorker?.removeEventListener("message", pushMessageHandler);
      window.removeEventListener(
        "wankul:in-app-notification",
        customNotificationHandler as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    const timers = items.map((item) => {
      const elapsedMs = Date.now() - item.createdAt;
      const timeoutMs = Math.max(0, item.durationMs - elapsedMs);

      return window.setTimeout(() => {
        setItems((current) => current.filter((entry) => entry.id !== item.id));
      }, timeoutMs);
    });

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [items]);

  function dismiss(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function openUrl(url?: string) {
    if (!url) return;

    if (/^https?:\/\//i.test(url)) {
      window.location.href = url;
      return;
    }

    navigate(url);
  }

  function handlePrimaryAction(
    id: string,
    payload: InAppNotificationPayload,
    action?: InAppNotificationAction,
  ) {
    if (action?.action === "dismiss") {
      dismiss(id);
      return;
    }

    openUrl(action?.url || payload.url);
    dismiss(id);
  }

  if (!items.length) {
    return null;
  }

  return (
    <div className="inAppNotificationStack" aria-live="polite" aria-atomic="false">
      {items.map((item) => {
        const primaryAction =
          item.payload.actions?.find((action) => action.action !== "dismiss") || null;
        const secondaryAction =
          item.payload.actions?.find((action) => action.action === "dismiss") || null;
        const cardStyle = {
          "--notification-duration": `${item.durationMs}ms`,
        } as CSSProperties;

        return (
          <article
            key={item.id}
            className={`inAppNotificationCard ${getAccentClass(item.payload)} ${getKindClass(item.payload)}`}
            style={cardStyle}
          >
            <div className="inAppNotificationCard__glow" />
            <div className="inAppNotificationCard__texture" />
            <div className="inAppNotificationCard__corner" />
            <div className="inAppNotificationCard__progress" />

            <div className="inAppNotificationCard__top">
              <div className="inAppNotificationCard__meta">
                <div className="inAppNotificationCard__eyebrow">
                  {getEyebrow(item.payload)}
                </div>
                <div className="inAppNotificationCard__time">Maintenant</div>
              </div>

              <button
                type="button"
                className="inAppNotificationCard__close"
                onClick={() => dismiss(item.id)}
                aria-label="Fermer la notification"
              >
                X
              </button>
            </div>

            <div className="inAppNotificationCard__body">
              {item.payload.image ? (
                <div className="inAppNotificationCard__media">
                  <div className="inAppNotificationCard__stamp">
                    {getStamp(item.payload)}
                  </div>
                  <SmartImage src={item.payload.image} alt="" />
                </div>
              ) : item.payload.icon ? (
                <div className="inAppNotificationCard__iconTile">
                  <SmartImage src={item.payload.icon} alt="" />
                </div>
              ) : null}

              <div className="inAppNotificationCard__content">
                <div className="inAppNotificationCard__monogram">
                  {getMonogram(item.payload)}
                </div>
                <div className="inAppNotificationCard__flavor">
                  {getFlavorText(item.payload)}
                </div>
                <h3>{item.payload.title}</h3>
                <p>{item.payload.body}</p>
              </div>
            </div>

            <div className="inAppNotificationCard__footer">
              <button
                type="button"
                className="inAppNotificationCard__cta"
                onClick={() =>
                  handlePrimaryAction(
                    item.id,
                    item.payload,
                    primaryAction ?? undefined,
                  )
                }
              >
                {primaryAction?.title || "Ouvrir"}
              </button>

              <button
                type="button"
                className="inAppNotificationCard__ghost"
                onClick={() =>
                  handlePrimaryAction(
                    item.id,
                    item.payload,
                    secondaryAction ?? { action: "dismiss", title: "Plus tard" },
                  )
                }
              >
                {secondaryAction?.title || "Plus tard"}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
