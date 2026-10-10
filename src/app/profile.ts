export type SocialKey = "discord" | "youtube" | "roblox" | "github" | "twitch" | "instagram";
export type ProfileFont = "Inter" | "DM Sans" | "Manrope" | "Poppins" | "Montserrat" | "Space Grotesk" | "Outfit" | "Plus Jakarta Sans" | "Rubik" | "Raleway" | "Playfair Display" | "Bebas Neue" | "Oswald" | "JetBrains Mono" | "Fira Code" | "Arial" | "system" | "monospace" | "Georgia" | "Courier New" | "Trebuchet MS" | "Impact" | "Times New Roman" | "Verdana";
export type TextAnimation = "none" | "fade-up" | "blur-in" | "typewriter" | "glitch" | "slide" | "float" | "pop";
export type CustomLink = {
  id: string;
  url: string;
  icon: string;
};

export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  audio: string;
  cover: string;
  source?: "background-video";
};

export type ProfileSettings = {
  username: string;
  displayName: string;
  description: string;
  location: string;
  avatar: string;
  banner: string;
  backgroundImage: string;
  backgroundVideo: string;
  backgroundVideoMusicDisabled: boolean;
  backgroundColour: string;
  accentColour: string;
  textColour: string;
  textOpacity: number;
  profileOpacity: number;
  profileBlur: number;
  borderRadius: number;
  borderOpacity: number;
  shadowOpacity: number;
  shadowBlur: number;
  cardWidth: number;
  contentSpacing: number;
  bannerHeight: number;
  avatarSize: number;
  avatarRadius: number;
  avatarBorderWidth: number;
  avatarBorderColour: string;
  avatarDecoration: "none" | "halo" | "orbit" | "flame";
  discordAvatarUrl: string;
  discordAvatarDecorationUrl: string;
  useDiscordAvatar: boolean;
  useDiscordDecoration: boolean;
  backgroundBlur: number;
  backgroundOverlay: number;
  backgroundScale: number;
  backgroundPositionX: number;
  backgroundPositionY: number;
  vignette: number;
  glow: boolean;
  glowIntensity: number;
  animated: boolean;
  particles: boolean;
  grain: boolean;
  scanlines: boolean;
  floating: boolean;
  parallax: boolean;
  parallaxStrength: number;
  parallaxPreferenceVersion: number;
  textGlow: boolean;
  nameGlow: boolean;
  descriptionGlow: boolean;
  locationGlow: boolean;
  socialsGlow: boolean;
  monochrome: boolean;
  showLocation: boolean;
  showDiscord: boolean;
  showVerified: boolean;
  showViews: boolean;
  showFooter: boolean;
  socialPills: boolean;
  layout: "Default" | "Modern" | "Minimal" | "Sleek" | "Text Only";
  alignment: "center" | "left";
  socialsPerRow: 2 | 3 | 4;
  views: number;
  socials: Record<SocialKey, string>;
  socialColours: Record<SocialKey, string>;
  socialIconColour: string;
  socialIconSize: number;
  customLinks: CustomLink[];
  activeLinkOrder: string[];
  activeBadgeIds: string[];
  activeBadgeOrder: string[];
  badgePosition: "username" | "bottom";
  badgeColour: string;
  badgeGlow: boolean;
  musicTracks: MusicTrack[];
  activeMusicId: string;
  musicAutoplay: boolean;
  showMusicPlayer: boolean;
  musicLoop: boolean;
  musicPlayerPosition: "top" | "bottom";
  customFont: ProfileFont;
  nameFont: ProfileFont;
  usernameFont: ProfileFont;
  descriptionFont: ProfileFont;
  locationFont: ProfileFont;
  socialsFont: ProfileFont;
  nameBold: boolean;
  usernameBold: boolean;
  descriptionBold: boolean;
  locationBold: boolean;
  socialsBold: boolean;
  nameItalic: boolean;
  usernameItalic: boolean;
  descriptionItalic: boolean;
  locationItalic: boolean;
  socialsItalic: boolean;
  nameAnimation: TextAnimation;
  usernameAnimation: TextAnimation;
  descriptionAnimation: TextAnimation;
  locationAnimation: TextAnimation;
  socialsAnimation: TextAnimation;
  customCursor: string;
  enterScreenEnabled: boolean;
  enterScreenMessage: string;
  enterScreenBackgroundColour: string;
  enterScreenBackgroundImage: string;
  enterScreenBackgroundVideo: string;
  enterScreenTextColour: string;
  enterScreenFont: ProfileFont;
  enterScreenBackgroundOpacity: number;
  enterScreenCardTitle: string;
  enterScreenCardText: string;
  enterScreenCardColour: string;
  enterScreenCardFont: ProfileFont;
  enterScreenCardBackgroundColour: string;
  enterScreenCardBorderColour: string;
  enterScreenCardOpacity: number;
  enterScreenCardBorderOpacity: number;
  enterScreenCardRadius: number;
  enterScreenCardWidth: number;
  enterScreenCardPositionX: number;
  enterScreenCardPositionY: number;
  enterScreenCardPadding: number;
  enterScreenCardBlur: number;
  enterScreenCardTitleSize: number;
  enterScreenCardTextSize: number;
  enterScreenCardTitleBold: boolean;
  enterScreenCardTextItalic: boolean;
  enterScreenCardTitleAnimation: TextAnimation;
  enterScreenCardTextAnimation: TextAnimation;
};

export const defaultSettings: ProfileSettings = {
  username: "",
  displayName: "",
  description: "Welcome to my profile. This is my little corner of the internet.",
  location: "London, United Kingdom",
  avatar: "",
  banner: "",
  backgroundImage: "",
  backgroundVideo: "",
  backgroundVideoMusicDisabled: false,
  backgroundColour: "#050505",
  accentColour: "#ff4d5f",
  textColour: "#ffffff",
  textOpacity: 92,
  profileOpacity: 0,
  profileBlur: 0,
  borderRadius: 28,
  borderOpacity: 0,
  shadowOpacity: 0,
  shadowBlur: 0,
  cardWidth: 680,
  contentSpacing: 18,
  bannerHeight: 150,
  avatarSize: 112,
  avatarRadius: 50,
  avatarBorderWidth: 4,
  avatarBorderColour: "#0b0b0d",
  avatarDecoration: "none",
  discordAvatarUrl: "",
  discordAvatarDecorationUrl: "",
  useDiscordAvatar: false,
  useDiscordDecoration: false,
  backgroundBlur: 0,
  backgroundOverlay: 45,
  backgroundScale: 100,
  backgroundPositionX: 50,
  backgroundPositionY: 50,
  vignette: 35,
  glow: true,
  glowIntensity: 18,
  animated: true,
  particles: false,
  grain: false,
  scanlines: false,
  floating: true,
  parallax: false,
  parallaxStrength: 28,
  parallaxPreferenceVersion: 1,
  textGlow: false,
  nameGlow: false,
  descriptionGlow: false,
  locationGlow: false,
  socialsGlow: false,
  monochrome: false,
  showLocation: true,
  showDiscord: true,
  showVerified: true,
  showViews: true,
  showFooter: true,
  socialPills: true,
  layout: "Default",
  alignment: "center",
  socialsPerRow: 3,
  views: 0,
  socials: { discord: "", youtube: "", roblox: "", github: "", twitch: "", instagram: "" },
  socialColours: { discord: "#FFFFFF", youtube: "#FFFFFF", roblox: "#FFFFFF", github: "#FFFFFF", twitch: "#FFFFFF", instagram: "#FFFFFF" },
  socialIconColour: "#FFFFFF",
  socialIconSize: 28,
  customLinks: [],
  activeLinkOrder: [],
  activeBadgeIds: [],
  activeBadgeOrder: [],
  badgePosition: "username",
  badgeColour: "#ffffff",
  badgeGlow: true,
  musicTracks: [],
  activeMusicId: "",
  musicAutoplay: true,
  showMusicPlayer: false,
  musicLoop: true,
  musicPlayerPosition: "bottom",
  customFont: "Inter",
  nameFont: "Inter",
  usernameFont: "Inter",
  descriptionFont: "Inter",
  locationFont: "Inter",
  socialsFont: "Inter",
  nameBold: true,
  usernameBold: false,
  descriptionBold: false,
  locationBold: false,
  socialsBold: false,
  nameItalic: false,
  usernameItalic: false,
  descriptionItalic: false,
  locationItalic: false,
  socialsItalic: false,
  nameAnimation: "fade-up",
  usernameAnimation: "fade-up",
  descriptionAnimation: "fade-up",
  locationAnimation: "fade-up",
  socialsAnimation: "fade-up",
  customCursor: "",
  enterScreenEnabled: true,
  enterScreenMessage: "Click to enter",
  enterScreenBackgroundColour: "#050505",
  enterScreenBackgroundImage: "",
  enterScreenBackgroundVideo: "",
  enterScreenTextColour: "#ffffff",
  enterScreenFont: "Inter",
  enterScreenBackgroundOpacity: 100,
  enterScreenCardTitle: "WELCOME TO MY PROFILE",
  enterScreenCardText: "Take a look around",
  enterScreenCardColour: "#ffffff",
  enterScreenCardFont: "Inter",
  enterScreenCardBackgroundColour: "#ffffff",
  enterScreenCardBorderColour: "#ffffff",
  enterScreenCardOpacity: 12,
  enterScreenCardBorderOpacity: 22,
  enterScreenCardRadius: 16,
  enterScreenCardWidth: 360,
  enterScreenCardPositionX: 50,
  enterScreenCardPositionY: 50,
  enterScreenCardPadding: 18,
  enterScreenCardBlur: 18,
  enterScreenCardTitleSize: 10,
  enterScreenCardTextSize: 13,
  enterScreenCardTitleBold: true,
  enterScreenCardTextItalic: false,
  enterScreenCardTitleAnimation: "none",
  enterScreenCardTextAnimation: "none",
};

export const LEGACY_PROFILE_SETTINGS_KEY = "profileSettings";
export const ACCOUNT_PROFILE_SETTINGS_PREFIX = "profileSettings:account:";

export type ProfileIdentity = { username?: string; displayName?: string };

export function accountSettingsStorageKey(userId: string) {
  return `${ACCOUNT_PROFILE_SETTINGS_PREFIX}${userId}`;
}

const PROFILE_FONTS: readonly ProfileFont[] = ["Inter", "DM Sans", "Manrope", "Poppins", "Montserrat", "Space Grotesk", "Outfit", "Plus Jakarta Sans", "Rubik", "Raleway", "Playfair Display", "Bebas Neue", "Oswald", "JetBrains Mono", "Fira Code", "Arial", "system", "monospace", "Georgia", "Courier New", "Trebuchet MS", "Impact", "Times New Roman", "Verdana"];
const TEXT_ANIMATIONS: readonly TextAnimation[] = ["none", "fade-up", "blur-in", "typewriter", "glitch", "slide", "float", "pop"];

function normaliseSettings(parsedValue: unknown, identity: ProfileIdentity = {}): ProfileSettings {
  const parsed = parsedValue && typeof parsedValue === "object" ? parsedValue as Record<string, any> : {};
  const normalizedUsername = (identity.username ?? (typeof parsed.username === "string" ? parsed.username : defaultSettings.username)).trim().toLowerCase();
  const normalizedDisplayName = (identity.displayName ?? (typeof parsed.displayName === "string" ? parsed.displayName : defaultSettings.displayName)).trim();
  const backgroundVideoMusicDisabled = typeof parsed.backgroundVideoMusicDisabled === "boolean" ? parsed.backgroundVideoMusicDisabled : false;
  let musicTracks: MusicTrack[] = Array.isArray(parsed.musicTracks) ? parsed.musicTracks.filter(track => track && typeof track === "object") : [];
  const backgroundVideo = typeof parsed.backgroundVideo === "string" ? parsed.backgroundVideo : "";
  const importedIndex = musicTracks.findIndex(track => track.source === "background-video" || (track.title === "Imported Music" && track.artist === "Background video"));
  if (backgroundVideo && !backgroundVideoMusicDisabled) {
    if (importedIndex >= 0) {
      musicTracks = musicTracks.map((track, index) => index === importedIndex ? { ...track, title: "Imported Music", artist: "Background video", audio: backgroundVideo, source: "background-video" } : track);
    } else {
      musicTracks = [...musicTracks, { id: "imported-background-video", title: "Imported Music", artist: "Background video", audio: backgroundVideo, cover: "", source: "background-video" }];
    }
  }
  const activeMusicId = typeof parsed.activeMusicId === "string" ? parsed.activeMusicId : "";
  const resolvedActiveMusicId = musicTracks.some(track => track.id === activeMusicId) ? activeMusicId : musicTracks[0]?.id || "";
  return {
    ...defaultSettings,
    ...parsed,
    backgroundVideoMusicDisabled,
    backgroundVideo,
    musicTracks,
    activeMusicId: resolvedActiveMusicId,
    username: normalizedUsername || defaultSettings.username,
    displayName: normalizedDisplayName || normalizedUsername || defaultSettings.displayName,
    // Older saved settings inherited the old enabled-by-default value. Treat those as
    // the old default, reset them to off once, and preserve any new explicit choice.
    parallax: parsed.parallaxPreferenceVersion === 1 && typeof parsed.parallax === "boolean" ? parsed.parallax : false,
    parallaxPreferenceVersion: 1,
    socials: { ...defaultSettings.socials, ...(parsed.socials || {}) },
    socialColours: { ...defaultSettings.socialColours, ...(parsed.socialColours || {}) },
    socialIconColour: typeof parsed.socialIconColour === "string" ? parsed.socialIconColour : defaultSettings.socialIconColour,
    socialIconSize: typeof parsed.socialIconSize === "number" && Number.isFinite(parsed.socialIconSize) ? Math.min(48, Math.max(16, Math.round(parsed.socialIconSize))) : defaultSettings.socialIconSize,
    customLinks: Array.isArray(parsed.customLinks) ? parsed.customLinks.filter((item: any) => item && typeof item.id === "string" && typeof item.url === "string" && typeof item.icon === "string") : [],
    activeLinkOrder: Array.isArray(parsed.activeLinkOrder) ? parsed.activeLinkOrder.filter((item: any) => typeof item === "string") : [],
    activeBadgeIds: Array.isArray(parsed.activeBadgeIds) ? parsed.activeBadgeIds.filter((item: any) => typeof item === "string") : [],
    activeBadgeOrder: Array.isArray(parsed.activeBadgeOrder) ? parsed.activeBadgeOrder.filter((item: any) => typeof item === "string") : [],
    badgePosition: parsed.badgePosition === "bottom" ? "bottom" : "username",
    badgeColour: typeof parsed.badgeColour === "string" && /^#[0-9a-f]{6}$/i.test(parsed.badgeColour) ? parsed.badgeColour : defaultSettings.badgeColour,
    badgeGlow: typeof parsed.badgeGlow === "boolean" ? parsed.badgeGlow : defaultSettings.badgeGlow,
    avatarDecoration: ["none", "halo", "orbit", "flame"].includes(parsed.avatarDecoration) ? parsed.avatarDecoration : defaultSettings.avatarDecoration,
    discordAvatarUrl: typeof parsed.discordAvatarUrl === "string" ? parsed.discordAvatarUrl : "",
    discordAvatarDecorationUrl: typeof parsed.discordAvatarDecorationUrl === "string" ? parsed.discordAvatarDecorationUrl : "",
    useDiscordAvatar: typeof parsed.useDiscordAvatar === "boolean" ? parsed.useDiscordAvatar : false,
    useDiscordDecoration: typeof parsed.useDiscordDecoration === "boolean" ? parsed.useDiscordDecoration : false,
    customFont: PROFILE_FONTS.includes(parsed.customFont) ? parsed.customFont : defaultSettings.customFont,
    nameFont: PROFILE_FONTS.includes(parsed.nameFont) ? parsed.nameFont : defaultSettings.nameFont,
    usernameFont: PROFILE_FONTS.includes(parsed.usernameFont) ? parsed.usernameFont : defaultSettings.usernameFont,
    descriptionFont: PROFILE_FONTS.includes(parsed.descriptionFont) ? parsed.descriptionFont : defaultSettings.descriptionFont,
    locationFont: PROFILE_FONTS.includes(parsed.locationFont) ? parsed.locationFont : defaultSettings.locationFont,
    socialsFont: PROFILE_FONTS.includes(parsed.socialsFont) ? parsed.socialsFont : defaultSettings.socialsFont,
    nameBold: typeof parsed.nameBold === "boolean" ? parsed.nameBold : defaultSettings.nameBold,
    usernameBold: typeof parsed.usernameBold === "boolean" ? parsed.usernameBold : defaultSettings.usernameBold,
    descriptionBold: typeof parsed.descriptionBold === "boolean" ? parsed.descriptionBold : defaultSettings.descriptionBold,
    locationBold: typeof parsed.locationBold === "boolean" ? parsed.locationBold : defaultSettings.locationBold,
    socialsBold: typeof parsed.socialsBold === "boolean" ? parsed.socialsBold : defaultSettings.socialsBold,
    nameItalic: typeof parsed.nameItalic === "boolean" ? parsed.nameItalic : defaultSettings.nameItalic,
    usernameItalic: typeof parsed.usernameItalic === "boolean" ? parsed.usernameItalic : defaultSettings.usernameItalic,
    descriptionItalic: typeof parsed.descriptionItalic === "boolean" ? parsed.descriptionItalic : defaultSettings.descriptionItalic,
    locationItalic: typeof parsed.locationItalic === "boolean" ? parsed.locationItalic : defaultSettings.locationItalic,
    socialsItalic: typeof parsed.socialsItalic === "boolean" ? parsed.socialsItalic : defaultSettings.socialsItalic,
    nameAnimation: TEXT_ANIMATIONS.includes(parsed.nameAnimation) ? parsed.nameAnimation : defaultSettings.nameAnimation,
    usernameAnimation: TEXT_ANIMATIONS.includes(parsed.usernameAnimation) ? parsed.usernameAnimation : defaultSettings.usernameAnimation,
    descriptionAnimation: TEXT_ANIMATIONS.includes(parsed.descriptionAnimation) ? parsed.descriptionAnimation : defaultSettings.descriptionAnimation,
    locationAnimation: TEXT_ANIMATIONS.includes(parsed.locationAnimation) ? parsed.locationAnimation : defaultSettings.locationAnimation,
    socialsAnimation: TEXT_ANIMATIONS.includes(parsed.socialsAnimation) ? parsed.socialsAnimation : defaultSettings.socialsAnimation,
    nameGlow: typeof parsed.nameGlow === "boolean" ? parsed.nameGlow : Boolean(parsed.textGlow),
    descriptionGlow: typeof parsed.descriptionGlow === "boolean" ? parsed.descriptionGlow : false,
    locationGlow: typeof parsed.locationGlow === "boolean" ? parsed.locationGlow : false,
    socialsGlow: typeof parsed.socialsGlow === "boolean" ? parsed.socialsGlow : false,
     musicAutoplay: typeof parsed.musicAutoplay === "boolean" ? parsed.musicAutoplay : defaultSettings.musicAutoplay,
    showMusicPlayer: typeof parsed.showMusicPlayer === "boolean" ? parsed.showMusicPlayer : defaultSettings.showMusicPlayer,
  };
}

export function normaliseProfileSettings(value: unknown, identity: ProfileIdentity = {}): ProfileSettings {
  return normaliseSettings(value, identity);
}

function parseStoredSettings(key: string): ProfileSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return normaliseSettings(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function loadSettings(storageKey = LEGACY_PROFILE_SETTINGS_KEY, identity: ProfileIdentity = {}): ProfileSettings {
  if (typeof window === "undefined") return normaliseSettings(defaultSettings, identity);
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return normaliseSettings(defaultSettings, identity);
    return normaliseSettings(JSON.parse(raw), identity);
  } catch {
    return normaliseSettings(defaultSettings, identity);
  }
}

export function saveSettingsToStorage(settings: ProfileSettings, storageKey = LEGACY_PROFILE_SETTINGS_KEY) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(storageKey, JSON.stringify(settings)); } catch { /* private browsing/storage quota */ }
}

export function loadSettingsForAccount(userId: string, identity: ProfileIdentity): ProfileSettings {
  const key = accountSettingsStorageKey(userId);
  const namespaced = parseStoredSettings(key);
  if (namespaced) return normaliseSettings(namespaced, identity);

  // Migrate the legacy single-profile settings only when they belong to this account.
  const legacy = parseStoredSettings(LEGACY_PROFILE_SETTINGS_KEY);
  if (legacy && identity.username && legacy.username.toLowerCase() === identity.username.toLowerCase()) {
    const migrated = normaliseSettings(legacy, identity);
    saveSettingsToStorage(migrated, key);
    return migrated;
  }

  // Never copy one signed-in user's appearance into a different account.
  return normaliseSettings({
    ...defaultSettings,
    ...identity,
    discordAvatarUrl: "",
    discordAvatarDecorationUrl: "",
    useDiscordAvatar: false,
    useDiscordDecoration: false,
  }, identity);
}

export function loadSettingsForUsername(username: string): { settings: ProfileSettings; storageKey: string } {
  const wanted = username.trim().toLowerCase();
  if (typeof window === "undefined" || !wanted) return { settings: normaliseSettings(defaultSettings, { username, displayName: username }), storageKey: LEGACY_PROFILE_SETTINGS_KEY };

  const candidates: string[] = [];
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && key.startsWith(ACCOUNT_PROFILE_SETTINGS_PREFIX)) candidates.push(key);
    }
  } catch {}
  candidates.push(LEGACY_PROFILE_SETTINGS_KEY);

  for (const key of candidates) {
    const parsed = parseStoredSettings(key);
    if (parsed?.username?.trim().toLowerCase() === wanted) {
      return { settings: normaliseSettings(parsed), storageKey: key };
    }
  }
  return { settings: normaliseSettings(defaultSettings, { username: wanted, displayName: wanted }), storageKey: LEGACY_PROFILE_SETTINGS_KEY };
}
