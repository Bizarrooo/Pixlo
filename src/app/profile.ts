export type SocialKey = "discord" | "youtube" | "roblox" | "github" | "twitch" | "instagram" | "spotify";
export type ProfileFont = "Inter" | "DM Sans" | "Manrope" | "Poppins" | "Montserrat" | "Space Grotesk" | "Outfit" | "Plus Jakarta Sans" | "Rubik" | "Raleway" | "Playfair Display" | "Bebas Neue" | "Oswald" | "JetBrains Mono" | "Fira Code" | "Arial" | "system" | "monospace" | "Georgia" | "Courier New" | "Trebuchet MS" | "Impact" | "Times New Roman" | "Verdana" | "Lexend" | "Urbanist" | "Sora" | "Lato" | "Roboto" | "Roboto Condensed" | "Nunito" | "Nunito Sans" | "Mulish" | "Work Sans" | "Archivo" | "Exo 2" | "Merriweather" | "Lora" | "Source Sans 3" | "Source Code Pro" | "IBM Plex Sans" | "IBM Plex Mono" | "Comfortaa" | "Figtree" | "Karla" | "Asap" | "Libre Franklin" | "Oxygen" | "Barlow" | "Barlow Condensed" | "Josefin Sans" | "Cabin" | "Jost" | "Spectral" | "Cinzel";
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
  shareCoverImage: string;
  shareCoverNameSize: number;
  shareCoverNameColour: string;
  shareCoverCreditColour: string;
  shareCoverNameGlow: boolean;
  shareCoverNameGlowIntensity: number;
  shareCoverNameGradientEnabled: boolean;
  shareCoverNameGradientColours: [string, string, string];
  shareCoverCreditGradientEnabled: boolean;
  shareCoverCreditGradientColours: [string, string, string];
  backgroundImage: string;
  backgroundVideo: string;
  backgroundVideoMusicDisabled: boolean;
  backgroundColour: string;
  accentColour: string;
  textColour: string;
  gradientTextEnabled: boolean;
  gradientTextColours: [string, string, string];
  gradientSocialsEnabled: boolean;
  gradientSocialsColours: [string, string, string];
  gradientBadgesEnabled: boolean;
  gradientBadgesColours: [string, string, string];
  dashboardCustomisationEnabled: boolean;
  dashboardBackgroundGradientEnabled: boolean;
  dashboardBackgroundGradientColours: [string, string, string];
  dashboardTextGradientEnabled: boolean;
  dashboardTextGradientColours: [string, string, string];
  dashboardTextSolidColour: string;
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
  showVerifiedBadgeNextToUsername: boolean;
  verifiedBadgeColour: string;
  showViews: boolean;
  showFooter: boolean;
  socialPills: boolean;
  layout: "Default" | "Modern" | "Minimal" | "Sleek" | "Text Only";
  extrasLayout: "pages" | "vertical" | "horizontal";
  timezoneEnabled: boolean;
  timezone: string;
  timezonePage: number;
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
  badgePosition: "left" | "right" | "bottom";
  badgeStyle: "default" | "icon";
  badgeColour: string;
  badgeGlow: boolean;
  badgeGlowIntensity: number;
  badgeScale: number;
  badgeUnderline: boolean;
  badgeUnderlineGlow: boolean;
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
  cursorTrailEnabled: boolean;
  cursorTrailColour: string;
  cursorTrailGlow: number;
  cursorTrailSize: number;
  cursorTrailDensity: number;
  cursorTrailSpeed: number;
  cursorTrailLifetime: number;
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
  shareCoverImage: "",
  shareCoverNameSize: 66,
  shareCoverNameColour: "#ffffff",
  shareCoverCreditColour: "#e3dcd8",
  shareCoverNameGlow: false,
  shareCoverNameGlowIntensity: 65,
  shareCoverNameGradientEnabled: false,
  shareCoverNameGradientColours: ["#ff8a00", "#ff3e5f", "#b14dff"],
  shareCoverCreditGradientEnabled: false,
  shareCoverCreditGradientColours: ["#ffffff", "#ffd2b4", "#ffffff"],
  backgroundImage: "",
  backgroundVideo: "",
  backgroundVideoMusicDisabled: false,
  backgroundColour: "#050505",
  accentColour: "#ff4d5f",
  textColour: "#ffffff",
  gradientTextEnabled: false,
  gradientTextColours: ["#ff4d5f", "#a855f7", "#3b82f6"],
  gradientSocialsEnabled: false,
  gradientSocialsColours: ["#ff4d5f", "#a855f7", "#3b82f6"],
  gradientBadgesEnabled: false,
  gradientBadgesColours: ["#ff4d5f", "#a855f7", "#3b82f6"],
  dashboardCustomisationEnabled: false,
  dashboardBackgroundGradientEnabled: true,
  dashboardBackgroundGradientColours: ["#251016", "#171016", "#24130d"],
  dashboardTextGradientEnabled: false,
  dashboardTextGradientColours: ["#ff684f", "#ffad65", "#f04a43"],
  dashboardTextSolidColour: "#f5f0ed",
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
  showVerifiedBadgeNextToUsername: false,
  verifiedBadgeColour: "#3b82f6",
  showViews: true,
  showFooter: true,
  socialPills: true,
  layout: "Default",
  extrasLayout: "pages",
  timezoneEnabled: true,
  timezone: "Europe/London",
  timezonePage: 2,
  alignment: "center",
  socialsPerRow: 3,
  views: 0,
  socials: { discord: "", youtube: "", roblox: "", github: "", twitch: "", instagram: "", spotify: "" },
  socialColours: { discord: "#FFFFFF", youtube: "#FFFFFF", roblox: "#FFFFFF", github: "#FFFFFF", twitch: "#FFFFFF", instagram: "#FFFFFF", spotify: "#FFFFFF" },
  socialIconColour: "#FFFFFF",
  socialIconSize: 28,
  customLinks: [],
  activeLinkOrder: [],
  activeBadgeIds: [],
  activeBadgeOrder: [],
  badgePosition: "left",
  badgeStyle: "default",
  badgeColour: "#ffffff",
  badgeGlow: true,
  badgeGlowIntensity: 65,
  badgeScale: 100,
  badgeUnderline: true,
  badgeUnderlineGlow: false,
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
  cursorTrailEnabled: false,
  cursorTrailColour: "#ff9b52",
  cursorTrailGlow: 72,
  cursorTrailSize: 100,
  cursorTrailDensity: 62,
  cursorTrailSpeed: 100,
  cursorTrailLifetime: 1400,
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

const PROFILE_FONTS: readonly ProfileFont[] = ["Inter", "DM Sans", "Manrope", "Poppins", "Montserrat", "Space Grotesk", "Outfit", "Plus Jakarta Sans", "Rubik", "Raleway", "Playfair Display", "Bebas Neue", "Oswald", "JetBrains Mono", "Fira Code", "Arial", "system", "monospace", "Georgia", "Courier New", "Trebuchet MS", "Impact", "Times New Roman", "Verdana", "Lexend", "Urbanist", "Sora", "Lato", "Roboto", "Roboto Condensed", "Nunito", "Nunito Sans", "Mulish", "Work Sans", "Archivo", "Exo 2", "Merriweather", "Lora", "Source Sans 3", "Source Code Pro", "IBM Plex Sans", "IBM Plex Mono", "Comfortaa", "Figtree", "Karla", "Asap", "Libre Franklin", "Oxygen", "Barlow", "Barlow Condensed", "Josefin Sans", "Cabin", "Jost", "Spectral", "Cinzel"];
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
    extrasLayout: parsed.extrasLayout === "vertical" || parsed.extrasLayout === "horizontal" ? parsed.extrasLayout : "pages",
    timezoneEnabled: typeof parsed.timezoneEnabled === "boolean" ? parsed.timezoneEnabled : defaultSettings.timezoneEnabled,
    timezone: (() => {
      const candidate = typeof parsed.timezone === "string" && parsed.timezone.length <= 80 ? parsed.timezone : defaultSettings.timezone;
      try { new Intl.DateTimeFormat("en-US", { timeZone: candidate }); return candidate; }
      catch { return defaultSettings.timezone; }
    })(),
    timezonePage: Math.max(2, Math.min(12, Number.isFinite(Number(parsed.timezonePage)) ? Math.round(Number(parsed.timezonePage)) : 2)),
    dashboardBackgroundGradientColours: Array.isArray(parsed.dashboardBackgroundGradientColours) && parsed.dashboardBackgroundGradientColours.length === 3 ? parsed.dashboardBackgroundGradientColours.map((c: unknown, i: number) => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c) ? c : defaultSettings.dashboardBackgroundGradientColours[i]) as [string,string,string] : defaultSettings.dashboardBackgroundGradientColours,
    dashboardTextGradientColours: Array.isArray(parsed.dashboardTextGradientColours) && parsed.dashboardTextGradientColours.length === 3 ? parsed.dashboardTextGradientColours.map((c: unknown, i: number) => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c) ? c : defaultSettings.dashboardTextGradientColours[i]) as [string,string,string] : defaultSettings.dashboardTextGradientColours,
    dashboardCustomisationEnabled: typeof parsed.dashboardCustomisationEnabled === "boolean" ? parsed.dashboardCustomisationEnabled : defaultSettings.dashboardCustomisationEnabled,
    dashboardBackgroundGradientEnabled: typeof parsed.dashboardBackgroundGradientEnabled === "boolean" ? parsed.dashboardBackgroundGradientEnabled : defaultSettings.dashboardBackgroundGradientEnabled,
    dashboardTextGradientEnabled: typeof parsed.dashboardTextGradientEnabled === "boolean" ? parsed.dashboardTextGradientEnabled : defaultSettings.dashboardTextGradientEnabled,
    dashboardTextSolidColour: typeof parsed.dashboardTextSolidColour === "string" && /^#[0-9a-f]{6}$/i.test(parsed.dashboardTextSolidColour) ? parsed.dashboardTextSolidColour : defaultSettings.dashboardTextSolidColour,
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
    socialIconSize: typeof parsed.socialIconSize === "number" && Number.isFinite(parsed.socialIconSize) ? Math.min(96, Math.max(16, Math.round(parsed.socialIconSize))) : defaultSettings.socialIconSize,
    shareCoverImage: typeof parsed.shareCoverImage === "string" ? parsed.shareCoverImage : defaultSettings.shareCoverImage,
    shareCoverNameSize: typeof parsed.shareCoverNameSize === "number" && Number.isFinite(parsed.shareCoverNameSize) ? Math.min(110, Math.max(28, Math.round(parsed.shareCoverNameSize))) : defaultSettings.shareCoverNameSize,
    shareCoverNameColour: typeof parsed.shareCoverNameColour === "string" && /^#[0-9a-f]{6}$/i.test(parsed.shareCoverNameColour) ? parsed.shareCoverNameColour : defaultSettings.shareCoverNameColour,
    shareCoverCreditColour: typeof parsed.shareCoverCreditColour === "string" && /^#[0-9a-f]{6}$/i.test(parsed.shareCoverCreditColour) ? parsed.shareCoverCreditColour : defaultSettings.shareCoverCreditColour,
    shareCoverNameGlow: typeof parsed.shareCoverNameGlow === "boolean" ? parsed.shareCoverNameGlow : defaultSettings.shareCoverNameGlow,
    shareCoverNameGlowIntensity: typeof parsed.shareCoverNameGlowIntensity === "number" && Number.isFinite(parsed.shareCoverNameGlowIntensity) ? Math.min(200, Math.max(0, parsed.shareCoverNameGlowIntensity)) : defaultSettings.shareCoverNameGlowIntensity,
    shareCoverNameGradientEnabled: typeof parsed.shareCoverNameGradientEnabled === "boolean" ? parsed.shareCoverNameGradientEnabled : defaultSettings.shareCoverNameGradientEnabled,
    shareCoverNameGradientColours: Array.isArray(parsed.shareCoverNameGradientColours) && parsed.shareCoverNameGradientColours.length === 3 ? parsed.shareCoverNameGradientColours.map((colour: unknown, i: number) => typeof colour === "string" && /^#[0-9a-f]{6}$/i.test(colour) ? colour : defaultSettings.shareCoverNameGradientColours[i]) as [string, string, string] : defaultSettings.shareCoverNameGradientColours,
    shareCoverCreditGradientEnabled: typeof parsed.shareCoverCreditGradientEnabled === "boolean" ? parsed.shareCoverCreditGradientEnabled : defaultSettings.shareCoverCreditGradientEnabled,
    shareCoverCreditGradientColours: Array.isArray(parsed.shareCoverCreditGradientColours) && parsed.shareCoverCreditGradientColours.length === 3 ? parsed.shareCoverCreditGradientColours.map((colour: unknown, i: number) => typeof colour === "string" && /^#[0-9a-f]{6}$/i.test(colour) ? colour : defaultSettings.shareCoverCreditGradientColours[i]) as [string, string, string] : defaultSettings.shareCoverCreditGradientColours,
    customLinks: Array.isArray(parsed.customLinks) ? parsed.customLinks.filter((item: any) => item && typeof item.id === "string" && typeof item.url === "string" && typeof item.icon === "string") : [],
    activeLinkOrder: Array.isArray(parsed.activeLinkOrder) ? parsed.activeLinkOrder.filter((item: any) => typeof item === "string") : [],
    showVerifiedBadgeNextToUsername: typeof parsed.showVerifiedBadgeNextToUsername === "boolean" ? parsed.showVerifiedBadgeNextToUsername : defaultSettings.showVerifiedBadgeNextToUsername,
    verifiedBadgeColour: typeof parsed.verifiedBadgeColour === "string" && /^#[0-9a-f]{6}$/i.test(parsed.verifiedBadgeColour) ? parsed.verifiedBadgeColour : defaultSettings.verifiedBadgeColour,
    activeBadgeIds: Array.isArray(parsed.activeBadgeIds) ? parsed.activeBadgeIds.filter((item: any) => typeof item === "string") : [],
    activeBadgeOrder: Array.isArray(parsed.activeBadgeOrder) ? parsed.activeBadgeOrder.filter((item: any) => typeof item === "string") : [],
    badgePosition: ["left", "right", "bottom"].includes(parsed.badgePosition) ? parsed.badgePosition : defaultSettings.badgePosition,
    badgeStyle: parsed.badgeStyle === "icon" ? "icon" : "default",
    badgeColour: typeof parsed.badgeColour === "string" && /^#[0-9a-f]{6}$/i.test(parsed.badgeColour) ? parsed.badgeColour : defaultSettings.badgeColour,
    badgeGlow: typeof parsed.badgeGlow === "boolean" ? parsed.badgeGlow : defaultSettings.badgeGlow,
    badgeGlowIntensity: typeof parsed.badgeGlowIntensity === "number" && Number.isFinite(parsed.badgeGlowIntensity) ? Math.min(200, Math.max(0, parsed.badgeGlowIntensity)) : defaultSettings.badgeGlowIntensity,
    badgeScale: typeof parsed.badgeScale === "number" && Number.isFinite(parsed.badgeScale) ? Math.min(300, Math.max(50, Math.round(parsed.badgeScale))) : defaultSettings.badgeScale,
    badgeUnderline: typeof parsed.badgeUnderline === "boolean" ? parsed.badgeUnderline : defaultSettings.badgeUnderline,
    badgeUnderlineGlow: typeof parsed.badgeUnderlineGlow === "boolean" ? parsed.badgeUnderlineGlow : defaultSettings.badgeUnderlineGlow,
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
    cursorTrailEnabled: typeof parsed.cursorTrailEnabled === "boolean" ? parsed.cursorTrailEnabled : typeof parsed.cursorSparklesEnabled === "boolean" ? parsed.cursorSparklesEnabled : defaultSettings.cursorTrailEnabled,
    cursorTrailColour: typeof parsed.cursorTrailColour === "string" && /^#[0-9a-f]{6}$/i.test(parsed.cursorTrailColour) ? parsed.cursorTrailColour : typeof parsed.cursorSparklesColour === "string" && /^#[0-9a-f]{6}$/i.test(parsed.cursorSparklesColour) ? parsed.cursorSparklesColour : defaultSettings.cursorTrailColour,
    cursorTrailGlow: typeof parsed.cursorTrailGlow === "number" && Number.isFinite(parsed.cursorTrailGlow) ? Math.min(200, Math.max(0, parsed.cursorTrailGlow)) : typeof parsed.cursorSparklesGlow === "number" && Number.isFinite(parsed.cursorSparklesGlow) ? Math.min(200, Math.max(0, parsed.cursorSparklesGlow)) : defaultSettings.cursorTrailGlow,
    cursorTrailSize: typeof parsed.cursorTrailSize === "number" && Number.isFinite(parsed.cursorTrailSize) ? Math.min(350, Math.max(50, Math.round(parsed.cursorTrailSize))) : typeof parsed.cursorSparklesSize === "number" && Number.isFinite(parsed.cursorSparklesSize) ? Math.min(350, Math.max(50, Math.round(parsed.cursorSparklesSize))) : defaultSettings.cursorTrailSize,
    cursorTrailDensity: typeof parsed.cursorTrailDensity === "number" && Number.isFinite(parsed.cursorTrailDensity) ? Math.min(250, Math.max(20, parsed.cursorTrailDensity)) : typeof parsed.cursorSparklesDensity === "number" && Number.isFinite(parsed.cursorSparklesDensity) ? Math.min(250, Math.max(20, parsed.cursorSparklesDensity)) : defaultSettings.cursorTrailDensity,
    cursorTrailSpeed: typeof parsed.cursorTrailSpeed === "number" && Number.isFinite(parsed.cursorTrailSpeed) ? Math.min(300, Math.max(50, parsed.cursorTrailSpeed)) : typeof parsed.cursorSparklesSpeed === "number" && Number.isFinite(parsed.cursorSparklesSpeed) ? Math.min(300, Math.max(50, parsed.cursorSparklesSpeed)) : defaultSettings.cursorTrailSpeed,
    cursorTrailLifetime: typeof parsed.cursorTrailLifetime === "number" && Number.isFinite(parsed.cursorTrailLifetime) ? Math.min(15000, Math.max(300, Math.round(parsed.cursorTrailLifetime / 100) * 100)) : defaultSettings.cursorTrailLifetime,
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
