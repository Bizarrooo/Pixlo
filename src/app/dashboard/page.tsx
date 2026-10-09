"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { accountSettingsStorageKey, defaultSettings, loadSettingsForAccount, saveSettingsToStorage, type CustomLink, type MusicTrack, type ProfileFont, type ProfileSettings, type SocialKey, type TextAnimation } from "../profile";
import { deleteAsset, loadAsset, saveAsset } from "../assetStore";

const sections = [
  ["General", "Identity & basics", "01"],
  ["Appearance", "Colours & transparency", "02"],
  ["Fonts", "Typography & text styles", "03"],
  ["Background", "Image, video & backdrop", "04"],
  ["Profile", "Avatar, banner & card", "05"],
  ["Socials", "Links & icon layout", "06"],
  ["Music", "Tracks, covers & player", "07"],
  ["Effects", "Motion, glow & atmosphere", "08"],
  ["Layout", "Structure & alignment", "09"],
  ["Advanced", "Fine controls", "10"],
] as const;

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
  return <div className="range"><div><span>{label}</span><b>{value}{suffix}</b></div><input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} /></div>;
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
    const limits = { image: 25, video: 500, audio: 500 };
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
  const fallbackNote = type === "video" ? "MP4 / WebM · up to 500MB" : type === "audio" ? "MP3 only · up to 500MB" : "Choose a file";
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
  const [previewPointer, setPreviewPointer] = useState({ x: 0, y: 0 });
  const previewPointerBoundsRef = useRef<DOMRect | null>(null);
  const previewAssetsLoadedRef = useRef(false);
  const [profileUserId, setProfileUserId] = useState("");
  const [savedIdentity, setSavedIdentity] = useState({ username: "", displayName: "" });
  const canUseVerifiedBadge = profileUserId === "3f29f647-4b99-4f53-adf0-eb678bef1c5f";
  const [usernameChangeAvailableAt, setUsernameChangeAvailableAt] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [previewAssets, setPreviewAssets] = useState({ avatar: "", banner: "", backgroundImage: "", backgroundVideo: "", musicCover: "", customLinkIcons: {} as Record<string, string> });
  const [draftTrack, setDraftTrack] = useState<{ title: string; artist: string; audio: string; cover: string }>({ title: "", artist: "", audio: "", cover: "" });
  const [discordUser, setDiscordUser] = useState<{ id?: string; username?: string; discordId?: string; discordUsername?: string; discordDisplayName?: string; discordAvatar?: string; discordAvatarDecoration?: string; useDiscordAvatar?: boolean; useDiscordDecoration?: boolean } | null>(null);
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
        const loaded = cloudHasSettings ? { ...localSettings, ...cloudSettings, username, displayName } as ProfileSettings : localSettings;
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
      loadAsset(track?.cover || ""),
      ...settings.customLinks.filter(link => link.icon).map(link => loadAsset(link.icon)),
    ])
      .then(entries => {
        if (cancelled) return;
        const customLinkIcons: Record<string, string> = {};
        const customLinksWithIcons = settings.customLinks.filter(link => link.icon);
        customLinksWithIcons.forEach((link, index) => { customLinkIcons[link.id] = entries[5 + index] as string; });
        setPreviewAssets({ avatar: entries[0] as string, banner: entries[1] as string, backgroundImage: entries[2] as string, backgroundVideo: entries[3] as string, musicCover: entries[4] as string, customLinkIcons });
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
  }, [settingsReady, settings.avatar, settings.banner, settings.backgroundImage, settings.backgroundVideo, settings.customLinks, settings.musicTracks, settings.activeMusicId]);

  const set = <K extends keyof ProfileSettings>(key: K, value: ProfileSettings[K]) => { setSettings(s => ({ ...s, [key]: value })); setSaved(false); };
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
  const profileUrl = `/${settings.username || "username"}`;
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
  const previewStyle = useMemo(() => ({
    "--accent": settings.accentColour,
    "--preview-background": settings.backgroundColour,
    "--preview-background-scale-factor": `${Math.max(1, settings.backgroundScale / 100)}`,
    "--preview-avatar-setting-size": `${settings.avatarSize}px`,
    "--preview-content-spacing-setting": `${settings.contentSpacing}px`,
    "--preview-card-shadow": previewShadow,
    "--preview-text": settings.textColour,
    "--preview-text-opacity": `${settings.textOpacity}%`,
    "--preview-card-opacity": `${settings.profileOpacity / 100}`,
    "--preview-card-bg": `rgba(${parseInt(settings.backgroundColour.slice(1,3), 16) || 0},${parseInt(settings.backgroundColour.slice(3,5), 16) || 0},${parseInt(settings.backgroundColour.slice(5,7), 16) || 0},${settings.profileOpacity / 100})`,
    "--preview-secondary-opacity": `${settings.textOpacity / 100}`,
    "--preview-text-color": `rgba(${parseInt(settings.textColour.slice(1,3), 16) || 255},${parseInt(settings.textColour.slice(3,5), 16) || 255},${parseInt(settings.textColour.slice(5,7), 16) || 255},${settings.textOpacity / 100})`,
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
    "--preview-parallax-rotate-x": `${previewPointer.y * -34 * previewParallaxPower}deg`,
    "--preview-parallax-rotate-y": `${previewPointer.x * 40 * previewParallaxPower}deg`,
    "--preview-parallax-light-x": `${50 + previewPointer.x * 45 * previewParallaxPower}%`,
    "--preview-parallax-light-y": `${50 + previewPointer.y * 45 * previewParallaxPower}%`,
    "--preview-parallax-shadow-x": `${previewPointer.x * -10 * previewParallaxPower}px`,
    "--preview-parallax-shadow-y": `${previewPointer.y * -8 * previewParallaxPower}px`,
    backgroundColor: settings.backgroundColour,
  } as React.CSSProperties), [settings, previewPointer, previewParallaxPower, previewShadow]);

  const updatePreviewPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!settings.parallax || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = previewPointerBoundsRef.current || event.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5) * 2));
    const y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / Math.max(bounds.height, 1) - 0.5) * 2));
    setPreviewPointer(previous => Math.abs(previous.x - x) < 0.002 && Math.abs(previous.y - y) < 0.002 ? previous : { x, y });
  };
  const handlePreviewPointerEnter = (event: React.PointerEvent<HTMLDivElement>) => {
    previewPointerBoundsRef.current = event.currentTarget.getBoundingClientRect();
  };
  const handlePreviewPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch" || !settings.parallax) return;
    previewPointerBoundsRef.current = event.currentTarget.getBoundingClientRect();
    updatePreviewPointer(event);
  };
  const resetPreviewPointer = () => {
    previewPointerBoundsRef.current = null;
    setPreviewPointer({ x: 0, y: 0 });
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

  const removeTrack = async (track: MusicTrack) => {
    await deleteAsset(track.audio);
    if (track.cover) await deleteAsset(track.cover);
    setSettings(s => {
      const tracks = s.musicTracks.filter(t => t.id !== track.id);
      return { ...s, musicTracks: tracks, activeMusicId: s.activeMusicId === track.id ? tracks[0]?.id || "" : s.activeMusicId };
    });
  };

  return <main className="dashboard">
    <aside className={`sidebar ${mobileMenu ? "mobile-open" : ""}`}>
      <div className="brand"><div className="brand-logo-shell"><img className="brand-logo" src="/pixlo-logo.png" alt="Pixlo" /></div><small>Profile customization</small></div>
      <nav>{sections.map(([name]) => <button type="button" key={name} className={active === name ? "active" : ""} onClick={() => { setActive(name); setMobileMenu(false); }}><span className="nav-dot" /><b>{name}</b></button>)}</nav>
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
          {active === "General" && <div className="form-stack">
            <SectionIntro number="01" title="Identity, presence and first impression" text="Control exactly what visitors see before they explore anything else." />
            <Field label="Username" hint={usernameLockHint}><input value={settings.username} disabled={usernameLocked} maxLength={24} autoCapitalize="none" autoCorrect="off" onChange={e => set("username", e.target.value.replace(/[^a-zA-Z0-9._-]/g, "").toLowerCase().slice(0, 24))} /></Field>
            <div className="url-preview">Your profile: <b>localhost:3000/{settings.username || "username"}</b></div>
            <Field label="Display name"><input value={settings.displayName} onChange={e => set("displayName", e.target.value)} /></Field>
            <Field label="Bio / description"><textarea value={settings.description} onChange={e => set("description", e.target.value)} placeholder="Tell people about yourself..." /></Field>
            <Field label="Location"><input value={settings.location} onChange={e => set("location", e.target.value)} placeholder="London, United Kingdom" /></Field>
            {discordNotice === "connected" && <div className="discord-success-notice">Discord connected successfully. Your Discord account is now linked to Pixlo.</div>}
            {discordNotice === "already-linked" && <div className="discord-error-notice">That Discord account is already linked to another Pixlo account.</div>}
            {discordNotice === "not-member" && <div className="discord-error-notice">{discordDetail || "You need to be in the required Pixlo Discord server to link your account."}</div>}
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
                  <p>{discordUser ? "Your Discord account is linked to this Pixlo account." : "Connect your Discord account to bring your avatar and decoration into your Pixlo profile."}</p>
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
            {canUseVerifiedBadge && <Setting label="Verified badge" text="Show your custom verification badge beside your name."><Toggle value={settings.showVerified} onChange={v => set("showVerified", v)} /></Setting>}
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
            <Range label="Text opacity" value={settings.textOpacity} min={10} max={100} suffix="%" onChange={v => set("textOpacity", v)} />
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
            <FileUpload label="Background video" value={settings.backgroundVideo} accept="video/*" type="video" onChange={v => set("backgroundVideo", v)} />
            <p className="hint">Video audio stays inside the video. Browsers may start it muted until the visitor interacts with the page; no sound is removed from the file.</p>
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
            <div className="info-card"><div><b>Unique views</b><span>The local prototype counts one view per browser/profile using local storage. A real global unique-view system needs a server database.</span></div><span className="info-pill">LOCAL</span></div>
            <div className="info-card"><div><b>Media storage</b><span>Large uploads are stored in IndexedDB in this local prototype. Production hosting should move them to object storage.</span></div><span className="info-pill">INDEXEDDB</span></div>
          </div>}
        </section>

        <aside className={`preview-panel ${previewVisible ? "" : "preview-panel-loading"}`} aria-hidden={!previewVisible}>
          {previewVisible && <>
          <div className="preview-label"><div><span>Live preview</span><small>updates instantly</small></div><a href={profileUrl} target="_blank" rel="noreferrer">Open ↗</a></div>
          <div className={`preview-frame preview-layout-${settings.layout.toLowerCase().replace(/\s+/g, "-")} ${settings.parallax ? "preview-parallax-on" : ""} ${settings.animated ? "preview-animated" : ""} ${settings.glow ? "preview-glow" : ""} ${settings.floating ? "preview-float" : ""} ${settings.particles ? "preview-particles-on" : ""} ${settings.grain ? "preview-grain-on" : ""} ${settings.scanlines ? "preview-scanlines-on" : ""} ${settings.textGlow ? "preview-text-glow" : ""}`} style={previewStyle}>
            {previewAssets.backgroundVideo && <video key={previewAssets.backgroundVideo} className="preview-media" src={previewAssets.backgroundVideo} autoPlay muted loop playsInline preload="auto" onLoadedData={event => { void event.currentTarget.play().catch(() => {}); }} />}
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
                <div className="preview-name-row"><b className={`${settings.nameGlow ? "element-glow-name " : ""}${animationClass(settings.nameAnimation)}`} style={{ fontFamily: fontFamily(settings.nameFont), fontWeight: settings.nameBold ? 700 : 400, fontStyle: settings.nameItalic ? "italic" : "normal" }}>{settings.displayName || settings.username}</b>{canUseVerifiedBadge && settings.showVerified && <span className="preview-verified-dot">✓</span>}</div>
                <small className={`preview-username ${animationClass(settings.usernameAnimation)}`} style={{ fontFamily: fontFamily(settings.usernameFont), fontWeight: settings.usernameBold ? 700 : 400, fontStyle: settings.usernameItalic ? "italic" : "normal" }}>@{settings.username || "username"}</small>
                {settings.description && <p className={`${settings.descriptionGlow ? "element-glow-description " : ""}${animationClass(settings.descriptionAnimation)}`} style={{ fontFamily: fontFamily(settings.descriptionFont), fontWeight: settings.descriptionBold ? 700 : 400, fontStyle: settings.descriptionItalic ? "italic" : "normal" }}>{settings.description}</p>}
                {settings.showLocation && settings.location && <small className={`preview-location ${settings.locationGlow ? "element-glow-location " : ""}${animationClass(settings.locationAnimation)}`} style={{ fontFamily: fontFamily(settings.locationFont), fontWeight: settings.locationBold ? 700 : 400, fontStyle: settings.locationItalic ? "italic" : "normal" }}>⌖ {settings.location}</small>}
                {settings.showMusicPlayer && settings.musicPlayerPosition === "top" && activeTrack && <div className="preview-music"><div className="preview-music-art">{previewAssets.musicCover ? <img src={previewAssets.musicCover} alt="" /> : <i>♫</i>}</div><span>{activeTrack.title}<small>{activeTrack.artist}</small></span><i className="preview-music-play">▶</i></div>}
                <div className={`preview-links ${settings.socialsGlow ? "element-glow-socials " : ""}${animationClass(settings.socialsAnimation)}`} style={{ opacity: settings.textOpacity / 100, fontFamily: fontFamily(settings.socialsFont), fontWeight: settings.socialsBold ? 700 : 400, fontStyle: settings.socialsItalic ? "italic" : "normal", "--social-icon-size": `${settings.socialIconSize}px` } as React.CSSProperties}>{activeLinkKeys.map(key => {
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
            <div className="preview-badge"><i /> LIVE</div>
          </div>
          </>}
        </aside>
      </div>
    </div>
  </main>;
}
