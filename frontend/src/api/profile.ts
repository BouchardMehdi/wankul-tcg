import { API_BASE, apiFetch } from "./http";
import defaultLainkAvatar from "../assets/wankul_laink.png";
import defaultTerraAvatar from "../assets/wankul_terra.png";

export type ProfileReward = {
  credits: number;
  freeBoosters: number;
};

export type ProfileBadge = {
  code: string;
  title: string;
  description: string;
  category: string;
  tier: "bronze" | "silver" | "gold" | "rainbow";
  reward: ProfileReward;
  progress: {
    current: number;
    target: number;
    unlocked: boolean;
    label?: string;
  };
  unlocked: boolean;
  unlockedAt: string | null;
};

export type ProfileAvatarOption = {
  id: string;
  label: string;
  url: string;
};

export type ProfileAvatarStyleOption = {
  id: string;
  label: string;
  cssValue: string;
};

export type ProfileResponse = {
  user: {
    id: number;
    username: string;
    email?: string;
    createdAt?: string;
  };
  profile: {
    avatarUrl: string;
    avatarSource: string;
    avatarFrameId: string;
    avatarBackgroundId: string;
    featuredBadgeCode: string | null;
    bio: string | null;
    createdAt?: string;
    updatedAt?: string;
  };
  defaultAvatars: ProfileAvatarOption[];
  avatarFrames: ProfileAvatarStyleOption[];
  avatarBackgrounds: ProfileAvatarStyleOption[];
  summary: {
    unlockedBadges: number;
    totalBadges: number;
    collectionPercent: number;
    uniqueCards: number;
    totalCards: number;
    boostersOpened: number;
    displaysOpened: number;
  };
  badges: ProfileBadge[];
  newlyUnlocked: ProfileBadge[];
};

const DEFAULT_AVATAR_ASSETS: Record<string, string> = {
  "default-laink": defaultLainkAvatar,
  "default-terra": defaultTerraAvatar,
  "/avatars/default-laink.svg": defaultLainkAvatar,
  "/avatars/default-terra.svg": defaultTerraAvatar,
  "/avatars/wankul_laink.png": defaultLainkAvatar,
  "/avatars/wankul_terra.png": defaultTerraAvatar,
};

export function toProfileAssetUrl(url?: string | null, avatarSource?: string | null) {
  if (avatarSource && DEFAULT_AVATAR_ASSETS[avatarSource]) {
    return DEFAULT_AVATAR_ASSETS[avatarSource];
  }

  if (!url) return "";
  if (DEFAULT_AVATAR_ASSETS[url]) return DEFAULT_AVATAR_ASSETS[url];
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return `${API_BASE}${url.startsWith("/") ? url : `/${url}`}`;
}

export function getProfileAvatarStyleVars(profile?: ProfileResponse | null) {
  if (!profile) return {};

  const frame = profile.avatarFrames.find(
    (option) => option.id === profile.profile.avatarFrameId,
  );
  const background = profile.avatarBackgrounds.find(
    (option) => option.id === profile.profile.avatarBackgroundId,
  );

  return {
    "--profile-avatar-frame": frame?.cssValue ?? profile.avatarFrames[0]?.cssValue ?? "",
    "--profile-avatar-background": background?.cssValue ?? profile.avatarBackgrounds[0]?.cssValue ?? "",
  };
}

export async function getProfile() {
  return apiFetch<ProfileResponse>("/profile", { method: "GET" });
}

export async function updateProfile(input: {
  featuredBadgeCode?: string;
  bio?: string;
  avatarFrameId?: string;
  avatarBackgroundId?: string;
}) {
  return apiFetch<ProfileResponse>("/profile", {
    method: "PATCH",
    body: input,
  });
}

export async function updateProfileAvatar(input:
  | { mode: "default"; defaultAvatarId: string }
  | { mode: "upload"; imageDataUrl: string }
) {
  return apiFetch<ProfileResponse>("/profile/avatar", {
    method: "PATCH",
    body: input,
  });
}

export async function syncProfileBadges() {
  return apiFetch<{ newlyUnlocked: ProfileBadge[] }>("/profile/badges/sync", {
    method: "POST",
  });
}
