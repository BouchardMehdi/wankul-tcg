export type OnboardingStepId =
  | "welcome"
  | "booster"
  | "opening"
  | "collection"
  | "market";

export type OnboardingStatus = "pending" | "skipped" | "completed";

export type OnboardingState = {
  version: 1;
  status: OnboardingStatus;
  step: OnboardingStepId;
  firstBoosterOpened: boolean;
  updatedAt: string;
};

const ONBOARDING_PREFIX = "wankul_onboarding_v1";
const ONBOARDING_EVENT = "wankul:onboarding-changed";

function keyForUser(userId: number | string) {
  return `${ONBOARDING_PREFIX}:${userId}`;
}

function defaultState(): OnboardingState {
  return {
    version: 1,
    status: "pending",
    step: "welcome",
    firstBoosterOpened: false,
    updatedAt: new Date().toISOString(),
  };
}

function emitOnboardingChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ONBOARDING_EVENT));
}

export function readOnboardingState(userId: number | string): OnboardingState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(keyForUser(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;

    if (parsed.version !== 1 || !parsed.status || !parsed.step) return null;

    return {
      version: 1,
      status: parsed.status,
      step: parsed.step,
      firstBoosterOpened: Boolean(parsed.firstBoosterOpened),
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeOnboardingState(
  userId: number | string,
  patch: Partial<Omit<OnboardingState, "version" | "updatedAt">>,
) {
  if (typeof window === "undefined") return null;

  const next: OnboardingState = {
    ...(readOnboardingState(userId) ?? defaultState()),
    ...patch,
    version: 1,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(keyForUser(userId), JSON.stringify(next));
  emitOnboardingChange();
  return next;
}

export function ensureOnboardingState(userId: number | string) {
  const current = readOnboardingState(userId);
  if (current) return current;
  return writeOnboardingState(userId, defaultState()) ?? defaultState();
}

export function setOnboardingStep(userId: number | string, step: OnboardingStepId) {
  return writeOnboardingState(userId, { step, status: "pending" });
}

export function skipOnboarding(userId: number | string) {
  return writeOnboardingState(userId, { status: "skipped" });
}

export function completeOnboarding(userId: number | string) {
  return writeOnboardingState(userId, { status: "completed", step: "market" });
}

export function markOnboardingFirstBoosterOpened(userId: number | string) {
  const current = readOnboardingState(userId);
  if (current?.status === "skipped" || current?.status === "completed") {
    return writeOnboardingState(userId, { firstBoosterOpened: true });
  }

  return writeOnboardingState(userId, {
    firstBoosterOpened: true,
    status: "pending",
    step: "opening",
  });
}

export function subscribeOnboarding(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(ONBOARDING_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(ONBOARDING_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
