"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { defaultSettings, loadSettings, loadSettingsForUsername, normaliseProfileSettings, saveSettingsToStorage, type MusicTrack, type ProfileFont, type ProfileSettings } from "./profile";
import { loadAsset, loadAssetMedia } from "./assetStore";
import CursorTrailCanvas from "./CursorTrailCanvas";

const socialLabels: Record<string, string> = { discord: "Discord", youtube: "YouTube", roblox: "Roblox", github: "GitHub", twitch: "Twitch", instagram: "Instagram", spotify: "Spotify" };
const socialKeys = ["discord", "youtube", "roblox", "github", "twitch", "instagram", "spotify"] as const;
const donorBadgeKeys = new Set(["donor_supporter", "donor_patron", "donor_benefactor", "donor_sponsor", "donor_elite_sponsor", "donor_mythic_patron", "donor_eternal_benefactor"]);

function SocialIcon({ name }: { name: string }) {
  const common = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true };
  if (name === "discord") return <svg {...common}><path d="M19.54 5.12a16.9 16.9 0 0 0-3.98-1.25l-.52 1.06a15.4 15.4 0 0 0-6.08 0L8.44 3.87a16.9 16.9 0 0 0-3.98 1.25C1.94 8.86 1.24 12.5 1.59 16.08a16.98 16.98 0 0 0 5.05 2.55l1.22-1.67c-.68-.25-1.33-.56-1.94-.94l.48-.37a12.35 12.35 0 0 0 11.2 0l.49.37c-.61.38-1.26.69-1.94.94l1.22 1.67a16.98 16.98 0 0 0 5.05-2.55c.41-4.15-.7-7.76-2.88-10.96ZM8.4 14.1c-1.05 0-1.9-.98-1.9-2.19s.84-2.19 1.9-2.19 1.92.98 1.9 2.19c0 1.21-.85 2.19-1.9 2.19Zm7.2 0c-1.05 0-1.9-.98-1.9-2.19s.84-2.19 1.9-2.19 1.92.98 1.9 2.19c0 1.21-.85 2.19-1.9 2.19Z" /></svg>;
  if (name === "youtube") return <svg {...common}><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.6 3.5 12 3.5 12 3.5s-7.6 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.8.6 9.4.6 9.4.6s7.6 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.9V8.1l6.8 3.9-6.8 3.9Z" /></svg>;
  if (name === "roblox") return <svg {...common}><path d="M18.926 23.998 0 18.892 5.075.002 24 5.108ZM15.348 10.09l-5.282-1.453-1.414 5.273 5.282 1.453z" /></svg>;
  if (name === "github") return <svg {...common}><path d="M12 2.1a9.9 9.9 0 0 0-3.13 19.3c.5.1.68-.22.68-.48v-1.69c-2.78.61-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.02 1.53 1.02.9 1.53 2.36 1.09 2.94.83.09-.65.35-1.09.64-1.34-2.22-.25-4.55-1.11-4.55-4.95 0-1.09.39-1.98 1.02-2.68-.1-.25-.44-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.54 1.37.2 2.39.1 2.64.63.7 1.02 1.59 1.02 2.68 0 3.85-2.34 4.7-4.57 4.95.36.31.68.92.68 1.85v2.74c0 .26.18.58.69.48A9.9 9.9 0 0 0 12 2.1Z" /></svg>;
  if (name === "twitch") return <svg {...common}><path d="M4 3h17v12.2l-5.3 5.3h-4.1L8 24v-3.5H4V3Zm2 2v13.5h3v1.9l2.1-1.9h3.8l4.1-4.1V5H6Zm4 3h2v5h-2V8Zm4 0h2v5h-2V8Z" /></svg>;
  if (name === "spotify") return <svg {...common}><path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm5.496 17.303a.748.748 0 0 1-1.03.249c-2.823-1.725-6.379-2.113-10.571-1.157a.75.75 0 0 1-.334-1.463c4.585-1.045 8.576-.571 11.686 1.329.355.218.466.682.249 1.042zm1.47-3.272a.937.937 0 0 1-1.29.309c-3.23-1.986-8.151-2.56-11.975-1.395a.938.938 0 0 1-.547-1.793c4.363-1.324 8.965-.723 13.503 1.59a.938.938 0 0 1 .309 1.29zm.126-3.409C15.211 8.32 9.06 8.118 5.494 9.2a1.125 1.125 0 0 1-.652-2.154c4.096-1.243 10.9-1.003 15.197 1.547a1.125 1.125 0 0 1-1.147 1.93z" /></svg>;
  return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="17.5" cy="6.5" r="1.2" /></svg>;
}




function fontFamily(font: ProfileFont) {
  const map: Record<ProfileFont, string> = {
    Inter: "var(--font-geist-sans), Inter, sans-serif",
    "DM Sans": "\"DM Sans\", sans-serif", Manrope: "Manrope, sans-serif", Poppins: "Poppins, sans-serif", Montserrat: "Montserrat, sans-serif",
    "Space Grotesk": "\"Space Grotesk\", sans-serif", Outfit: "Outfit, sans-serif", "Plus Jakarta Sans": "\"Plus Jakarta Sans\", sans-serif",
    Rubik: "Rubik, sans-serif", Raleway: "Raleway, sans-serif", "Playfair Display": "\"Playfair Display\", Georgia, serif",
    "Bebas Neue": "\"Bebas Neue\", Impact, sans-serif", Oswald: "Oswald, sans-serif", "JetBrains Mono": "\"JetBrains Mono\", monospace",
    "Fira Code": "\"Fira Code\", monospace",
    "Lexend": "Lexend, sans-serif",
    "Urbanist": "Urbanist, sans-serif",
    "Sora": "Sora, sans-serif",
    "Lato": "Lato, sans-serif",
    "Roboto": "Roboto, sans-serif",
    "Roboto Condensed": "Roboto Condensed, sans-serif",
    "Nunito": "Nunito, sans-serif",
    "Nunito Sans": "Nunito Sans, sans-serif",
    "Mulish": "Mulish, sans-serif",
    "Work Sans": "Work Sans, sans-serif",
    "Archivo": "Archivo, sans-serif",
    "Exo 2": "Exo 2, sans-serif",
    "Merriweather": "Merriweather, sans-serif",
    "Lora": "Lora, sans-serif",
    "Source Sans 3": "Source Sans 3, sans-serif",
    "Source Code Pro": "Source Code Pro, monospace",
    "IBM Plex Sans": "IBM Plex Sans, sans-serif",
    "IBM Plex Mono": "IBM Plex Mono, monospace",
    "Comfortaa": "Comfortaa, sans-serif",
    "Figtree": "Figtree, sans-serif",
    "Karla": "Karla, sans-serif",
    "Asap": "Asap, sans-serif",
    "Libre Franklin": "Libre Franklin, sans-serif",
    "Oxygen": "Oxygen, sans-serif",
    "Barlow": "Barlow, sans-serif",
    "Barlow Condensed": "Barlow Condensed, sans-serif",
    "Josefin Sans": "Josefin Sans, sans-serif",
    "Cabin": "Cabin, sans-serif",
    "Jost": "Jost, sans-serif",
    "Spectral": "Spectral, sans-serif",
    "Cinzel": "Cinzel, sans-serif",
    "Anton": "Anton, sans-serif",
    "Bricolage Grotesque": "Bricolage Grotesque, sans-serif",
    "DM Serif Display": "DM Serif Display, serif",
    "IBM Plex Serif": "IBM Plex Serif, serif",
    "Onest": "Onest, sans-serif",
    "Righteous": "Righteous, sans-serif",
    "Space Mono": "Space Mono, monospace",
    "Titillium Web": "Titillium Web, sans-serif",
    "Ubuntu": "Ubuntu, sans-serif",
    "Yeseva One": "Yeseva One, serif",
    "Zilla Slab": "Zilla Slab, serif",
    "Archivo Black": "Archivo Black, sans-serif",
    Arial: "Arial, Helvetica, sans-serif", system: "system-ui, sans-serif",
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
  const [musicPlaybackNeedsTap, setMusicPlaybackNeedsTap] = useState(false);
  const [assets, setAssets] = useState({ avatar: "", banner: "", backgroundImage: "", backgroundVideo: "", musicCover: "", musicAudio: "", musicMediaType: "", customLinkIcons: {} as Record<string, string> });
  const [profileBadges, setProfileBadges] = useState<Array<{ id: string; name: string; icon_url: string | null; description: string; badge_key?: string }>>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [extrasPage, setExtrasPage] = useState(1);
  const [clockNow, setClockNow] = useState(() => new Date());
  const extrasPageRefs = useRef<Record<number, HTMLElement | null>>({});
  const [trackIndex, setTrackIndex] = useState(0);
  const [musicVideoFallback, setMusicVideoFallback] = useState(false);
  const [parallaxReturning, setParallaxReturning] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const parallaxReturnTimerRef = useRef<number | null>(null);
  const pointerBoundsRef = useRef<DOMRect | null>(null);
  const profilePageRef = useRef<HTMLElement | null>(null);
  const parallaxTargetRef = useRef({ x: 0, y: 0 });
  const parallaxFrameRef = useRef<number | null>(null);
  const shareCopiedTimerRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLMediaElement>(null);
  const unlockedRef = useRef(false);
  const manualPauseRef = useRef(false);
  const lastSettingsRawRef = useRef("");
  const settingsStorageKeyRef = useRef("profileSettings");

  const activeTrack = settings.musicTracks[trackIndex] || settings.musicTracks.find(track => track.id === settings.activeMusicId) || settings.musicTracks[0];
  const activeTrackIndex = activeTrack ? settings.musicTracks.findIndex(track => track.id === activeTrack.id) : -1;

  // Donor tiers are earned and equipped automatically. They remain visible even
  // when the user has not manually selected that badge in dashboard customisation.
  const visibleProfileBadges = useMemo(() => profileBadges
    .filter(badge => donorBadgeKeys.has(badge.badge_key || "") || settings.activeBadgeIds.includes(badge.id))
    .sort((a, b) => {
      const aOrder = settings.activeBadgeOrder.indexOf(a.id);
      const bOrder = settings.activeBadgeOrder.indexOf(b.id);
      if (donorBadgeKeys.has(a.badge_key || "")) return donorBadgeKeys.has(b.badge_key || "") ? 0 : -1;
      if (donorBadgeKeys.has(b.badge_key || "")) return 1;
      return (aOrder < 0 ? Number.MAX_SAFE_INTEGER : aOrder) - (bOrder < 0 ? Number.MAX_SAFE_INTEGER : bOrder);
    }), [profileBadges, settings.activeBadgeIds, settings.activeBadgeOrder]);

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
        if (!cancelled && !data?.profile) setProfileStatus("error");
        return data;
      })
      .then(async data => {
        if (cancelled || !data?.profile) return;
        setProfileBadges(Array.isArray(data.profile.badges) ? data.profile.badges : []);
        setIsPremium(Boolean(data.profile.premium));
        const previewSlot = new URLSearchParams(window.location.search).get("presetPreview");
        let remote = data?.profile?.settings;
        if (previewSlot && /^[1-5]$/.test(previewSlot)) {
          try {
            const presetResponse = await fetch(`/api/presets?preview=${previewSlot}`, { cache: "no-store", credentials: "include" });
            const presetData = await presetResponse.json().catch(() => ({}));
            if (presetResponse.ok && presetData?.slot?.settings) remote = presetData.slot.settings;
          } catch {}
        }
        if (cancelled) return;
        if (!remote || typeof remote !== "object" || Object.keys(remote).length === 0) {
          setProfileStatus("found");
          return;
        }
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
        // Don't show the enter-screen until remote profile media URLs are in place.
        // On mobile Safari the enter tap must reach an already-mounted audio element.
        setProfileStatus("found");
      })
      .catch(() => { if (!cancelled) setProfileStatus("error"); });
    return () => { cancelled = true; };
  }, [forcedUsername]);

  useEffect(() => {
    const interval = window.setInterval(() => setClockNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setExtrasPage(1);
  }, [forcedUsername]);

  useEffect(() => {
    if (settings.extrasLayout === "pages") return;
    const target = extrasPageRefs.current[extrasPage];
    if (target) target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: settings.extrasLayout === "horizontal" ? "center" : "nearest" });
  }, [extrasPage, settings.extrasLayout, settings.timezonePage]);

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
    if (!ready || profileStatus !== "found" || embedMode || !settings.musicAutoplay || manualPauseRef.current) return;

    const startMedia = () => {
      const audio = audioRef.current;
      const video = videoRef.current;

      // Attempt audio first, while the tap is still an active user gesture on mobile Safari.
      if (activeTrack && audio && audio.paused && !manualPauseRef.current) {
        audio.volume = 1;
        audio.muted = false;
        audio.loop = settings.musicLoop;
        try {
          void audio.play()
            .then(() => { setPlaying(true); setMusicPlaybackNeedsTap(false); })
            .catch(() => {
              setPlaying(false);
              if (entered) setMusicPlaybackNeedsTap(true);
            });
        } catch {
          setPlaying(false);
          if (entered) setMusicPlaybackNeedsTap(true);
        }
      } else if (activeTrack && !audio && entered) {
        setMusicPlaybackNeedsTap(true);
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
      if (!manualPauseRef.current && settings.musicAutoplay) startMedia();
    };
    // Don't consume the only unlock tap if the audio element hasn't mounted yet.
    window.addEventListener("pointerdown", unlockMedia, { capture: true });
    window.addEventListener("keydown", unlockMedia, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", unlockMedia, true);
      window.removeEventListener("keydown", unlockMedia, true);
    };
  }, [ready, profileStatus, embedMode, activeTrack?.id, assets.musicAudio, settings.musicAutoplay, settings.musicLoop, settings.backgroundVideoMusicDisabled, entered]);

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
    "--mouse-x": "0px",
    "--mouse-y": "0px",
    "--parallax-rotate-x": "0deg",
    "--parallax-rotate-y": "0deg",
    "--parallax-light-x": "50%",
    "--parallax-light-y": "50%",
    "--parallax-shadow-x": "0px",
    "--parallax-shadow-y": "0px",
  } as React.CSSProperties;

  const selectTrack = (index: number) => {
    if (!settings.musicTracks.length) return;
    manualPauseRef.current = false;
    setMusicVideoFallback(false);
    setTrackIndex((index + settings.musicTracks.length) % settings.musicTracks.length);
  };

  const nextTrack = () => selectTrack(activeTrackIndex + 1);
  const previousTrack = () => selectTrack(activeTrackIndex - 1);

  const copyProfileLink = async () => {
    const username = (forcedUsername || "").trim().toLowerCase();
    if (!username) return;
    const profileUrlObject = new URL(`/user/${encodeURIComponent(username)}`, window.location.origin);
    // Give each copied share a fresh URL key so Discord does not reuse a previously cached OG image.
    const shareKey = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toLowerCase();
    profileUrlObject.searchParams.set("share", shareKey);
    const profileUrl = profileUrlObject.toString();
    let copied = false;
    try {
      await navigator.clipboard.writeText(profileUrl);
      copied = true;
    } catch {
      try {
        const temporary = document.createElement("textarea");
        temporary.value = profileUrl;
        temporary.setAttribute("readonly", "");
        temporary.style.position = "fixed";
        temporary.style.opacity = "0";
        temporary.style.pointerEvents = "none";
        document.body.appendChild(temporary);
        temporary.select();
        copied = document.execCommand("copy");
        temporary.remove();
      } catch {
        copied = false;
      }
    }
    if (!copied) {
      window.prompt("Copy your Pixlo profile link:", profileUrl);
      return;
    }
    setShareCopied(true);
    if (shareCopiedTimerRef.current !== null) window.clearTimeout(shareCopiedTimerRef.current);
    shareCopiedTimerRef.current = window.setTimeout(() => {
      setShareCopied(false);
      shareCopiedTimerRef.current = null;
    }, 2000);
  };

  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      manualPauseRef.current = false;
      audio.muted = false;
      audio.volume = 1;
      try {
        await audio.play();
        setPlaying(true);
        setMusicPlaybackNeedsTap(false);
      } catch {
        setPlaying(false);
        setMusicPlaybackNeedsTap(true);
      }
    } else {
      manualPauseRef.current = true;
      audio.pause();
      setPlaying(false);
      setMusicPlaybackNeedsTap(false);
    }
  };

  const playMusicFromGesture = () => {
    if (embedMode || !settings.musicAutoplay || !activeTrack || manualPauseRef.current) return;
    const audio = audioRef.current;
    if (!audio) {
      setMusicPlaybackNeedsTap(true);
      return;
    }
    audio.volume = 1;
    audio.muted = false;
    audio.loop = settings.musicLoop;
    try {
      // Call play synchronously from the touch gesture; don't await video or other media first.
      void audio.play()
        .then(() => { setPlaying(true); setMusicPlaybackNeedsTap(false); })
        .catch(() => { setPlaying(false); setMusicPlaybackNeedsTap(true); });
    } catch {
      setPlaying(false);
      setMusicPlaybackNeedsTap(true);
    }
  };

  const applyCardParallax = (x: number, y: number) => {
    const root = profilePageRef.current;
    if (!root) return;
    const strength = settings.parallax ? settings.parallaxStrength : 0;
    const power = settings.parallax && strength > 0
      ? Math.min(1.7, Math.pow(Math.min(100, Math.max(0, strength)) / 35, 0.72))
      : 0;
    root.style.setProperty("--mouse-x", `${x * strength}px`);
    root.style.setProperty("--mouse-y", `${y * strength}px`);
    root.style.setProperty("--parallax-rotate-x", `${y * -18 * power}deg`);
    root.style.setProperty("--parallax-rotate-y", `${x * 22 * power}deg`);
    root.style.setProperty("--parallax-light-x", `${50 + x * 45 * power}%`);
    root.style.setProperty("--parallax-light-y", `${50 + y * 45 * power}%`);
    root.style.setProperty("--parallax-shadow-x", `${x * -10 * power}px`);
    root.style.setProperty("--parallax-shadow-y", `${y * -8 * power}px`);
  };
  const updateCardPointer = (event: React.PointerEvent<HTMLElement>) => {
    if (!settings.parallax || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = pointerBoundsRef.current;
    if (!bounds) return;
    const trackingMargin = 72;
    if (
      event.clientX < bounds.left - trackingMargin ||
      event.clientX > bounds.right + trackingMargin ||
      event.clientY < bounds.top - trackingMargin ||
      event.clientY > bounds.bottom + trackingMargin
    ) {
      resetCardPointer();
      return;
    }
    if (parallaxReturnTimerRef.current !== null) window.clearTimeout(parallaxReturnTimerRef.current);
    parallaxReturnTimerRef.current = null;
    parallaxTargetRef.current = {
      x: Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5) * 2)),
      y: Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / Math.max(bounds.height, 1) - 0.5) * 2)),
    };
    if (parallaxFrameRef.current === null) {
      parallaxFrameRef.current = window.requestAnimationFrame(() => {
        parallaxFrameRef.current = null;
        const target = parallaxTargetRef.current;
        applyCardParallax(target.x, target.y);
      });
    }
  };
  const handleCardPointerEnter = (event: React.PointerEvent<HTMLDivElement>) => {
    if (parallaxReturnTimerRef.current !== null) window.clearTimeout(parallaxReturnTimerRef.current);
    parallaxReturnTimerRef.current = null;
    setParallaxReturning(false);
    if (!pointerBoundsRef.current) pointerBoundsRef.current = event.currentTarget.parentElement?.getBoundingClientRect() || event.currentTarget.getBoundingClientRect();
  };
  const handleCardPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch" || !settings.parallax) return;
    pointerBoundsRef.current = event.currentTarget.parentElement?.getBoundingClientRect() || event.currentTarget.getBoundingClientRect();
    updateCardPointer(event);
  };
  const resetCardPointer = () => {
    pointerBoundsRef.current = null;
    parallaxTargetRef.current = { x: 0, y: 0 };
    if (parallaxFrameRef.current !== null) {
      window.cancelAnimationFrame(parallaxFrameRef.current);
      parallaxFrameRef.current = null;
    }
    applyCardParallax(0, 0);
    setParallaxReturning(true);
    if (parallaxReturnTimerRef.current !== null) window.clearTimeout(parallaxReturnTimerRef.current);
    parallaxReturnTimerRef.current = window.setTimeout(() => {
      setParallaxReturning(false);
      parallaxReturnTimerRef.current = null;
    }, 700);
  };
  const handleCardPointerUp = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch" || event.type === "pointercancel") resetCardPointer();
  };

  return (
    <main ref={profilePageRef} className={`profile-page ${isPremium && settings.timezoneEnabled && !presetPreviewMode && !embedMode && forcedUsername ? "has-extras" : ""} ${settings.gradientTextEnabled ? "gradient-text-on" : ""} ${settings.gradientSocialsEnabled ? "gradient-socials-on" : ""} ${settings.gradientBadgesEnabled ? "gradient-badges-on" : ""} ${settings.parallax ? "parallax-on" : ""} ${parallaxReturning ? "parallax-returning" : ""} ${settings.animated ? "effects-on" : ""} ${settings.floating ? "floating-card" : ""} ${settings.particles ? "particles-on" : ""} ${settings.grain ? "grain-on" : ""} ${settings.scanlines ? "scanlines-on" : ""} layout-${settings.layout.toLowerCase().replace(" ", "-")}`} style={style}>
      {isPremium && settings.cursorTrailEnabled && !presetPreviewMode && !embedMode && forcedUsername && typeof document !== "undefined" && createPortal(
        <CursorTrailCanvas enabled={isPremium && settings.cursorTrailEnabled && !presetPreviewMode && !embedMode && Boolean(forcedUsername)} mode="viewport" colour={settings.cursorTrailColour} glow={settings.cursorTrailGlow} size={settings.cursorTrailSize} density={settings.cursorTrailDensity} speed={settings.cursorTrailSpeed} lifetime={settings.cursorTrailLifetime} className={settings.parallax ? "parallax-lite" : ""} />,
        document.body
      )}
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
          onPointerDown={() => playMusicFromGesture()}
          onClick={() => setEntering(true)}
          onTransitionEnd={() => { if (entering) { setEntered(true); setEntering(false); const backgroundVideo = document.querySelector<HTMLVideoElement>(".background-media"); if (backgroundVideo) void backgroundVideo.play().catch(() => { backgroundVideo.muted = true; void backgroundVideo.play().catch(() => {}); }); } }}
          style={{ position: "fixed", inset: 0, zIndex: 10000, width: "100%", height: "100%", padding: 24, border: 0, margin: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer", backgroundColor: `rgba(${parseInt(settings.enterScreenBackgroundColour.slice(1,3),16)||0},${parseInt(settings.enterScreenBackgroundColour.slice(3,5),16)||0},${parseInt(settings.enterScreenBackgroundColour.slice(5,7),16)||0},${assets.backgroundVideo ? Math.min(settings.enterScreenBackgroundOpacity / 100, 0.28) : settings.enterScreenBackgroundOpacity / 100})`, backdropFilter: `blur(${settings.enterScreenCardBlur}px)`, WebkitBackdropFilter: `blur(${settings.enterScreenCardBlur}px)`, color: settings.enterScreenTextColour, fontFamily: fontFamily(settings.enterScreenFont), textAlign: "center", opacity: entering ? 0 : 1, transition: "opacity 450ms ease" }}
        >
          <span style={{ position: "absolute", zIndex: 2, left: `${settings.enterScreenCardPositionX}%`, top: `${settings.enterScreenCardPositionY}%`, transform: "translate(-50%, -50%)", display: "block", width: `min(90%, ${settings.enterScreenCardWidth}px)`, boxSizing: "border-box", padding: `${settings.enterScreenCardPadding}px`, borderRadius: settings.enterScreenCardRadius, border: `1px solid ${settings.enterScreenCardBorderColour}${Math.round(settings.enterScreenCardBorderOpacity*2.55).toString(16).padStart(2,"0")}`, background: `${settings.enterScreenCardBackgroundColour}${Math.round(settings.enterScreenCardOpacity*2.55).toString(16).padStart(2,"0")}`, color: settings.enterScreenTextColour,  fontSize: "clamp(1.2rem, 3vw, 2.2rem)", fontWeight: 700, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere", textShadow: "0 2px 24px rgba(0,0,0,0.45)" }}>{settings.enterScreenMessage || "Click to enter"}</span>
        </button>
      )}
      {entered && !embedMode && settings.musicAutoplay && activeTrack && assets.musicAudio && musicPlaybackNeedsTap && !playing && (
        <button
          type="button"
          onPointerDown={event => event.stopPropagation()}
          onClick={event => { event.stopPropagation(); playMusicFromGesture(); }}
          aria-label="Tap to play profile music"
          style={{ position: "fixed", left: "50%", bottom: "max(18px, env(safe-area-inset-bottom))", zIndex: 9999, transform: "translateX(-50%)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9, minHeight: 44, padding: "11px 18px", border: "1px solid rgba(255,255,255,.35)", borderRadius: 999, color: "#fff", background: "linear-gradient(110deg, #f24d3d 0%, #ff7842 58%, #ffad52 100%)", boxShadow: "0 8px 28px rgba(242,77,61,.3)", font: "600 13px/1.2 inherit", cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
        >
          <span aria-hidden="true">♫</span>
          Tap to start music
        </button>
      )}
      <section
        className={`profile-wrap ${presetPreviewMode ? "preset-preview-mode" : ""}`}
        onPointerMove={updateCardPointer}
        onPointerLeave={resetCardPointer}
        onPointerUp={handleCardPointerUp}
        onPointerCancel={resetCardPointer}
      >
        <div
          className={`profile-card ${settings.glow ? "glow-enabled" : ""} ${settings.alignment === "left" ? "text-left" : ""}`}
          style={{ boxShadow: shadow, "--glow-strength": settings.glowIntensity } as React.CSSProperties}
          onPointerEnter={handleCardPointerEnter}
          onPointerDown={handleCardPointerDown}
        >
          {assets.banner && settings.bannerHeight > 0 && <div className="profile-banner"><img src={assets.banner} alt="" /></div>}
          <div className="profile-inner">
            <div className="profile-avatar-badge-row">
              {settings.badgePosition === "left" && visibleProfileBadges.length > 0 && <section className={`pixlo-profile-badges pixlo-side-badges pixlo-side-badges-left ${settings.badgeGlow ? "pixlo-badges-glow" : ""} ${settings.badgeUnderline ? "pixlo-double-underline" : ""} ${settings.badgeUnderlineGlow ? "pixlo-underline-glow" : ""} ${settings.badgeStyle === "icon" ? "pixlo-badges-icon-only" : ""}`} aria-label="Badges" style={{ "--badge-colour": settings.badgeColour, "--badge-glow-intensity": settings.badgeGlowIntensity / 100, "--badge-scale": settings.badgeScale / 100 } as React.CSSProperties}><div className="pixlo-profile-badges-list">{visibleProfileBadges.map(badge => <div className="pixlo-profile-badge" key={badge.id} data-badge-name={badge.name} aria-label={badge.name}>{badge.icon_url ? <span className="pixlo-badge-icon-tint" aria-hidden="true" style={{ maskImage: `url("${badge.icon_url}")`, WebkitMaskImage: `url("${badge.icon_url}")` } as React.CSSProperties} /> : <span>✦</span>}</div>)}</div></section>}
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
            {settings.badgePosition === "bottom" && profileBadges.some(badge => settings.activeBadgeIds.includes(badge.id)) && <section className={`pixlo-profile-badges pixlo-active-badges ${settings.badgeGlow ? "pixlo-badges-glow" : ""} ${settings.badgeUnderline ? "pixlo-double-underline" : ""} ${settings.badgeUnderlineGlow ? "pixlo-underline-glow" : ""} ${settings.badgeStyle === "icon" ? "pixlo-badges-icon-only" : ""}`} aria-label="Active badges" style={{ "--badge-colour": settings.badgeColour, "--badge-glow-intensity": settings.badgeGlowIntensity / 100, "--badge-scale": settings.badgeScale / 100 } as React.CSSProperties}><div className="pixlo-profile-badges-list">{[...visibleProfileBadges].map(badge => <div className="pixlo-profile-badge" key={badge.id} data-badge-name={badge.name} aria-label={badge.name}>{badge.icon_url ? <span className="pixlo-badge-icon-tint" aria-hidden="true" style={{ maskImage: `url("${badge.icon_url}")`, WebkitMaskImage: `url("${badge.icon_url}")` } as React.CSSProperties} /> : <span>✦</span>}</div>)}</div></section>}

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
                  onPlay={() => { setPlaying(true); setMusicPlaybackNeedsTap(false); }}
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

            {settings.showFooter && <div className="profile-footer"><span><i className="online-dot" /> Online</span>{settings.showViews && <span className="profile-view-count" aria-label={Number(settings.views || 0).toLocaleString() + " profile views"} title="Profile views"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.7" /></svg>{Number(settings.views || 0).toLocaleString()}</span>}</div>}

          </div>
        </div>
      </section>
      {isPremium && settings.timezoneEnabled && !presetPreviewMode && !embedMode && forcedUsername && <section className={`pixlo-extras pixlo-extras-${settings.extrasLayout}`} aria-label="Extra">
        <div className="pixlo-extras-heading"><div><span>PIXLO / PREMIUM</span><h2>Extra</h2><p>Little details, across time zones.</p></div><div className="pixlo-extras-status"><i /> LIVE</div></div>
        <nav className="pixlo-extras-pages" aria-label="Extra pages">
          {Array.from({ length: Math.max(2, settings.timezonePage) }, (_, index) => index + 1).map(page => <button type="button" key={page} className={extrasPage === page ? "active" : ""} onClick={() => setExtrasPage(page)} aria-current={extrasPage === page ? "page" : undefined}><span>{String(page).padStart(2, "0")}</span><small>{page === 1 ? "Overview" : page === settings.timezonePage ? "Extra" : "Coming soon"}</small></button>)}
        </nav>
        <div className="pixlo-extras-viewport" key={settings.extrasLayout}>
          {(settings.extrasLayout === "pages" ? [extrasPage] : Array.from({ length: Math.max(2, settings.timezonePage) }, (_, index) => index + 1)).map(page => <article key={`${page}-${extrasPage}`} ref={node => { extrasPageRefs.current[page] = node; }} className={`pixlo-extras-panel ${extrasPage === page ? "is-current" : ""} ${page === settings.timezonePage ? "pixlo-timezone-panel" : ""}`}>
            {page === 1 ? <div className="pixlo-extras-welcome"><span className="pixlo-extras-orbit" aria-hidden="true"><i /><i /><i /></span><div><span className="pixlo-extras-kicker">YOUR SPACE, EXPANDED</span><h3>More than a profile.</h3><p>Explore little widgets and useful details picked by the profile owner. New extras can live here without crowding the main page.</p><button type="button" onClick={() => setExtrasPage(settings.timezonePage)}>Explore extras <span>↗</span></button></div><span className="pixlo-extras-page-number">01</span></div>
            : page === settings.timezonePage ? <div className="pixlo-timezone-content">
                <div className="pixlo-timezone-topline"><span className="pixlo-extras-kicker">WORLD CLOCK</span><span className="pixlo-timezone-zone">{settings.timezone.replace(/_/g, " ").split("/").slice(-1)[0]}</span></div>
                <div className="pixlo-timezone-grid">
                  <div className="pixlo-timezone-primary">
                    <div className="pixlo-analog-clock" aria-label={new Intl.DateTimeFormat("en-GB", { timeZone: settings.timezone, hour: "2-digit", minute: "2-digit" }).format(clockNow)}>
                      <span className="pixlo-clock-face"><i className="pixlo-clock-hour" style={{ transform: `rotate(${(Number(new Intl.DateTimeFormat("en-GB", { timeZone: settings.timezone, hour: "2-digit", hourCycle: "h23" }).format(clockNow)) % 12) * 30 + Number(new Intl.DateTimeFormat("en-GB", { timeZone: settings.timezone, minute: "2-digit" }).format(clockNow)) / 2}deg)` }} /><i className="pixlo-clock-minute" style={{ transform: `rotate(${Number(new Intl.DateTimeFormat("en-GB", { timeZone: settings.timezone, minute: "2-digit" }).format(clockNow)) * 6}deg)` }} /><i className="pixlo-clock-second" style={{ transform: `rotate(${Number(new Intl.DateTimeFormat("en-GB", { timeZone: settings.timezone, second: "2-digit" }).format(clockNow)) * 6}deg)` }} /><b /></span>
                    </div>
                    <div className="pixlo-timezone-digital"><strong>{new Intl.DateTimeFormat("en-GB", { timeZone: settings.timezone, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(clockNow)}</strong><span>{new Intl.DateTimeFormat("en-GB", { timeZone: settings.timezone, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(clockNow)}</span><small>{new Intl.DateTimeFormat("en-GB", { timeZone: settings.timezone, timeZoneName: "long" }).formatToParts(clockNow).find(part => part.type === "timeZoneName")?.value}</small></div>
                  </div>
                  <div className="pixlo-local-time"><span className="pixlo-local-time-icon">⌖</span><div><small>YOUR LOCAL TIME</small><strong>{new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(clockNow)}</strong><span>{new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short", year: "numeric" }).format(clockNow)}</span><em>{Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " ")}</em></div><i className="pixlo-local-live-dot" /></div>
                </div>
                <div className="pixlo-timezone-footer"><span><i /> Both clocks update live</span><span>TIMEZONE COMPARISON</span></div>
              </div>
            : <div className="pixlo-extras-empty"><span className="pixlo-extras-empty-icon">✳</span><span className="pixlo-extras-kicker">PAGE {String(page).padStart(2, "0")}</span><h3>Something good is coming.</h3><p>This page is ready for another Premium extra.</p><span className="pixlo-extras-page-number">{String(page).padStart(2, "0")}</span></div>}
          </article>)}
        </div>
        <style jsx>{`
          .profile-page.has-extras{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:0;overflow-x:hidden;overflow-y:auto;padding:48px 18px 24px;scroll-behavior:smooth}.profile-page.has-extras>section{position:relative;z-index:1;flex:0 0 auto;width:min(100%,var(--card-width));margin:auto auto 0}.profile-page.has-extras>.pixlo-extras{width:min(100%,760px);margin:26px auto 36px}
          .pixlo-extras{--extra-accent:#ff815f;width:min(100%,760px);margin:26px auto 36px;padding:22px;border:1px solid rgba(255,255,255,.1);border-radius:25px;background:linear-gradient(145deg,rgba(17,15,18,.9),rgba(9,9,12,.82));box-shadow:0 25px 80px rgba(0,0,0,.28);color:#fff;backdrop-filter:blur(22px);animation:pixloExtrasIntro .72s cubic-bezier(.2,.82,.22,1) both}
          @keyframes pixloExtrasIntro{0%{opacity:0;transform:translateY(18px) scale(.965);filter:blur(8px)}65%{opacity:1;transform:translateY(-2px) scale(1.008);filter:blur(0)}100%{opacity:1;transform:translateY(0) scale(1)}}
          .pixlo-extras-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:18px}.pixlo-extras-heading>div:first-child>span,.pixlo-extras-kicker{font-size:9px;letter-spacing:.2em;font-weight:800;color:#ff9a78}.pixlo-extras-heading h2{margin:5px 0 3px;font-size:25px;letter-spacing:-.05em}.pixlo-extras-heading p{margin:0;color:rgba(255,255,255,.5);font-size:12px}.pixlo-extras-status{display:flex;align-items:center;gap:7px;padding:7px 10px;border-radius:99px;border:1px solid rgba(255,137,95,.2);color:#ffad8b;font-size:9px;letter-spacing:.12em;font-weight:800}.pixlo-extras-status i,.pixlo-timezone-footer i{width:5px;height:5px;border-radius:50%;background:#ff966e;box-shadow:0 0 12px #ff966e}
          .pixlo-extras-pages{display:flex;gap:7px;overflow-x:auto;padding:2px 1px 13px;scrollbar-width:thin;scrollbar-color:rgba(255,130,95,.25) transparent}.pixlo-extras-pages button{display:flex;align-items:center;gap:9px;flex:0 0 auto;padding:9px 12px;border:1px solid rgba(255,255,255,.075);border-radius:12px;background:rgba(255,255,255,.025);color:rgba(255,255,255,.52);cursor:pointer;transition:transform .25s cubic-bezier(.2,.8,.2,1),border-color .25s,background .25s}.pixlo-extras-pages button:hover{transform:translateY(-2px)}.pixlo-extras-pages button span{font-size:10px;font-weight:800}.pixlo-extras-pages button small{font-size:11px}.pixlo-extras-pages button.active{color:#fff;border-color:rgba(255,133,95,.45);background:linear-gradient(120deg,rgba(255,91,67,.14),rgba(255,160,83,.07));box-shadow:0 5px 18px rgba(255,93,62,.08)}
          .pixlo-extras-viewport{min-width:0}.pixlo-extras-panel{position:relative;min-width:0;overflow:hidden;border:1px solid rgba(255,255,255,.075);border-radius:19px;background:radial-gradient(ellipse at 95% 0%,rgba(255,112,75,.1),transparent 43%),linear-gradient(135deg,rgba(255,255,255,.035),rgba(255,255,255,.012));animation:pixloPanelPop .62s cubic-bezier(.18,.86,.22,1) both}.pixlo-extras-pages~.pixlo-extras-viewport>.pixlo-extras-panel{margin-bottom:12px}.pixlo-extras-pages~.pixlo-extras-viewport>.pixlo-extras-panel:last-child{margin-bottom:0}.pixlo-extras-pages~.pixlo-extras-viewport>.pixlo-extras-panel.is-current{border-color:rgba(255,131,92,.3)}
          @keyframes pixloPanelPop{0%{opacity:0;transform:translateY(14px) scale(.975);filter:blur(5px)}70%{opacity:1;transform:translateY(-1px) scale(1.006);filter:blur(0)}100%{opacity:1;transform:translateY(0) scale(1)}}
          .pixlo-extras-welcome{position:relative;display:flex;align-items:center;gap:25px;min-height:235px;padding:30px;overflow:hidden}.pixlo-extras-welcome>div{position:relative;z-index:1;max-width:390px}.pixlo-extras-welcome h3,.pixlo-extras-empty h3{font-size:clamp(22px,4vw,32px);letter-spacing:-.055em;margin:9px 0}.pixlo-extras-welcome p,.pixlo-extras-empty p{font-size:13px;line-height:1.7;color:rgba(255,255,255,.58);margin:0 0 18px}.pixlo-extras-welcome button{padding:10px 13px;border:1px solid rgba(255,137,95,.32);border-radius:11px;background:rgba(255,104,72,.1);color:#fff;font:inherit;font-size:12px;font-weight:700;cursor:pointer}.pixlo-extras-welcome button span{color:#ff9a78;margin-left:7px}.pixlo-extras-orbit{position:relative;display:block;flex:0 0 165px;width:165px;height:165px;border-radius:50%;border:1px solid rgba(255,144,106,.17);background:radial-gradient(circle,rgba(255,113,74,.17),transparent 66%);box-shadow:inset 0 0 40px rgba(255,107,70,.08),0 0 50px rgba(255,107,70,.06)}.pixlo-extras-orbit:before,.pixlo-extras-orbit:after{content:"";position:absolute;inset:18px;border:1px solid rgba(255,146,108,.15);border-radius:50%;transform:rotate(-25deg) scaleX(.55)}.pixlo-extras-orbit:after{transform:rotate(55deg) scaleX(.55)}.pixlo-extras-orbit i{position:absolute;left:50%;top:50%;width:9px;height:9px;border-radius:50%;background:#ff8d68;box-shadow:0 0 18px #ff7756}.pixlo-extras-orbit i:nth-child(1){transform:translate(-50%,-80px)}.pixlo-extras-orbit i:nth-child(2){transform:translate(42px,14px);background:#ffb16c}.pixlo-extras-orbit i:nth-child(3){transform:translate(-54px,28px);background:#e95d4b}
          .pixlo-extras-page-number{position:absolute;right:18px;bottom:14px;font-size:11px;letter-spacing:.1em;color:rgba(255,255,255,.25);font-variant-numeric:tabular-nums}.pixlo-extras-empty{position:relative;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;min-height:230px;padding:30px}.pixlo-extras-empty-icon{display:grid;place-items:center;width:36px;height:36px;border-radius:12px;color:#ff9a78;background:rgba(255,120,82,.1);font-size:19px;margin-bottom:20px}
          .pixlo-timezone-content{padding:25px}.pixlo-timezone-topline{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}.pixlo-timezone-zone{font-size:10px;color:rgba(255,255,255,.58);padding:6px 9px;border:1px solid rgba(255,255,255,.1);border-radius:99px;background:rgba(255,255,255,.025)}.pixlo-timezone-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:12px}.pixlo-timezone-primary{display:flex;align-items:center;gap:22px;padding:20px;border:1px solid rgba(255,255,255,.07);border-radius:16px;background:rgba(0,0,0,.15);min-width:0}.pixlo-analog-clock{flex:0 0 94px;width:94px;height:94px}.pixlo-clock-face{position:relative;display:block;width:94px;height:94px;border-radius:50%;border:1px solid rgba(255,255,255,.22);background:radial-gradient(circle,rgba(255,255,255,.045),rgba(0,0,0,.2));box-shadow:0 0 35px rgba(255,116,77,.1),inset 0 0 0 5px rgba(255,255,255,.025)}.pixlo-clock-face:before{content:"";position:absolute;inset:7px;border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(255,255,255,.72) 0deg 1deg,transparent 1deg 30deg);mask:radial-gradient(circle,transparent 0 79%,#000 80%)}.pixlo-clock-face:after{content:"";position:absolute;inset:16px;border-radius:50%;background:radial-gradient(circle,rgba(255,125,86,.07),transparent 70%)}.pixlo-clock-face i{position:absolute;left:calc(50% - 1px);bottom:50%;display:block;transform-origin:bottom center;border-radius:99px;z-index:2}.pixlo-clock-hour{width:3px;height:22px;background:#fff}.pixlo-clock-minute{width:2px;height:31px;background:#ff9b77}.pixlo-clock-second{width:1px;height:35px;background:#ff644e}.pixlo-clock-face b{position:absolute;z-index:3;left:calc(50% - 3px);top:calc(50% - 3px);width:6px;height:6px;border-radius:50%;background:#ff986f;box-shadow:0 0 10px #ff986f}.pixlo-timezone-digital{display:flex;flex-direction:column;gap:5px;min-width:0}.pixlo-timezone-digital strong{font-size:clamp(24px,4vw,38px);line-height:1;letter-spacing:-.065em;font-variant-numeric:tabular-nums;white-space:nowrap}.pixlo-timezone-digital span{font-size:11px;line-height:1.5;color:rgba(255,255,255,.65)}.pixlo-timezone-digital small{font-size:10px;color:#ff9a78}.pixlo-local-time{position:relative;display:flex;align-items:flex-start;gap:12px;padding:19px 16px;border:1px solid rgba(255,255,255,.07);border-radius:16px;background:linear-gradient(145deg,rgba(255,255,255,.035),rgba(255,255,255,.012));min-width:0}.pixlo-local-time-icon{display:grid;place-items:center;width:30px;height:30px;flex:0 0 30px;border-radius:10px;background:rgba(255,123,85,.1);color:#ff9a78}.pixlo-local-time>div{display:flex;flex-direction:column;gap:6px;min-width:0}.pixlo-local-time small{font-size:9px;letter-spacing:.12em;color:rgba(255,255,255,.48);font-weight:800}.pixlo-local-time strong{font-size:clamp(19px,2.7vw,27px);letter-spacing:-.05em;white-space:nowrap;font-variant-numeric:tabular-nums}.pixlo-local-time span:not(.pixlo-local-time-icon){font-size:11px;color:rgba(255,255,255,.65)}.pixlo-local-time em{font-size:10px;color:#ff9a78;font-style:normal;line-height:1.5}.pixlo-local-live-dot{position:absolute;right:13px;top:13px;width:6px;height:6px;border-radius:50%;background:#ff986f;box-shadow:0 0 10px #ff986f;animation:pixloLivePulse 1.6s ease-in-out infinite}@keyframes pixloLivePulse{50%{opacity:.4;transform:scale(.8)}}.pixlo-timezone-footer{display:flex;justify-content:space-between;gap:12px;margin-top:16px;color:rgba(255,255,255,.45);font-size:9px;letter-spacing:.1em}.pixlo-timezone-footer span:first-child{display:flex;align-items:center;gap:7px}
          .pixlo-extras-vertical .pixlo-extras-viewport{max-height:580px;overflow-y:auto;scroll-behavior:smooth;padding-right:3px}.pixlo-extras-horizontal .pixlo-extras-viewport{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;padding-bottom:5px}.pixlo-extras-horizontal .pixlo-extras-panel{flex:0 0 100%;scroll-snap-align:center}.pixlo-extras-vertical .pixlo-extras-panel{margin-bottom:12px}
          @media(max-width:650px){.pixlo-extras{padding:14px;border-radius:20px}.pixlo-extras-welcome{padding:22px;min-height:205px}.pixlo-extras-orbit{display:none}.pixlo-timezone-content{padding:17px}.pixlo-timezone-grid{grid-template-columns:1fr}.pixlo-timezone-primary{gap:16px;padding:15px}.pixlo-analog-clock,.pixlo-clock-face{width:76px;height:76px;flex-basis:76px}.pixlo-clock-hour{height:18px}.pixlo-clock-minute{height:25px}.pixlo-clock-second{height:28px}.pixlo-timezone-footer{font-size:8px}.pixlo-extras-pages button{padding:8px 10px}}
        `}</style>
      </section>}
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
