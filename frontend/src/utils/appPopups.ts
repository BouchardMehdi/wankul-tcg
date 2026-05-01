export const WELCOME_BONUS_CREDITS = 1500;

const WELCOME_POPUP_PREFIX = "wankul_welcome_bonus_popup_v1";
const PWA_INSTALL_DISMISS_UNTIL_KEY = "wankul_pwa_install_popup_dismissed_until";
const PWA_INSTALL_ACCEPTED_KEY = "wankul_pwa_install_popup_accepted";
const POPUP_EVENT = "wankul:app-popups-changed";

function emitPopupChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(POPUP_EVENT));
}

function welcomeKey(userId: number | string) {
  return `${WELCOME_POPUP_PREFIX}:${userId}`;
}

export function hasSeenWelcomeBonusPopup(userId: number | string) {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(welcomeKey(userId)) === "seen";
}

export function markWelcomeBonusPopupSeen(userId: number | string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(welcomeKey(userId), "seen");
  emitPopupChange();
}

export function isStandalonePwaMode() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function hasAcceptedPwaInstallPopup() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(PWA_INSTALL_ACCEPTED_KEY) === "true";
}

export function markPwaInstallPopupAccepted() {
  if (typeof window === "undefined") return;
  localStorage.setItem(PWA_INSTALL_ACCEPTED_KEY, "true");
  emitPopupChange();
}

export function shouldShowPwaInstallPopup() {
  if (typeof window === "undefined") return false;
  if (isStandalonePwaMode() || hasAcceptedPwaInstallPopup()) return false;

  const dismissedUntil = Number(localStorage.getItem(PWA_INSTALL_DISMISS_UNTIL_KEY) ?? 0);
  return !Number.isFinite(dismissedUntil) || Date.now() > dismissedUntil;
}

export function dismissPwaInstallPopup(days = 7) {
  if (typeof window === "undefined") return;
  const delay = Math.max(1, days) * 24 * 60 * 60 * 1000;
  localStorage.setItem(PWA_INSTALL_DISMISS_UNTIL_KEY, String(Date.now() + delay));
  emitPopupChange();
}

export function subscribeAppPopups(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(POPUP_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(POPUP_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
