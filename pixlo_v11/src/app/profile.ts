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
  layout: "Default" | "Modern" | "Minimal" | "Sleek";
  alignment: "center" | "left";
  socialsPerRow: 2 | 3 | 4;
  views: number;
  socials: Record<SocialKey, string>;
  socialColours: Record<SocialKey, string>;
  socialIconColour: string;
  customLinks: CustomLink[];
  activeLinkOrder: string[];
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
};

export const defaultSettings: ProfileSettings = {
  username: "mrbeat",
  displayName: "mrbeat",
  description: "Welcome to my profile. This is my little corner of the internet.",
  location: "London, United Kingdom",
  avatar: "",
  banner: "",
  backgroundImage: "",
  backgroundVideo: "",
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
  avatarDecoration: "halo",
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
  parallax: true,
  parallaxStrength: 16,
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
  customLinks: [],
  activeLinkOrder: [],
  musicTracks: [],
  activeMusicId: "",
  musicAutoplay: true,
  showMusicPlayer: true,
  musicLoop: false,
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
};

export function loadSettings(): ProfileSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = localStorage.getItem("profileSettings");
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw);
    return {
      ...defaultSettings,
      ...parsed,
      socials: { ...defaultSettings.socials, ...(parsed.socials || {}) },
      socialColours: { ...defaultSettings.socialColours, ...(parsed.socialColours || {}) },
      socialIconColour: typeof parsed.socialIconColour === "string" ? parsed.socialIconColour : defaultSettings.socialIconColour,
      customLinks: Array.isArray(parsed.customLinks) ? parsed.customLinks.filter((item: any) => item && typeof item.id === "string" && typeof item.url === "string" && typeof item.icon === "string") : [],
      activeLinkOrder: Array.isArray(parsed.activeLinkOrder) ? parsed.activeLinkOrder.filter((item: any) => typeof item === "string") : [],
      avatarDecoration: ["none", "halo", "orbit", "flame"].includes(parsed.avatarDecoration) ? parsed.avatarDecoration : defaultSettings.avatarDecoration,
      discordAvatarUrl: typeof parsed.discordAvatarUrl === "string" ? parsed.discordAvatarUrl : defaultSettings.discordAvatarUrl,
      discordAvatarDecorationUrl: typeof parsed.discordAvatarDecorationUrl === "string" ? parsed.discordAvatarDecorationUrl : defaultSettings.discordAvatarDecorationUrl,
      useDiscordAvatar: typeof parsed.useDiscordAvatar === "boolean" ? parsed.useDiscordAvatar : defaultSettings.useDiscordAvatar,
      useDiscordDecoration: typeof parsed.useDiscordDecoration === "boolean" ? parsed.useDiscordDecoration : defaultSettings.useDiscordDecoration,
      nameFont: typeof parsed.nameFont === "string" ? parsed.nameFont : defaultSettings.nameFont,
      usernameFont: typeof parsed.usernameFont === "string" ? parsed.usernameFont : defaultSettings.usernameFont,
      descriptionFont: typeof parsed.descriptionFont === "string" ? parsed.descriptionFont : defaultSettings.descriptionFont,
      locationFont: typeof parsed.locationFont === "string" ? parsed.locationFont : defaultSettings.locationFont,
      socialsFont: typeof parsed.socialsFont === "string" ? parsed.socialsFont : defaultSettings.socialsFont,
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
      nameAnimation: typeof parsed.nameAnimation === "string" ? parsed.nameAnimation : defaultSettings.nameAnimation,
      usernameAnimation: typeof parsed.usernameAnimation === "string" ? parsed.usernameAnimation : defaultSettings.usernameAnimation,
      descriptionAnimation: typeof parsed.descriptionAnimation === "string" ? parsed.descriptionAnimation : defaultSettings.descriptionAnimation,
      locationAnimation: typeof parsed.locationAnimation === "string" ? parsed.locationAnimation : defaultSettings.locationAnimation,
      socialsAnimation: typeof parsed.socialsAnimation === "string" ? parsed.socialsAnimation : defaultSettings.socialsAnimation,
      nameGlow: typeof parsed.nameGlow === "boolean" ? parsed.nameGlow : Boolean(parsed.textGlow),
      descriptionGlow: typeof parsed.descriptionGlow === "boolean" ? parsed.descriptionGlow : false,
      locationGlow: typeof parsed.locationGlow === "boolean" ? parsed.locationGlow : false,
      socialsGlow: typeof parsed.socialsGlow === "boolean" ? parsed.socialsGlow : false,
      musicTracks: Array.isArray(parsed.musicTracks) ? parsed.musicTracks : [],
      musicAutoplay: typeof parsed.musicAutoplay === "boolean" ? parsed.musicAutoplay : defaultSettings.musicAutoplay,
      showMusicPlayer: typeof parsed.showMusicPlayer === "boolean" ? parsed.showMusicPlayer : defaultSettings.showMusicPlayer,
    };
  } catch {
    return defaultSettings;
  }
}
