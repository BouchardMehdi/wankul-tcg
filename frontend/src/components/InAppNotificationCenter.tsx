import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

import "../styles/InAppNotifications.css";

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
const NOTIFICATION_DURATION_MS = 5000;

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
        const existingWithoutSameTag = current.filter((item) => item.id !== nextId);
        const nextItems = [
          {
            id: nextId,
            payload,
            createdAt: Date.now(),
            durationMs: NOTIFICATION_DURATION_MS,
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
        const hasAction = Boolean(primaryAction?.url || item.payload.url);
        const cardStyle = {
          "--notification-duration": `${item.durationMs}ms`,
        } as CSSProperties;

        return (
          <article
            key={item.id}
            className={`inAppNotificationCard ${getAccentClass(item.payload)} ${getKindClass(item.payload)}`}
            style={cardStyle}
          >
            <span className="inAppNotificationCard__accent" aria-hidden="true" />
            <div className="inAppNotificationCard__progress" />

            <div className="inAppNotificationCard__top">
              <div className="inAppNotificationCard__eyebrow">
                {getEyebrow(item.payload)}
              </div>

              <button
                type="button"
                className="inAppNotificationCard__close"
                onClick={() => dismiss(item.id)}
                aria-label="Fermer la notification"
              >
                ×
              </button>
            </div>

            <div className="inAppNotificationCard__content">
              <h3>{item.payload.title}</h3>
              <p>{item.payload.body}</p>
            </div>

            {hasAction ? (
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
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
