"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { accountSettingsStorageKey, defaultSettings, loadSettingsForAccount, normaliseProfileSettings, saveSettingsToStorage, type CustomLink, type MusicTrack, type ProfileFont, type ProfileSettings, type SocialKey, type TextAnimation } from "../profile";
import { deleteAsset, loadAsset, migrateAssetToCloud, saveAsset } from "../assetStore";

const sections = [
  ["General", "Identity & basics", "01"],
  ["Appearance", "Colours & transparency", "02"],
  ["Fonts", "Typography & text styles", "03"],
  ["Background", "Image, video & backdrop", "04"],
  ["Profile", "Avatar, banner & card", "05"],
  ["Socials", "Links & icon layout", "06"],
  ["Badges", "Discord rewards & profile badges", "13"],
  ["Music", "Tracks, covers & player", "07"],
  ["Effects", "Motion, glow & atmosphere", "08"],
  ["Layout", "Structure & alignment", "09"],
  ["Advanced", "Fine controls", "10"],
  ["Enter Screen", "Intro & click-to-enter", "11"],
  ["Stats", "Views & profile activity", "12"],
] as const;

type DashboardBadge = { id: string; name: string; description: string; icon_url: string | null };

const socials: [SocialKey, string][] = [
  ["discord", "Discord"], ["youtube", "YouTube"], ["roblox", "Roblox"], ["github", "GitHub"], ["twitch", "Twitch"], ["instagram", "Instagram"],
];

const socialLabels: Record<SocialKey, string> = Object.fromEntries(socials) as Record<SocialKey, string>;

const fontOptions: [ProfileFont, string][] = [
  ["Inter", "Inter"], ["DM Sans", "DM Sans"], ["Manrope", "Manrope"], ["Poppins", "Poppins"], ["Montserrat", "Montserrat"],
  ["Space Grotesk", "Space Grotesk"], ["Outfit", "Outfit"], ["Plus Jakarta Sans", "Plus Jakarta Sans"], ["Rubik", "Rubik"],
  ["Raleway", "Raleway"], ["Playfair Display", "Playfair Display"], ["Bebas Neue", "Bebas Neue"], ["Oswald", "Oswald"],
  ["JetBrains Mono", "JetBrains Mono"], ["Fira Code", "Fira Code"], ["Arial", "Arial"], ["system", "System UI"],
  ["monospace", "Monospace"], ["Georgia", "Georgia"], ["Courier New", "Courier New"], ["Trebuchet MS", "Trebuchet MS"],
  ["Impact", "Impact"], ["Times New Roman", "Times New Roman"], ["Verdana", "Verdana"],
];
const animationOptions: [TextAnimation, string][] = [
  ["none", "None"], ["fade-up", "Fade Up"], ["blur-in", "Blur In"], ["typewriter", "Typewriter"],
  ["glitch", "Glitch"], ["slide", "Slide In"], ["float", "Float"], ["pop", "Pop"],
];

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

function animationClass(animation: TextAnimation) {
  return animation === "none" ? "" : `text-animation-${animation}`;
}

function FontDropdown({ value, onChange, id, open, setOpen }: { value: ProfileFont; onChange: (value: ProfileFont) => void; id: string; open: string | null; setOpen: (id: string | null) => void }) {
  const isOpen = open === id;
  return <div className={`visual-select ${isOpen ? "open" : ""}`}>
    <button type="button" className="visual-select-trigger" onClick={() => setOpen(isOpen ? null : id)} aria-expanded={isOpen}>
      <span style={{ fontFamily: fontFamily(value) }}>{value === "system" ? "System UI" : value}</span><i>⌄</i>
    </button>
    {isOpen && <div className="visual-select-menu">{fontOptions.map(([option, label]) => <button type="button" key={option} className={`visual-select-option ${value === option ? "selected" : ""}`} onClick={() => { onChange(option); setOpen(null); }}>
      <span style={{ fontFamily: fontFamily(option) }}>{label}</span><small style={{ fontFamily: fontFamily(option) }}>Aa</small>
    </button>)}</div>}
  </div>;
}

function EffectDropdown({ value, onChange, id, open, setOpen }: { value: TextAnimation; onChange: (value: TextAnimation) => void; id: string; open: string | null; setOpen: (id: string | null) => void }) {
  const isOpen = open === id;
  const currentLabel = animationOptions.find(([option]) => option === value)?.[1] || "None";
  return <div className={`visual-select effect-select ${isOpen ? "open" : ""}`}>
    <button type="button" className="visual-select-trigger" onClick={() => setOpen(isOpen ? null : id)} aria-expanded={isOpen}>
      <span className={animationClass(value)}>{currentLabel}</span><i>⌄</i>
    </button>
    {isOpen && <div className="visual-select-menu">{animationOptions.map(([option, label]) => <button type="button" key={option} className={`visual-select-option ${value === option ? "selected" : ""}`} onClick={() => { onChange(option); setOpen(null); }}>
      <span className={animationClass(option)}>{label}</span><small className={animationClass(option)}>Aa</small>
    </button>)}</div>}
  </div>;
}

function SocialIcon({ name }: { name: SocialKey }) {
  const common = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true };
  if (name === "discord") return <svg {...common}><path d="M19.54 5.12a16.9 16.9 0 0 0-3.98-1.25l-.52 1.06a15.4 15.4 0 0 0-6.08 0L8.44 3.87a16.9 16.9 0 0 0-3.98 1.25C1.94 8.86 1.24 12.5 1.59 16.08a16.98 16.98 0 0 0 5.05 2.55l1.22-1.67c-.68-.25-1.33-.56-1.94-.94l.48-.37a12.35 12.35 0 0 0 11.2 0l.49.37c-.61.38-1.26.69-1.94.94l1.22 1.67a16.98 16.98 0 0 0 5.05-2.55c.41-4.15-.7-7.76-2.88-10.96ZM8.4 14.1c-1.05 0-1.9-.98-1.9-2.19s.84-2.19 1.9-2.19 1.92.98 1.9 2.19c0 1.21-.85 2.19-1.9 2.19Zm7.2 0c-1.05 0-1.9-.98-1.9-2.19s.84-2.19 1.9-2.19 1.92.98 1.9 2.19c0 1.21-.85 2.19-1.9 2.19Z" /></svg>;
  if (name === "youtube") return <svg {...common}><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.6 3.5 12 3.5 12 3.5s-7.6 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.8.6 9.4.6 9.4.6s7.6 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.9V8.1l6.8 3.9-6.8 3.9Z" /></svg>;
  if (name === "roblox") return <svg {...common}><path d="M18.926 23.998 0 18.892 5.075.002 24 5.108ZM15.348 10.09l-5.282-1.453-1.414 5.273 5.282 1.453z" /></svg>;
  if (name === "github") return <svg {...common}><path d="M12 2.1a9.9 9.9 0 0 0-3.13 19.3c.5.1.68-.22.68-.48v-1.69c-2.78.61-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.02 1.53 1.02.9 1.53 2.36 1.09 2.94.83.09-.65.35-1.09.64-1.34-2.22-.25-4.55-1.11-4.55-4.95 0-1.09.39-1.98 1.02-2.68-.1-.25-.44-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.54 1.37.2 2.39.1 2.64.63.7 1.02 1.59 1.02 2.68 0 3.85-2.34 4.7-4.57 4.95.36.31.68.92.68 1.85v2.74c0 .26.18.58.69.48A9.9 9.9 0 0 0 12 2.1Z" /></svg>;
  if (name === "twitch") return <svg {...common}><path d="M4 3h17v12.2l-5.3 5.3h-4.1L8 24v-3.5H4V3Zm2 2v13.5h3v1.9l2.1-1.9h3.8l4.1-4.1V5H6Zm4 3h2v5h-2V8Zm4 0h2v5h-2V8Z" /></svg>;
  return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="17.5" cy="6.5" r="1.2" /></svg>;
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

function PencilIcon({ size = 20 }: { size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  return <svg {...common}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>;
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return <button type="button" className={`toggle ${value ? "on" : ""}`} onClick={() => onChange(!value)} aria-label="Toggle"><span /></button>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}{hint && <small>{hint}</small>}</span>{children}</label>;
}

function Setting({ label, text, children }: { label: string; text: string; children: React.ReactNode }) {
  return <div className="setting"><div><b>{label}</b><span>{text}</span></div>{children}</div>;
}

function Range({ label, value, min, max, suffix = "", onChange }: { label: string; value: number; min: number; max: number; suffix?: string; onChange: (v: number) => void }) {
  const progress = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return <div className="range"><div><span>{label}</span><b>{value}{suffix}</b></div><input type="range" min={min} max={max} value={value} style={{ "--range-progress": `${progress}%` } as React.CSSProperties} onChange={e => onChange(Number(e.target.value))} /></div>;
}

function Colour({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const safe = /^#[0-9a-f]{6}$/i.test(value) ? value : "#ffffff";
  return <div className="colour-field"><span>{label}</span><div><input type="color" value={safe} onChange={e => onChange(e.target.value)} /><input type="text" value={value} onChange={e => onChange(e.target.value)} /></div></div>;
}

function FileUpload({ label, value, accept, type, onChange, note }: { label: string; value: string; accept: string; type: "image" | "video" | "audio"; onChange: (v: string) => void; note?: string }) {
  const [busy, setBusy] = useState(false);
  const handle = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const imageByExtension = ["png", "jpg", "jpeg", "webp", "gif", "avif"].includes(extension);
    const audioByExtension = ["mp3"].includes(extension);
    const videoByExtension = ["mp4", "webm", "m4v", "mov"].includes(extension);
    const isImage = file.type.startsWith("image/") || imageByExtension;
    const isAudio = file.type.startsWith("audio/") || audioByExtension;
    const isVideo = file.type.startsWith("video/") || videoByExtension;
    const limits = { image: 25, video: 50, audio: 50 };
    const max = limits[type] * 1024 * 1024;
    if (file.size > max) { alert(`Please use a ${type} smaller than ${limits[type]}MB.`); return; }
    const valid = type === "image" ? isImage : type === "video" ? isVideo : isAudio;
    if (!valid) { alert(`Please choose a valid ${type} file.`); return; }
    try {
      setBusy(true);
      const storedFile = file;
      onChange(await saveAsset(storedFile));
    } catch (error) {
      alert(error instanceof Error ? error.message : "The file could not be stored. Please try another file.");
    } finally {
      setBusy(false);
    }
  };
  const fallbackNote = type === "video" ? "MP4 / WebM · up to 50MB" : type === "audio" ? "MP3 only · up to 50MB" : "Choose a file";
  return <div className="upload-row"><div><b>{label}</b><span>{value ? "File selected" : note || fallbackNote}</span></div><label className={`upload-button ${busy ? "upload-busy" : ""}`}>{busy ? "Saving…" : "Browse"}<input type="file" accept={accept} onChange={handle} disabled={busy} /></label>{value && <button type="button" className="clear-button" onClick={async () => { await deleteAsset(value); onChange(""); }}>Clear</button>}</div>;
}
function SectionIntro({ title }: { number?: string; title: string; text?: string }) {
  return <div className="section-intro"><h2>{title}</h2></div>;
}

export default function Dashboard() {
  const [active, setActive] = useState("General");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [settings, setSettings] = useState<ProfileSettings>(defaultSettings);
  const [settingsReady, setSettingsReady] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [previewEntered, setPreviewEntered] = useState(false);
  const [previewEntering, setPreviewEntering] = useState(false);
  const [previewPointer, setPreviewPointer] = useState({ x: 0, y: 0 });
  const [previewParallaxReturning, setPreviewParallaxReturning] = useState(false);
  const previewParallaxReturnTimerRef = useRef<number | null>(null);
  const previewPointerBoundsRef = useRef<DOMRect | null>(null);
  const previewAssetsLoadedRef = useRef(false);
  const [profileUserId, setProfileUserId] = useState("");
  const [viewToolAmount, setViewToolAmount] = useState("100");
  const [viewToolUsername, setViewToolUsername] = useState("");
  const [viewToolMessage, setViewToolMessage] = useState("");
  const [viewToolBusy, setViewToolBusy] = useState(false);
  const [savedIdentity, setSavedIdentity] = useState({ username: "", displayName: "" });
  const [badgesHidden, setBadgesHidden] = useState(false);
  const [dashboardBadges, setDashboardBadges] = useState<DashboardBadge[]>([]);
  const [dashboardBadgesLoading, setDashboardBadgesLoading] = useState(false);
  const [dashboardBadgesError, setDashboardBadgesError] = useState("");
  const canManageOwnViews = profileUserId === "3f29f647-4b99-4f53-adf0-eb678bef1c5f";
  const [usernameChangeAvailableAt, setUsernameChangeAvailableAt] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [profileCopied, setProfileCopied] = useState(false);
  const [viewLeaderboard, setViewLeaderboard] = useState<{ leaderboard: { username: string; displayName: string; views: number; rank: number }[]; viewer: { username: string; displayName: string; views: number; rank: number } | null; totalProfiles: number } | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState("");
  useEffect(() => {
    if (active !== "Stats" || !settingsReady || !settings.username || viewLeaderboard || leaderboardLoading) return;
    let cancelled = false;
    setLeaderboardLoading(true);
    setLeaderboardError("");
    fetch('/api/profile-stats?username=' + encodeURIComponent(settings.username), { cache: "no-store" })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not load leaderboard."); return data; })
      .then(data => { if (!cancelled) setViewLeaderboard(data); })
      .catch(error => { if (!cancelled) setLeaderboardError(error instanceof Error ? error.message : "Could not load leaderboard."); })
      .finally(() => { if (!cancelled) setLeaderboardLoading(false); });
    return () => { cancelled = true; };
  }, [active, settingsReady, settings.username]);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile/badges-visibility", { cache: "no-store" }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to load badge visibility."); return data; }).then(data => { if (!cancelled) setBadgesHidden(Boolean(data.hidden)); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);


  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [previewAssets, setPreviewAssets] = useState({ avatar: "", banner: "", backgroundImage: "", backgroundVideo: "", enterScreenBackgroundImage: "", enterScreenBackgroundVideo: "", musicCover: "", customLinkIcons: {} as Record<string, string> });
  const [draftTrack, setDraftTrack] = useState<{ title: string; artist: string; audio: string; cover: string }>({ title: "", artist: "", audio: "", cover: "" });
  const [discordUser, setDiscordUser] = useState<{ id?: string; username?: string; discordId?: string; discordUsername?: string; discordDisplayName?: string; discordAvatar?: string; discordAvatarDecoration?: string; useDiscordAvatar?: boolean; useDiscordDecoration?: boolean } | null>(null);

  useEffect(() => {
    if (active !== "Badges" || !settingsReady || !discordUser) return;
    let cancelled = false;
    setDashboardBadgesLoading(true);
    setDashboardBadgesError("");
    fetch(`/api/public-profile/${encodeURIComponent(settings.username)}`, { cache: "no-store" })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.profile) throw new Error(data.error || "Could not load your badges.");
        return data.profile.badges as DashboardBadge[] | undefined;
      })
      .then(badges => { if (!cancelled) setDashboardBadges(Array.isArray(badges) ? badges : []); })
      .catch(error => { if (!cancelled) setDashboardBadgesError(error instanceof Error ? error.message : "Could not load your badges."); })
      .finally(() => { if (!cancelled) setDashboardBadgesLoading(false); });
    return () => { cancelled = true; };
  }, [active, settingsReady, settings.username, discordUser]);
  const [discordLoading, setDiscordLoading] = useState(true);
  const [discordNotice, setDiscordNotice] = useState<"connected" | "error" | "already-linked" | "not-member" | "cancelled" | null>(null);
  const [discordDetail, setDiscordDetail] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const discordStatus = params.get("discord");
    const detail = params.get("discord_detail");
    if (["connected", "error", "already-linked", "not-member", "cancelled"].includes(discordStatus || "")) setDiscordNotice(discordStatus as "connected" | "error" | "already-linked" | "not-member" | "cancelled");
    if (detail) setDiscordDetail(detail);
    if (discordStatus) window.history.replaceState({}, "", "/dashboard");

    let active = true;
    async function initialiseAccount() {
      try {
        const sessionResponse = await fetch("/api/auth/session", { cache: "no-store", credentials: "include" });
        const sessionData = await sessionResponse.json().catch(() => ({}));
        if (!active) return;
        if (!sessionResponse.ok || !sessionData.user?.id) {
          window.location.href = "/login?next=/dashboard";
          return;
        }

        const accountResponse = await fetch("/api/account", { cache: "no-store", credentials: "include" });
        const accountData = await accountResponse.json().catch(() => ({}));
        if (!active) return;
        if (!accountResponse.ok || !accountData.profile) {
          window.location.href = "/login?next=/dashboard";
          return;
        }

        const authUser = sessionData.user as { id: string; email?: string; user_metadata?: { username?: string; display_name?: string; full_name?: string } };
        const profile = accountData.profile as { id?: string; username?: string; displayName?: string; usernameChangeAvailableAt?: string | null };
        const username = String(profile.username || authUser.user_metadata?.username || authUser.email?.split("@")[0] || "user").trim().toLowerCase();
        const displayName = String(profile.displayName || authUser.user_metadata?.display_name || authUser.user_metadata?.full_name || username).trim() || username;
        const localSettings = loadSettingsForAccount(authUser.id, { username, displayName });
        const cloudSettings = accountData.profile.settings && typeof accountData.profile.settings === "object" ? accountData.profile.settings as Partial<ProfileSettings> : {};
        const cloudHasSettings = Object.keys(cloudSettings).length > 0;
        let loaded = normaliseProfileSettings(cloudHasSettings ? { ...localSettings, ...cloudSettings, username, displayName } : localSettings, { username, displayName });
        const migrate = async (value: string) => {
          if (!value.startsWith("idb:")) return value;
          try { return await migrateAssetToCloud(value) || value; } catch { return value; }
        };
        const [avatar, banner, backgroundImage, backgroundVideo, enterScreenBackgroundImage, enterScreenBackgroundVideo, musicTracks, customLinks] = await Promise.all([
          migrate(loaded.avatar),
          migrate(loaded.banner),
          migrate(loaded.backgroundImage),
          migrate(loaded.backgroundVideo),
          migrate(loaded.enterScreenBackgroundImage),
          migrate(loaded.enterScreenBackgroundVideo),
          Promise.all(loaded.musicTracks.map(async track => ({ ...track, cover: await migrate(track.cover), audio: await migrate(track.audio) }))),
          Promise.all(loaded.customLinks.map(async link => ({ ...link, icon: await migrate(link.icon) }))),
        ]);
        loaded = { ...loaded, avatar, banner, backgroundImage, backgroundVideo, enterScreenBackgroundImage, enterScreenBackgroundVideo, musicTracks, customLinks };
        const linkedDiscord = accountData.user?.discordId ? accountData.user : null;
        if (accountData.discordUnlinkedForMembership) {
          setDiscordNotice("not-member");
          setDiscordDetail("Your Discord link was removed because this account is no longer in the required server.");
        }

        setProfileUserId(authUser.id);
        setSavedIdentity({ username, displayName });
        setUsernameChangeAvailableAt(profile.usernameChangeAvailableAt || null);
        setDiscordUser(linkedDiscord);
        setSettings({
          ...loaded,
          username,
          displayName,
          // The server profile is the source of truth. Never reuse stale Discord data from another account/browser setting.
          discordAvatarUrl: linkedDiscord?.discordAvatar || "",
          discordAvatarDecorationUrl: linkedDiscord?.discordAvatarDecoration || "",
          useDiscordAvatar: Boolean(linkedDiscord?.useDiscordAvatar),
          useDiscordDecoration: Boolean(linkedDiscord?.useDiscordDecoration),
        });
        setSettingsReady(true);
      } catch {
        if (active) window.location.href = "/login?next=/dashboard";
      } finally {
        if (active) setDiscordLoading(false);
      }
    }
    void initialiseAccount();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!settingsReady) return;
    const timer = window.setTimeout(() => {
      if (profileUserId) {
        const settingsForStorage = savedIdentity.username
          ? { ...settings, username: savedIdentity.username, displayName: savedIdentity.displayName || settings.displayName }
          : settings;
        saveSettingsToStorage(settingsForStorage, accountSettingsStorageKey(profileUserId));
        void fetch("/api/account", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ settings: settingsForStorage }),
        }).then(async response => {
          if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            console.error("Pixlo cloud settings save failed:", result.error || response.status);
            setSaved(false);
            return;
          }
          setSaved(true);
          window.setTimeout(() => setSaved(false), 900);
        }).catch(error => {
          console.error("Pixlo cloud settings save failed:", error);
          setSaved(false);
        });
        return;
      }
      setSaved(true);
      window.setTimeout(() => setSaved(false), 900);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [settings, settingsReady, profileUserId, savedIdentity]);

  useEffect(() => {
    // Do not resolve preview assets from the temporary default state. Wait until the
    // active Supabase account and its account-scoped settings have loaded first.
    if (!settingsReady) return;
    let cancelled = false;
    if (!previewAssetsLoadedRef.current) setPreviewReady(false);
    const track = settings.musicTracks.find(item => item.id === settings.activeMusicId) || settings.musicTracks[0];
    Promise.all([
      loadAsset(settings.avatar), loadAsset(settings.banner), loadAsset(settings.backgroundImage), loadAsset(settings.backgroundVideo),
      loadAsset(settings.enterScreenBackgroundImage), loadAsset(settings.enterScreenBackgroundVideo),
      loadAsset(track?.cover || ""),
      ...settings.customLinks.filter(link => link.icon).map(link => loadAsset(link.icon)),
    ])
      .then(entries => {
        if (cancelled) return;
        const customLinkIcons: Record<string, string> = {};
        const customLinksWithIcons = settings.customLinks.filter(link => link.icon);
        customLinksWithIcons.forEach((link, index) => { customLinkIcons[link.id] = entries[7 + index] as string; });
        setPreviewAssets({ avatar: entries[0] as string, banner: entries[1] as string, backgroundImage: entries[2] as string, backgroundVideo: entries[3] as string, enterScreenBackgroundImage: entries[4] as string, enterScreenBackgroundVideo: entries[5] as string, musicCover: entries[6] as string, customLinkIcons });
        if (!previewAssetsLoadedRef.current) {
          previewAssetsLoadedRef.current = true;
          setPreviewReady(true);
        }
      })
      .catch(() => {
        // A missing optional asset should not leave the preview hidden forever.
        if (!cancelled && !previewAssetsLoadedRef.current) {
          previewAssetsLoadedRef.current = true;
          setPreviewReady(true);
        }
      });
    return () => { cancelled = true; };
  }, [settingsReady, settings.avatar, settings.banner, settings.backgroundImage, settings.backgroundVideo, settings.enterScreenBackgroundImage, settings.enterScreenBackgroundVideo, settings.customLinks, settings.musicTracks, settings.activeMusicId]);

  const set = <K extends keyof ProfileSettings>(key: K, value: ProfileSettings[K]) => { setSettings(s => ({ ...s, [key]: value })); setSaved(false); };

  const adjustOwnViews = async (action: "add" | "remove") => {
    const amount = Number(viewToolAmount);
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 1000000) {
      setViewToolMessage("Enter a whole number from 1 to 1,000,000.");
      return;
    }
    setViewToolBusy(true);
    setViewToolMessage("");
    try {
      const response = await fetch("/api/admin/profile-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, amount, username: viewToolUsername.trim() || settings.username }),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not adjust your views.");
      const targetUsername = (viewToolUsername.trim() || settings.username).toLowerCase();
      if (targetUsername === settings.username.toLowerCase()) {
        setSettings(current => ({ ...current, views: Number(data.views) || 0 }));
        setViewLeaderboard(null);
        setLeaderboardError("");
      }
      setViewToolMessage(action === "add" ? `Added ${amount.toLocaleString()} views to @${targetUsername}. Total: ${Number(data.views).toLocaleString()}.` : `Removed views from @${targetUsername}. Total: ${Number(data.views).toLocaleString()}.`);
    } catch (error) {
      setViewToolMessage(error instanceof Error ? error.message : "Could not adjust your views.");
    } finally {
      setViewToolBusy(false);
    }
  };
  useEffect(() => {
    if (!profileUserId) return;
    let active = true;
    const checkMembership = async () => {
      try {
        const response = await fetch("/api/account", { cache: "no-store", credentials: "include" });
        const data = await response.json().catch(() => ({}));
        if (!active || !response.ok) return;
        if (data.discordUnlinkedForMembership) {
          setDiscordUser(null);
          setDiscordNotice("not-member");
          setDiscordDetail("Your Discord link was removed because this account is no longer in the required server.");
          setSettings(current => {
            const next = { ...current, discordAvatarUrl: "", discordAvatarDecorationUrl: "", useDiscordAvatar: false, useDiscordDecoration: false };
            saveSettingsToStorage(next, accountSettingsStorageKey(profileUserId));
            return next;
          });
        } else if (data.user?.discordId) {
          setDiscordUser(data.user);
        }
      } catch { /* don't turn a temporary network error into a false disconnect */ }
    };
    const timer = window.setInterval(() => { void checkMembership(); }, 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [profileUserId]);

  const setSocial = (key: SocialKey, value: string) => {
    setSettings(s => {
      const order = Array.isArray(s.activeLinkOrder) && s.activeLinkOrder.length ? [...s.activeLinkOrder] : socials.filter(([socialKey]) => s.socials[socialKey]).map(([socialKey]) => `social:${socialKey}`).concat(s.customLinks.map(link => `custom:${link.id}`));
      const activeKey = `social:${key}`;
      if (value && !order.includes(activeKey)) order.push(activeKey);
      return { ...s, socials: { ...s.socials, [key]: value }, activeLinkOrder: order };
    });
    setSaved(false);
  };
  const addCustomLink = () => {
    const id = crypto.randomUUID();
    setSettings(current => ({ ...current, customLinks: [...current.customLinks, { id, url: "", icon: "" }], activeLinkOrder: [...(Array.isArray(current.activeLinkOrder) ? current.activeLinkOrder : []), `custom:${id}`] }));
    setSaved(false);
  };
  const updateCustomLink = (id: string, patch: Partial<CustomLink>) => {
    setSettings(current => ({ ...current, customLinks: current.customLinks.map(link => link.id === id ? { ...link, ...patch } : link) }));
    setSaved(false);
  };
  const uploadCustomLinkIcon = async (id: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const validImage = file.type.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "avif"].includes(extension);
    if (!validImage) { alert("Please choose an image for the custom link icon."); return; }
    if (file.size > 5 * 1024 * 1024) { alert("Custom link icons must be 5MB or smaller."); return; }
    try {
      const current = settings.customLinks.find(link => link.id === id);
      const next = await saveAsset(file);
      if (current?.icon) await deleteAsset(current.icon);
      updateCustomLink(id, { icon: next });
    } catch { alert("The custom link icon could not be stored."); }
  };
  const removeCustomLink = async (id: string) => {
    const current = settings.customLinks.find(link => link.id === id);
    if (current?.icon) await deleteAsset(current.icon);
    setSettings(s => ({ ...s, customLinks: s.customLinks.filter(link => link.id !== id), activeLinkOrder: (Array.isArray(s.activeLinkOrder) ? s.activeLinkOrder : []).filter(key => key !== `custom:${id}`) }));
    setSaved(false);
  };
  const clearCustomLinkIcon = async (id: string) => {
    const current = settings.customLinks.find(link => link.id === id);
    if (current?.icon) await deleteAsset(current.icon);
    updateCustomLink(id, { icon: "" });
  };
  const reorderActiveLinks = (fromKey: string, toKey: string) => {
    if (fromKey === toKey) return;
    setSettings(current => {
      const validKeys = [
        ...socials.filter(([key]) => current.socials[key]).map(([key]) => `social:${key}`),
        ...current.customLinks.filter(link => link.url).map(link => `custom:${link.id}`),
      ];
      const existingOrder = Array.isArray(current.activeLinkOrder) ? current.activeLinkOrder : [];
      const order = [...existingOrder.filter(key => validKeys.includes(key)), ...validKeys.filter(key => !existingOrder.includes(key))];
      const fromIndex = order.indexOf(fromKey);
      const toIndex = order.indexOf(toKey);
      if (fromIndex < 0 || toIndex < 0) return current;
      const next = [...order];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return { ...current, activeLinkOrder: next };
    });
    setSaved(false);
  };
  const activeLinkKeys = useMemo(() => {
    const validKeys = [
      ...socials.filter(([key]) => settings.socials[key]).map(([key]) => `social:${key}`),
      ...settings.customLinks.filter(link => link.url).map(link => `custom:${link.id}`),
    ];
    const order = Array.isArray(settings.activeLinkOrder) ? settings.activeLinkOrder : [];
    return [...order.filter(key => validKeys.includes(key)), ...validKeys.filter(key => !order.includes(key))];
  }, [settings]);
  const save = async () => {
    if (!profileUserId) return;
    setSaved(false);
    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: settings.username, displayName: settings.displayName }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.profile) {
        window.alert(data.error || "Unable to save your account identity.");
        setSettings(current => ({ ...current, username: savedIdentity.username || current.username, displayName: savedIdentity.displayName || current.displayName }));
        return;
      }
      const nextSettings = { ...settings, username: data.profile.username, displayName: data.profile.displayName };
      setSettings(nextSettings);
      setSavedIdentity({ username: data.profile.username, displayName: data.profile.displayName });
      setUsernameChangeAvailableAt(data.profile.usernameChangeAvailableAt || null);
      saveSettingsToStorage(nextSettings, accountSettingsStorageKey(profileUserId));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch {
      window.alert("Couldn't save your account identity. Check your connection and try again.");
    }
  };
  const reset = () => {
    if (!confirm("Reset profile settings? Your username, display name and views will be kept.")) return;
    const identity = { username: savedIdentity.username || settings.username, displayName: savedIdentity.displayName || settings.displayName, views: settings.views };
    const next = { ...defaultSettings, ...identity, discordAvatarUrl: settings.discordAvatarUrl, discordAvatarDecorationUrl: settings.discordAvatarDecorationUrl, useDiscordAvatar: settings.useDiscordAvatar, useDiscordDecoration: settings.useDiscordDecoration };
    if (profileUserId) saveSettingsToStorage(next, accountSettingsStorageKey(profileUserId));
    setSettings(next);
    setSaved(false);
  };
  const usernameLocked = Boolean(usernameChangeAvailableAt && Date.now() < new Date(usernameChangeAvailableAt).getTime());
  const usernameLockHint = usernameLocked && usernameChangeAvailableAt
    ? `Username locked until ${new Date(usernameChangeAvailableAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}. You can change it once every 3 days.`
    : "Usernames can be changed once every 3 days. Changing it updates your profile URL.";
  const profileUrl = `https://pixlo1.vercel.app/${settings.username || "username"}`;
  const copyProfileUrl = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setProfileCopied(true);
      window.setTimeout(() => setProfileCopied(false), 1800);
    } catch {
      window.prompt("Copy your Pixlo profile link:", profileUrl);
    }
  };
  const previewAvatar = settings.useDiscordAvatar && settings.discordAvatarUrl ? settings.discordAvatarUrl : previewAssets.avatar;
  const previewDecoration = settings.useDiscordDecoration && settings.discordAvatarDecorationUrl ? settings.discordAvatarDecorationUrl : "";
  const activeTrack = settings.musicTracks.find(t => t.id === settings.activeMusicId) || settings.musicTracks[0];
  const previewVisible = settingsReady && previewReady;
  const previewParallaxPower = settings.parallax && settings.parallaxStrength > 0
    ? Math.pow(Math.min(35, Math.max(0, settings.parallaxStrength)) / 35, 0.72)
    : 0;
  const previewGlowRadius = Math.max(18, settings.glowIntensity * 1.8);
  const previewGlowAlpha = Math.min(0.85, Math.max(0.18, settings.glowIntensity / 100));
  const previewShadow = settings.glow
    ? `0 0 ${previewGlowRadius}px ${rgbaFromHex(settings.accentColour, previewGlowAlpha)}, 0 0 ${Math.max(28, previewGlowRadius * 2.2)}px ${rgbaFromHex(settings.accentColour, previewGlowAlpha * 0.35)}, 0 28px 90px ${rgbaFromHex("#000000", Math.max(0.2, settings.shadowOpacity / 100))}`
    : `0 28px 90px ${rgbaFromHex("#000000", settings.shadowOpacity / 100)}`;
  const readableTextOpacity = Math.max(85, Math.min(100, Number(settings.textOpacity) || 0));

  const previewStyle = useMemo(() => ({
    "--accent": settings.accentColour,
    "--preview-background": settings.backgroundColour,
    "--preview-background-scale-factor": `${Math.max(1, settings.backgroundScale / 100)}`,
    "--preview-avatar-setting-size": `${settings.avatarSize}px`,
    "--preview-content-spacing-setting": `${settings.contentSpacing}px`,
    "--preview-card-shadow": previewShadow,
    "--preview-text": settings.textColour,
    "--preview-text-opacity": `${readableTextOpacity}%`,
    "--preview-card-opacity": `${settings.profileOpacity / 100}`,
    "--preview-card-bg": `rgba(${parseInt(settings.backgroundColour.slice(1,3), 16) || 0},${parseInt(settings.backgroundColour.slice(3,5), 16) || 0},${parseInt(settings.backgroundColour.slice(5,7), 16) || 0},${settings.profileOpacity / 100})`,
    "--preview-secondary-opacity": `${readableTextOpacity / 100}`,
    "--preview-text-color": `rgba(${parseInt(settings.textColour.slice(1,3), 16) || 255},${parseInt(settings.textColour.slice(3,5), 16) || 255},${parseInt(settings.textColour.slice(5,7), 16) || 255},${readableTextOpacity / 100})`,
    "--preview-blur": `${settings.profileBlur}px`,
    "--preview-radius": `${settings.borderRadius}px`,
    "--preview-border-opacity": `${settings.borderOpacity / 100}`,
    "--preview-card-width": `${settings.cardWidth}px`,
    "--preview-position": `${settings.backgroundPositionX}% ${settings.backgroundPositionY}%`,
    "--preview-scale": `${settings.backgroundScale}% auto`,
    "--preview-overlay": `${settings.backgroundOverlay / 100}`,
    "--preview-vignette": `${settings.vignette / 100}`,
    "--preview-glow": `${Math.max(0, settings.glowIntensity * 0.8)}px`,
    "--preview-font": fontFamily(settings.customFont),
    "--preview-parallax-x": `${settings.parallax ? previewPointer.x * settings.parallaxStrength : 0}px`,
    "--preview-parallax-y": `${settings.parallax ? previewPointer.y * settings.parallaxStrength : 0}px`,
    "--preview-parallax-rotate-x": `${previewPointer.y * -16 * previewParallaxPower}deg`,
    "--preview-parallax-rotate-y": `${previewPointer.x * 19 * previewParallaxPower}deg`,
    "--preview-parallax-light-x": `${50 + previewPointer.x * 45 * previewParallaxPower}%`,
    "--preview-parallax-light-y": `${50 + previewPointer.y * 45 * previewParallaxPower}%`,
    "--preview-parallax-shadow-x": `${previewPointer.x * -10 * previewParallaxPower}px`,
    "--preview-parallax-shadow-y": `${previewPointer.y * -8 * previewParallaxPower}px`,
    backgroundColor: settings.backgroundColour,
  } as React.CSSProperties), [settings, previewPointer, previewParallaxPower, previewShadow]);

  const updatePreviewPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!settings.parallax || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (previewParallaxReturnTimerRef.current !== null) window.clearTimeout(previewParallaxReturnTimerRef.current);
    previewParallaxReturnTimerRef.current = null;
    setPreviewParallaxReturning(false);
    const bounds = previewPointerBoundsRef.current || event.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5) * 2));
    const y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / Math.max(bounds.height, 1) - 0.5) * 2));
    setPreviewPointer(previous => Math.abs(previous.x - x) < 0.002 && Math.abs(previous.y - y) < 0.002 ? previous : { x, y });
  };
  const handlePreviewPointerEnter = (event: React.PointerEvent<HTMLDivElement>) => {
    if (previewParallaxReturnTimerRef.current !== null) window.clearTimeout(previewParallaxReturnTimerRef.current);
    previewParallaxReturnTimerRef.current = null;
    setPreviewParallaxReturning(false);
    previewPointerBoundsRef.current = event.currentTarget.getBoundingClientRect();
  };
  const handlePreviewPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch" || !settings.parallax) return;
    previewPointerBoundsRef.current = event.currentTarget.getBoundingClientRect();
    updatePreviewPointer(event);
  };
  const resetPreviewPointer = () => {
    previewPointerBoundsRef.current = null;
    setPreviewParallaxReturning(true);
    setPreviewPointer({ x: 0, y: 0 });
    if (previewParallaxReturnTimerRef.current !== null) window.clearTimeout(previewParallaxReturnTimerRef.current);
    previewParallaxReturnTimerRef.current = window.setTimeout(() => {
      setPreviewParallaxReturning(false);
      previewParallaxReturnTimerRef.current = null;
    }, 700);
  };
  const handlePreviewPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || event.type === "pointercancel") resetPreviewPointer();
  };

  const addTrack = () => {
    if (!draftTrack.audio || !draftTrack.title.trim()) { alert("Add an audio file and give the track a name first."); return; }
    const track: MusicTrack = { id: crypto.randomUUID(), title: draftTrack.title.trim(), artist: draftTrack.artist.trim() || "Unknown artist", audio: draftTrack.audio, cover: draftTrack.cover };
    setSettings(s => ({ ...s, musicTracks: [...s.musicTracks, track], activeMusicId: s.activeMusicId || track.id }));
    setDraftTrack({ title: "", artist: "", audio: "", cover: "" });
  };

  const handleBackgroundVideoChange = (url: string) => {
    setSettings(current => {
      const importedTrack = current.musicTracks.find(track => track.source === "background-video");
      if (!url) {
        const musicTracks = current.musicTracks.filter(track => track.source !== "background-video");
        return { ...current, backgroundVideo: "", backgroundVideoMusicDisabled: false, musicTracks, activeMusicId: importedTrack && current.activeMusicId === importedTrack.id ? musicTracks[0]?.id || "" : current.activeMusicId };
      }
      if (importedTrack) {
        return { ...current, backgroundVideo: url, backgroundVideoMusicDisabled: false, musicTracks: current.musicTracks.map(track => track.source === "background-video" ? { ...track, audio: url } : track), activeMusicId: importedTrack.id };
      }
      const track: MusicTrack = { id: crypto.randomUUID(), title: "Imported Music", artist: "Background video", audio: url, cover: "", source: "background-video" };
      return { ...current, backgroundVideo: url, backgroundVideoMusicDisabled: false, musicTracks: [...current.musicTracks, track], activeMusicId: track.id };
    });
  };

  const removeTrack = async (track: MusicTrack) => {
    await deleteAsset(track.audio);
    if (track.cover) await deleteAsset(track.cover);
    setSettings(s => {
      const tracks = s.musicTracks.filter(t => t.id !== track.id);
      return { ...s, backgroundVideoMusicDisabled: track.source === "background-video" ? true : s.backgroundVideoMusicDisabled, musicTracks: tracks, activeMusicId: s.activeMusicId === track.id ? tracks[0]?.id || "" : s.activeMusicId };
    });
  };

  return <main className="dashboard">
    <aside className={`sidebar ${mobileMenu ? "mobile-open" : ""}`}>
      <div className="brand"><div className="brand-logo-shell"><img className="brand-logo" src="/pixlo-logo.png" alt="Pixlo" /></div><small>Profile customization</small></div>
      <nav>{sections.map(([name]) => <button type="button" key={name} className={active === name ? "active" : ""} onClick={() => { setActive(name); setMobileMenu(false); setPreviewEntered(false); setPreviewEntering(false); }}><span className="nav-dot" /><b>{name}</b></button>)}</nav>
      <div className="sidebar-bottom"><button type="button" className="reset-button" style={{ color: "#ffffff", WebkitTextFillColor: "#ffffff" }} onClick={reset}>Reset to default</button></div>
    </aside>

    <div className="dashboard-main">
      <header className="dash-header">
        <button type="button" className="mobile-menu-button" onClick={() => setMobileMenu(v => !v)}>☰</button>
        <div className="header-copy"><h1>{active}</h1></div>
        <div className="header-actions"><a className="view-button view-button-primary" href={profileUrl} target="_blank" rel="noreferrer">View live profile ↗</a><button type="button" className="save-button" onClick={save}>{saved ? "✓ Saved" : "Save changes"}</button></div>
      </header>

      <div className="editor-grid">
        <section className="editor">
          {active === "Badges" && <div className="form-stack">
            <SectionIntro title="Your Pixlo badges" />
            {!discordUser ? <section className="discord-connect-card" style={{ padding: 24, borderRadius: 18 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div className="discord-connect-icon"><SocialIcon name="discord" /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: "0 0 8px", fontSize: 20 }}>Badges are locked</h3>
                  <p style={{ margin: "0 0 18px", lineHeight: 1.65, opacity: 0.82 }}>Unlock this section once you link Discord and join the official Pixlo Discord server.</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    <a className="connect-button" href="https://discord.gg/Bkz4P9gVy7" target="_blank" rel="noreferrer">Join official server ↗</a>
                    <a className="connect-button discord-connect-action" href="/api/auth/discord">Link Discord <span aria-hidden="true">↗</span></a>
                  </div>
                  <p style={{ margin: "14px 0 0", fontSize: 12, opacity: 0.65 }}>Join the server first, then link your Discord account to unlock your badges.</p>
                </div>
              </div>
            </section> : <>
              <p className="hint">Your earned Pixlo badges appear here. Badges are linked to your Discord membership and eligible server roles.</p>
              <p className="hint">Switch badges on to equip them. Drag using the three-line handle to choose their order. Changes apply when you save.</p>
              <Setting label="Badge position" text="Show equipped badges below your username or in an Active Badges section at the bottom."><select value={settings.badgePosition} onChange={e => { set("badgePosition", e.target.value as "username" | "bottom"); setSaved(false); }}><option value="username">Below username</option><option value="bottom">Active Badges at bottom</option></select></Setting>
              <div className="colour-grid"><Colour label="Badge colour" value={settings.badgeColour} onChange={v => { set("badgeColour", v); setSaved(false); }} /><Setting label="Badge glow" text="Add a stronger coloured glow to equipped badges."><Toggle value={settings.badgeGlow} onChange={v => { set("badgeGlow", v); setSaved(false); }} /></Setting></div>
              {dashboardBadgesLoading ? <div className="empty-state">Loading your badges…</div> : dashboardBadgesError ? <div className="discord-error-notice">{dashboardBadgesError}</div> : dashboardBadges.length === 0 ? <div className="empty-state">You haven't earned any badges yet. Keep an eye on the official Pixlo Discord server for roles and rewards.</div> : <div className="active-links-list pixlo-badge-editor-list">
                {[...dashboardBadges].sort((a,b) => { const order = settings.activeBadgeOrder || []; const ai = order.indexOf(a.id), bi = order.indexOf(b.id); return (ai < 0 ? 9999 : ai) - (bi < 0 ? 9999 : bi); }).map(badge => {
                  const equipped = settings.activeBadgeIds.includes(badge.id);
                  return <div className="active-link-row" key={badge.id} draggable onDragStart={event => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", badge.id); event.currentTarget.classList.add("dragging"); }} onDragEnd={event => event.currentTarget.classList.remove("dragging")} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const from = event.dataTransfer.getData("text/plain"); if (!from || from === badge.id) return; setSettings(current => { const valid = dashboardBadges.map(item => item.id); const order = [...(current.activeBadgeOrder || []).filter(id => valid.includes(id)), ...valid.filter(id => !(current.activeBadgeOrder || []).includes(id))]; const a = order.indexOf(from), b = order.indexOf(badge.id); if (a < 0 || b < 0) return current; const next = [...order]; const [moved] = next.splice(a, 1); next.splice(b, 0, moved); return { ...current, activeBadgeOrder: next }; }); setSaved(false); }}>
                    <span className="active-link-handle" title="Drag to reorder" aria-hidden="true"><i /><i /><i /></span>
                    <div className="badge-admin-icon">{badge.icon_url ? <img src={badge.icon_url} alt="" /> : <span>✦</span>}</div>
                    <div className="active-link-info"><b>{badge.name}</b><span>{badge.description || "Pixlo badge"}</span></div>
                    <Toggle value={equipped} onChange={v => { setSettings(current => ({ ...current, activeBadgeIds: v ? [...current.activeBadgeIds, badge.id] : current.activeBadgeIds.filter(id => id !== badge.id) })); setSaved(false); }} />
                  </div>;
                })}
              </div>}
            </>}
          </div>}

          {active === "General" && <div className="form-stack">
            <SectionIntro number="01" title="Identity, presence and first impression" text="Control exactly what visitors see before they explore anything else." />
            <Field label="Username" hint={usernameLockHint}><input value={settings.username} disabled={usernameLocked} maxLength={24} autoCapitalize="none" autoCorrect="off" onChange={e => set("username", e.target.value.replace(/[^a-zA-Z0-9._-]/g, "").toLowerCase().slice(0, 24))} /></Field>
            <div className="url-preview" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><span>Your profile: <b style={{ overflowWrap: "anywhere" }}>{profileUrl}</b></span><button type="button" onClick={() => void copyProfileUrl()} style={{ flexShrink: 0, padding: "8px 12px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.08)", color: "inherit", cursor: "pointer", font: "inherit" }}>{profileCopied ? "✓ Copied!" : "Copy link"}</button></div>
            <Field label="Display name"><input value={settings.displayName} onChange={e => set("displayName", e.target.value)} /></Field>
            <Field label="Bio / description"><textarea value={settings.description} onChange={e => set("description", e.target.value)} placeholder="Tell people about yourself..." /></Field>
            <Field label="Location"><input value={settings.location} onChange={e => set("location", e.target.value)} placeholder="London, United Kingdom" /></Field>
            {discordNotice === "connected" && <div className="discord-success-notice">Discord connected successfully. Your Discord account is now linked to Pixlo.</div>}
            {discordNotice === "already-linked" && <div className="discord-error-notice">That Discord account is already linked to another Pixlo account.</div>}
            {discordNotice === "not-member" && <div className="discord-error-notice">{discordDetail || "You need to join the official Pixlo Discord server before linking your account."} <a href="https://discord.gg/Bkz4P9gVy7" target="_blank" rel="noreferrer">Join the official Pixlo server</a></div>}
            {discordNotice === "cancelled" && <div className="discord-error-notice">Discord linking was cancelled.</div>}
            {discordNotice === "error" && <div className="discord-error-notice">Discord linking failed. {discordDetail || "Try connecting again."}</div>}
            <section className="discord-connect-card dashboard-discord-card" aria-label="Discord connection">
              <div className="discord-card-top">
                <div className="discord-connect-icon"><SocialIcon name="discord" /></div>
                <div className="discord-connect-copy">
                  <div className="discord-title-line">
                    <b>{discordUser ? `Discord connected · ${discordUser.discordUsername || discordUser.username || "Account"}` : "Connect your Discord"}</b>
                    {discordUser && <span className="discord-linked-pill"><i /> Linked</span>}
                  </div>
                  <p>{discordUser ? "Your Discord account is linked to this Pixlo account." : <>Connect your Discord account to bring your avatar and decoration into your Pixlo profile. <strong>Requirement: you must join the official Pixlo Discord server first.</strong> <a href="https://discord.gg/Bkz4P9gVy7" target="_blank" rel="noreferrer">Join the official server ↗</a></>}</p>
                </div>
                {discordUser ? <button type="button" className="discord-disconnect-button" onClick={async () => { const response = await fetch("/api/account", { method: "DELETE", credentials: "include" }); if (response.ok) { setDiscordUser(null); setDiscordNotice(null); set("useDiscordAvatar", false); set("useDiscordDecoration", false); set("discordAvatarUrl", ""); set("discordAvatarDecorationUrl", ""); } else { const data = await response.json().catch(() => ({})); window.alert(data.error || "Couldn't disconnect Discord."); } }}>Disconnect</button> : <a className="connect-button discord-connect-action" href="/api/auth/discord">Connect Discord <span aria-hidden="true">↗</span></a>}
              </div>
              {discordUser?.discordAvatar && <div className="discord-profile-preview">
                <div className="discord-avatar-stack"><img className="discord-profile-avatar" src={discordUser.discordAvatar} alt="Discord profile" />{discordUser.discordAvatarDecoration && <img className="discord-profile-decoration" src={discordUser.discordAvatarDecoration} alt="" aria-hidden="true" />}</div>
                <div className="discord-profile-preview-copy"><b>{discordUser.discordDisplayName || discordUser.discordUsername || "Discord profile"}</b><span>Avatar synced from Discord</span></div>
              </div>}
              {discordUser && <div className="discord-preferences">
                <Setting label="Use Discord profile picture" text="Use your Discord photo as the avatar on your public Pixlo page."><Toggle value={Boolean(settings.useDiscordAvatar)} onChange={async v => { set("useDiscordAvatar", v); await fetch("/api/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ useDiscordAvatar: v }) }); }} /></Setting>
                <Setting label="Use Discord avatar decoration" text={discordUser.discordAvatarDecoration ? "Show your Discord avatar frame around your Pixlo avatar." : "No Discord avatar decoration was detected on this account yet."}><Toggle value={Boolean(settings.useDiscordDecoration)} onChange={async v => { set("useDiscordDecoration", v); await fetch("/api/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ useDiscordDecoration: v }) }); }} /></Setting>
              </div>}
            </section>
            <Setting label="Show location" text="Display the location underneath your bio."><Toggle value={settings.showLocation} onChange={v => set("showLocation", v)} /></Setting>
            <Setting label="Online status" text="Show the status dot and online indicator."><Toggle value={settings.showDiscord} onChange={v => set("showDiscord", v)} /></Setting>
            <Setting label="View counter" text="Show the profile's view count in the footer."><Toggle value={settings.showViews} onChange={v => set("showViews", v)} /></Setting>
          </div>}

          {active === "Appearance" && <div className="form-stack">
            <SectionIntro number="02" title="Colours, transparency and glass" text="Separate the card's opacity from the text opacity so you can make either one as subtle as you want." />
            <div className="appearance-glow-section">
              <div className="subsection-heading"><div><b>Glow:</b></div></div>
              <Setting label="Name glow" text="Add the accent glow to your display name."><Toggle value={settings.nameGlow} onChange={v => set("nameGlow", v)} /></Setting>
              <Setting label="Description glow" text="Add the accent glow to your profile description."><Toggle value={settings.descriptionGlow} onChange={v => set("descriptionGlow", v)} /></Setting>
              <Setting label="Location glow" text="Add the accent glow to your location."><Toggle value={settings.locationGlow} onChange={v => set("locationGlow", v)} /></Setting>
              <Setting label="Socials glow" text="Add the accent glow around your active social and custom-link icons."><Toggle value={settings.socialsGlow} onChange={v => set("socialsGlow", v)} /></Setting>
              <Range label="Glow intensity" value={settings.glowIntensity} min={0} max={80} suffix="%" onChange={v => set("glowIntensity", v)} />
            </div>
            <div className="colour-grid"><Colour label="Accent" value={settings.accentColour} onChange={v => set("accentColour", v)} /><Colour label="Page background" value={settings.backgroundColour} onChange={v => set("backgroundColour", v)} /><Colour label="Text" value={settings.textColour} onChange={v => set("textColour", v)} /><Colour label="Avatar border" value={settings.avatarBorderColour} onChange={v => set("avatarBorderColour", v)} /></div>
            <div className="presets"><span>Accent presets</span><div>{["#ffffff","#8b5cf6","#3b82f6","#22c55e","#f59e0b","#ec4899","#06b6d4","#ef4444"].map(c => <button type="button" key={c} style={{ background: c }} className={settings.accentColour === c ? "selected" : ""} onClick={() => set("accentColour", c)} />)}</div></div>
            <Range label="Profile opacity" value={settings.profileOpacity} min={0} max={100} suffix="%" onChange={v => set("profileOpacity", v)} />
            <Range label="Text opacity" value={Math.max(85, settings.textOpacity)} min={85} max={100} suffix="%" onChange={v => set("textOpacity", v)} />
            <Range label="Glass blur" value={settings.profileBlur} min={0} max={60} suffix="px" onChange={v => set("profileBlur", v)} />
            <Range label="Card border opacity" value={settings.borderOpacity} min={0} max={100} suffix="%" onChange={v => set("borderOpacity", v)} />
            <Range label="Shadow opacity" value={settings.shadowOpacity} min={0} max={100} suffix="%" onChange={v => set("shadowOpacity", v)} />
            <Range label="Shadow blur" value={settings.shadowBlur} min={0} max={160} suffix="px" onChange={v => set("shadowBlur", v)} />
            <Range label="Corner radius" value={settings.borderRadius} min={0} max={60} suffix="px" onChange={v => set("borderRadius", v)} />

          </div>}
          {active === "Fonts" && <div className="form-stack">
            <SectionIntro number="03" title="Typography & font styling" text="Give every part of your profile its own typeface and weight, with a live preview as you edit." />
            <Field label="Default profile font" hint="Used by profile elements without a separate font choice">
              <select value={settings.customFont} onChange={e => set("customFont", e.target.value as ProfileSettings["customFont"])}>
                {fontOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
            </Field>
            <div className="typography-section">
              <div className="subsection-heading"><div><b>Text styles</b></div><span className="font-section-note">Choose a font and toggle bold or italic per element.</span></div>
              {([
                ["name", "Name", settings.nameFont, settings.nameBold, settings.nameItalic],
                ["username", "Username", settings.usernameFont, settings.usernameBold, settings.usernameItalic],
                ["description", "Description", settings.descriptionFont, settings.descriptionBold, settings.descriptionItalic],
                ["location", "Location", settings.locationFont, settings.locationBold, settings.locationItalic],
                ["socials", "Socials", settings.socialsFont, settings.socialsBold, settings.socialsItalic],
              ] as ["name" | "username" | "description" | "location" | "socials", string, ProfileFont, boolean, boolean][]).map(([key, label, font, bold, italic]) => <div className="typography-row font-row" key={key}>
                <div className="font-row-label"><b>{label}</b></div>
                <div className="font-picker-bar">
                  <FontDropdown id={`font-${key}`} open={openDropdown} setOpen={setOpenDropdown} value={font} onChange={value => set(`${key}Font` as keyof ProfileSettings, value)} />
                  <div className="font-style-buttons" aria-label={`${label} font styles`}>
                    <button type="button" className={bold ? "active" : ""} onClick={() => set(`${key}Bold` as keyof ProfileSettings, !bold)} aria-label={`Toggle bold for ${label}`}><b>B</b></button>
                    <button type="button" className={italic ? "active" : ""} onClick={() => set(`${key}Italic` as keyof ProfileSettings, !italic)} aria-label={`Toggle italic for ${label}`}><i>I</i></button>
                  </div>
                </div>
              </div>)}
            </div>
          </div>}

          {active === "Background" && <div className="form-stack">
            <SectionIntro number="04" title="Build the backdrop" text="Layer colour, images, video, blur and atmosphere independently." />
            <FileUpload label="Background image" value={settings.backgroundImage} accept="image/*" type="image" onChange={v => set("backgroundImage", v)} note="JPG / PNG / WebP · up to 25MB" />
            <FileUpload label="Background video" value={settings.backgroundVideo} accept="video/*,.mp4,.webm,.m4v,.mov" type="video" onChange={handleBackgroundVideoChange} />
            <p className="hint">The video soundtrack is added to Music as “Imported Music”. Choose another track to override it, or remove Imported Music from the library. Visitors may need to interact with the page before audio can start.</p>
            <Range label="Background blur" value={settings.backgroundBlur} min={0} max={30} suffix="px" onChange={v => set("backgroundBlur", v)} />
            <Range label="Background darkness" value={settings.backgroundOverlay} min={0} max={90} suffix="%" onChange={v => set("backgroundOverlay", v)} />
            <Range label="Background scale" value={settings.backgroundScale} min={100} max={160} suffix="%" onChange={v => set("backgroundScale", v)} />
            <Range label="Background X position" value={settings.backgroundPositionX} min={0} max={100} suffix="%" onChange={v => set("backgroundPositionX", v)} />
            <Range label="Background Y position" value={settings.backgroundPositionY} min={0} max={100} suffix="%" onChange={v => set("backgroundPositionY", v)} />
            <Range label="Vignette" value={settings.vignette} min={0} max={100} suffix="%" onChange={v => set("vignette", v)} />
          </div>}

          {active === "Profile" && <div className="form-stack">
            <SectionIntro number="05" title="Make the card yours" text="Control every major profile surface instead of being locked into one fixed design." />
            <FileUpload label="Avatar" value={settings.avatar} accept="image/*" type="image" onChange={v => set("avatar", v)} />
            <FileUpload label="Banner" value={settings.banner} accept="image/*" type="image" onChange={v => set("banner", v)} />
            <Range label="Card width" value={settings.cardWidth} min={420} max={900} suffix="px" onChange={v => set("cardWidth", v)} />
            <Range label="Banner height" value={settings.bannerHeight} min={0} max={300} suffix="px" onChange={v => set("bannerHeight", v)} />
            <Range label="Avatar size" value={settings.avatarSize} min={56} max={180} suffix="px" onChange={v => set("avatarSize", v)} />
            <Range label="Avatar roundness" value={settings.avatarRadius} min={0} max={50} suffix="%" onChange={v => set("avatarRadius", v)} />
            <Range label="Avatar border" value={settings.avatarBorderWidth} min={0} max={12} suffix="px" onChange={v => set("avatarBorderWidth", v)} />
            <Field label="Avatar decoration"><select value={settings.avatarDecoration} onChange={e => set("avatarDecoration", e.target.value as ProfileSettings["avatarDecoration"])}><option value="none">None</option><option value="halo">Halo</option><option value="orbit">Orbit</option><option value="flame">Flame</option></select></Field>
            <Range label="Content spacing" value={settings.contentSpacing} min={6} max={36} suffix="px" onChange={v => set("contentSpacing", v)} />
            <p className="hint">Adjust the inner padding between the card edge and its content. This does not change the card width.</p>
            <Setting label="Show footer" text="Keep the online and view information at the bottom."><Toggle value={settings.showFooter} onChange={v => set("showFooter", v)} /></Setting>
          </div>}

          {active === "Socials" && <div className="form-stack">
            <SectionIntro number="06" title="Social links" text="Add your platform URLs using the original platform logos." />
            <div className="subsection-heading"><div><b>Platforms:</b></div></div>
            <div className="social-editor-list">
              {socials.map(([key, label]) => <div className="social-editor-row" key={key}>
                <div className="social-editor-icon" title={label} aria-label={label}><SocialIcon name={key} /></div>
                <input aria-label={`${label} URL`} value={settings.socials[key]} onChange={e => setSocial(key, e.target.value)} placeholder={`Paste ${label} URL`} />
              </div>)}
            </div>

            <div className="social-global-colour">
              <Colour label="Social icon colour" value={settings.socialIconColour} onChange={v => setSettings(current => ({ ...current, socialIconColour: v }))} />
            </div>

            <div className="subsection-heading custom-links-heading"><div><b>Custom links:</b></div><button type="button" className="add-custom-link" onClick={addCustomLink}>+ Add link</button></div>
            <div className="custom-link-editor-list">
              {settings.customLinks.length === 0 && <div className="custom-link-empty">No custom links yet. Add one to create a separate icon link on your profile.</div>}
              {settings.customLinks.map(link => <div className="custom-link-editor-row" key={link.id}>
                <label className="social-editor-icon social-editor-file" title="Import custom link icon" aria-label="Import custom link icon">
                  {previewAssets.customLinkIcons[link.id] ? <img src={previewAssets.customLinkIcons[link.id]} alt="" className="custom-social-icon" /> : <PencilIcon size={22} />}
                  <span className="social-editor-pencil"><PencilIcon size={11} /></span>
                  <input type="file" accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.avif" onChange={e => void uploadCustomLinkIcon(link.id, e)} />
                </label>
                <input aria-label="Custom link URL" value={link.url} onChange={e => updateCustomLink(link.id, { url: e.target.value })} placeholder="Paste custom URL" />
                {link.icon && <button type="button" className="clear-icon-button" onClick={() => void clearCustomLinkIcon(link.id)} aria-label="Remove custom link icon">×</button>}
                <button type="button" className="clear-icon-button custom-link-remove" onClick={() => void removeCustomLink(link.id)} aria-label="Remove custom link">×</button>
              </div>)}
            </div>
            <div className="subsection-heading active-links-heading"><div><b>Active links:</b></div></div>
            <div className="active-links-list">
              {activeLinkKeys.length === 0 ? <div className="custom-link-empty">Add a valid social URL or custom link above and it will appear here.</div> : activeLinkKeys.map(key => {
                const isSocial = key.startsWith("social:");
                const socialKey = isSocial ? key.slice(7) as SocialKey : null;
                const custom = !isSocial ? settings.customLinks.find(link => `custom:${link.id}` === key) : null;
                if (!socialKey && !custom) return null;
                return <div className="active-link-row" key={key} draggable onDragStart={event => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", key); event.currentTarget.classList.add("dragging"); }} onDragEnd={event => event.currentTarget.classList.remove("dragging")} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const fromKey = event.dataTransfer.getData("text/plain"); if (fromKey) reorderActiveLinks(fromKey, key); }}>
                  <span className="active-link-handle" title="Drag to reorder" aria-hidden="true"><i /><i /><i /></span>
                  <div className="active-link-info"><b>{isSocial ? socialLabels[socialKey!] : "Custom link"}</b><span>{isSocial ? settings.socials[socialKey!] : custom!.url}</span></div>
                  <span className="active-link-icon">{isSocial ? <SocialIcon name={socialKey!} /> : previewAssets.customLinkIcons[custom!.id] ? <img src={previewAssets.customLinkIcons[custom!.id]} alt="" /> : <span className="custom-link-fallback" aria-hidden="true">↗</span>}</span>
                </div>;
              })}
            </div>
            <div className="social-size-control">
              <Range label="Social icon size" value={settings.socialIconSize} min={16} max={48} suffix="px" onChange={v => set("socialIconSize", v)} />
              <p>Resize your social and custom-link icons on your public profile and in this live preview.</p>
            </div>
          </div>}
          {active === "Music" && <div className="form-stack">
            <SectionIntro number="06" title="Your own music library" text="Give every track its own name, artist and cover. Pick which track opens on the profile." />
            <div className="track-builder">
              <div className="track-builder-title">Add a track:</div>
              <div className="music-format-notice"><div className="music-format-icon">♪</div><div><b>MP3 audio only</b><span>For the most reliable playback, upload your music as an MP3 file.</span><a href="https://www.freeconvert.com/mp3-converter/download" target="_blank" rel="noreferrer">Convert your audio to MP3 <span aria-hidden="true">↗</span></a></div></div>
              <Field label="Track name"><input value={draftTrack.title} onChange={e => setDraftTrack(d => ({ ...d, title: e.target.value }))} placeholder="Track name" /></Field>
              <Field label="Artist"><input value={draftTrack.artist} onChange={e => setDraftTrack(d => ({ ...d, artist: e.target.value }))} placeholder="Artist / creator" /></Field>
              <FileUpload label="Audio file" value={draftTrack.audio} accept=".mp3,audio/mpeg" type="audio" onChange={v => setDraftTrack(d => ({ ...d, audio: v }))} note="MP3 only · up to 500MB" />
              <FileUpload label="Cover image" value={draftTrack.cover} accept="image/*" type="image" onChange={v => setDraftTrack(d => ({ ...d, cover: v }))} />
              <button type="button" className="add-track" onClick={addTrack}>+ Add track</button>
            </div>
            <div className="track-list">{settings.musicTracks.length === 0 ? <div className="empty-state">No tracks yet. Add your first one above.</div> : settings.musicTracks.map(track => <div className={`track-item ${activeTrack?.id === track.id ? "selected" : ""}`} key={track.id}><div className="track-thumb">{track.cover ? "▣" : "♫"}</div><div className="track-meta"><b>{track.title}</b><span>{track.artist}</span></div><button type="button" className="track-select" onClick={() => set("activeMusicId", track.id)}>{activeTrack?.id === track.id ? "Active" : "Use"}</button><button type="button" className="track-delete" onClick={() => void removeTrack(track)}>×</button></div>)}</div>
            <Setting label="Show music player" text="Show the controls on the public profile. Music can still play when this is off."><Toggle value={settings.showMusicPlayer} onChange={v => set("showMusicPlayer", v)} /></Setting>
            <Setting label="Loop" text="Restart the selected track when it finishes."><Toggle value={settings.musicLoop} onChange={v => set("musicLoop", v)} /></Setting>
            <Field label="Player position"><select value={settings.musicPlayerPosition} onChange={e => set("musicPlayerPosition", e.target.value as "top" | "bottom")}><option value="top">Above socials</option><option value="bottom">Below socials</option></select></Field>
          </div>}

          {active === "Effects" && <div className="form-stack">
            <SectionIntro number="07" title="Go completely overboard" text="Motion, atmosphere, glow and texture are all independent toggles." />
            <div className="effects-typography-section">
              <div className="subsection-heading"><div><b>Text effects:</b></div></div>
              {([
                ["name", "Name", settings.nameAnimation],
                ["username", "Username", settings.usernameAnimation],
                ["description", "Description", settings.descriptionAnimation],
                ["location", "Location", settings.locationAnimation],
                ["socials", "Socials", settings.socialsAnimation],
              ] as ["name" | "username" | "description" | "location" | "socials", string, TextAnimation][]).map(([key, label, animation]) => <div className="typography-row effect-row" key={key}>
                <div><b>{label}:</b></div>
                <EffectDropdown id={`effect-${key}`} open={openDropdown} setOpen={setOpenDropdown} value={animation} onChange={value => set(`${key}Animation` as keyof ProfileSettings, value)} />
              </div>)}
            </div>
            <Setting label="Animated effects" text="Enable transitions and subtle motion across the profile."><Toggle value={settings.animated} onChange={v => set("animated", v)} /></Setting>
            <Setting label="Card glow" text="Create a coloured glow around the profile card."><Toggle value={settings.glow} onChange={v => set("glow", v)} /></Setting>
            <Range label="Glow intensity" value={settings.glowIntensity} min={0} max={80} suffix="%" onChange={v => set("glowIntensity", v)} />
            <Setting label="Floating card" text="Give the profile a slow floating motion."><Toggle value={settings.floating} onChange={v => set("floating", v)} /></Setting>
            <Setting label="Profile-card parallax" text="Give the profile card a smooth 3D tilt that follows your mouse or finger. The background stays completely still."><Toggle value={settings.parallax} onChange={v => set("parallax", v)} /></Setting>
            <Range label="Parallax intensity" value={settings.parallaxStrength} min={0} max={35} suffix="%" onChange={v => set("parallaxStrength", v)} />
            <Setting label="Background particles" text="Add soft floating particles behind the profile."><Toggle value={settings.particles} onChange={v => set("particles", v)} /></Setting>
            <Setting label="Film grain" text="Add a subtle texture overlay for a less flat background."><Toggle value={settings.grain} onChange={v => set("grain", v)} /></Setting>
            <Setting label="Show earned badges on your profile" text="Hide your badges from other people without removing your earned badges."><Toggle value={!badgesHidden} onChange={async value => { const previous = badgesHidden; setBadgesHidden(!value); try { const response = await fetch("/api/profile/badges-visibility", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hidden: !value }) }); if (!response.ok) setBadgesHidden(previous); } catch { setBadgesHidden(previous); } }} /></Setting>
            <Setting label="Scanlines" text="Add a retro display texture across the page."><Toggle value={settings.scanlines} onChange={v => set("scanlines", v)} /></Setting>
          </div>}

          {active === "Layout" && <div className="form-stack">
            <SectionIntro number="09" title="Structure the experience" text="Choose a base layout, then fine tune its density and type." />
            <div className="layout-options">{(["Default", "Modern", "Minimal", "Sleek", "Text Only"] as const).map(layout => <button type="button" key={layout} className={settings.layout === layout ? "chosen" : ""} onClick={() => set("layout", layout)}><div className={`layout-mini ${layout.toLowerCase()}`} /><b>{layout}</b><small>{layout === "Default" ? "Balanced glass card" : layout === "Modern" ? "Sharper & compact" : layout === "Minimal" ? "Quiet & clean" : layout === "Sleek" ? "Wide & cinematic" : "No card, just text"}</small></button>)}</div>
            <Setting label="Left aligned profile" text="Move the main content from centered to editorial left alignment."><Toggle value={settings.alignment === "left"} onChange={v => set("alignment", v ? "left" : "center")} /></Setting>
          </div>}

          {active === "Advanced" && <div className="form-stack">
            <SectionIntro number="10" title="Fine controls" text="These are the controls you only touch when you want to obsess over the final 5%." />
            <Field label="Custom cursor image URL" hint="Optional"><input value={settings.customCursor} onChange={e => set("customCursor", e.target.value)} placeholder="https://..." /></Field>
            <Setting label="Keep the browser-native cursor" text="Leave this enabled by clearing the custom cursor URL."><span className="info-pill">AUTO</span></Setting>
            <div className="info-card"><div><b>Unique views</b><span>Counts a visitor once per profile per browser/device, with totals stored on the server.</span></div><span className="info-pill">SERVER</span></div>
            {canManageOwnViews && <div className="view-admin-tool">
              <div><b>Owner view controls</b><p>Only available on your account. Adjust the view total for your own profile.</p></div>
              <Field label="Target username" hint="Enter any Pixlo username, or leave blank to use your own profile."><input value={viewToolUsername} onChange={e => setViewToolUsername(e.target.value)} placeholder={settings.username || "username"} autoComplete="off" /></Field>
              <Field label="Number of views"><input type="number" min={1} max={1000000} step={1} inputMode="numeric" value={viewToolAmount} onChange={e => setViewToolAmount(e.target.value)} /></Field>
              <div className="view-admin-actions">
                <button type="button" disabled={viewToolBusy} onClick={() => void adjustOwnViews("add")}>{viewToolBusy ? "Working…" : "Generate views"}</button>
                <button type="button" disabled={viewToolBusy} onClick={() => void adjustOwnViews("remove")}>Remove views</button>
              </div>
              {viewToolMessage && <p className="view-admin-message" role="status">{viewToolMessage}</p>}
            </div>}
            {canManageOwnViews && <a className="badge-admin-dashboard-link" href="/dashboard/badges">Manage Pixlo badges <span>→</span></a>}
          </div>}
          {active === "Stats" && <div className="form-stack stats-page">
            <SectionIntro number="12" title="Your stats" text="Your Pixlo profile performance, all in one place." />
            <div className="stats-grid">
              <div className="stats-card stats-views-card"><span><i>◉</i> Total profile views</span><strong>{Number(settings.views || 0).toLocaleString()}</strong><small>Unique visitors per browser/device</small></div>
              <div className="stats-card"><span><i>↗</i> Social links</span><strong>{socials.filter(([key]) => Boolean(settings.socials[key]?.trim())).length + settings.customLinks.filter(link => Boolean(link.url.trim())).length}</strong><small>Connected social and custom links</small></div>
              <div className="stats-card"><span><i>♫</i> Music tracks</span><strong>{settings.musicTracks.length}</strong><small>Tracks saved to your profile</small></div>
              <div className="stats-card"><span><i>✳</i> Profile completion</span><strong>{Math.round(([settings.avatar, settings.description, ...socials.map(([key]) => settings.socials[key]), ...settings.customLinks.map(link => link.url)].filter(value => Boolean(String(value || "").trim())).length / (3 + socials.length + settings.customLinks.length)) * 100)}%</strong><small>Based on your profile details</small></div>
            </div>
            <div className="leaderboard-heading"><div><span>COMMUNITY RANKING</span><h3>Profile views leaderboard</h3><p>Top 100 Pixlo profiles by unique views.</p></div><button type="button" onClick={() => { setLeaderboardLoading(true); setLeaderboardError(""); fetch('/api/profile-stats?username=' + encodeURIComponent(settings.username), { cache: "no-store" }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not load leaderboard."); setViewLeaderboard(data); }).catch(error => setLeaderboardError(error instanceof Error ? error.message : "Could not load leaderboard.")).finally(() => setLeaderboardLoading(false)); }}>Refresh ↻</button></div>
            {leaderboardLoading && <div className="leaderboard-empty">Loading leaderboard…</div>}
            {!leaderboardLoading && leaderboardError && <div className="leaderboard-empty leaderboard-error">{leaderboardError}<small>Run the latest supabase/schema.sql in Supabase SQL Editor.</small></div>}
            {!leaderboardLoading && !leaderboardError && viewLeaderboard && <div className="leaderboard-list">
              {viewLeaderboard.leaderboard.map(person => <div key={person.username} className={'leaderboard-row ' + (person.username.toLowerCase() === settings.username.toLowerCase() ? "leaderboard-you " : "") + (person.rank <= 3 ? 'leaderboard-rank-' + person.rank : "")}><span className="leaderboard-rank">{person.rank === 1 ? "♛" : person.rank === 2 ? "✦" : person.rank === 3 ? "✧" : '#' + person.rank}</span><div className="leaderboard-person"><b>{person.displayName || person.username}{person.username.toLowerCase() === settings.username.toLowerCase() && <em>YOU</em>}</b><small>@{person.username}</small></div><strong>{Number(person.views).toLocaleString()} <small>views</small></strong></div>)}
              {viewLeaderboard.viewer && viewLeaderboard.viewer.rank > 100 && <><div className="leaderboard-ellipsis">···</div><div className="leaderboard-row leaderboard-you leaderboard-your-rank"><span className="leaderboard-rank">#{viewLeaderboard.viewer.rank}</span><div className="leaderboard-person"><b>{viewLeaderboard.viewer.displayName || viewLeaderboard.viewer.username}<em>YOUR POSITION</em></b><small>@{viewLeaderboard.viewer.username}</small></div><strong>{Number(viewLeaderboard.viewer.views).toLocaleString()} <small>views</small></strong></div></>}
            </div>}
            {!viewLeaderboard && !leaderboardLoading && !leaderboardError && <button type="button" className="leaderboard-load" onClick={() => { setLeaderboardLoading(true); fetch('/api/profile-stats?username=' + encodeURIComponent(settings.username), { cache: "no-store" }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not load leaderboard."); setViewLeaderboard(data); }).catch(error => setLeaderboardError(error instanceof Error ? error.message : "Could not load leaderboard.")).finally(() => setLeaderboardLoading(false)); }}>Load top 100 leaderboard</button>}
            <p className="stats-footnote">Your highlighted row is easy to spot, even if you are outside the top 100.</p>
          </div>}
          {active === "Enter Screen" && <div className="form-stack">
            <SectionIntro number="11" title="Your entrance" text="The message appears once, inside its own customisable bordered card." />
            <Field label="Entrance message" hint="Up to 100 characters"><input maxLength={100} value={settings.enterScreenMessage} onChange={e => set("enterScreenMessage", e.target.value)} placeholder="Click to enter" /></Field>
            <Field label="Message font"><FontDropdown id="enter-message-font" open={openDropdown} setOpen={setOpenDropdown} value={settings.enterScreenFont} onChange={v => set("enterScreenFont", v)} /></Field>
            <Colour label="Message colour" value={settings.enterScreenTextColour} onChange={v => set("enterScreenTextColour", v)} />
            <Colour label="Screen background colour" value={settings.enterScreenBackgroundColour} onChange={v => set("enterScreenBackgroundColour", v)} />
            <Range label="Screen background transparency" value={settings.enterScreenBackgroundOpacity} min={0} max={100} suffix="%" onChange={v => set("enterScreenBackgroundOpacity", v)} />
            <SectionIntro title="Message card" text="Style the border and background wrapped around that same message." />
            <Colour label="Card border colour" value={settings.enterScreenCardBorderColour} onChange={v => set("enterScreenCardBorderColour", v)} />
            <Range label="Border transparency" value={settings.enterScreenCardBorderOpacity} min={0} max={100} suffix="%" onChange={v => set("enterScreenCardBorderOpacity", v)} />
            <Colour label="Card background colour" value={settings.enterScreenCardBackgroundColour} onChange={v => set("enterScreenCardBackgroundColour", v)} />
            <Range label="Card background transparency" value={settings.enterScreenCardOpacity} min={0} max={100} suffix="%" onChange={v => set("enterScreenCardOpacity", v)} />
            <Range label="Card corner roundness" value={settings.enterScreenCardRadius} min={0} max={48} suffix="px" onChange={v => set("enterScreenCardRadius", v)} />
            <Range label="Card width" value={settings.enterScreenCardWidth} min={180} max={760} suffix="px" onChange={v => set("enterScreenCardWidth", v)} />
            <Range label="Card horizontal position" value={settings.enterScreenCardPositionX} min={5} max={95} suffix="%" onChange={v => set("enterScreenCardPositionX", v)} />
            <Range label="Card vertical position" value={settings.enterScreenCardPositionY} min={5} max={95} suffix="%" onChange={v => set("enterScreenCardPositionY", v)} />
            <Range label="Card padding" value={settings.enterScreenCardPadding} min={4} max={48} suffix="px" onChange={v => set("enterScreenCardPadding", v)} />
            <Range label="Screen background blur" value={settings.enterScreenCardBlur} min={0} max={40} suffix="px" onChange={v => set("enterScreenCardBlur", v)} />
          </div>}
        </section>

        <aside className={`preview-panel ${previewVisible ? "" : "preview-panel-loading"}`} aria-hidden={!previewVisible}>
          {previewVisible && <>
          <div className="preview-label"><div><span>Live preview</span><small>updates instantly</small></div><a href={profileUrl} target="_blank" rel="noreferrer">Open ↗</a></div>
          <div className={`preview-frame preview-layout-${settings.layout.toLowerCase().replace(/\s+/g, "-")} ${settings.parallax ? "preview-parallax-on" : ""} ${previewParallaxReturning ? "preview-parallax-returning" : ""} ${settings.animated ? "preview-animated" : ""} ${settings.glow ? "preview-glow" : ""} ${settings.floating ? "preview-float" : ""} ${settings.particles ? "preview-particles-on" : ""} ${settings.grain ? "preview-grain-on" : ""} ${settings.scanlines ? "preview-scanlines-on" : ""} ${settings.textGlow ? "preview-text-glow" : ""}`} style={previewStyle}>
            {previewAssets.backgroundVideo && <video key={previewAssets.backgroundVideo} className="preview-media" src={previewAssets.backgroundVideo} autoPlay={active !== "Enter Screen" || previewEntered} muted loop playsInline preload="auto" onLoadedData={event => { const video = event.currentTarget; if (active === "Enter Screen" && !previewEntered) { video.pause(); video.currentTime = 0; } else { void video.play().catch(() => {}); } }} onCanPlay={event => { if (active === "Enter Screen" && !previewEntered) { event.currentTarget.pause(); event.currentTarget.currentTime = 0; } }} />}
            {previewAssets.backgroundImage && <div className="preview-bg" style={{ backgroundImage: `url("${previewAssets.backgroundImage}")`, filter: `blur(${settings.backgroundBlur}px)`, transform: `scale(${Math.max(1, settings.backgroundScale / 100)})`, backgroundPosition: `${settings.backgroundPositionX}% ${settings.backgroundPositionY}%`, backgroundSize: `${settings.backgroundScale}% auto` }} />}
            <div className="preview-overlay" />
            <div className="preview-vignette" />
            {settings.particles && <div className="preview-particle-field" aria-hidden="true">{Array.from({ length: 12 }).map((_, i) => <i key={i} style={{ "--i": i } as React.CSSProperties} />)}</div>}
            {settings.grain && <div className="preview-effect-grain" aria-hidden="true" />}
            {settings.scanlines && <div className="preview-effect-scanlines" aria-hidden="true" />}
            <div
              className={`preview-card ${settings.glow ? "effects-glow" : ""} ${settings.layout === "Minimal" ? "layout-minimal" : ""} ${settings.layout === "Modern" ? "layout-modern" : ""} ${settings.layout === "Sleek" ? "layout-sleek" : ""} ${settings.layout === "Text Only" ? "layout-text-only" : ""} ${settings.alignment === "left" ? "text-left" : ""}`}
              style={{ borderRadius: settings.layout === "Text Only" ? 0 : settings.borderRadius, fontFamily: "var(--preview-font)", background: settings.layout === "Text Only" ? "transparent" : "var(--preview-card-bg)", color: "var(--preview-text-color)", opacity: 1, boxShadow: settings.layout === "Text Only" ? "none" : previewShadow, border: settings.layout === "Text Only" ? "none" : undefined, backdropFilter: settings.layout === "Text Only" ? "none" : undefined, WebkitBackdropFilter: settings.layout === "Text Only" ? "none" : undefined, "--preview-card-shadow": settings.layout === "Text Only" ? "none" : previewShadow } as React.CSSProperties}
              onPointerEnter={handlePreviewPointerEnter}
              onPointerMove={updatePreviewPointer}
              onPointerDown={handlePreviewPointerDown}
              onPointerUp={handlePreviewPointerUp}
              onPointerCancel={resetPreviewPointer}
              onPointerLeave={resetPreviewPointer}
            >
              {previewAssets.banner && settings.bannerHeight > 0 && <img className="preview-banner" src={previewAssets.banner} alt="" style={{ height: settings.bannerHeight, borderRadius: `${settings.borderRadius}px ${settings.borderRadius}px 0 0` }} />}
              <div className="preview-card-inner" style={{ "--preview-content-spacing-setting": `${settings.contentSpacing}px` } as React.CSSProperties}>
                <div className={`preview-avatar-wrap preview-avatar-decoration-${settings.avatarDecoration}`}><div className="preview-avatar" style={{ borderRadius: `${settings.avatarRadius}%`, borderWidth: settings.avatarBorderWidth, borderColor: settings.avatarBorderColour }}>{previewAvatar ? <img src={previewAvatar} alt="" /> : (settings.displayName || settings.username).slice(0, 1).toUpperCase()}</div>{previewDecoration && <img className="preview-discord-avatar-decoration" src={previewDecoration} alt="" aria-hidden="true" />}{settings.showDiscord && <span className="preview-status-dot" title="Online" />}</div>
                <div className="preview-name-row"><b className={`${settings.nameGlow ? "element-glow-name " : ""}${animationClass(settings.nameAnimation)}`} style={{ fontFamily: fontFamily(settings.nameFont), fontWeight: settings.nameBold ? 700 : 400, fontStyle: settings.nameItalic ? "italic" : "normal" }}>{settings.displayName || settings.username}</b></div>
                <small className={`preview-username ${animationClass(settings.usernameAnimation)}`} style={{ fontFamily: fontFamily(settings.usernameFont), fontWeight: settings.usernameBold ? 700 : 400, fontStyle: settings.usernameItalic ? "italic" : "normal" }}>@{settings.username || "username"}</small>
                {settings.description && <p className={`${settings.descriptionGlow ? "element-glow-description " : ""}${animationClass(settings.descriptionAnimation)}`} style={{ fontFamily: fontFamily(settings.descriptionFont), fontWeight: settings.descriptionBold ? 700 : 400, fontStyle: settings.descriptionItalic ? "italic" : "normal" }}>{settings.description}</p>}
                {settings.showLocation && settings.location && <small className={`preview-location ${settings.locationGlow ? "element-glow-location " : ""}${animationClass(settings.locationAnimation)}`} style={{ fontFamily: fontFamily(settings.locationFont), fontWeight: settings.locationBold ? 700 : 400, fontStyle: settings.locationItalic ? "italic" : "normal" }}>⌖ {settings.location}</small>}
                {settings.showMusicPlayer && settings.musicPlayerPosition === "top" && activeTrack && <div className="preview-music"><div className="preview-music-art">{previewAssets.musicCover ? <img src={previewAssets.musicCover} alt="" /> : <i>♫</i>}</div><span>{activeTrack.title}<small>{activeTrack.artist}</small></span><i className="preview-music-play">▶</i></div>}
                <div className={`preview-links ${settings.socialsGlow ? "element-glow-socials " : ""}${animationClass(settings.socialsAnimation)}`} style={{ opacity: 1, fontFamily: fontFamily(settings.socialsFont), fontWeight: settings.socialsBold ? 700 : 400, fontStyle: settings.socialsItalic ? "italic" : "normal", "--social-icon-size": `${settings.socialIconSize}px` } as React.CSSProperties}>{activeLinkKeys.map(key => {
                  if (key.startsWith("social:")) {
                    const socialKey = key.slice(7) as SocialKey;
                    return <a key={key} href={normaliseUrl(settings.socials[socialKey])} target="_blank" rel="noreferrer" aria-label={socialLabels[socialKey]} title={socialLabels[socialKey]} className="social-preview-link" style={{ "--social-colour": settings.socialIconColour, "--social-icon-size": `${settings.socialIconSize}px` } as React.CSSProperties}><SocialIcon name={socialKey} /></a>;
                  }
                  const link = settings.customLinks.find(item => `custom:${item.id}` === key);
                  if (!link) return null;
                  return <a key={key} href={normaliseUrl(link.url)} target="_blank" rel="noreferrer" aria-label="Custom link" title={link.url} className="social-preview-link custom-link-preview" style={{ "--social-colour": settings.socialIconColour, "--social-icon-size": `${settings.socialIconSize}px` } as React.CSSProperties}>{previewAssets.customLinkIcons[link.id] ? <img src={previewAssets.customLinkIcons[link.id]} alt="" className="custom-social-icon" /> : <span className="custom-link-fallback" aria-hidden="true">↗</span>}</a>;
                })}</div>

                {settings.showMusicPlayer && settings.musicPlayerPosition === "bottom" && activeTrack && <div className="preview-music"><div className="preview-music-art">{previewAssets.musicCover ? <img src={previewAssets.musicCover} alt="" /> : <i>♫</i>}</div><span>{activeTrack.title}<small>{activeTrack.artist}</small></span><i className="preview-music-play">▶</i></div>}
                {settings.showFooter && <div className="preview-profile-footer"><span><i className="preview-online-dot" /> Online</span>{settings.showViews && <span>{settings.views || 0} views</span>}</div>}
              </div>
            </div>
            {active === "Enter Screen" && !previewEntered && <button type="button" onClick={() => setPreviewEntering(true)} onTransitionEnd={() => { if (previewEntering) { setPreviewEntered(true); setPreviewEntering(false); } }} style={{ position: "absolute", inset: 0, zIndex: 20, width: "100%", height: "100%", padding: 16, border: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer", backgroundColor: `rgba(${parseInt(settings.enterScreenBackgroundColour.slice(1,3),16)||0},${parseInt(settings.enterScreenBackgroundColour.slice(3,5),16)||0},${parseInt(settings.enterScreenBackgroundColour.slice(5,7),16)||0},${previewAssets.backgroundVideo ? Math.min(settings.enterScreenBackgroundOpacity / 100, 0.28) : settings.enterScreenBackgroundOpacity / 100})`, backdropFilter: `blur(${settings.enterScreenCardBlur}px)`, WebkitBackdropFilter: `blur(${settings.enterScreenCardBlur}px)`, color: settings.enterScreenTextColour, textAlign: "center", fontFamily: fontFamily(settings.enterScreenFont), opacity: previewEntering ? 0 : 1, transition: "opacity 450ms ease" }}>
              <span style={{ position: "absolute", zIndex: 2, left: `${settings.enterScreenCardPositionX}%`, top: `${settings.enterScreenCardPositionY}%`, transform: "translate(-50%, -50%)", display: "block", width: `min(90%, ${settings.enterScreenCardWidth}px)`, boxSizing: "border-box", padding: `${settings.enterScreenCardPadding}px`, borderRadius: settings.enterScreenCardRadius, border: `1px solid ${settings.enterScreenCardBorderColour}${Math.round(settings.enterScreenCardBorderOpacity*2.55).toString(16).padStart(2,"0")}`, background: `${settings.enterScreenCardBackgroundColour}${Math.round(settings.enterScreenCardOpacity*2.55).toString(16).padStart(2,"0")}`, color: settings.enterScreenTextColour, fontSize: "clamp(12px, 2.5vw, 20px)", fontWeight: 700, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere", textShadow: "0 2px 18px rgba(0,0,0,0.45)" }}>{settings.enterScreenMessage || "Click to enter"}</span>
            </button>}
            <div className="preview-badge"><i /> LIVE</div>
          </div>
          </>}
        </aside>
      </div>
    </div>
  </main>;
}
