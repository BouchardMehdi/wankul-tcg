import { useEffect, useMemo, useState, type CSSProperties } from "react";

import "../styles.css";
import "../styles/Profile.css";

import {
  getProfileAvatarStyleVars,
  getProfile,
  toProfileAssetUrl,
  updateProfile,
  updateProfileAvatar,
  type ProfileBadge,
  type ProfileResponse,
} from "../api/profile";
import AppNavbar from "../components/AppNavbar";
import ProfileBadgeIcon from "../components/ProfileBadgeIcon";
import SmartImage from "../components/SmartImage";
import { playActionDeniedSound, playSettingToggleSound } from "../utils/sound";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Impossible de lire l'image."));
    reader.readAsDataURL(file);
  });
}

function rewardLabel(badge: ProfileBadge) {
  const parts = [];
  if (badge.reward.credits > 0) parts.push(`${badge.reward.credits} credits`);
  if (badge.reward.freeBoosters > 0) {
    parts.push(`${badge.reward.freeBoosters} booster${badge.reward.freeBoosters > 1 ? "s" : ""}`);
  }
  return parts.length ? parts.join(" + ") : "Cosmetique";
}

function progressLabel(badge: ProfileBadge) {
  const suffix = badge.progress.label ?? "";
  return `${Math.round(badge.progress.current)}${suffix} / ${Math.round(badge.progress.target)}${suffix}`;
}

function formatUnlockedAt(value?: string | null) {
  if (!value) return "Pas encore debloque";
  return new Date(value).toLocaleDateString("fr-FR");
}

export default function Profile() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const data = await getProfile();
        if (mounted) setProfile(data);
      } catch (err: any) {
        if (mounted) setError(err?.message || "Impossible de charger le profil.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load().catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const featuredBadge = useMemo(() => {
    if (!profile?.profile.featuredBadgeCode) return null;
    return profile.badges.find((badge) => badge.code === profile.profile.featuredBadgeCode) ?? null;
  }, [profile]);

  const unlockedBadges = useMemo(
    () => profile?.badges.filter((badge) => badge.unlocked) ?? [],
    [profile],
  );

  const lockedBadges = useMemo(
    () => profile?.badges.filter((badge) => !badge.unlocked) ?? [],
    [profile],
  );

  const avatarStyle = useMemo(
    () => getProfileAvatarStyleVars(profile) as CSSProperties,
    [profile],
  );

  async function chooseDefaultAvatar(defaultAvatarId: string) {
    setSaving(true);
    setError("");
    setFeedback("");

    try {
      const data = await updateProfileAvatar({ mode: "default", defaultAvatarId });
      setProfile(data);
      setFeedback("Avatar mis a jour.");
      playSettingToggleSound(true);
    } catch (err: any) {
      playActionDeniedSound();
      setError(err?.message || "Impossible de changer l'avatar.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      playActionDeniedSound();
      setError("Format invalide. Utilise PNG, JPG ou WEBP.");
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      playActionDeniedSound();
      setError("Image trop lourde. Maximum 2 Mo.");
      return;
    }

    setSaving(true);
    setError("");
    setFeedback("");

    try {
      const imageDataUrl = await fileToDataUrl(file);
      const data = await updateProfileAvatar({ mode: "upload", imageDataUrl });
      setProfile(data);
      setFeedback("Photo de profil importee.");
      playSettingToggleSound(true);
    } catch (err: any) {
      playActionDeniedSound();
      setError(err?.message || "Impossible d'importer l'image.");
    } finally {
      setSaving(false);
    }
  }

  async function featureBadge(badgeCode: string) {
    setSaving(true);
    setError("");
    setFeedback("");

    try {
      const data = await updateProfile({ featuredBadgeCode: badgeCode });
      setProfile(data);
      setFeedback("Badge mis en avant sur le profil.");
      playSettingToggleSound(true);
    } catch (err: any) {
      playActionDeniedSound();
      setError(err?.message || "Impossible de mettre ce badge en avant.");
    } finally {
      setSaving(false);
    }
  }

  async function updateAvatarCosmetic(input: {
    avatarFrameId?: string;
    avatarBackgroundId?: string;
  }) {
    setSaving(true);
    setError("");
    setFeedback("");

    try {
      const data = await updateProfile(input);
      setProfile(data);
      setFeedback("Style d'avatar mis a jour.");
      playSettingToggleSound(true);
    } catch (err: any) {
      playActionDeniedSound();
      setError(err?.message || "Impossible de changer le style d'avatar.");
    } finally {
      setSaving(false);
    }
  }

  function renderBadge(badge: ProfileBadge) {
    const percent = Math.min(
      100,
      Math.round((badge.progress.current / Math.max(1, badge.progress.target)) * 100),
    );

    return (
      <article
        className={[
          "profileBadgeItem",
          `profileBadgeItem--${badge.tier}`,
          badge.unlocked ? "is-unlocked" : "is-locked",
        ].join(" ")}
        key={badge.code}
      >
        <ProfileBadgeIcon
          code={badge.code}
          title={badge.title}
          tier={badge.tier}
          unlocked={badge.unlocked}
          className="profileBadgeItem__icon"
        />

        <div className="profileBadgeItem__body">
          <div className="profileBadgeItem__top">
            <div>
              <strong>{badge.title}</strong>
              <span>{badge.category}</span>
            </div>
            <em>{badge.unlocked ? "Actif" : `${percent}%`}</em>
          </div>

          <p>{badge.description}</p>

          <div className="profileBadgeItem__progress" aria-label={progressLabel(badge)}>
            <span style={{ width: `${percent}%` }} />
          </div>

          <div className="profileBadgeItem__meta">
            <span>{progressLabel(badge)}</span>
            <span>{rewardLabel(badge)}</span>
          </div>

          <div className="profileBadgeItem__bottom">
            <span>{formatUnlockedAt(badge.unlockedAt)}</span>
            {badge.unlocked ? (
              <button
                type="button"
                className="btn btn--ghost"
                disabled={saving || profile?.profile.featuredBadgeCode === badge.code}
                onClick={() => void featureBadge(badge.code)}
              >
                {profile?.profile.featuredBadgeCode === badge.code ? "Affiche" : "Afficher"}
              </button>
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  if (loading) {
    return (
      <div className="app-shell">
        <AppNavbar currentPage="profile" />
        <main className="container profilePage">
          <div className="panel profileLoading">Chargement du profil...</div>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="app-shell">
        <AppNavbar currentPage="profile" />
        <main className="container profilePage">
          <div className="panel profileLoading">
            {error || "Profil introuvable."}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <AppNavbar currentPage="profile" />

      <main className="container profilePage">
        <section className="profileHero">
          <div className="profileHero__avatarWrap" style={avatarStyle}>
            <SmartImage
              src={toProfileAssetUrl(profile.profile.avatarUrl, profile.profile.avatarSource)}
              alt={`Avatar de ${profile.user.username}`}
              className="profileHero__avatar"
              loading="eager"
              fetchPriority="high"
            />
          </div>

          <div className="profileHero__content">
            <span className="profileHero__eyebrow">Profil joueur</span>
            <div className="profileNameLine">
              <h1>{profile.user.username}</h1>
              {featuredBadge ? (
                <ProfileBadgeIcon
                  code={featuredBadge.code}
                  title={featuredBadge.title}
                  tier={featuredBadge.tier}
                  size="sm"
                  className="profileInlineBadge"
                />
              ) : null}
            </div>
            <p>
              Ta vitrine de collection : avatar, badge principal et objectifs qui
              donnent des vraies recompenses sans toucher au gameplay.
            </p>

            {featuredBadge ? (
              <div className={`profileFeaturedBadge profileFeaturedBadge--${featuredBadge.tier}`}>
                <span>Badge en avant</span>
                <strong>{featuredBadge.title}</strong>
              </div>
            ) : (
              <div className="profileFeaturedBadge">
                <span>Badge en avant</span>
                <strong>Choisis un badge debloque</strong>
              </div>
            )}
          </div>

          <div className="profileHero__stats">
            <div>
              <strong>{profile.summary.unlockedBadges}/{profile.summary.totalBadges}</strong>
              <span>Badges</span>
            </div>
            <div>
              <strong>{profile.summary.collectionPercent}%</strong>
              <span>Collection</span>
            </div>
            <div>
              <strong>{profile.summary.boostersOpened}</strong>
              <span>Boosters</span>
            </div>
          </div>
        </section>

        {profile.newlyUnlocked.length > 0 ? (
          <section className="profileUnlockBanner">
            <div>
              <span>Nouveau badge</span>
              <strong>
                {profile.newlyUnlocked.map((badge) => badge.title).join(", ")}
              </strong>
            </div>
            <p>
              Recompense ajoutee automatiquement :
              {" "}
              {profile.newlyUnlocked.map(rewardLabel).join(" + ")}.
            </p>
          </section>
        ) : null}

        {error ? <div className="alert alert-error">{error}</div> : null}
        {feedback ? <div className="alert alert-success">{feedback}</div> : null}

        <section className="profileGrid">
          <article className="profilePanel">
            <div className="profilePanel__head">
              <div>
                <span>Avatar</span>
                <h2>Choisis ton image</h2>
              </div>
            </div>

            <div className="profileAvatarChoices">
              {profile.defaultAvatars.map((avatar) => {
                const selected = profile.profile.avatarSource === avatar.id;

                return (
                  <button
                    type="button"
                    className={`profileAvatarChoice ${selected ? "is-selected" : ""}`}
                    key={avatar.id}
                    disabled={saving}
                    onClick={() => void chooseDefaultAvatar(avatar.id)}
                  >
                    <SmartImage
                      src={toProfileAssetUrl(avatar.url, avatar.id)}
                      alt={avatar.label}
                      loading="lazy"
                    />
                    <span>{avatar.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="profileCosmeticGrid">
              <div className="profileCosmeticGroup">
                <div className="profileCosmeticGroup__title">Cadre</div>
                <div className="profileSwatchGrid">
                  {profile.avatarFrames.map((frame) => {
                    const selected = profile.profile.avatarFrameId === frame.id;

                    return (
                      <button
                        type="button"
                        className={`profileSwatch ${selected ? "is-selected" : ""}`}
                        key={frame.id}
                        title={frame.label}
                        disabled={saving}
                        style={{ "--profile-swatch": frame.cssValue } as CSSProperties}
                        onClick={() => void updateAvatarCosmetic({ avatarFrameId: frame.id })}
                      >
                        <span aria-hidden="true" />
                        <small>{frame.label}</small>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="profileCosmeticGroup">
                <div className="profileCosmeticGroup__title">Fond</div>
                <div className="profileSwatchGrid">
                  {profile.avatarBackgrounds.map((background) => {
                    const selected = profile.profile.avatarBackgroundId === background.id;

                    return (
                      <button
                        type="button"
                        className={`profileSwatch ${selected ? "is-selected" : ""}`}
                        key={background.id}
                        title={background.label}
                        disabled={saving}
                        style={{ "--profile-swatch": background.cssValue } as CSSProperties}
                        onClick={() => void updateAvatarCosmetic({ avatarBackgroundId: background.id })}
                      >
                        <span aria-hidden="true" />
                        <small>{background.label}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <label className="profileUpload">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={saving}
                onChange={uploadAvatar}
              />
              <span>Importer ma photo de profil</span>
              <small>PNG, JPG ou WEBP, 2 Mo max.</small>
            </label>
          </article>

          <article className="profilePanel profilePanel--summary">
            <div className="profilePanel__head">
              <div>
                <span>Progression</span>
                <h2>Objectifs actifs</h2>
              </div>
            </div>

            <div className="profileSummaryList">
              <div>
                <span>Cartes uniques</span>
                <strong>{profile.summary.uniqueCards}/{profile.summary.totalCards}</strong>
              </div>
              <div>
                <span>Displays ouverts</span>
                <strong>{profile.summary.displaysOpened}</strong>
              </div>
              <div>
                <span>Badges restants</span>
                <strong>{lockedBadges.length}</strong>
              </div>
            </div>
          </article>
        </section>

        <section className="profileBadgesSection">
          <div className="profileBadgesSection__head">
            <div>
              <span>Succes</span>
              <h2>Badges debloques</h2>
            </div>
            <strong>{unlockedBadges.length} obtenus</strong>
          </div>

          <div className="profileBadgeGrid">
            {unlockedBadges.length ? unlockedBadges.map(renderBadge) : (
              <div className="profileEmptyState">
                Aucun badge debloque pour le moment. Ouvre un booster et la machine se lance.
              </div>
            )}
          </div>
        </section>

        <section className="profileBadgesSection">
          <div className="profileBadgesSection__head">
            <div>
              <span>A venir</span>
              <h2>Objectifs a viser</h2>
            </div>
            <strong>{lockedBadges.length} restants</strong>
          </div>

          <div className="profileBadgeGrid">
            {lockedBadges.map(renderBadge)}
          </div>
        </section>
      </main>
    </div>
  );
}
