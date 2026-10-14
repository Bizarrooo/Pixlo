"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { defaultSettings, loadSettings, loadSettingsForUsername, normaliseProfileSettings, saveSettingsToStorage, type MusicTrack, type ProfileFont, type ProfileSettings } from "./profile";
import { loadAsset, loadAssetMedia } from "./assetStore";

const socialLabels: Record<string, string> = { discord: "Discord", youtube: "YouTube", roblox: "Roblox", github: "GitHub", twitch: "Twitch", instagram: "Instagram", spotify: "Spotify" };
const socialKeys = ["discord", "youtube", "roblox", "github", "twitch", "instagram", "spotify"] as const;

function SocialIcon({ name }: { name: string }) {
  const common = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true };
  if (name === "discord") return <svg {...common}><path d="M19.54 5.12a16.9 16.9 0 0 0-3.98-1.25l-.52 1.06a15.4 15.4 0 0 0-6.08 0L8.44 3.87a16.9 16.9 0 0 0-3.98 1.25C1.94 8.86 1.24 12.5 1.59 16.08a16.98 16.98 0 0 0 5.05 2.55l1.22-1.67c-.68-.25-1.33-.56-1.94-.94l.48-.37a12.35 12.35 0 0 0 11.2 0l.49.37c-.61.38-1.26.69-1.94.94l1.22 1.67a16.98 16.98 0 0 0 5.05-2.55c.41-4.15-.7-7.76-2.88-10.96ZM8.4 14.1c-1.05 0-1.9-.98-1.9-2.19s.84-2.19 1.9-2.19 1.92.98 1.9 2.19c0 1.21-.85 2.19-1.9 2.19Zm7.2 0c-1.05 0-1.9-.98-1.9-2.19s.84-2.19 1.9-2.19 1.92.98 1.9 2.19c0 1.21-.85 2.19-1.9 2.19Z" /></svg>;
  if (name === "youtube") return <svg {...common}><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.6 3.5 12 3.5 12 3.5s-7.6 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.8.6 9.4.6 9.4.6s7.6 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.9V8.1l6.8 3.9-6.8 3.9Z" /></svg>;
  if (name === "roblox") return <svg {...common}><path d="M18.926 23.998 0 18.892 5.075.002 24 5.108ZM15.348 10.09l-5.282-1.453-1.414 5.273 5.282 1.453z" /></svg>;
  if (name === "github") return <svg {...common}><path d="M12 2.1a9.9 9.9 0 0 0-3.13 19.3c.5.1.68-.22.68-.48v-1.69c-2.78.61-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.02 1.53 1.02.9 1.53 2.36 1.09 2.94.83.09-.65.35-1.09.64-1.34-2.22-.25-4.55-1.11-4.55-4.95 0-1.09.39-1.98 1.02-2.68-.1-.25-.44-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.54 1.37.2 2.39.1 2.64.63.7 1.02 1.59 1.02 2.68 0 3.85-2.34 4.7-4.57 4.95.36.31.68.92.68 1.85v2.74c0 .26.18.58.69.48A9.9 9.9 0 0 0 12 2.1Z" /></svg>;
  if (name === "twitch") return <svg {...common}><path d="M4 3h17v12.2l-5.3 5.3h-4.1L8 24v-3.5H4V3Zm2 2v13.5h3v1.9l2.1-1.9h3.8l4.1-4.1V5H6Zm4 3h2v5h-2V8Zm4 0h2v5h-2V8Z" /></svg>;
  if (name === "spotify") return <svg {...common}><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.59 14.42a.75.75 0 0 1-1.03.25c-2.82-1.72-6.37-2.11-10.55-1.15a.75.75 0 1 1-.34-1.46c4.58-1.05 8.51-.59 11.67 1.33.35.21.46.67.25 1.03Zm1.47-3.27a.94.94 0 0 1-1.29.31c-3.23-1.99-8.15-2.56-11.97-1.4a.94.94 0 1 1-.55-1.8c4.36-1.32 9.78-.68 13.5 1.61.44.27.58.84.31 1.28Zm.13-3.4c-3.87-2.3-10.25-2.52-13.94-1.39a1.13 1.13 0 1 1-.66-2.16c4.24-1.29 11.29-1.04 15.75 1.61a1.13 1.13 0 0 1-1.15 1.94Z" /></svg>;
  return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="17.5" cy="6.5" r="1.2" /></svg>;
}




function fontFamily(font: ProfileFont) {
  const map: Record<ProfileFont, string> = {
    Inter: "var(--font-geist-sans), Inter, sans-serif",
    "DM Sans": "\"DM Sans\", sans-serif", Manrope: "Manrope, sans-serif", Poppins: "Poppins, sans-serif", Montserrat: "Montserrat, sans-serif",
    "Space Grotesk": "\"Space Grotesk\", sans-serif", Outfit: "Outfit, sans-serif", "Plus Jakarta Sans": "\"Plus Jakarta Sans\", sans-serif",
    Rubik: "Rubik, sans-serif", Raleway: "Raleway, sans-serif", "Playfair Display": "\"Playfair Display\", Georgia, serif",
    "Bebas Neue": "\"Bebas Neue\", Impact, sans-serif", Oswald: "Oswald, sans-serif", "JetBrains Mono": "\"JetBrains Mono\", monospace",
    "Fira Code": "\"Fira Code\", monospace", Arial: "Arial, Helvetica, sans-serif", system: "system-ui, sans-serif",
    monospace: "ui-monospace, SFMono-Regular, monospace", Georgia: "Georgia, serif", "Courier New": "\"Courier New\", monospace",
    "Trebuchet MS": "\"Trebuchet MS\", sans-serif", Impact: "Impact, Haettenschweiler, sans-serif",
    "Times New Roman": "\"Times New Roman\", Times, serif", Verdana: "Verdana, sans-serif",
  };
  return map[font];
}

function animationClass(animation: ProfileSettings["nameAnimation"]) {
  return animation === "none" ? "" : `text-animation-${animation}`;
}

function normaliseUrl(value: string) {
  if (!value) return "#";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function rgbaFromHex(hex: string, alpha: number) {
  const safe = /^#?[0-9a-f]{6}$/i.test(hex) ? hex.replace(/^#/, "") : "ffffff";
  const n = Number.parseInt(safe, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export default function ProfileView({ forcedUsername }: { forcedUsername?: string }) {
  const [settings, setSettings] = useState<ProfileSettings>(defaultSettings);
  const [presetPreviewMode, setPresetPreviewMode] = useState(false);
  const [embedMode, setEmbedMode] = useState(false);
  const [ready, setReady] = useState(false);
  const [profileStatus, setProfileStatus] = useState<"loading" | "found" | "missing" | "error">("loading");
  const [entered, setEntered] = useState(false);
  const [entering, setEntering] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [assets, setAssets] = useState({ avatar: "", banner: "", backgroundImage: "", backgroundVideo: "", musicCover: "", musicAudio: "", musicMediaType: "", customLinkIcons: {} as Record<string, string> });
  const [profileBadges, setProfileBadges] = useState<Array<{ id: string; name: string; icon_url: string | null; description: string }>>([]);
  const [trackIndex, setTrackIndex] = useState(0);
  const [musicVideoFallback, setMusicVideoFallback] = useState(false);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [parallaxReturning, setParallaxReturning] = useState(false);
  const parallaxReturnTimerRef = useRef<number | null>(null);
  const pointerBoundsRef = useRef<DOMRect | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLMediaElement>(null);
  const unlockedRef = useRef(false);
  const manualPauseRef = useRef(false);
  const lastSettingsRawRef = useRef("");
  const settingsStorageKeyRef = useRef("profileSettings");

  const activeTrack = settings.musicTracks[trackIndex] || settings.musicTracks.find(track => track.id === settings.activeMusicId) || settings.musicTracks[0];
  const activeTrackIndex = activeTrack ? settings.musicTracks.findIndex(track => track.id === activeTrack.id) : -1;

  useEffect(() => {
    const selection = loadSettingsForUsername(forcedUsername || "");
    const current = selection.settings;
    settingsStorageKeyRef.current = selection.storageKey;
    lastSettingsRawRef.current = localStorage.getItem(selection.storageKey) || JSON.stringify(current);
    const selectedIndex = Math.max(0, current.musicTracks.findIndex(track => track.id === current.activeMusicId));
    setSettings(current);
    setTrackIndex(selectedIndex);
    setMusicVideoFallback(false);
    setReady(true);

    Promise.all([
      current.useDiscordAvatar && current.discordAvatarUrl ? Promise.resolve(current.discordAvatarUrl) : loadAsset(current.avatar),
      loadAsset(current.banner),
      loadAsset(current.backgroundImage),
      loadAsset(current.backgroundVideo),
      loadAsset(current.musicTracks[selectedIndex]?.cover || ""),
      loadAssetMedia(current.musicTracks[selectedIndex]?.audio || ""),
      ...current.customLinks.filter(link => link.icon).map(link => loadAsset(link.icon)),
    ]).then(entries => {
      const customLinkIcons: Record<string, string> = {};
      const customLinksWithIcons = current.customLinks.filter(link => link.icon);
      customLinksWithIcons.forEach((link, index) => { customLinkIcons[link.id] = entries[6 + index] as string; });
      const musicAudio = entries[5] as { url: string; type: string };
      setAssets({ avatar: entries[0] as string, banner: entries[1] as string, backgroundImage: entries[2] as string, backgroundVideo: entries[3] as string, musicCover: entries[4] as string, musicAudio: musicAudio.url, musicMediaType: musicAudio.type, customLinkIcons });
    }).catch(() => {});

    setEntered(false);
    setEntering(false);
  }, [forcedUsername]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPresetPreviewMode(params.has("presetPreview"));
    setEmbedMode(params.get("embed") === "1");
  }, []);

  useEffect(() => {
    const username = (forcedUsername || "").trim().toLowerCase();
    setProfileStatus("loading");
    if (!username) { setProfileStatus("missing"); return; }
    let cancelled = false;
    fetch(`/api/public-profile/${encodeURIComponent(username)}`, { cache: "no-store" })
      .then(async response => {
        if (!response.ok) {
          if (!cancelled) setProfileStatus(response.status === 404 ? "missing" : "error");
          return null;
        }
        const data = await response.json().catch(() => null);
        if (!cancelled) setProfileStatus(data?.profile ? "found" : "error");
        return data;
      })
      .then(async data => {
        if (!cancelled) setProfileBadges(Array.isArray(data?.profile?.badges) ? data.profile.badges : []);
        const previewSlot = new URLSearchParams(window.location.search).get("presetPreview");
        let remote = data?.profile?.settings;
        if (previewSlot && /^[1-5]$/.test(previewSlot)) {
          try {
            const presetResponse = await fetch(`/api/presets?preview=${previewSlot}`, { cache: "no-store", credentials: "include" });
            const presetData = await presetResponse.json().catch(() => ({}));
            if (presetResponse.ok && presetData?.slot?.settings) remote = presetData.slot.settings;
          } catch {}
        }
        if (cancelled || !remote || typeof remote !== "object" || Object.keys(remote).length === 0) return;
        const current = normaliseProfileSettings(remote, { username: data.profile.username || username, displayName: data.profile.displayName || data.profile.username || username });
        setSettings(previous => ({ ...current, views: Math.max(Number(current.views) || 0, Number(previous.views) || 0) }));
        setTrackIndex(Math.max(0, current.musicTracks.findIndex(track => track.id === current.activeMusicId)));
        const selectedTrack = current.musicTracks.find(track => track.id === current.activeMusicId) || current.musicTracks[0];
        const customLinksWithIcons = current.customLinks.filter(link => link.icon);
        const entries = await Promise.all([
          current.useDiscordAvatar && current.discordAvatarUrl ? Promise.resolve(current.discordAvatarUrl) : loadAsset(current.avatar),
          loadAsset(current.banner),
          loadAsset(current.backgroundImage),
          loadAsset(current.backgroundVideo),
          loadAsset(selectedTrack?.cover || ""),
          loadAssetMedia(selectedTrack?.audio || ""),
          ...customLinksWithIcons.map(link => loadAsset(link.icon)),
        ]);
        if (cancelled) return;
        const customLinkIcons: Record<string, string> = {};
        customLinksWithIcons.forEach((link, index) => { customLinkIcons[link.id] = entries[6 + index] as string; });
        const musicAudio = entries[5] as { url: string; type: string };
        setAssets({ avatar: entries[0] as string, banner: entries[1] as string, backgroundImage: entries[2] as string, backgroundVideo: entries[3] as string, musicCover: entries[4] as string, musicAudio: musicAudio.url, musicMediaType: musicAudio.type, customLinkIcons });
      })
      .catch(() => { if (!cancelled) setProfileStatus("error"); });
    return () => { cancelled = true; };
  }, [forcedUsername]);

  useEffect(() => {
    const username = (forcedUsername || "").trim().toLowerCase();
    const params = new URLSearchParams(window.location.search);
    if (!username || params.has("presetPreview") || params.get("embed") === "1") return;
    let visitorId = "";
    try {
      visitorId = localStorage.getItem("pixlo-visitor-id") || "";
      if (!visitorId) {
        visitorId = crypto.randomUUID();
        localStorage.setItem("pixlo-visitor-id", visitorId);
      }
    } catch {
      return;
    }
    let cancelled = false;
    fetch("/api/profile-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, visitorId }),
      cache: "no-store",
    }).then(response => response.ok ? response.json() : null).then(data => {
      if (!cancelled && typeof data?.views === "number") setSettings(previous => ({ ...previous, views: data.views }));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [forcedUsername]);

  useEffect(() => {
    const track = settings.musicTracks[trackIndex] || settings.musicTracks.find(item => item.id === settings.activeMusicId) || settings.musicTracks[0];
    let cancelled = false;
    Promise.all([loadAsset(track?.cover || ""), loadAssetMedia(track?.audio || "")]).then(([musicCover, musicAudio]) => {
      if (!cancelled) { setMusicVideoFallback(false); setAssets(previous => ({ ...previous, musicCover, musicAudio: musicAudio.url, musicMediaType: musicAudio.type })); }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [trackIndex, activeTrack?.id, activeTrack?.audio, activeTrack?.cover]);

  useEffect(() => {
    const syncSettings = () => {
      const storageKey = settingsStorageKeyRef.current;
      const raw = localStorage.getItem(storageKey) || "";
      if (!raw || raw === lastSettingsRawRef.current) return;
      lastSettingsRawRef.current = raw;
      try { setSettings(loadSettings(storageKey)); } catch {}
    };
    lastSettingsRawRef.current = localStorage.getItem(settingsStorageKeyRef.current) || "";
    window.addEventListener("storage", syncSettings);
    window.addEventListener("pageshow", syncSettings);
    const interval = window.setInterval(syncSettings, 500);
    return () => {
      window.removeEventListener("storage", syncSettings);
      window.removeEventListener("pageshow", syncSettings);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!ready || embedMode || !settings.musicAutoplay || manualPauseRef.current) return;

    const startMedia = () => {
      const audio = audioRef.current;
      const video = videoRef.current;

      // Start audio immediately during the user's tap gesture. Awaiting video.play()
      // first can lose iOS Safari's user-activation permission for audio playback.
      if (audio && activeTrack && audio.paused && !manualPauseRef.current) {
        audio.volume = 1;
        audio.muted = false;
        audio.loop = settings.musicLoop;
        void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      }

      if (video && video.paused) {
        video.volume = 1;
        video.muted = Boolean(activeTrack) || settings.backgroundVideoMusicDisabled;
        void video.play().catch(() => {
          if (!activeTrack && !settings.backgroundVideoMusicDisabled) video.muted = true;
          void video.play().catch(() => {});
        });
      }
    };

    void startMedia();

    const unlockMedia = () => {
      if (!manualPauseRef.current && settings.musicAutoplay) void startMedia();
    };
    window.addEventListener("pointerdown", unlockMedia, { once: true, capture: true });
    window.addEventListener("keydown", unlockMedia, { once: true, capture: true });
    return () => {
      window.removeEventListener("pointerdown", unlockMedia, true);
      window.removeEventListener("keydown", unlockMedia, true);
    };
  }, [ready, embedMode, activeTrack?.id, settings.musicAutoplay, settings.musicLoop]);

  useEffect(() => {
    if (!assets.musicAudio || !audioRef.current || !activeTrack) return;
    const audio = audioRef.current;
    audio.loop = settings.musicLoop;
    audio.preload = "auto";
    return () => {
      audio.pause();
    };
  }, [assets.musicAudio, activeTrack?.id, settings.musicLoop]);

  const activeLinks = useMemo(() => {
    const validKeys = [
      ...socialKeys.filter(key => settings.socials[key]).map(key => `social:${key}`),
      ...settings.customLinks.filter(link => link.url).map(link => `custom:${link.id}`),
    ];
    const order = settings.activeLinkOrder || [];
    return [...order.filter(key => validKeys.includes(key)), ...validKeys.filter(key => !order.includes(key))];
  }, [settings]);

  if (!ready || profileStatus === "loading") return <main className="profile-loading"><div className="loader" /></main>;
  if (profileStatus === "missing") return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#09090d", color: "#f5f5f7", fontFamily: "var(--font-geist-sans), Inter, sans-serif" }}><section style={{ width: "min(100%, 420px)", padding: "36px 28px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 22, background: "rgba(255,255,255,0.045)", textAlign: "center", boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}><div style={{ width: 52, height: 52, margin: "0 auto 18px", display: "grid", placeItems: "center", borderRadius: 16, background: "rgba(255,255,255,0.08)", fontSize: 25 }}>?</div><h1 style={{ margin: "0 0 10px", fontSize: 25, fontWeight: 750, letterSpacing: "-0.04em" }}>Account doesn’t exist</h1><p style={{ margin: 0, color: "rgba(245,245,247,0.68)", lineHeight: 1.6 }}>We couldn’t find a Pixlo account for <strong style={{ color: "#f5f5f7" }}>@{forcedUsername}</strong>.</p><a href="/" style={{ display: "inline-flex", marginTop: 24, padding: "11px 18px", borderRadius: 12, background: "#f5f5f7", color: "#111116", fontWeight: 700, textDecoration: "none" }}>Back to Pixlo</a></section></main>;
  if (profileStatus === "error") return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#09090d", color: "#f5f5f7", fontFamily: "var(--font-geist-sans), Inter, sans-serif" }}><section style={{ width: "min(100%, 420px)", padding: "32px 26px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 22, background: "rgba(255,255,255,0.045)", textAlign: "center" }}><h1 style={{ margin: "0 0 10px", fontSize: 23, fontWeight: 750 }}>Profile unavailable</h1><p style={{ margin: 0, color: "rgba(245,245,247,0.68)", lineHeight: 1.6 }}>We couldn’t load this account right now. Please try again in a moment.</p><button type="button" onClick={() => window.location.reload()} style={{ marginTop: 22, padding: "11px 18px", border: 0, borderRadius: 12, background: "#f5f5f7", color: "#111116", fontWeight: 700, cursor: "pointer" }}>Try again</button></section></main>;

  const readableTextOpacity = Math.max(85, Math.min(100, Number(settings.textOpacity) || 0));
  const textOpacity = `${readableTextOpacity}%`;
  const cardBg = rgbaFromHex(settings.backgroundColour, settings.profileOpacity / 100);
  const border = rgbaFromHex("ffffff", settings.borderOpacity / 100);
  const glowRadius = settings.glowIntensity * 1.8;
  const glowAlpha = Math.min(0.8, Math.max(0, settings.glowIntensity / 100));
  const shadow = settings.glow && settings.glowIntensity > 0
    ? `0 0 ${glowRadius}px ${rgbaFromHex(settings.accentColour, glowAlpha)}, 0 0 ${glowRadius * 2.2}px ${rgbaFromHex(settings.accentColour, glowAlpha * 0.35)}, 0 28px 90px ${rgbaFromHex("000000", Math.max(0.2, settings.shadowOpacity / 100))}`
    : `0 28px 90px ${rgbaFromHex("000000", settings.shadowOpacity / 100)}`;
  const font = fontFamily(settings.customFont);
  const position = `${settings.backgroundPositionX}% ${settings.backgroundPositionY}%`;
  const scale = `${settings.backgroundScale}%`;
  const parallaxPower = settings.parallax && settings.parallaxStrength > 0
    ? Math.pow(Math.min(35, Math.max(0, settings.parallaxStrength)) / 35, 0.72)
    : 0;
  const style = {
    "--background": settings.backgroundColour,
    "--accent": settings.accentColour,
    "--text": settings.textColour,
    "--gradient-text": `linear-gradient(110deg, ${settings.gradientTextColours.join(", ")}, ${settings.gradientTextColours[0]}, ${settings.gradientTextColours.slice(1).join(", ")}, ${settings.gradientTextColours[0]})`,
    "--gradient-socials": `linear-gradient(110deg, ${settings.gradientSocialsColours.join(", ")}, ${settings.gradientSocialsColours[0]}, ${settings.gradientSocialsColours.slice(1).join(", ")}, ${settings.gradientSocialsColours[0]})`,
    "--gradient-badges": `linear-gradient(110deg, ${settings.gradientBadgesColours.join(", ")}, ${settings.gradientBadgesColours[0]}, ${settings.gradientBadgesColours.slice(1).join(", ")}, ${settings.gradientBadgesColours[0]})`,
    "--gradient-badge-1": settings.gradientBadgesColours[0],
    "--gradient-badge-2": settings.gradientBadgesColours[1],
    "--gradient-badge-3": settings.gradientBadgesColours[2],
    "--text-opacity": textOpacity,
    "--text-opacity-number": readableTextOpacity / 100,
    "--element-glow": `${Math.max(2, settings.glowIntensity * 0.35)}px`,
    "--profile-bg": cardBg,
    "--profile-text": rgbaFromHex(settings.textColour, readableTextOpacity / 100),
    "--profile-border": border,
    "--profile-blur": `${settings.profileBlur}px`,
    "--profile-opacity": settings.profileOpacity / 100,
    "--border-opacity": settings.borderOpacity / 100,
    "--radius": `${settings.borderRadius}px`,
    "--card-width": `${settings.cardWidth}px`,
    "--spacing": "18px",
    "--content-padding": `${settings.contentSpacing}px`,
    "--banner-height": `${settings.bannerHeight}px`,
    "--avatar-size": `${settings.avatarSize}px`,
    "--avatar-radius": `${settings.avatarRadius}%`,
    "--avatar-border": `${settings.avatarBorderWidth}px`,
    "--avatar-border-colour": settings.avatarBorderColour,
    "--background-blur": `${settings.backgroundBlur}px`,
    "--background-position": position,
    "--background-scale": scale,
    "--background-scale-factor": `${Math.max(1, settings.backgroundScale / 100)}`,
    "--content-spacing-setting": `${settings.contentSpacing}px`,
    "--vignette": settings.vignette / 100,
    "--background-overlay": settings.backgroundOverlay / 100,
    "--font-profile": font,
    "--mouse-x": `${settings.parallax ? pointer.x * settings.parallaxStrength : 0}px`,
    "--mouse-y": `${settings.parallax ? pointer.y * settings.parallaxStrength : 0}px`,
    "--parallax-rotate-x": `${pointer.y * -16 * parallaxPower}deg`,
    "--parallax-rotate-y": `${pointer.x * 19 * parallaxPower}deg`,
    "--parallax-light-x": `${50 + pointer.x * 45 * parallaxPower}%`,
    "--parallax-light-y": `${50 + pointer.y * 45 * parallaxPower}%`,
    "--parallax-shadow-x": `${pointer.x * -10 * parallaxPower}px`,
    "--parallax-shadow-y": `${pointer.y * -8 * parallaxPower}px`,
  } as React.CSSProperties;

  const selectTrack = (index: number) => {
    if (!settings.musicTracks.length) return;
    manualPauseRef.current = false;
    setMusicVideoFallback(false);
    setTrackIndex((index + settings.musicTracks.length) % settings.musicTracks.length);
  };

  const nextTrack = () => selectTrack(activeTrackIndex + 1);
  const previousTrack = () => selectTrack(activeTrackIndex - 1);

  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      manualPauseRef.current = false;
      audio.muted = false;
      audio.volume = 1;
      try { await audio.play(); setPlaying(true); } catch { setPlaying(false); }
    } else {
      manualPauseRef.current = true;
      audio.pause();
      setPlaying(false);
    }
  };

  const updateCardPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!settings.parallax || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (parallaxReturnTimerRef.current !== null) window.clearTimeout(parallaxReturnTimerRef.current);
    parallaxReturnTimerRef.current = null;
    setParallaxReturning(false);
    const bounds = pointerBoundsRef.current || event.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5) * 2));
    const y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / Math.max(bounds.height, 1) - 0.5) * 2));
    setPointer(previous => {
      if (Math.abs(previous.x - x) < 0.002 && Math.abs(previous.y - y) < 0.002) return previous;
      return { x, y };
    });
  };
  const handleCardPointerEnter = (event: React.PointerEvent<HTMLDivElement>) => {
    if (parallaxReturnTimerRef.current !== null) window.clearTimeout(parallaxReturnTimerRef.current);
    parallaxReturnTimerRef.current = null;
    setParallaxReturning(false);
    pointerBoundsRef.current = event.currentTarget.getBoundingClientRect();
  };
  const handleCardPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch" || !settings.parallax) return;
    pointerBoundsRef.current = event.currentTarget.getBoundingClientRect();
    updateCardPointer(event);
  };
  const resetCardPointer = () => {
    pointerBoundsRef.current = null;
    setParallaxReturning(true);
    setPointer({ x: 0, y: 0 });
    if (parallaxReturnTimerRef.current !== null) window.clearTimeout(parallaxReturnTimerRef.current);
    parallaxReturnTimerRef.current = window.setTimeout(() => {
      setParallaxReturning(false);
      parallaxReturnTimerRef.current = null;
    }, 700);
  };
  const handleCardPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || event.type === "pointercancel") resetCardPointer();
  };

  return (
    <main className={`profile-page ${settings.gradientTextEnabled ? "gradient-text-on" : ""} ${settings.gradientSocialsEnabled ? "gradient-socials-on" : ""} ${settings.gradientBadgesEnabled ? "gradient-badges-on" : ""} ${settings.parallax ? "parallax-on" : ""} ${parallaxReturning ? "parallax-returning" : ""} ${settings.animated ? "effects-on" : ""} ${settings.floating ? "floating-card" : ""} ${settings.particles ? "particles-on" : ""} ${settings.grain ? "grain-on" : ""} ${settings.scanlines ? "scanlines-on" : ""} layout-${settings.layout.toLowerCase().replace(" ", "-")}`} style={style}>
      <svg className="pixlo-gradient-defs" aria-hidden="true" width="0" height="0" style={{position:"absolute",width:0,height:0,overflow:"hidden"}}><defs><linearGradient id="pixlo-social-gradient" x1="0%" y1="0%" x2="100%" y2="0%" spreadMethod="repeat"><stop offset="0%" stopColor={settings.gradientSocialsColours[0]} /><stop offset="33.333%" stopColor={settings.gradientSocialsColours[1]} /><stop offset="66.666%" stopColor={settings.gradientSocialsColours[2]} /><stop offset="100%" stopColor={settings.gradientSocialsColours[0]} /><animateTransform attributeName="gradientTransform" type="translate" from="0 0" to="-1 0" dur="8s" repeatCount="indefinite" /></linearGradient></defs></svg>
      <div className="background-media-layer" aria-hidden="true">
        {assets.backgroundImage && <div className="background-image" style={{ backgroundImage: `url("${assets.backgroundImage}")` }} />}
        {assets.backgroundVideo && (
          <video
            key={assets.backgroundVideo}
            ref={videoRef}
            className="background-media"
            src={assets.backgroundVideo}
            autoPlay={entered || embedMode}
            muted={embedMode || Boolean(activeTrack) || settings.backgroundVideoMusicDisabled}
            loop
            playsInline
            preload="auto"
            onCanPlay={event => {
              const video = event.currentTarget;
              if (!entered && !embedMode) { video.pause(); video.currentTime = 0; return; }
              video.volume = 1;
              video.muted = embedMode || Boolean(activeTrack) || settings.backgroundVideoMusicDisabled;
              void video.play().catch(() => { if (!activeTrack && !settings.backgroundVideoMusicDisabled) video.muted = true; void video.play().catch(() => {}); });
            }}
          />
        )}
      </div>
      <div className="background-overlay" />
      <div className="vignette" />
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      {settings.particles && <div className="particle-field" aria-hidden="true">{Array.from({ length: 18 }).map((_, i) => <i key={i} style={{ "--i": i } as React.CSSProperties} />)}</div>}
      {settings.grain && <div className="effect-grain" aria-hidden="true" />}
      {settings.scanlines && <div className="effect-scanlines" aria-hidden="true" />}

      {ready && !entered && !embedMode && (
        <button
          type="button"
          aria-label="Enter profile"
          onClick={() => setEntering(true)}
          onTransitionEnd={() => { if (entering) { setEntered(true); setEntering(false); const backgroundVideo = document.querySelector<HTMLVideoElement>(".background-media"); if (backgroundVideo) void backgroundVideo.play().catch(() => { backgroundVideo.muted = true; void backgroundVideo.play().catch(() => {}); }); } }}
          style={{ position: "fixed", inset: 0, zIndex: 10000, width: "100%", height: "100%", padding: 24, border: 0, margin: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer", backgroundColor: `rgba(${parseInt(settings.enterScreenBackgroundColour.slice(1,3),16)||0},${parseInt(settings.enterScreenBackgroundColour.slice(3,5),16)||0},${parseInt(settings.enterScreenBackgroundColour.slice(5,7),16)||0},${assets.backgroundVideo ? Math.min(settings.enterScreenBackgroundOpacity / 100, 0.28) : settings.enterScreenBackgroundOpacity / 100})`, backdropFilter: `blur(${settings.enterScreenCardBlur}px)`, WebkitBackdropFilter: `blur(${settings.enterScreenCardBlur}px)`, color: settings.enterScreenTextColour, fontFamily: fontFamily(settings.enterScreenFont), textAlign: "center", opacity: entering ? 0 : 1, transition: "opacity 450ms ease" }}
        >
          <span style={{ position: "absolute", zIndex: 2, left: `${settings.enterScreenCardPositionX}%`, top: `${settings.enterScreenCardPositionY}%`, transform: "translate(-50%, -50%)", display: "block", width: `min(90%, ${settings.enterScreenCardWidth}px)`, boxSizing: "border-box", padding: `${settings.enterScreenCardPadding}px`, borderRadius: settings.enterScreenCardRadius, border: `1px solid ${settings.enterScreenCardBorderColour}${Math.round(settings.enterScreenCardBorderOpacity*2.55).toString(16).padStart(2,"0")}`, background: `${settings.enterScreenCardBackgroundColour}${Math.round(settings.enterScreenCardOpacity*2.55).toString(16).padStart(2,"0")}`, color: settings.enterScreenTextColour,  fontSize: "clamp(1.2rem, 3vw, 2.2rem)", fontWeight: 700, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere", textShadow: "0 2px 24px rgba(0,0,0,0.45)" }}>{settings.enterScreenMessage || "Click to enter"}</span>
        </button>
      )}
      <section className={`profile-wrap ${presetPreviewMode ? "preset-preview-mode" : ""}`}>
        <div
          className={`profile-card ${settings.glow ? "glow-enabled" : ""} ${settings.alignment === "left" ? "text-left" : ""}`}
          style={{ boxShadow: shadow, "--glow-strength": settings.glowIntensity } as React.CSSProperties}
          onPointerEnter={handleCardPointerEnter}
          onPointerMove={updateCardPointer}
          onPointerDown={handleCardPointerDown}
          onPointerUp={handleCardPointerUp}
          onPointerCancel={resetCardPointer}
          onPointerLeave={resetCardPointer}
        >
          {assets.banner && settings.bannerHeight > 0 && <div className="profile-banner"><img src={assets.banner} alt="" /></div>}
          <div className="profile-inner">
            <div className="profile-avatar-badge-row">
              {settings.badgePosition === "left" && profileBadges.some(badge => settings.activeBadgeIds.includes(badge.id)) && <section className={`pixlo-profile-badges pixlo-side-badges pixlo-side-badges-left ${settings.badgeGlow ? "pixlo-badges-glow" : ""} ${settings.badgeUnderline ? "pixlo-double-underline" : ""} ${settings.badgeUnderlineGlow ? "pixlo-underline-glow" : ""} ${settings.badgeStyle === "icon" ? "pixlo-badges-icon-only" : ""}`} aria-label="Badges" style={{ "--badge-colour": settings.badgeColour, "--badge-glow-intensity": settings.badgeGlowIntensity / 100, "--badge-scale": settings.badgeScale / 100 } as React.CSSProperties}><div className="pixlo-profile-badges-list">{profileBadges.filter(badge => settings.activeBadgeIds.includes(badge.id)).sort((a,b) => settings.activeBadgeOrder.indexOf(a.id)-settings.activeBadgeOrder.indexOf(b.id)).map(badge => <div className="pixlo-profile-badge" key={badge.id} data-badge-name={badge.name} aria-label={badge.name}>{badge.icon_url ? <span className="pixlo-badge-icon-tint" aria-hidden="true" style={{ maskImage: `url("${badge.icon_url}")`, WebkitMaskImage: `url("${badge.icon_url}")` } as React.CSSProperties} /> : <span>✦</span>}</div>)}</div></section>}
              <div className={`avatar-wrap avatar-decoration-${settings.avatarDecoration}`} style={{ width: `${settings.avatarSize}px`, height: `${settings.avatarSize}px` }}>
                <div className="avatar">{assets.avatar ? <img src={assets.avatar} alt="" /> : <span>{(settings.displayName || settings.username).slice(0, 1).toUpperCase()}</span>}</div>
                {settings.useDiscordDecoration && settings.discordAvatarDecorationUrl && <img className="discord-avatar-decoration" src={settings.discordAvatarDecorationUrl} alt="" aria-hidden="true" />}
                {settings.showDiscord && <span className="status-dot" title="Online" />}
              </div>
              {settings.badgePosition === "right" && profileBadges.some(badge => settings.activeBadgeIds.includes(badge.id)) && <section className={`pixlo-profile-badges pixlo-side-badges pixlo-side-badges-right ${settings.badgeGlow ? "pixlo-badges-glow" : ""} ${settings.badgeUnderline ? "pixlo-double-underline" : ""} ${settings.badgeUnderlineGlow ? "pixlo-underline-glow" : ""} ${settings.badgeStyle === "icon" ? "pixlo-badges-icon-only" : ""}`} aria-label="Badges" style={{ "--badge-colour": settings.badgeColour, "--badge-glow-intensity": settings.badgeGlowIntensity / 100, "--badge-scale": settings.badgeScale / 100 } as React.CSSProperties}><div className="pixlo-profile-badges-list">{profileBadges.filter(badge => settings.activeBadgeIds.includes(badge.id)).sort((a,b) => settings.activeBadgeOrder.indexOf(a.id)-settings.activeBadgeOrder.indexOf(b.id)).map(badge => <div className="pixlo-profile-badge" key={badge.id} data-badge-name={badge.name} aria-label={badge.name}>{badge.icon_url ? <span className="pixlo-badge-icon-tint" aria-hidden="true" style={{ maskImage: `url("${badge.icon_url}")`, WebkitMaskImage: `url("${badge.icon_url}")` } as React.CSSProperties} /> : <span>✦</span>}</div>)}</div></section>}
            </div>

            <div className="profile-name-row" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, width: "100%", flexWrap: "nowrap" }}>
              <h1 className={`${settings.nameGlow ? "element-glow-name " : ""}${animationClass(settings.nameAnimation)}`} style={{ fontFamily: fontFamily(settings.nameFont), fontWeight: settings.nameBold ? 700 : 400, fontStyle: settings.nameItalic ? "italic" : "normal", margin: 0, flex: "0 1 auto", minWidth: 0, width: "auto" }}>{settings.displayName || settings.username}</h1>
              {settings.showVerifiedBadgeNextToUsername && (() => { const verifiedBadge = profileBadges.find(badge => badge.name.trim().toLowerCase() === "verified" && badge.icon_url); return verifiedBadge?.icon_url ? <span className="pixlo-name-badge pixlo-badge-icon-tint" role="img" aria-label="Verified" title="Verified" style={{ width: 17, height: 17, backgroundColor: settings.verifiedBadgeColour, maskImage: `url("${verifiedBadge.icon_url}")`, WebkitMaskImage: `url("${verifiedBadge.icon_url}")`, maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat", maskPosition: "center", WebkitMaskPosition: "center", maskSize: "contain", WebkitMaskSize: "contain", flex: "0 0 auto" } as React.CSSProperties} /> : null; })()}
            </div>
            <div className={`username ${animationClass(settings.usernameAnimation)}`} style={{ fontFamily: fontFamily(settings.usernameFont), fontWeight: settings.usernameBold ? 700 : 400, fontStyle: settings.usernameItalic ? "italic" : "normal", opacity: 1 }}>@{settings.username}</div>
            
            {settings.description && <p className={`description ${settings.descriptionGlow ? "element-glow-description " : ""}${animationClass(settings.descriptionAnimation)}`} style={{ fontFamily: fontFamily(settings.descriptionFont), fontWeight: settings.descriptionBold ? 700 : 400, fontStyle: settings.descriptionItalic ? "italic" : "normal" }}>{settings.description}</p>}
            {settings.showLocation && settings.location && <div className={`location ${settings.locationGlow ? "element-glow-location " : ""}${animationClass(settings.locationAnimation)}`} style={{ fontFamily: fontFamily(settings.locationFont), fontWeight: settings.locationBold ? 700 : 400, fontStyle: settings.locationItalic ? "italic" : "normal", opacity: 1 }}><span>⌖</span>{settings.location}</div>}

            {settings.showMusicPlayer && settings.musicPlayerPosition === "top" && activeTrack && <MusicPlayer track={activeTrack} cover={assets.musicCover} audioRef={audioRef} playing={playing} tracks={settings.musicTracks} onToggle={toggleMusic} onPrev={previousTrack} onNext={nextTrack} loop={settings.musicLoop} />}

            {activeLinks.length > 0 && <div className={`socials ${settings.socialsGlow ? "element-glow-socials " : ""}${animationClass(settings.socialsAnimation)}`} style={{ opacity: 1, fontFamily: fontFamily(settings.socialsFont), fontWeight: settings.socialsBold ? 700 : 400, fontStyle: settings.socialsItalic ? "italic" : "normal", "--social-icon-size": `${settings.socialIconSize}px` } as React.CSSProperties} aria-label="Active links">
              {activeLinks.map(key => {
                if (key.startsWith("social:")) {
                  const socialKey = key.slice(7);
                  return <a key={key} href={normaliseUrl(settings.socials[socialKey as keyof typeof settings.socials])} target="_blank" rel="noreferrer" className="social" aria-label={socialLabels[socialKey] || socialKey} title={socialLabels[socialKey] || socialKey} style={{ "--social-colour": settings.socialIconColour, "--social-icon-size": `${settings.socialIconSize}px` } as React.CSSProperties}><span><SocialIcon name={socialKey} /></span></a>;
                }
                const link = settings.customLinks.find(item => `custom:${item.id}` === key);
                if (!link) return null;
                return <a key={key} href={normaliseUrl(link.url)} target="_blank" rel="noreferrer" className="social custom-link-social" aria-label="Custom link" title={link.url} style={{ "--social-colour": settings.socialIconColour, "--social-icon-size": `${settings.socialIconSize}px` } as React.CSSProperties}><span>{assets.customLinkIcons[link.id] ? <img src={assets.customLinkIcons[link.id]} alt="" className="custom-social-icon" /> : <span className="custom-link-fallback" aria-hidden="true">↗</span>}</span></a>;
              })}
            </div>}


            {settings.showMusicPlayer && settings.musicPlayerPosition === "bottom" && activeTrack && <MusicPlayer track={activeTrack} cover={assets.musicCover} audioRef={audioRef} playing={playing} tracks={settings.musicTracks} onToggle={toggleMusic} onPrev={previousTrack} onNext={nextTrack} loop={settings.musicLoop} />}
            {settings.badgePosition === "bottom" && profileBadges.some(badge => settings.activeBadgeIds.includes(badge.id)) && <section className={`pixlo-profile-badges pixlo-active-badges ${settings.badgeGlow ? "pixlo-badges-glow" : ""} ${settings.badgeUnderline ? "pixlo-double-underline" : ""} ${settings.badgeUnderlineGlow ? "pixlo-underline-glow" : ""} ${settings.badgeStyle === "icon" ? "pixlo-badges-icon-only" : ""}`} aria-label="Active badges" style={{ "--badge-colour": settings.badgeColour, "--badge-glow-intensity": settings.badgeGlowIntensity / 100, "--badge-scale": settings.badgeScale / 100 } as React.CSSProperties}><div className="pixlo-profile-badges-list">{[...profileBadges.filter(badge => settings.activeBadgeIds.includes(badge.id)).sort((a,b) => settings.activeBadgeOrder.indexOf(a.id)-settings.activeBadgeOrder.indexOf(b.id))].map(badge => <div className="pixlo-profile-badge" key={badge.id} data-badge-name={badge.name} aria-label={badge.name}>{badge.icon_url ? <span className="pixlo-badge-icon-tint" aria-hidden="true" style={{ maskImage: `url("${badge.icon_url}")`, WebkitMaskImage: `url("${badge.icon_url}")` } as React.CSSProperties} /> : <span>✦</span>}</div>)}</div></section>}

            {activeTrack && assets.musicAudio && (
              (activeTrack.source === "background-video" || assets.musicMediaType.startsWith("video/") || musicVideoFallback) ? (
                <video
                  className="music-source-media"
                  ref={audioRef as React.RefObject<HTMLVideoElement>}
                  src={assets.musicAudio}
                  loop={settings.musicLoop}
                  preload="auto"
                  playsInline
                  onError={() => { setMusicVideoFallback(true); setPlaying(false); }}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onEnded={() => {
                    if (settings.musicLoop) return;
                    if (settings.musicTracks.length > 1) { manualPauseRef.current = false; nextTrack(); return; }
                    manualPauseRef.current = true;
                    setPlaying(false);
                  }}
                  aria-hidden="true"
                />
              ) : (
                <audio
                  className="music-source-media"
                  ref={audioRef as React.RefObject<HTMLAudioElement>}
                  src={assets.musicAudio}
                  loop={settings.musicLoop}
                  preload="auto"
                  onError={() => { setMusicVideoFallback(true); setPlaying(false); }}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onEnded={() => {
                    if (settings.musicLoop) return;
                    if (settings.musicTracks.length > 1) { manualPauseRef.current = false; nextTrack(); return; }
                    manualPauseRef.current = true;
                    setPlaying(false);
                  }}
                  aria-hidden="true"
                />
              )
            )}

            {settings.showFooter && <div className="profile-footer"><span><i className="online-dot" /> Online</span>{settings.showViews && <span>{settings.views || 0} views</span>}</div>}
          </div>
        </div>
      </section>
    </main>
  );
}

function MusicPlayer({ track, cover, audioRef, playing, tracks, onToggle, onPrev, onNext, loop }: { track: MusicTrack; cover: string; audioRef: React.RefObject<HTMLMediaElement | null>; playing: boolean; tracks: MusicTrack[]; onToggle: () => void; onPrev: () => void; onNext: () => void; loop: boolean }) {
  return <div className="music-card">
    <div className={`music-art ${playing ? "spinning" : ""}`}>{cover ? <img src={cover} alt="" /> : <span>♫</span>}</div>
    <div className="music-info"><strong>{track.title}</strong><span>{track.artist}</span></div>
    <div className="music-controls">
      {tracks.length > 1 && <button type="button" onClick={onPrev} aria-label="Previous track">‹</button>}
      <button type="button" className="play-button" onClick={onToggle} aria-label={playing ? "Pause" : "Play"}>{playing ? "Ⅱ" : "▶"}</button>
      {tracks.length > 1 && <button type="button" onClick={onNext} aria-label="Next track">›</button>}
    </div>
  </div>;
}
