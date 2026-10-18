"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { accountSettingsStorageKey, defaultSettings, loadSettingsForAccount, normaliseProfileSettings, saveSettingsToStorage, type CustomLink, type MusicTrack, type ProfileFont, type ProfileSettings, type SocialKey, type TextAnimation } from "../profile";
import { deleteAsset, loadAsset, migrateAssetToCloud, saveAsset } from "../assetStore";
import { rememberPixloAccount } from "../accountSwitcher";
import DashboardSidebar, { DashboardNavIcon, customizeTabs, optimiseTabs, type DashboardPrimarySection } from "./DashboardSidebar";
import CursorTrailCanvas from "../CursorTrailCanvas";
import "./dashboard-badges.css";

type DashboardBadge = { id: string; badge_key?: string; name: string; description: string; icon_url: string | null; awarded_at?: string };
type BadgeHubTab = "Your badges" | "All badges" | "Customize" | "Shop";
type BadgeDonorStatus = { authenticated?: boolean; totalDonatedPence?: number; tiers?: Array<{ key: string; name: string; amountPence: number; icon?: string | null }> };
type BadgeProgressTier = { tier_key: string; name: string; description?: string; icon_url: string | null; threshold_views?: number; threshold_invites?: number };
const PROFILE_VIEW_TIERS: BadgeProgressTier[] = [
  { tier_key: "views_seen", name: "Seen", threshold_views: 100, icon_url: "/badges/views-seen.svg" },
  { tier_key: "views_rising", name: "Rising", threshold_views: 1000, icon_url: "/badges/views-rising.svg" },
  { tier_key: "views_viral", name: "Viral", threshold_views: 10000, icon_url: "/badges/views-viral.svg" },
  { tier_key: "views_buzzing", name: "Buzzing", threshold_views: 25000, icon_url: "/badges/views-buzzing.svg" },
  { tier_key: "views_main_character", name: "Main Character", threshold_views: 50000, icon_url: "/badges/views-main-character.svg" },
  { tier_key: "views_famous", name: "Famous", threshold_views: 100000, icon_url: "/badges/views-famous.svg" },
];
const RECRUITER_TIER_FALLBACK: BadgeProgressTier[] = [
  { tier_key: "recruiter_scout", name: "Scout", threshold_invites: 5, icon_url: "/badges/recruiter-scout.svg" },
  { tier_key: "recruiter_recruiter", name: "Recruiter", threshold_invites: 15, icon_url: "/badges/recruiter-recruiter.svg" },
  { tier_key: "recruiter_senior_recruiter", name: "Senior Recruiter", threshold_invites: 30, icon_url: "/badges/recruiter-senior-recruiter.svg" },
  { tier_key: "recruiter_lead_recruiter", name: "Lead Recruiter", threshold_invites: 50, icon_url: "/badges/recruiter-lead-recruiter.svg" },
  { tier_key: "recruiter_elite_recruiter", name: "Elite Recruiter", threshold_invites: 100, icon_url: "/badges/recruiter-elite-recruiter.svg" },
];
const DONOR_BADGE_KEYS = new Set(["donor", "donor_supporter", "donor_patron", "donor_benefactor", "donor_sponsor", "donor_elite_sponsor", "donor_mythic_patron", "donor_eternal_benefactor"]);

const socials: [SocialKey, string][] = [
  ["discord", "Discord"], ["youtube", "YouTube"], ["roblox", "Roblox"], ["github", "GitHub"], ["twitch", "Twitch"], ["instagram", "Instagram"], ["spotify", "Spotify"],
];

const socialLabels: Record<SocialKey, string> = Object.fromEntries(socials) as Record<SocialKey, string>;

const fontOptions: [ProfileFont, string][] = [
  ["Inter", "Inter"],
  ["DM Sans", "DM Sans"],
  ["Manrope", "Manrope"],
  ["Poppins", "Poppins"],
  ["Montserrat", "Montserrat"],
  ["Space Grotesk", "Space Grotesk"],
  ["Outfit", "Outfit"],
  ["Plus Jakarta Sans", "Plus Jakarta Sans"],
  ["Rubik", "Rubik"],
  ["Raleway", "Raleway"],
  ["Playfair Display", "Playfair Display"],
  ["Bebas Neue", "Bebas Neue"],
  ["Oswald", "Oswald"],
  ["JetBrains Mono", "JetBrains Mono"],
  ["Fira Code", "Fira Code"],
  ["Arial", "Arial"],
  ["system", "System UI"],
  ["monospace", "Monospace"],
  ["Georgia", "Georgia"],
  ["Courier New", "Courier New"],
  ["Trebuchet MS", "Trebuchet MS"],
  ["Impact", "Impact"],
  ["Times New Roman", "Times New Roman"],
  ["Verdana", "Verdana"],
  ["Lexend", "Lexend"],
  ["Urbanist", "Urbanist"],
  ["Sora", "Sora"],
  ["Lato", "Lato"],
  ["Roboto", "Roboto"],
  ["Roboto Condensed", "Roboto Condensed"],
  ["Nunito", "Nunito"],
  ["Nunito Sans", "Nunito Sans"],
  ["Mulish", "Mulish"],
  ["Work Sans", "Work Sans"],
  ["Archivo", "Archivo"],
  ["Exo 2", "Exo 2"],
  ["Merriweather", "Merriweather"],
  ["Lora", "Lora"],
  ["Source Sans 3", "Source Sans 3"],
  ["Source Code Pro", "Source Code Pro"],
  ["IBM Plex Sans", "IBM Plex Sans"],
  ["IBM Plex Mono", "IBM Plex Mono"],
  ["Comfortaa", "Comfortaa"],
  ["Figtree", "Figtree"],
  ["Karla", "Karla"],
  ["Asap", "Asap"],
  ["Libre Franklin", "Libre Franklin"],
  ["Oxygen", "Oxygen"],
  ["Barlow", "Barlow"],
  ["Barlow Condensed", "Barlow Condensed"],
  ["Josefin Sans", "Josefin Sans"],
  ["Cabin", "Cabin"],
  ["Jost", "Jost"],
  ["Spectral", "Spectral"],
  ["Cinzel", "Cinzel"],
  ["Anton", "Anton"],
  ["Bricolage Grotesque", "Bricolage Grotesque"],
  ["DM Serif Display", "DM Serif Display"],
  ["IBM Plex Serif", "IBM Plex Serif"],
  ["Onest", "Onest"],
  ["Righteous", "Righteous"],
  ["Space Mono", "Space Mono"],
  ["Titillium Web", "Titillium Web"],
  ["Ubuntu", "Ubuntu"],
  ["Yeseva One", "Yeseva One"],
  ["Zilla Slab", "Zilla Slab"],
  ["Archivo Black", "Archivo Black"],
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
    "DM Serif Display": "DM Serif Display, sans-serif",
    "IBM Plex Serif": "IBM Plex Serif, sans-serif",
    "Onest": "Onest, sans-serif",
    "Righteous": "Righteous, sans-serif",
    "Space Mono": "Space Mono, monospace",
    "Titillium Web": "Titillium Web, sans-serif",
    "Ubuntu": "Ubuntu, sans-serif",
    "Yeseva One": "Yeseva One, sans-serif",
    "Zilla Slab": "Zilla Slab, sans-serif",
    "Archivo Black": "Archivo Black, sans-serif",
    Arial: "Arial, Helvetica, sans-serif", system: "system-ui, sans-serif",
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
  if (name === "spotify") return <svg {...common}><path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm5.496 17.303a.748.748 0 0 1-1.03.249c-2.823-1.725-6.379-2.113-10.571-1.157a.75.75 0 0 1-.334-1.463c4.585-1.045 8.576-.571 11.686 1.329.355.218.466.682.249 1.042zm1.47-3.272a.937.937 0 0 1-1.29.309c-3.23-1.986-8.151-2.56-11.975-1.395a.938.938 0 0 1-.547-1.793c4.363-1.324 8.965-.723 13.503 1.59a.938.938 0 0 1 .309 1.29zm.126-3.409C15.211 8.32 9.06 8.118 5.494 9.2a1.125 1.125 0 0 1-.652-2.154c4.096-1.243 10.9-1.003 15.197 1.547a1.125 1.125 0 0 1-1.147 1.93z" /></svg>;
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

function Range({ label, value, min, max, suffix = "", step = 1, displayValue, throttleMs = 0, onChange }: { label: string; value: number; min: number; max: number; suffix?: string; step?: number; displayValue?: string; throttleMs?: number; onChange: (v: number) => void }) {
  const [draftValue, setDraftValue] = useState(value);
  const lastSentValue = useRef(value);
  const lastCommitAt = useRef(0);
  const pendingValue = useRef<number | null>(null);
  const timer = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => {
    if (value !== lastSentValue.current) {
      lastSentValue.current = value;
      setDraftValue(value);
    }
  }, [value]);
  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  const commit = (nextValue: number) => {
    if (throttleMs <= 0) {
      lastSentValue.current = nextValue;
      onChange(nextValue);
      return;
    }
    pendingValue.current = nextValue;
    const now = Date.now();
    const wait = throttleMs - (now - lastCommitAt.current);
    if (wait <= 0) {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = null;
      pendingValue.current = null;
      lastCommitAt.current = now;
      lastSentValue.current = nextValue;
      onChangeRef.current(nextValue);
      return;
    }
    if (timer.current === null) {
      timer.current = window.setTimeout(() => {
        timer.current = null;
        const pending = pendingValue.current;
        if (pending === null) return;
        pendingValue.current = null;
        lastCommitAt.current = Date.now();
        lastSentValue.current = pending;
        onChangeRef.current(pending);
      }, wait);
    }
  };

  const progress = max > min ? ((draftValue - min) / (max - min)) * 100 : 0;
  return <div className="range"><div><span>{label}</span><b>{displayValue ?? `${draftValue}${suffix}`}</b></div><input type="range" min={min} max={max} step={step} value={draftValue} style={{ "--range-progress": `${progress}%` } as React.CSSProperties} onChange={e => { const nextValue = Number(e.target.value); setDraftValue(nextValue); commit(nextValue); }} /></div>;
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
function SectionIntro({ title, text }: { number?: string; title: string; text?: string }) {
  return <div className="section-intro"><h2>{title}</h2>{text && <p>{text}</p>}</div>;
}



async function migratePresetAssets(settings: ProfileSettings): Promise<ProfileSettings> {
  const migrate = async (value: string) => {
    if (!value || !value.startsWith("idb:")) return value;
    try { return await migrateAssetToCloud(value) || value; } catch { return value; }
  };
  const [avatar, banner, shareCoverImage, backgroundImage, backgroundVideo, enterScreenBackgroundImage, enterScreenBackgroundVideo] = await Promise.all([
    migrate(settings.avatar), migrate(settings.banner), migrate(settings.shareCoverImage), migrate(settings.backgroundImage), migrate(settings.backgroundVideo),
    migrate(settings.enterScreenBackgroundImage), migrate(settings.enterScreenBackgroundVideo),
  ]);
  const [musicTracks, customLinks] = await Promise.all([
    Promise.all(settings.musicTracks.map(async track => ({ ...track, audio: await migrate(track.audio), cover: await migrate(track.cover) }))),
    Promise.all(settings.customLinks.map(async link => ({ ...link, icon: await migrate(link.icon) }))),
  ]);
  return { ...settings, avatar, banner, shareCoverImage, backgroundImage, backgroundVideo, enterScreenBackgroundImage, enterScreenBackgroundVideo, musicTracks, customLinks };
}

export default function Dashboard() {
  const [active, setActive] = useState("Overview");
  const [activePrimary, setActivePrimary] = useState<DashboardPrimarySection>("account");
  const [accountNavOpen, setAccountNavOpen] = useState(true);
  const [currentAccountEmail, setCurrentAccountEmail] = useState("");
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [settings, setSettings] = useState<ProfileSettings>(defaultSettings);
  const [settingsReady, setSettingsReady] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [previewEntered, setPreviewEntered] = useState(false);
  const [presetPreviewResetKey, setPresetPreviewResetKey] = useState(0);
  const [previewEntering, setPreviewEntering] = useState(false);
  const [previewParallaxReturning, setPreviewParallaxReturning] = useState(false);
  const previewParallaxReturnTimerRef = useRef<number | null>(null);
  const previewPointerBoundsRef = useRef<DOMRect | null>(null);
  const previewCardRef = useRef<HTMLDivElement>(null);
  const previewParallaxTargetRef = useRef({ x: 0, y: 0 });
  const previewParallaxFrameRef = useRef<number | null>(null);
  const previewAssetsLoadedRef = useRef(false);
  const [profileUserId, setProfileUserId] = useState("");
  const [viewToolAmount, setViewToolAmount] = useState("100");
  const [viewToolUsername, setViewToolUsername] = useState("");
  const [viewToolMessage, setViewToolMessage] = useState("");
  const [viewToolBusy, setViewToolBusy] = useState(false);
  const [premiumGiftUsername, setPremiumGiftUsername] = useState("");
  const [premiumGiftBusy, setPremiumGiftBusy] = useState(false);
  const [premiumGiftMessage, setPremiumGiftMessage] = useState("");
  const [premiumRevokeUsername, setPremiumRevokeUsername] = useState("");
  const [premiumRevokeBusy, setPremiumRevokeBusy] = useState(false);
  const [premiumRevokeMessage, setPremiumRevokeMessage] = useState("");
  const [savedIdentity, setSavedIdentity] = useState({ username: "", displayName: "" });
  const [showUsernameConfirm, setShowUsernameConfirm] = useState(false);
  const [usernameSaveBusy, setUsernameSaveBusy] = useState(false);
  const [usernameSaveError, setUsernameSaveError] = useState("");
  const [showDisplayNameConfirm, setShowDisplayNameConfirm] = useState(false);
  const [displayNameSaveBusy, setDisplayNameSaveBusy] = useState(false);
  const [displayNameSaveError, setDisplayNameSaveError] = useState("");
  const [badgesHidden, setBadgesHidden] = useState(false);
  const [dashboardBadges, setDashboardBadges] = useState<DashboardBadge[]>([]);
  const [previewBadges, setPreviewBadges] = useState<DashboardBadge[]>([]);
  const [dashboardBadgesLoading, setDashboardBadgesLoading] = useState(false);
  const [dashboardBadgesError, setDashboardBadgesError] = useState("");
  const [badgeCatalog, setBadgeCatalog] = useState<DashboardBadge[]>([]);
  const [badgeHubTab, setBadgeHubTab] = useState<BadgeHubTab>("Your badges");
  const [badgeTierModal, setBadgeTierModal] = useState<"views" | "donor" | "recruiter" | null>(null);
  const [badgeViews, setBadgeViews] = useState(0);
  const [badgeDonorStatus, setBadgeDonorStatus] = useState<BadgeDonorStatus | null>(null);
  const [viewBadgeTiers, setViewBadgeTiers] = useState<BadgeProgressTier[]>([]);
  const [recruiterBadgeTiers, setRecruiterBadgeTiers] = useState<BadgeProgressTier[]>([]);
  const [totalRecruiterInvites, setTotalRecruiterInvites] = useState(0);
  const [badgeDiscordLinked, setBadgeDiscordLinked] = useState(false);
  const canManageOwnViews = profileUserId === "3f29f647-4b99-4f53-adf0-eb678bef1c5f";
  const effectiveViewTiers = viewBadgeTiers.length ? viewBadgeTiers : PROFILE_VIEW_TIERS;
  const effectiveRecruiterTiers = recruiterBadgeTiers.length ? recruiterBadgeTiers : RECRUITER_TIER_FALLBACK;
  const [saved, setSaved] = useState(false);
  const [presetsPremium, setPresetsPremium] = useState(false);
  const [presetsPremiumReady, setPresetsPremiumReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/premium/status", { cache: "no-store", credentials: "include" })
      .then(async response => ({ ok: response.ok, data: await response.json().catch(() => ({})) }))
      .then(({ ok, data }) => {
        if (cancelled) return;
        setPresetsPremium(Boolean(ok && data?.premium));
        setPresetsPremiumReady(true);
      })
      .catch(() => { if (!cancelled) setPresetsPremiumReady(true); });
    return () => { cancelled = true; };
  }, []);
  const [presets, setPresets] = useState<{ slot_number: number; name: string; settings: Partial<ProfileSettings>; updated_at: string }[]>([]);
  const [presetBusy, setPresetBusy] = useState<number | null>(null);
  const [presetNames, setPresetNames] = useState<Record<number, string>>({});
  const [presetMessage, setPresetMessage] = useState("");
  const [profileCopied, setProfileCopied] = useState(false);
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
    if (!settingsReady) return;
    let cancelled = false;
    fetch("/api/presets", { cache: "no-store", credentials: "include" })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Could not load presets.");
        return data;
      })
      .then(data => {
        if (cancelled) return;
        setPresetsPremium(Boolean(data.premium));
        setPresets(Array.isArray(data.slots) ? data.slots : []);
        setPresetNames(Object.fromEntries((Array.isArray(data.slots) ? data.slots : []).map((slot: { slot_number: number; name: string }) => [slot.slot_number, slot.name])));
        setPresetMessage("");
      })
      .catch(error => {
        if (!cancelled) setPresetMessage(error instanceof Error ? error.message : "Could not load presets.");
      })
      .finally(() => { if (!cancelled) setPresetsPremiumReady(true); });
    return () => { cancelled = true; };
  }, [settingsReady]);

  useEffect(() => {
    if (active !== "Badges" || !settingsReady || !settings.username) return;
    let cancelled = false;
    setDashboardBadgesLoading(true);
    setDashboardBadgesError("");
    fetch("/api/profile/badges", { cache: "no-store", credentials: "include" })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Could not load your badges.");
        if (cancelled) return;
        setDashboardBadges(Array.isArray(data.badges) ? data.badges : []);
        setBadgeCatalog(Array.isArray(data.catalog) ? data.catalog : []);
        setViewBadgeTiers(Array.isArray(data.viewTiers) ? data.viewTiers : []);
        setRecruiterBadgeTiers(Array.isArray(data.recruiterTiers) ? data.recruiterTiers : []);
        setTotalRecruiterInvites(Math.max(0, Number(data.totalInvites || 0) || 0));
        setBadgeDiscordLinked(Boolean(data.discordLinked));
        setViewBadgeTiers(Array.isArray(data.viewTiers) ? data.viewTiers : []);
        setRecruiterBadgeTiers(Array.isArray(data.recruiterTiers) ? data.recruiterTiers : []);
        setTotalRecruiterInvites(Math.max(0, Number(data.totalInvites || 0) || 0));
        setBadgeDiscordLinked(Boolean(data.discordLinked));
      })
      .catch(error => { if (!cancelled) setDashboardBadgesError(error instanceof Error ? error.message : "Could not load your badges."); })
      .finally(() => { if (!cancelled) setDashboardBadgesLoading(false); });

    fetch("/api/profile-stats?username=" + encodeURIComponent(settings.username), { cache: "no-store", credentials: "include" })
      .then(async response => ({ ok: response.ok, data: await response.json().catch(() => ({})) }))
      .then(({ ok, data }) => { if (!cancelled && ok) setBadgeViews(Math.max(0, Number(data?.viewer?.views ?? data?.views ?? 0) || 0)); })
      .catch(() => {});
    fetch("/api/donations/status", { cache: "no-store", credentials: "include" })
      .then(async response => ({ ok: response.ok, data: await response.json().catch(() => ({})) }))
      .then(({ ok, data }) => { if (!cancelled) setBadgeDonorStatus(ok ? data : null); })
      .catch(() => { if (!cancelled) setBadgeDonorStatus(null); });

    return () => { cancelled = true; };
  }, [active, settingsReady, settings.username]);

  useEffect(() => {
    if (!badgeTierModal) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setBadgeTierModal(null); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [badgeTierModal]);
  useEffect(() => {
    if (!settingsReady || !settings.username) { setPreviewBadges([]); return; }
    let cancelled = false;
    fetch(`/api/public-profile/${encodeURIComponent(settings.username)}`, { cache: "no-store" })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (!cancelled) setPreviewBadges(Array.isArray(data?.profile?.badges) ? data.profile.badges : []); })
      .catch(() => { if (!cancelled) setPreviewBadges([]); });
    return () => { cancelled = true; };
  }, [settingsReady, settings.username]);
  const [discordLoading, setDiscordLoading] = useState(true);
  const [discordNotice, setDiscordNotice] = useState<"connected" | "error" | "already-linked" | "not-member" | "cancelled" | null>(null);
  const [discordDetail, setDiscordDetail] = useState("");
  const [discordSetupStep, setDiscordSetupStep] = useState<1 | 2>(1);
  const [discordCheckingMembership, setDiscordCheckingMembership] = useState(false);

  useEffect(() => {
    if (discordSetupStep !== 2 || discordUser) return;

    let active = true;
    let inFlight = false;
    const verifyMembership = async () => {
      if (!active || inFlight || document.visibilityState !== "visible") return;
      inFlight = true;
      try {
        const response = await fetch("/api/auth/discord/verify-membership", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = await response.json().catch(() => ({}));
        if (!active) return;
        if (response.ok && data.verified === true) {
          window.sessionStorage.removeItem("pixlo-discord-pending-join");
          window.location.assign("/dashboard");
          return;
        }
        if (response.status === 401 && data.code === "pending-expired") {
          window.sessionStorage.removeItem("pixlo-discord-pending-join");
          setDiscordCheckingMembership(false);
          setDiscordSetupStep(1);
          setDiscordNotice("error");
          setDiscordDetail("Your temporary Discord connection expired. Please link Discord again, then join the server.");
        } else if (!response.ok && response.status >= 500) {
          setDiscordDetail("Discord membership is temporarily unavailable. We'll keep checking automatically.");
        }
      } catch {
        // Keep checking if connectivity briefly drops while switching back from Discord.
      } finally {
        inFlight = false;
      }
    };

    const onReturn = () => {
      if (document.visibilityState === "visible") void verifyMembership();
    };
    void verifyMembership();
    const interval = window.setInterval(() => void verifyMembership(), 4000);
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, [discordSetupStep, discordUser]);


  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const discordStatus = params.get("discord");
    const detail = params.get("discord_detail");
    const pendingJoinKey = "pixlo-discord-pending-join";
    const savedPendingJoin = window.sessionStorage.getItem(pendingJoinKey) === "1";
    const resumeJoinStep = discordStatus === "not-member" || (!discordStatus && savedPendingJoin);

    if (["connected", "error", "already-linked", "not-member", "cancelled"].includes(discordStatus || "")) setDiscordNotice(discordStatus as "connected" | "error" | "already-linked" | "not-member" | "cancelled");
    setDiscordSetupStep(resumeJoinStep ? 2 : 1);
    setDiscordCheckingMembership(resumeJoinStep);
    if (resumeJoinStep) {
      window.sessionStorage.setItem(pendingJoinKey, "1");
    } else if (discordStatus) {
      window.sessionStorage.removeItem(pendingJoinKey);
    }
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
        const profile = accountData.profile as { id?: string; username?: string; displayName?: string;  };
        const username = String(profile.username || authUser.user_metadata?.username || authUser.email?.split("@")[0] || "user").trim().toLowerCase();
        const displayName = String(profile.displayName || authUser.user_metadata?.display_name || authUser.user_metadata?.full_name || username).trim() || username;
        const accountEmail = String(authUser.email || "").trim().toLowerCase();
        setCurrentAccountEmail(accountEmail);
        const localSettings = loadSettingsForAccount(authUser.id, { username, displayName });
        const cloudSettings = accountData.profile.settings && typeof accountData.profile.settings === "object" ? accountData.profile.settings as Partial<ProfileSettings> : {};
        const cloudHasSettings = Object.keys(cloudSettings).length > 0;
        let loaded = normaliseProfileSettings(cloudHasSettings ? { ...localSettings, ...cloudSettings, username, displayName } : localSettings, { username, displayName });
        const migrate = async (value: string) => {
          if (!value.startsWith("idb:")) return value;
          try { return await migrateAssetToCloud(value) || value; } catch { return value; }
        };
        const [avatar, banner, shareCoverImage, backgroundImage, backgroundVideo, enterScreenBackgroundImage, enterScreenBackgroundVideo, musicTracks, customLinks] = await Promise.all([
          migrate(loaded.avatar),
          migrate(loaded.banner),
          migrate(loaded.shareCoverImage),
          migrate(loaded.backgroundImage),
          migrate(loaded.backgroundVideo),
          migrate(loaded.enterScreenBackgroundImage),
          migrate(loaded.enterScreenBackgroundVideo),
          Promise.all(loaded.musicTracks.map(async track => ({ ...track, cover: await migrate(track.cover), audio: await migrate(track.audio) }))),
          Promise.all(loaded.customLinks.map(async link => ({ ...link, icon: await migrate(link.icon) }))),
        ]);
        loaded = { ...loaded, avatar, banner, shareCoverImage, backgroundImage, backgroundVideo, enterScreenBackgroundImage, enterScreenBackgroundVideo, musicTracks, customLinks };
        if (accountEmail) rememberPixloAccount({
          email: accountEmail, username, userId: authUser.id, displayName,
          ...(typeof avatar === "string" && /^https?:\/\//i.test(avatar) ? { avatar } : {}),
        });
        const linkedDiscord = accountData.user?.discordId ? accountData.user : null;
        if (linkedDiscord) {
          window.sessionStorage.removeItem("pixlo-discord-pending-join");
          setDiscordCheckingMembership(false);
        }
        if (accountData.discordUnlinkedForMembership) {
          setDiscordSetupStep(1);
          setDiscordNotice("not-member");
          setDiscordDetail("Your Discord link was removed because this account is no longer in the required server.");
        }

        setProfileUserId(authUser.id);
        setSavedIdentity({ username, displayName });
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
    }, 650);
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
  const navigateDashboard = (primary: DashboardPrimarySection, destination: string) => {
    setActivePrimary(primary);
    setActive(destination);
    setPremiumOpen(primary === "premium");
    setMobileMenu(false);
    setPreviewEntered(false);
    setPreviewEntering(false);
  };

  const savePresetSlot = async (slot: number) => {
    setPresetBusy(slot); setPresetMessage("");
    try {
      const existing = presets.find(item => item.slot_number === slot);
      const response = await fetch("/api/presets", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, name: (presetNames[slot] || existing?.name || `Preset ${slot}`).trim() || `Preset ${slot}`, settings: await migratePresetAssets(settings) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not save this preset.");
      setPresets(current => [...current.filter(item => item.slot_number !== slot), data.slot].sort((a,b) => a.slot_number - b.slot_number));
      setPresetMessage(`Preset slot ${slot} saved successfully.`);
    } catch (error) { setPresetMessage(error instanceof Error ? error.message : "Could not save this preset."); }
    finally { setPresetBusy(null); }
  };

  const savePresetName = async (slot: number) => {
    const existing = presets.find(item => item.slot_number === slot);
    const name = (presetNames[slot] ?? existing?.name ?? `Preset ${slot}`).trim().slice(0, 40) || `Preset ${slot}`;
    if (existing && name === existing.name) return;
    setPresetBusy(slot);
    setPresetMessage("");
    try {
      const response = await fetch("/api/presets", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, name, settings: existing?.settings || settings }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not save this preset name.");
      setPresets(current => [...current.filter(item => item.slot_number !== slot), data.slot].sort((a,b) => a.slot_number - b.slot_number));
      setPresetNames(current => ({ ...current, [slot]: data.slot?.name || name }));
      setPresetMessage(existing ? `Preset slot ${slot} renamed successfully.` : `Preset slot ${slot} named and saved successfully.`);
    } catch (error) {
      setPresetMessage(error instanceof Error ? error.message : "Could not save this preset name.");
      setPresetNames(current => ({ ...current, [slot]: existing?.name || "" }));
    } finally {
      setPresetBusy(null);
    }
  };

  const loadPresetSlot = async (preset: { slot_number: number; name: string; settings: Partial<ProfileSettings> }) => {
    setPresetBusy(preset.slot_number);
    setPresetMessage("");
    try {
      // Keep the account username, but restore the preset's saved display name and all other settings.
      const restored = normaliseProfileSettings({ ...preset.settings, username: settings.username, displayName: preset.settings.displayName ?? settings.displayName }, { username: settings.username });
      const next = await migratePresetAssets(restored);
      if (profileUserId) {
        saveSettingsToStorage(next, accountSettingsStorageKey(profileUserId));
        const response = await fetch("/api/account", {
          method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ settings: next }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "The preset was applied locally but could not be synced to your profile.");
      }
      setSettings(next);
      setSaved(true);
      setPresetMessage(`Equipped “${preset.name || `Preset ${preset.slot_number}`}” — all saved settings restored.`);
      setPreviewEntered(false); setPreviewEntering(false);
    } catch (error) {
      setPresetMessage(error instanceof Error ? error.message : "Could not equip this preset.");
    } finally {
      setPresetBusy(null);
    }
  };

  const deletePresetSlot = async (slot: number) => {
    setPresetBusy(slot); setPresetMessage("");
    try {
      const response = await fetch("/api/presets?slot=" + slot, { method: "DELETE", credentials: "include", cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not clear this preset.");
      setPresets(current => current.filter(item => item.slot_number !== slot));
      setPresetMessage(`Preset slot ${slot} cleared.`);
    } catch (error) { setPresetMessage(error instanceof Error ? error.message : "Could not clear this preset."); }
    finally { setPresetBusy(null); }
  };


  const giftFreePremium = async () => {
    const username = premiumGiftUsername.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,24}$/.test(username)) {
      setPremiumGiftMessage("Enter a valid Pixlo username (3–24 characters).");
      return;
    }
    if (!window.confirm(`Gift lifetime Pixlo Premium to @${username} for free? This grants Premium and its badge.`)) return;
    setPremiumGiftBusy(true);
    setPremiumGiftMessage("");
    try {
      const response = await fetch("/api/admin/premium-gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username }),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not gift Premium.");
      setPremiumGiftMessage(`Successfully gifted lifetime Premium to @${data.recipient?.username || username}. The Discord announcement will appear after the bot syncs.`);
      setPremiumGiftUsername("");
    } catch (error) {
      setPremiumGiftMessage(error instanceof Error ? error.message : "Could not gift Premium.");
    } finally {
      setPremiumGiftBusy(false);
    }
  };

  const revokePremium = async () => {
    const username = premiumRevokeUsername.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,24}$/.test(username)) {
      setPremiumRevokeMessage("Enter a valid Pixlo username.");
      return;
    }
    if (!window.confirm(`Revoke lifetime Pixlo Premium from @${username}? This will remove their Premium entitlement and Premium badge. The Discord bot will announce the revocation when it next syncs and removes their Premium role.`)) return;
    setPremiumRevokeBusy(true);
    setPremiumRevokeMessage("");
    try {
      const response = await fetch("/api/admin/premium-revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username }),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not revoke Premium.");
      setPremiumRevokeMessage(`Revoked lifetime Premium from @${data.recipient?.username || username}. The Discord bot will announce the revocation on its next Premium sync.`);
      setPremiumRevokeUsername("");
    } catch (error) {
      setPremiumRevokeMessage(error instanceof Error ? error.message : "Could not revoke Premium.");
    } finally {
      setPremiumRevokeBusy(false);
    }
  };

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
      }
      setViewToolMessage(action === "add" ? `Added ${amount.toLocaleString()} views to @${targetUsername}. Total: ${Number(data.views).toLocaleString()}.` : `Removed views from @${targetUsername}. Total: ${Number(data.views).toLocaleString()}.`);
    } catch (error) {
      setViewToolMessage(error instanceof Error ? error.message : "Could not adjust your views.");
    } finally {
      setViewToolBusy(false);
    }
  };
  useEffect(() => {
    if (!settingsReady || !profileUserId || !settings.username) return;
    let cancelled = false;
    const reconcilePremiumBadge = async () => {
      try {
        const statusResponse = await fetch("/api/premium/status", { cache: "no-store", credentials: "include" });
        const status = await statusResponse.json().catch(() => ({}));
        if (!statusResponse.ok || !status.premium || cancelled) return;
        const badgesResponse = await fetch(`/api/public-profile/${encodeURIComponent(settings.username)}?premium-refresh=${Date.now()}`, { cache: "no-store" });
        const badgesData = await badgesResponse.json().catch(() => ({}));
        if (cancelled || !badgesResponse.ok) return;
        const premiumBadge = (Array.isArray(badgesData?.profile?.badges) ? badgesData.profile.badges : [])
          .find((badge: DashboardBadge) => badge.name.trim().toLowerCase() === "premium");
        if (!premiumBadge) return;
        setSettings(current => {
          if (current.activeBadgeIds.includes(premiumBadge.id)) return current;
          return {
            ...current,
            activeBadgeIds: [...current.activeBadgeIds, premiumBadge.id],
            activeBadgeOrder: current.activeBadgeOrder.includes(premiumBadge.id) ? current.activeBadgeOrder : [...current.activeBadgeOrder, premiumBadge.id],
          };
        });
      } catch {
        // Premium badge reconciliation should never block normal dashboard use.
      }
    };
    void reconcilePremiumBadge();
    return () => { cancelled = true; };
  }, [settingsReady, profileUserId, settings.username]);

  useEffect(() => {
    if (!profileUserId) return;
    let active = true;
    const checkMembership = async () => {
      try {
        const response = await fetch("/api/account", { cache: "no-store", credentials: "include" });
        const data = await response.json().catch(() => ({}));
        if (!active || !response.ok) return;
        if (data.discordUnlinkedForMembership) {
          setDiscordSetupStep(1);
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
  const performSave = async () => {
    const isUsernameChange = settings.username.trim().toLowerCase() !== savedIdentity.username.trim().toLowerCase();
    if (isUsernameChange && usernameSaveBusy) return;
    if (!profileUserId) {
      if (isUsernameChange) setUsernameSaveError("Your Pixlo account is still loading. Please wait a moment and try again.");
      return;
    }
    if (isUsernameChange) {
      setUsernameSaveBusy(true);
      setUsernameSaveError("");
    }
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
        const message = data.error || "Unable to save your account identity.";
        if (isUsernameChange) {
          setUsernameSaveError(message);
          return;
        }
        window.alert(message);
        setSettings(current => ({ ...current, username: savedIdentity.username || current.username, displayName: savedIdentity.displayName || current.displayName }));
        return;
      }

      const savedUsername = String(data.profile.username || "").trim().toLowerCase();
      const requestedUsername = settings.username.trim().toLowerCase();
      if (isUsernameChange && savedUsername !== requestedUsername) {
        setUsernameSaveError("Pixlo received the save request but the database still returned your previous username. No change has been confirmed. Please refresh and try again; if it repeats, send us this message.");
        return;
      }

      const nextSettings = { ...settings, username: data.profile.username, displayName: data.profile.displayName };
      setSettings(nextSettings);
      setSavedIdentity({ username: data.profile.username, displayName: data.profile.displayName });
      saveSettingsToStorage(nextSettings, accountSettingsStorageKey(profileUserId));
      setSaved(true);
      setShowUsernameConfirm(false);
      setUsernameSaveError("");
      window.setTimeout(() => setSaved(false), 1800);
    } catch {
      if (isUsernameChange) setUsernameSaveError("Couldn't reach Pixlo to save this username. Check your connection and try again.");
      else window.alert("Couldn't save your account identity. Check your connection and try again.");
    } finally {
      if (isUsernameChange) setUsernameSaveBusy(false);
    }
  };
  const performDisplayNameSave = async () => {
    const requestedDisplayName = settings.displayName.trim().slice(0, 48);
    if (displayNameSaveBusy) return;
    if (!requestedDisplayName) {
      setDisplayNameSaveError("Display name cannot be empty.");
      return;
    }
    if (!profileUserId) {
      setDisplayNameSaveError("Your Pixlo account is still loading. Please wait a moment and try again.");
      return;
    }

    setDisplayNameSaveBusy(true);
    setDisplayNameSaveError("");
    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: savedIdentity.username || settings.username,
          displayName: requestedDisplayName,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.profile) {
        setDisplayNameSaveError(data.error || "Unable to save your display name.");
        return;
      }

      const savedDisplayName = String(data.profile.displayName || "").trim();
      if (!savedDisplayName || savedDisplayName !== requestedDisplayName) {
        setDisplayNameSaveError("Pixlo did not confirm the new display name. Your previous name is still saved; please try again.");
        return;
      }

      const nextSettings = {
        ...settings,
        username: savedIdentity.username || settings.username,
        displayName: savedDisplayName,
      };
      setSettings(current => ({ ...current, displayName: savedDisplayName }));
      setSavedIdentity(current => ({ ...current, displayName: savedDisplayName }));
      saveSettingsToStorage(nextSettings, accountSettingsStorageKey(profileUserId));
      setSaved(true);
      setShowDisplayNameConfirm(false);
      setDisplayNameSaveError("");
      window.setTimeout(() => setSaved(false), 1800);
    } catch {
      setDisplayNameSaveError("Couldn't reach Pixlo to save your display name. Check your connection and try again.");
    } finally {
      setDisplayNameSaveBusy(false);
    }
  };
  const save = async () => {
    if (settings.username.trim().toLowerCase() !== savedIdentity.username.trim().toLowerCase()) {
      setShowUsernameConfirm(true);
      return;
    }
    await performSave();
  };
  const reset = () => {
    if (!confirm("Reset profile settings? Your username, display name and views will be kept.")) return;
    const identity = { username: savedIdentity.username || settings.username, displayName: savedIdentity.displayName || settings.displayName, views: settings.views };
    const next = { ...defaultSettings, ...identity, discordAvatarUrl: settings.discordAvatarUrl, discordAvatarDecorationUrl: settings.discordAvatarDecorationUrl, useDiscordAvatar: settings.useDiscordAvatar, useDiscordDecoration: settings.useDiscordDecoration };
    if (profileUserId) saveSettingsToStorage(next, accountSettingsStorageKey(profileUserId));
    setSettings(next);
    setSaved(false);
  };
  const usernameHint = "You can change your username at any time. Changing it updates your profile URL.";
  const profileUrl = settingsReady && settings.username.trim() ? `https://pixlo1.vercel.app/user/${encodeURIComponent(settings.username.trim().toLowerCase())}` : "/dashboard";
  const profileShareKey = (() => {
    const parts = [
      "share-cover-v7-independent-glow-gradient",
      settings.displayName,
      settings.shareCoverFont,
      settings.shareCoverImage,
      String(settings.shareCoverNameSize),
      settings.shareCoverNameColour,
      settings.shareCoverCreditColour,
      String(settings.shareCoverNameGlow),
      String(settings.shareCoverNameGlowIntensity),
      String(settings.shareCoverNameGradientEnabled),
      JSON.stringify(settings.shareCoverNameGradientColours),
      String(settings.shareCoverCreditGradientEnabled),
      JSON.stringify(settings.shareCoverCreditGradientColours),
      settings.useDiscordAvatar ? settings.discordAvatarUrl : settings.avatar,
      settings.useDiscordDecoration ? settings.discordAvatarDecorationUrl : "",
      settings.backgroundImage,
      settings.backgroundVideo,
    ];
    let hash = 2166136261;
    for (const character of parts.join("|")) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
    return hash.toString(36);
  })();
  const shareProfileUrl = profileUrl === "/dashboard" ? profileUrl : `${profileUrl}?share=${profileShareKey}`;
  const copyProfileUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareProfileUrl);
      setProfileCopied(true);
      window.setTimeout(() => setProfileCopied(false), 1800);
    } catch {
      window.prompt("Copy your Pixlo profile link:", shareProfileUrl);
    }
  };
  const previewAvatar = settings.useDiscordAvatar && settings.discordAvatarUrl ? settings.discordAvatarUrl : previewAssets.avatar;
  const previewDecoration = settings.useDiscordDecoration && settings.discordAvatarDecorationUrl ? settings.discordAvatarDecorationUrl : "";
  const activeTrack = settings.musicTracks.find(t => t.id === settings.activeMusicId) || settings.musicTracks[0];
  const previewVisible = settingsReady && previewReady;
  const previewGlowRadius = settings.glowIntensity * 1.8;
  const previewGlowAlpha = Math.min(0.8, Math.max(0, settings.glowIntensity / 100));
  const previewShadow = settings.glow && settings.glowIntensity > 0
    ? `0 0 ${previewGlowRadius}px ${rgbaFromHex(settings.accentColour, previewGlowAlpha)}, 0 0 ${previewGlowRadius * 2.2}px ${rgbaFromHex(settings.accentColour, previewGlowAlpha * 0.35)}, 0 28px 90px ${rgbaFromHex("#000000", Math.max(0.2, settings.shadowOpacity / 100))}`
    : `0 28px 90px ${rgbaFromHex("#000000", settings.shadowOpacity / 100)}`;
  const readableTextOpacity = Math.max(85, Math.min(100, Number(settings.textOpacity) || 0));

  const previewStyle = useMemo(() => ({
    "--accent": settings.accentColour,
    "--glow-strength": settings.glowIntensity,
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
    "--preview-parallax-x": "0px",
    "--preview-parallax-y": "0px",
    "--preview-parallax-rotate-x": "0deg",
    "--preview-parallax-rotate-y": "0deg",
    "--preview-parallax-light-x": "50%",
    "--preview-parallax-light-y": "50%",
    "--preview-parallax-shadow-x": "0px",
    "--preview-parallax-shadow-y": "0px",
    backgroundColor: settings.backgroundColour,
  } as React.CSSProperties), [settings, previewShadow]);

  const applyPreviewParallax = (x: number, y: number) => {
    const card = previewCardRef.current;
    if (!card) return;
    const strength = settings.parallax ? settings.parallaxStrength : 0;
    const power = settings.parallax && strength > 0
      ? Math.min(1.7, Math.pow(Math.min(100, Math.max(0, strength)) / 35, 0.72))
      : 0;
    card.style.setProperty("--preview-parallax-x", `${x * strength}px`);
    card.style.setProperty("--preview-parallax-y", `${y * strength}px`);
    card.style.setProperty("--preview-parallax-rotate-x", `${y * -18 * power}deg`);
    card.style.setProperty("--preview-parallax-rotate-y", `${x * 22 * power}deg`);
    card.style.setProperty("--preview-parallax-light-x", `${50 + x * 45 * power}%`);
    card.style.setProperty("--preview-parallax-light-y", `${50 + y * 45 * power}%`);
    card.style.setProperty("--preview-parallax-shadow-x", `${x * -10 * power}px`);
    card.style.setProperty("--preview-parallax-shadow-y", `${y * -8 * power}px`);
  };
  const updatePreviewPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!settings.parallax || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = previewPointerBoundsRef.current;
    if (!bounds) return;
    const trackingMargin = 46;
    if (
      event.clientX < bounds.left - trackingMargin ||
      event.clientX > bounds.right + trackingMargin ||
      event.clientY < bounds.top - trackingMargin ||
      event.clientY > bounds.bottom + trackingMargin
    ) {
      resetPreviewPointer();
      return;
    }
    if (previewParallaxReturnTimerRef.current !== null) window.clearTimeout(previewParallaxReturnTimerRef.current);
    previewParallaxReturnTimerRef.current = null;
    previewParallaxTargetRef.current = {
      x: Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5) * 2)),
      y: Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / Math.max(bounds.height, 1) - 0.5) * 2)),
    };
    if (previewParallaxFrameRef.current === null) {
      previewParallaxFrameRef.current = window.requestAnimationFrame(() => {
        previewParallaxFrameRef.current = null;
        const target = previewParallaxTargetRef.current;
        applyPreviewParallax(target.x, target.y);
      });
    }
  };
  const handlePreviewPointerEnter = (event: React.PointerEvent<HTMLDivElement>) => {
    if (previewParallaxReturnTimerRef.current !== null) window.clearTimeout(previewParallaxReturnTimerRef.current);
    previewParallaxReturnTimerRef.current = null;
    setPreviewParallaxReturning(false);
    if (!previewPointerBoundsRef.current) previewPointerBoundsRef.current = event.currentTarget.parentElement?.getBoundingClientRect() || event.currentTarget.getBoundingClientRect();
  };
  const handlePreviewPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch" || !settings.parallax) return;
    previewPointerBoundsRef.current = event.currentTarget.parentElement?.getBoundingClientRect() || event.currentTarget.getBoundingClientRect();
    updatePreviewPointer(event);
  };
  const resetPreviewPointer = () => {
    previewPointerBoundsRef.current = null;
    previewParallaxTargetRef.current = { x: 0, y: 0 };
    if (previewParallaxFrameRef.current !== null) {
      window.cancelAnimationFrame(previewParallaxFrameRef.current);
      previewParallaxFrameRef.current = null;
    }
    applyPreviewParallax(0, 0);
    setPreviewParallaxReturning(true);
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

  if (discordLoading || !settingsReady) {
    return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#09090d", color: "#fff", fontFamily: "Inter, system-ui, sans-serif", padding: 24 }}>
      <div style={{ textAlign: "center" }}><div style={{ width: 38, height: 38, margin: "0 auto 18px", border: "3px solid rgba(255,255,255,.16)", borderTopColor: "#ffb45f", borderRadius: "50%", animation: "pixlo-spin 0.8s linear infinite" }} /><h1 style={{ margin: 0, fontSize: 22 }}>Loading your Pixlo dashboard…</h1><p style={{ color: "rgba(255,255,255,.65)" }}>Checking your account and Discord connection.</p></div>
      <style>{`@keyframes pixlo-spin { to { transform: rotate(360deg); } }`}</style>
    </main>;
  }

  if (!discordUser) {
    return (
      <main className="auth-page auth-page-discord-gate">
        <div className="auth-glow auth-glow-a" aria-hidden="true" />
        <div className="auth-glow auth-glow-b" aria-hidden="true" />
        <header className="auth-topbar auth-gate-topbar">
          <a href="/" className="auth-brand" aria-label="Pixlo home">
            <img className="auth-brand-logo" src="/pixlo-logo.png" alt="Pixlo" />
          </a>
        </header>

        <section className="auth-card auth-card-discord" aria-labelledby="discord-gate-title">
          <div className="auth-card-rails" aria-hidden="true">
            <i className="auth-rail auth-rail-tl-top" /><i className="auth-rail auth-rail-tl-side" />
            <i className="auth-rail auth-rail-tr-top" /><i className="auth-rail auth-rail-tr-side" />
            <i className="auth-rail auth-rail-bl-side" /><i className="auth-rail auth-rail-bl-bottom" />
            <i className="auth-rail auth-rail-br-bottom" /><i className="auth-rail auth-rail-br-side" />
          </div>

          <div className="auth-discord-steps" aria-label={`Discord setup progress, step ${discordSetupStep} of 2`}>
            <div className="auth-discord-progress" aria-hidden="true">
              <span className={discordSetupStep === 1 ? "is-active" : "is-complete"} />
              <span className={discordSetupStep === 2 ? "is-active" : ""} />
            </div>
          </div>

          <div className="auth-discord-emblem" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.54 5.12a16.9 16.9 0 0 0-3.98-1.25l-.52 1.06a15.4 15.4 0 0 0-6.08 0L8.44 3.87a16.9 16.9 0 0 0-3.98 1.25C1.94 8.86 1.24 12.5 1.59 16.08a16.98 16.98 0 0 0 5.05 2.55l1.22-1.67c-.68-.25-1.33-.56-1.94-.94l.48-.37a12.35 12.35 0 0 0 11.2 0l.49.37c-.61.38-1.26.69-1.94.94l1.22 1.67a16.98 16.98 0 0 0 5.05-2.55c.41-4.15-.7-7.76-2.88-10.96ZM8.4 14.1c-1.05 0-1.9-.98-1.9-2.19s.84-2.19 1.9-2.19 1.92.98 1.9 2.19c0 1.21-.85 2.19-1.9 2.19Zm7.2 0c-1.05 0-1.9-.98-1.9-2.19s.84-2.19 1.9-2.19 1.92.98 1.9 2.19c0 1.21-.85 2.19-1.9 2.19Z" />
            </svg>
          </div>

          <div className="auth-heading auth-heading-discord">
            {discordSetupStep === 1 ? (
              <>
                <h1 id="discord-gate-title">Link your <em>Discord account.</em></h1>
                <p>Connect the Discord account you use. We’ll check your server membership next before unlocking the dashboard.</p>
              </>
            ) : (
              <>
                <h1 id="discord-gate-title">Join the <em>Pixlo Discord.</em></h1>
                <p>Your Discord account is connected. Join the official server and we’ll automatically verify your membership when you return here.</p>
              </>
            )}
          </div>

          {discordSetupStep === 1 && (discordNotice === "error" || discordNotice === "cancelled" || discordNotice === "already-linked") && (
            <div className="auth-error auth-gate-message" role="alert">
              <span className="auth-message-icon">!</span>
              <span>{discordDetail || (discordNotice === "cancelled" ? "Discord linking was cancelled. Try again when you’re ready." : discordNotice === "already-linked" ? "That Discord account is already linked to another Pixlo account. Use the correct Discord account to continue." : "Discord could not be linked. Please try again.")}</span>
            </div>
          )}
          {discordSetupStep === 2 && discordNotice === "not-member" && (
            <div className="auth-gate-membership-note" role="status">
              <span className="auth-gate-note-dot" />
              {discordCheckingMembership ? "Checking your server membership…" : "Not a server member yet. Join below; Pixlo will check again automatically."}
            </div>
          )}

          {discordSetupStep === 1 ? (
            <div className="auth-gate-actions auth-gate-step-one">
              <a href="/api/auth/discord" className="auth-submit auth-gate-connect">
                <span>Link Discord account</span>
                <span className="auth-submit-arrow" aria-hidden="true">↗</span>
              </a>
            </div>
          ) : (
            <div className="auth-gate-step-two">
              <a
                href="https://discord.gg/Bkz4P9gVy7"
                target="_blank"
                rel="noreferrer"
                className="auth-submit auth-gate-connect auth-gate-join-server"
                onClick={() => setDiscordCheckingMembership(true)}
              >
                <span>Join the Pixlo Discord</span>
                <span className="auth-submit-arrow" aria-hidden="true">↗</span>
              </a>
            </div>
          )}

          <div className="auth-gate-note"><span className="auth-gate-note-dot" /> Pixlo unlocks when your Discord account is linked and server membership is confirmed.</div>
        </section>
      </main>
    );
  }

  return <>
  <style jsx global>{`
    .presets-premium-mark{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:22px;height:22px;margin-left:auto;border-radius:7px;color:#ffb45f;background:rgba(255,111,72,.10);border:1px solid rgba(255,151,83,.24);filter:drop-shadow(0 0 5px rgba(255,112,70,.22));}
    .presets-premium-mark img{width:75%;height:75%;object-fit:contain;filter:brightness(0) saturate(100%) invert(72%) sepia(56%) saturate(950%) hue-rotate(326deg) brightness(102%) drop-shadow(0 0 4px rgba(255,126,72,.3))}
    .presets-premium-mark svg{width:75%;height:75%;fill:currentColor}
    .presets-premium-mark-large{width:34px;height:34px;border-radius:10px}
    .presets-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
    .presets-tip{padding:13px 15px;border:1px solid rgba(255,143,83,.16);background:rgba(255,111,72,.055);border-radius:12px;color:rgba(255,255,255,.72);font-size:12px;line-height:1.65}
    .preset-status{display:inline-flex!important;align-items:center;align-self:flex-start!important;justify-self:start!important;flex:0 0 auto!important;width:max-content!important;max-width:min(420px,100%)!important;height:auto!important;min-height:0!important;box-sizing:border-box!important;padding:6px 10px!important;margin:0!important;border-radius:8px;border:1px solid #e5e7eb;background:#fff;color:#242424;font-size:11px;font-weight:650;line-height:1.35;white-space:normal;box-shadow:0 2px 8px rgba(0,0,0,.06)}
    .preset-slots{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
    .preset-slot-card{min-width:0;padding:16px;border:1px solid rgba(255,255,255,.09);border-radius:17px;background:linear-gradient(145deg,rgba(30,23,24,.98),rgba(15,15,19,.98));box-shadow:0 14px 34px rgba(0,0,0,.2);transition:border-color .22s ease,transform .22s ease}
    .preset-slot-card:hover{border-color:rgba(255,139,78,.3);transform:translateY(-2px)}
    .preset-slot-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:14px}
    .preset-slot-number{font-size:10px;letter-spacing:.15em;color:#ffad70;font-weight:800}
    .preset-slot-top h3{margin:5px 0 0;font-size:15px;color:#fff;overflow-wrap:anywhere}
    .preset-slot-state{font-size:9px;letter-spacing:.1em;font-weight:800;color:rgba(255,255,255,.42);padding:5px 7px;border:1px solid rgba(255,255,255,.09);border-radius:7px}
    .preset-slot-state.saved-state{color:#ffc092;border-color:rgba(255,143,83,.2);background:rgba(255,111,72,.08)}
    .preset-name-label{display:grid;gap:7px;margin-bottom:12px;color:rgba(255,255,255,.68);font-size:11px;font-weight:700}
    .preset-name-label input{width:100%;min-width:0;padding:10px 11px;border:1px solid rgba(255,255,255,.12);border-radius:9px;background:rgba(5,5,8,.52);color:#fff;font:inherit;font-size:12px;outline:none}
    .preset-name-label input:focus{border-color:rgba(255,143,83,.55);box-shadow:0 0 0 3px rgba(255,111,72,.08)}
    .preset-real-preview{position:relative;isolation:isolate;overflow:hidden;height:310px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:#070709}
    .preset-real-preview iframe{display:block;width:100%;height:100%;border:0;background:#070709}
    .preset-empty-preview{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:20px;text-align:center;background:radial-gradient(ellipse at top,rgba(255,111,72,.12),transparent 65%),#09090d;color:rgba(255,255,255,.5)}
    .preset-empty-mark{display:grid;place-items:center;width:38px;height:38px;margin-bottom:4px;border-radius:11px;background:linear-gradient(125deg,#ff9c4a,#ff624f);color:#1a0f0b;font-weight:900;font-size:18px;box-shadow:0 5px 20px rgba(255,100,72,.16)}
    .preset-empty-preview b{font-size:12px;color:rgba(255,255,255,.8)}.preset-empty-preview span:last-child{font-size:10px;line-height:1.5}
    .preset-preview-tag{position:absolute;left:9px;top:9px;display:flex;align-items:center;gap:6px;padding:5px 7px;border:1px solid rgba(255,255,255,.13);border-radius:7px;background:rgba(5,5,8,.72);backdrop-filter:blur(8px);color:rgba(255,255,255,.68);font-size:8px;font-weight:800;letter-spacing:.08em}
    .preset-preview-tag i{width:5px;height:5px;border-radius:50%;background:#ff9b55;box-shadow:0 0 8px rgba(255,145,77,.7)}
    .preset-updated{min-height:16px;margin:10px 0 12px;color:rgba(255,255,255,.45);font-size:10px}
    .preset-slot-actions{display:flex;align-items:stretch;gap:8px}
    .preset-slot-actions button{border-radius:9px;padding:9px 11px;font:inherit;font-size:11px;font-weight:750;cursor:pointer;transition:filter .2s ease,opacity .2s ease;white-space:nowrap}
    .preset-slot-actions button:disabled{opacity:.5;cursor:wait}
    .preset-equip-button{flex:1;border:0;background:linear-gradient(105deg,#ff9c4a,#ff654f);color:#1b100c;box-shadow:0 5px 16px rgba(255,100,72,.14)}
    .preset-clear-button{flex:0 0 auto;border:1px solid rgba(255,104,104,.18);background:rgba(255,75,75,.055);color:#ffb1a9}
    .preset-save-new-button{width:100%}
    .dashboard-sidebar-nav{display:flex;flex-direction:column;gap:5px}
    .premium-nav-group{margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.1)}
    .premium-nav-heading{display:flex;align-items:center;gap:9px;padding:0 10px 9px;color:#c4a4ff;font-size:9px;font-weight:900;letter-spacing:.22em}
    .premium-nav-heading span{height:1px;flex:1;background:linear-gradient(90deg,rgba(168,85,247,.4),transparent)}
    .premium-nav-heading span:first-child{background:linear-gradient(90deg,transparent,rgba(168,85,247,.4))}
    .premium-nav-group .premium-nav-button{border:1px solid rgba(168,85,247,.24);background:linear-gradient(100deg,rgba(112,50,180,.14),rgba(255,255,255,.018));box-shadow:inset 0 0 18px rgba(168,85,247,.035)}
    .premium-nav-group .premium-nav-button.active{border-color:rgba(192,132,252,.48);background:linear-gradient(100deg,rgba(139,92,246,.24),rgba(255,255,255,.04));box-shadow:0 0 18px rgba(139,92,246,.1)}
    .premium-nav-group .premium-nav-button b{color:#e5d5ff}\n    .premium-gradient-card{padding:18px;border:1px solid rgba(168,85,247,.22);border-radius:16px;background:linear-gradient(135deg,rgba(139,92,246,.08),rgba(255,255,255,.025));display:flex;flex-direction:column;gap:14px}\n    .premium-gradient-card h3{margin:0;font-size:15px;color:#f4eaff}.premium-gradient-card p{margin:5px 0 0;color:#a9a2b8;font-size:12px;line-height:1.5}.premium-gradient-card-head{display:flex;align-items:center;justify-content:space-between;gap:14px}.premium-gradient-swatch{height:36px;border-radius:9px;background-size:240% 100%;animation:pixlo-gradient-swatch 5s ease-in-out infinite alternate;box-shadow:0 0 18px rgba(168,85,247,.14)}@keyframes pixlo-gradient-swatch{0%{background-position:0% 50%}100%{background-position:100% 50%}}.premium-gradient-colours{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.premium-gradient-note{padding:12px 14px;border:1px solid rgba(168,85,247,.16);border-radius:12px;color:#c7bdd8;font-size:12px;line-height:1.6;background:rgba(139,92,246,.06)}
    .admin-nav-button{position:relative!important;display:flex!important;align-items:center!important;gap:10px!important;margin:12px 0 2px!important;padding:11px 12px!important;border:1px solid rgba(255,90,90,.55)!important;border-radius:12px!important;background:linear-gradient(105deg,rgba(127,29,29,.35),rgba(30,10,14,.92))!important;box-shadow:0 0 0 1px rgba(255,75,75,.08),0 5px 22px rgba(220,38,38,.12)!important;color:#fff!important}
    .admin-nav-button b{color:#fff!important;font-size:11px!important;letter-spacing:.16em!important}
    .admin-nav-button .admin-nav-icon{display:grid;place-items:center;width:24px;height:24px;border-radius:7px;background:linear-gradient(135deg,#ffb36b,#ff5353);color:#27100e;font-size:14px;font-weight:900}
    .admin-nav-owner{margin-left:auto;padding:3px 5px;border:1px solid rgba(255,126,126,.25);border-radius:5px;color:#ffb0aa;font-size:8px;font-weight:900;letter-spacing:.12em}
    .admin-nav-button.active{border-color:rgba(255,140,120,.9)!important;background:linear-gradient(105deg,rgba(153,27,27,.55),rgba(50,10,18,.98))!important;box-shadow:0 0 24px rgba(239,68,68,.18)!important}
    @media(max-width:760px){.premium-nav-group{margin-top:10px}.admin-nav-button{margin-top:8px!important}}
      .presets-lock-overlay{position:absolute;z-index:60;inset:0;display:grid;place-items:center;padding:clamp(18px,4vw,44px);border-radius:22px;background:rgba(5,5,9,.78);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}
    .presets-lock-card{width:min(100%,420px);padding:clamp(24px,4vw,38px);text-align:center;border:1px solid rgba(255,143,83,.22);border-radius:22px;background:linear-gradient(145deg,rgba(34,25,24,.98),rgba(13,13,17,.98));box-shadow:0 25px 80px rgba(0,0,0,.42),0 0 35px rgba(255,100,72,.07);color:#fff}
    .presets-premium-mark-lock{width:52px;height:52px;margin:0 auto 18px;border-radius:16px}
    .presets-lock-eyebrow{margin:0 0 8px;color:#ffb782;font-size:10px;font-weight:850;letter-spacing:.2em}
    .presets-lock-card h2{margin:0 0 10px;font-size:clamp(24px,3vw,32px);letter-spacing:-.04em}
    .presets-lock-card>p:not(.presets-lock-eyebrow){margin:0 auto 22px;max-width:330px;color:rgba(255,255,255,.66);font-size:13px;line-height:1.75}
    .presets-unlock-button{display:inline-flex;align-items:center;justify-content:center;gap:9px;padding:12px 17px;border-radius:10px;background:linear-gradient(110deg,#ff9c4a,#ff654f);color:#1b100c;text-decoration:none;font-size:13px;font-weight:850;box-shadow:0 6px 22px rgba(255,100,72,.18)}
    @media(max-width:760px){.preset-slots{grid-template-columns:1fr}.presets-lock-overlay{border-radius:16px}.preset-real-preview{height:290px}.preset-slot-actions button{padding:9px 8px;font-size:10px}}
    /* Uniformly scale the entire Premium Presets workspace; do not squash the slot cards. */
    @media(min-width:1101px){
      .dashboard:has(.presets-page){height:100dvh!important;min-height:0!important;max-height:100dvh!important;overflow:hidden!important}
      .dashboard:has(.presets-page) .dashboard-main{min-height:0!important;height:100dvh!important;overflow:hidden!important}
      .dashboard:has(.presets-page) .editor-grid{display:block!important;height:100dvh!important;max-height:100dvh!important;min-height:0!important;overflow:hidden!important;padding:4px 10px!important}
      .dashboard:has(.presets-page) .editor-grid{vertical-align:top!important;align-content:start!important;justify-content:start!important;padding-top:0!important}
      .dashboard:has(.presets-page) .editor{display:block!important;align-self:start!important;margin-top:0!important;padding-top:0!important}
      .dashboard:has(.presets-page) .presets-page{position:relative!important;top:0!important;align-self:start!important;align-items:start!important;align-content:start!important;justify-content:start!important;margin:0!important;padding-top:0!important;display:flex!important;flex-direction:column!important;gap:12px!important}.dashboard:has(.presets-page) .presets-heading,.dashboard:has(.presets-page) .preset-status,.dashboard:has(.presets-page) .preset-slots{flex:0 0 auto!important}.dashboard:has(.presets-page) .preset-slots{width:100%!important}
      .dashboard:has(.presets-page) .preset-status{margin:0!important;justify-self:start!important}
      .dashboard:has(.presets-page) .editor{height:100%!important;max-height:100%!important;min-height:0!important;overflow:hidden!important;padding:4px 8px!important}
      .dashboard:has(.presets-page) .presets-page{zoom:1!important;transform:scale(.72)!important;transform-origin:top left!important;width:138.889%!important;height:138.889%!important;max-width:none!important;max-height:none!important;min-height:0!important;margin:0!important;overflow:visible!important;grid-template-rows:auto auto auto!important;gap:12px!important}
      .dashboard:has(.presets-page) .presets-heading{margin:0!important}
      .dashboard:has(.presets-page) .presets-heading .hint{margin:6px 0!important}
      .dashboard:has(.presets-page) .preset-slots{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;grid-template-rows:auto auto!important;align-content:start!important;gap:12px!important;height:auto!important;min-height:0!important;overflow:visible!important}
      .dashboard:has(.presets-page) .preset-slot-card{min-width:0!important;min-height:0!important;height:auto!important;max-height:none!important;padding:16px!important;overflow:hidden!important}
      .dashboard:has(.presets-page) .preset-real-preview{height:450px!important;min-height:0!important;flex:none!important;aspect-ratio:auto!important}
      /* Give the embedded profile a larger virtual viewport, then fit it inside the unchanged preview frame. */
      .dashboard:has(.presets-page) .preset-real-preview iframe{width:147.059%!important;height:147.059%!important;transform:scale(.68)!important;transform-origin:top left!important;overflow:hidden!important}
    }
  `}</style>
  {showUsernameConfirm && <div className="username-change-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !usernameSaveBusy) { setShowUsernameConfirm(false); setUsernameSaveError(""); } }}>
    <section className="username-change-dialog" role="dialog" aria-modal="true" aria-labelledby="username-confirm-title" aria-busy={usernameSaveBusy}>
      <div className="username-change-title-row">
        <h2 id="username-confirm-title">Confirm username change</h2>
        <button type="button" className="username-change-close" aria-label="Close" disabled={usernameSaveBusy} onClick={() => { setShowUsernameConfirm(false); setUsernameSaveError(""); }}>×</button>
      </div>
      <p className="username-change-copy">You are changing your username to <strong>@{settings.username}</strong>. Your Pixlo profile URL will change too.</p>
      <div className="username-change-target"><strong>@{settings.username}</strong><small>pixlo1.vercel.app/user/{settings.username.trim().toLowerCase()}</small></div>
      {usernameSaveError && <div className="auth-error username-change-error" role="alert"><span className="auth-message-icon">!</span><span>{usernameSaveError}</span></div>}
      <div className="username-change-actions">
        <button type="button" className="auth-back-button" disabled={usernameSaveBusy} onClick={() => { setShowUsernameConfirm(false); setUsernameSaveError(""); setSettings(current => ({ ...current, username: savedIdentity.username })); }}>Cancel</button>
        <button type="button" className="auth-submit username-change-submit" disabled={usernameSaveBusy || !profileUserId} onClick={() => { void performSave(); }}><span>{usernameSaveBusy ? "Saving…" : "Save username"}</span>{!usernameSaveBusy && <span className="auth-submit-arrow" aria-hidden="true">↗</span>}</button>
      </div>
    </section>
  </div>}
  {showDisplayNameConfirm && <div className="username-change-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !displayNameSaveBusy) { setShowDisplayNameConfirm(false); setDisplayNameSaveError(""); } }}>
    <section className="username-change-dialog display-name-dialog" role="dialog" aria-modal="true" aria-labelledby="display-name-confirm-title" aria-busy={displayNameSaveBusy}>
      <div className="username-change-title-row">
        <h2 id="display-name-confirm-title">Confirm display name change</h2>
        <button type="button" className="username-change-close" aria-label="Close" disabled={displayNameSaveBusy} onClick={() => { setShowDisplayNameConfirm(false); setDisplayNameSaveError(""); }}>×</button>
      </div>
      <p className="username-change-copy">You are changing your display name to <strong>{settings.displayName.trim()}</strong>.</p>
      <div className="username-change-target display-name-target"><strong>{settings.displayName.trim()}</strong><small>This is the name visitors will see on your Pixlo profile.</small></div>
      {displayNameSaveError && <div className="auth-error username-change-error" role="alert"><span className="auth-message-icon">!</span><span>{displayNameSaveError}</span></div>}
      <div className="username-change-actions">
        <button type="button" className="auth-back-button" disabled={displayNameSaveBusy} onClick={() => { setShowDisplayNameConfirm(false); setDisplayNameSaveError(""); setSettings(current => ({ ...current, displayName: savedIdentity.displayName })); }}>Cancel</button>
        <button type="button" className="auth-submit username-change-submit" disabled={displayNameSaveBusy || !profileUserId || !settings.displayName.trim()} onClick={() => { void performDisplayNameSave(); }}><span>{displayNameSaveBusy ? "Saving…" : "Save display name"}</span>{!displayNameSaveBusy && <span className="auth-submit-arrow" aria-hidden="true">↗</span>}</button>
      </div>
    </section>
  </div>}
    <main className={`dashboard dashboard-revamp ${settings.dashboardCustomisationEnabled ? "dashboard-customisation-on" : ""} ${settings.dashboardCustomisationEnabled && settings.dashboardBackgroundGradientEnabled ? "dashboard-bg-gradient-on" : ""} ${settings.dashboardCustomisationEnabled && settings.dashboardTextGradientEnabled ? "dashboard-text-gradient-on" : ""} ${settings.dashboardCustomisationEnabled && !settings.dashboardTextGradientEnabled ? "dashboard-text-solid-on" : ""}`} style={{ "--dashboard-bg-gradient": `linear-gradient(125deg, ${settings.dashboardBackgroundGradientColours[0]}, ${settings.dashboardBackgroundGradientColours[1]}, ${settings.dashboardBackgroundGradientColours[2]})`, "--dashboard-text-gradient": `linear-gradient(90deg, ${settings.dashboardTextGradientColours[0]} 0%, ${settings.dashboardTextGradientColours[1]} 16.666%, ${settings.dashboardTextGradientColours[2]} 33.333%, ${settings.dashboardTextGradientColours[0]} 50%, ${settings.dashboardTextGradientColours[1]} 66.666%, ${settings.dashboardTextGradientColours[2]} 83.333%, ${settings.dashboardTextGradientColours[0]} 100%)`, "--dashboard-text-solid": settings.dashboardTextSolidColour } as React.CSSProperties} onMouseDownCapture={event => { if (active === "Presets" && !(event.target as HTMLElement).closest(".preset-real-preview")) setPresetPreviewResetKey(value => value + 1); }}>
    <DashboardSidebar
      active={active}
      activePrimary={activePrimary}
      accountNavOpen={accountNavOpen}
      setAccountNavOpen={setAccountNavOpen}
      premiumOpen={premiumOpen}
      setPremiumOpen={setPremiumOpen}
      mobileMenu={mobileMenu}
      profileUserId={profileUserId}
      currentAccountEmail={currentAccountEmail}
      username={settings.username}
      displayName={settings.displayName}
      avatar={settings.avatar}
      isOwner={profileUserId === "3f29f647-4b99-4f53-adf0-eb678bef1c5f"}
      premiumIcon={previewBadges.find(badge => badge.name.trim().toLowerCase() === "premium")?.icon_url || ""}
      onNavigate={navigateDashboard}
      onReset={reset}
/>

    {settingsReady && settings.username.trim() && <button type="button" className={`pixlo-share-profile-button pixlo-dashboard-share-button ${profileCopied ? "is-copied" : ""}`} onClick={() => void copyProfileUrl()} aria-label="Share your Pixlo profile link"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M16 8V5.8A1.8 1.8 0 0 0 14.2 4H5.8A1.8 1.8 0 0 0 4 5.8v8.4A1.8 1.8 0 0 0 5.8 16H8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg><span>{profileCopied ? "Link copied!" : "Share your profile"}</span></button>}
      <div className="dashboard-main">
      <header className="dash-header">
        <button type="button" className="mobile-menu-button" onClick={() => setMobileMenu(v => !v)}>☰</button>
        <div className="header-copy"><h1>{activePrimary === "customize" ? "Customize" : activePrimary === "optimise" ? "Optimise" : activePrimary === "links" ? "Links" : active === "Stats" && activePrimary === "account" ? "Analytics" : active === "General" && activePrimary === "account" ? "Settings" : active === "Dashboard" ? "Workspace theme" : active === "Extras" ? "Widgets" : active}</h1><p>{activePrimary === "customize" ? "Fine-tune the look and feel of your public profile." : activePrimary === "optimise" ? "Advanced tools for your Pixlo profile, exclusive to Premium." : activePrimary === "links" ? "Manage your social URLs and custom profile links." : active === "Overview" ? "Your profile, account and quick actions in one place." : active === "Connections" ? "Your linked accounts and connected services." : ""}</p></div>
        <div className="header-actions"><a className="view-button view-button-primary" href={profileUrl} target="_blank" rel="noreferrer">View live profile ↗</a><button type="button" className="save-button" onClick={save}>{saved ? "✓ Saved" : "Save changes"}</button></div>
      </header>

      {activePrimary === "links" && <nav className="dashboard-links-tabs" aria-label="Links settings">
        <button type="button" className={active === "Socials" ? "active" : ""} onClick={() => setActive("Socials")}>Social links</button>
      </nav>}

      {activePrimary === "customize" && <nav className="dashboard-customize-tabs" aria-label="Customize profile settings">
        {customizeTabs.map(tab => <button key={tab.value} type="button" className={active === tab.value ? "active" : ""} onClick={() => { setActive(tab.value); setMobileMenu(false); setPreviewEntered(false); setPreviewEntering(false); }}><DashboardNavIcon name={tab.icon} className="dashboard-nav-icon" /><span>{tab.label}</span></button>)}
      </nav>}
      {(activePrimary === "premium" || activePrimary === "optimise") && <nav className="dashboard-premium-tabs" aria-label="Premium sections">
        <button type="button" className={activePrimary === "premium" ? "active" : ""} onClick={() => navigateDashboard("premium", "Presets")}>Premium presets</button>
        <button type="button" className={activePrimary === "optimise" ? "active" : ""} onClick={() => navigateDashboard("optimise", "Cursor Trail")}>Optimise</button>
      </nav>}
      {activePrimary === "optimise" && <nav className="dashboard-optimise-tabs" aria-label="Optimise settings">
        {optimiseTabs.map(tab => <button key={tab.value} type="button" className={active === tab.value ? "active" : ""} onClick={() => { setActive(tab.value); setMobileMenu(false); setPreviewEntered(false); setPreviewEntering(false); }}><DashboardNavIcon name={tab.icon} className="dashboard-nav-icon" /><span>{tab.label}</span></button>)}
      </nav>}

      <div className="editor-grid" style={{ position: "relative" }}>
        <section className="editor">
        {active === "Overview" && <div className="form-stack dashboard-overview-page">
          <div className="dashboard-overview-hero"><span className="dashboard-overview-kicker">YOUR PIXLO WORKSPACE</span><h2>Welcome back, {settings.displayName || settings.username || "creator"}.</h2><p>Everything you need to manage your profile, links and style—organised into one workspace.</p></div>
          <section className="dashboard-overview-profile">
            <span className="dashboard-overview-avatar">{typeof settings.avatar === "string" && /^https?:\/\//i.test(settings.avatar) ? <img src={settings.avatar} alt="" /> : <span>{(settings.displayName || settings.username || "P").slice(0,1).toUpperCase()}</span>}</span>
            <div className="dashboard-overview-profile-copy"><b>{settings.displayName || settings.username || "Your profile"}</b><span>@{settings.username || "username"}</span><small>{currentAccountEmail || "Signed-in Pixlo account"}</small></div>
            <a className="dashboard-overview-open" href={profileUrl} target="_blank" rel="noreferrer"><DashboardNavIcon name="external" />View profile</a>
          </section>
          <div className="dashboard-overview-grid">
            <button type="button" className="dashboard-overview-card" onClick={() => navigateDashboard("customize", "General")}><span className="dashboard-overview-card-icon"><DashboardNavIcon name="palette" /></span><b>Customize profile</b><small>Colours, avatar, backgrounds, fonts and effects.</small><span className="dashboard-overview-card-action">Open customization <i>↗</i></span></button>
            <button type="button" className="dashboard-overview-card" onClick={() => navigateDashboard("links", "Socials")}><span className="dashboard-overview-card-icon"><DashboardNavIcon name="link" /></span><b>Manage links</b><small>Edit social URLs and arrange your profile links.</small><span className="dashboard-overview-card-action">Open links <i>↗</i></span></button>
            <button type="button" className="dashboard-overview-card" onClick={() => navigateDashboard("account", "Stats")}><span className="dashboard-overview-card-icon"><DashboardNavIcon name="chart" /></span><b>Analytics</b><small>Check profile activity and your place in the community.</small><span className="dashboard-overview-card-action">View analytics <i>↗</i></span></button>
            <button type="button" className="dashboard-overview-card" onClick={() => navigateDashboard("account", "Badges")}><span className="dashboard-overview-card-icon"><DashboardNavIcon name="badge" /></span><b>Badges</b><small>Choose which earned Pixlo badges appear on your page.</small><span className="dashboard-overview-card-action">Manage badges <i>↗</i></span></button>
          </div>
          <div className="dashboard-overview-bottom"><div><span className="dashboard-overview-status-dot" /><span><b>Discord connected</b><small>Your account is linked and server membership is verified.</small></span></div><button type="button" onClick={() => navigateDashboard("account", "Connections")}>View connections <i>→</i></button></div>
        </div>}

          {active === "Connections" && <div className="form-stack dashboard-connections-page">
          <SectionIntro title="Connected accounts" text="Manage the services linked to your Pixlo account." />
          <section className="dashboard-connection-card"><span className="dashboard-connection-brand"><DashboardNavIcon name="connections" /></span>
            <div className="dashboard-connection-copy"><div><b>Discord</b><span className="dashboard-connection-status"><i /> Connected</span></div><p>{discordUser?.discordDisplayName || discordUser?.discordUsername || "Your Discord account"} is linked to Pixlo. Server membership is required to keep dashboard access.</p>{discordUser?.discordUsername && <small>@{discordUser.discordUsername}</small>}</div>
            {discordUser?.discordAvatar && <img className="dashboard-connection-avatar" src={discordUser.discordAvatar} alt="Discord avatar" />}
          </section>
          <div className="dashboard-connection-help"><DashboardNavIcon name="shield" /><p>Pixlo checks official server membership when you access the dashboard. If you leave the server, dashboard access is locked again.</p></div>
        </div>}
        {activePrimary === "optimise" && active === "Dashboard" && <div className="form-stack dashboard-theme-page">
            <SectionIntro title="Dashboard appearance" text="Make your Pixlo workspace feel like yours. These settings change the dashboard only, not your public profile." />
            {!presetsPremiumReady ? <div className="premium-gradient-card">Checking Premium access…</div> : !presetsPremium ? <div className="premium-gradient-card"><h3>Premium dashboard themes</h3><p>Custom dashboard backgrounds and animated interface text are included with Pixlo Premium.</p><a className="presets-unlock-button" href="/premium">Explore Premium ↗</a></div> : <>
              <section className="dashboard-theme-master">
                <div><h3>Dashboard customisation</h3><p>Turn your custom theme on or off at any time. Your colours are saved when you press Save changes.</p></div>
                <Toggle value={settings.dashboardCustomisationEnabled} onChange={value => { set("dashboardCustomisationEnabled", value); setSaved(false); }} />
              </section>
              <div className={`dashboard-theme-controls ${settings.dashboardCustomisationEnabled ? "" : "is-disabled"}`}>
                <section className="premium-gradient-card">
                  <div className="premium-gradient-card-head"><div><h3>Background gradient</h3><p>Blend three colours across the dashboard background.</p></div><Toggle value={settings.dashboardBackgroundGradientEnabled} onChange={value => { set("dashboardBackgroundGradientEnabled", value); setSaved(false); }} /></div>
                  <div className="dashboard-theme-swatch dashboard-bg-swatch" style={{ background: `linear-gradient(110deg, ${settings.dashboardBackgroundGradientColours.join(", ")})` }} />
                  <div className="premium-gradient-colours">{([0,1,2] as const).map(index => <Colour key={index} label={`Background colour ${index+1}`} value={settings.dashboardBackgroundGradientColours[index]} onChange={value => { set("dashboardBackgroundGradientColours", settings.dashboardBackgroundGradientColours.map((colour, i) => i === index ? value : colour) as [string,string,string]); setSaved(false); }} />)}</div>
                </section>
                <section className="premium-gradient-card">
                  <div className="premium-gradient-card-head"><div><h3>Text colour</h3><p>Choose a smooth animated gradient or keep dashboard text one solid colour. The background gradient stays independent.</p></div><Toggle value={settings.dashboardTextGradientEnabled} onChange={value => { set("dashboardTextGradientEnabled", value); setSaved(false); }} /></div>
                  <div className="dashboard-theme-swatch" style={{ background: settings.dashboardTextGradientEnabled ? `linear-gradient(110deg, ${settings.dashboardTextGradientColours.join(", ")})` : settings.dashboardTextSolidColour }} />
                  {settings.dashboardTextGradientEnabled ? <div className="premium-gradient-colours">{([0,1,2] as const).map(index => <Colour key={index} label={`Gradient colour ${index+1}`} value={settings.dashboardTextGradientColours[index]} onChange={value => { set("dashboardTextGradientColours", settings.dashboardTextGradientColours.map((colour, i) => i === index ? value : colour) as [string,string,string]); setSaved(false); }} />)}</div> : <div className="premium-gradient-colours"><Colour label="Solid text colour" value={settings.dashboardTextSolidColour} onChange={value => { set("dashboardTextSolidColour", value); setSaved(false); }} /></div>}
                  <p className="dashboard-theme-footnote">{settings.dashboardTextGradientEnabled ? "Gradient is enabled. Turn this off to choose a single text colour." : "Solid text colour is enabled. Your background gradient is unchanged."}</p>
                </section>
              </div>
              <p className="dashboard-theme-footnote">Your theme is private to your signed-in account. Turning customisation off restores the standard Pixlo dashboard without deleting your saved colours.</p>
            </>}
          </div>}
          {active === "Presets" && <div className="form-stack presets-page">
            <div className="presets-heading"><SectionIntro title="Premium presets" /></div>
            {presetMessage && <div className="preset-status" role="status">{presetMessage}</div>}
            {presetsPremiumReady && !presetsPremium ? <div className="premium-gradient-card"><h3>✦ Premium feature</h3><p>Save and switch between your profile presets with Pixlo Premium.</p><a className="presets-unlock-button" href="/premium">Explore Premium ↗</a></div> : <div className="preset-slots">
              {[1,2,3,4].map(slot => {
                const preset = presets.find(item => item.slot_number === slot);
                const previewUsername = String(settings.username || preset?.settings?.username || "");
                return <article className={`preset-slot-card ${preset ? "has-preset" : "is-empty"}`} key={slot}>
                  <div className="preset-slot-top"><div><span className="preset-slot-number">Saved preset</span><h3>{preset?.name || `Preset ${slot}`}</h3></div>{preset && <span className="preset-slot-state saved-state">SAVED</span>}</div>
                  <label className="preset-name-label">Preset name<input aria-label={`Name for preset slot ${slot}`} maxLength={40} value={presetNames[slot] ?? preset?.name ?? ""} placeholder={`Name this preset`} onChange={event => setPresetNames(current => ({ ...current, [slot]: event.target.value }))} onBlur={() => void savePresetName(slot)} /></label>
                  <div className="preset-real-preview">
                    {preset && previewUsername ? <iframe key={`${slot}-${presetPreviewResetKey}`} title={`Pixlo profile preview for ${preset.name || `slot ${slot}`}`} src={`/${encodeURIComponent(previewUsername)}?presetPreview=${slot}&embedded=1`} loading="lazy" /> : <div className="preset-empty-preview" aria-label="Empty preset slot" />}
                  </div>
                  {preset && <p className="preset-updated">Last saved {new Date(preset.updated_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p>}
                  <div className="preset-slot-actions">
                    {preset && <button type="button" className="preset-equip-button" disabled={presetBusy !== null} onClick={() => { if (window.confirm(`Are you sure you want to equip “${preset.name || `Preset ${slot}`}”? This will replace your current dashboard customisation.`)) loadPresetSlot(preset); }}>Equip preset</button>}
                    {!preset && <button type="button" className="preset-equip-button preset-save-new-button" disabled={presetBusy !== null || !settingsReady} onClick={() => void savePresetSlot(slot)}>{presetBusy === slot ? "Saving…" : "Save current settings"}</button>}
                    {preset && <button type="button" className="preset-clear-button" disabled={presetBusy !== null} onClick={() => { if (window.confirm(`Are you sure you want to clear “${preset.name || `Preset ${slot}`}”? This cannot be undone.`)) void deletePresetSlot(slot); }}>Clear</button>}
                  </div>
                </article>;
              })}
            </div>}
          </div>}

          {active === "Badges" && <div className="form-stack pixlo-badge-hub">
            <header className="pixlo-badge-hub-header">
              <div>
                <span className="pixlo-badge-kicker">PROFILE REWARDS</span>
                <h2>Badges</h2>
                <p>Collect badges on Pixlo, track your milestones, and choose how they appear on your profile.</p>
              </div>
              <a href={"/user/" + encodeURIComponent(settings.username)} target="_blank" rel="noreferrer" className="pixlo-badge-profile-link">View profile ↗</a>
            </header>

            <nav className="pixlo-badge-tabs" aria-label="Badge sections">
              {(["Your badges", "All badges", "Customize", "Shop"] as BadgeHubTab[]).map(tab => (
                <button type="button" key={tab} className={badgeHubTab === tab ? "is-active" : ""} aria-selected={badgeHubTab === tab} onClick={() => setBadgeHubTab(tab)}>
                  {tab}{tab === "Your badges" && <span>{dashboardBadges.filter(badge => badge.badge_key !== "donor" && badge.name.trim().toLowerCase() !== "donor").length}</span>}
                </button>
              ))}
            </nav>

            {badgeHubTab === "Your badges" && <section className="pixlo-badge-tab-panel">
              <div className="pixlo-badge-panel-heading">
                <div><h3>Your collection</h3><p>Badges awarded to your Pixlo account. Equipping and display settings live under Customize.</p></div>
                <button type="button" className="pixlo-badge-quiet-button" disabled={dashboardBadgesLoading} onClick={() => {
                  setDashboardBadgesLoading(true);
                  setDashboardBadgesError("");
                  fetch("/api/profile/badges?refresh=" + Date.now(), { cache: "no-store", credentials: "include" })
                    .then(async response => {
                      const data = await response.json().catch(() => ({}));
                      if (!response.ok) throw new Error(data.error || "Could not refresh your badges.");
                      setDashboardBadges(Array.isArray(data.badges) ? data.badges : []);
                      setBadgeCatalog(Array.isArray(data.catalog) ? data.catalog : []);
                    })
                    .catch(error => setDashboardBadgesError(error instanceof Error ? error.message : "Could not refresh your badges."))
                    .finally(() => setDashboardBadgesLoading(false));
                }}>{dashboardBadgesLoading ? "Refreshing…" : "Refresh ↻"}</button>
              </div>
              {dashboardBadgesLoading && dashboardBadges.length === 0 ? <div className="pixlo-badge-empty"><span className="pixlo-badge-empty-icon">✦</span><strong>Loading your badges…</strong><p>Checking your earned rewards.</p></div>
              : dashboardBadgesError ? <div className="pixlo-badge-error" role="alert">{dashboardBadgesError}</div>
              : dashboardBadges.filter(badge => badge.badge_key !== "donor" && badge.name.trim().toLowerCase() !== "donor").length === 0
                ? <div className="pixlo-badge-empty"><span className="pixlo-badge-empty-icon">✦</span><strong>No badges yet.</strong><p>Check All badges to discover profile milestones and rewards available on Pixlo.</p><button type="button" onClick={() => setBadgeHubTab("All badges")}>Explore all badges <span>↗</span></button></div>
                : <div className="pixlo-badge-card-grid pixlo-earned-badge-grid">
                  {[...dashboardBadges].filter(badge => badge.badge_key !== "donor" && badge.name.trim().toLowerCase() !== "donor").sort((a, b) => {
                    const order = settings.activeBadgeOrder || [];
                    const ai = order.indexOf(a.id), bi = order.indexOf(b.id);
                    return (ai < 0 ? 9999 : ai) - (bi < 0 ? 9999 : bi);
                  }).map(badge => (
                    <article className="pixlo-badge-card pixlo-earned-badge-card" key={badge.id}>
                      <div className="pixlo-badge-card-mark">{badge.icon_url ? <img src={badge.icon_url} alt="" /> : <span>✦</span>}</div>
                      <div className="pixlo-badge-card-copy"><strong>{badge.name}</strong><p>{badge.description || "A badge earned on Pixlo."}</p></div>
                      <span className={settings.activeBadgeIds.includes(badge.id) ? "pixlo-badge-state is-equipped" : "pixlo-badge-state"}>{settings.activeBadgeIds.includes(badge.id) ? "Equipped" : "Earned"}</span>
                    </article>
                  ))}
                </div>}
            </section>}

            {badgeHubTab === "All badges" && <section className="pixlo-badge-tab-panel">
              <div className="pixlo-badge-panel-heading">
                <div><h3>Explore badges</h3><p>See the progression milestones and collectable badges available across Pixlo.</p></div>
              </div>
              <div className="pixlo-badge-progression-grid">
                <article className="pixlo-badge-progression-card">
                  <div className="pixlo-badge-progression-top">
                    <span className="pixlo-badge-progression-icon views-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.8 10-6.8S22 12 22 12s-3.6 6.8-10 6.8S2 12 2 12Z"/><circle cx="12" cy="12" r="3.2"/></svg></span>
                    <span className="pixlo-badge-category-label">PROFILE MILESTONES</span>
                  </div>
                  <h4>Profile views</h4>
                  <p>Build your audience and work through six view milestones, from Seen to Famous.</p>
                  <div className="pixlo-badge-progress-meta"><strong>{badgeViews.toLocaleString("en-GB")} views</strong><span>{effectiveViewTiers.find(tier => Number(tier.threshold_views || 0) > badgeViews) ? "Next: " + effectiveViewTiers.find(tier => Number(tier.threshold_views || 0) > badgeViews)!.name : "All milestones reached"}</span></div>
                  <div className="pixlo-badge-progress-track"><span style={{ width: (effectiveViewTiers.find(tier => Number(tier.threshold_views || 0) > badgeViews) ? Math.max(2, Math.min(100, Math.round((badgeViews / (effectiveViewTiers.find(tier => Number(tier.threshold_views || 0) > badgeViews)?.threshold_views || 1)) * 100))) : 100) + "%" }} /></div>
                  <button type="button" className="pixlo-badge-primary-button" onClick={() => setBadgeTierModal("views")}>View tiers <span>↗</span></button>
                </article>
                <article className="pixlo-badge-progression-card">
                  <div className="pixlo-badge-progression-top">
                    <span className="pixlo-badge-progression-icon donor-icon">$</span>
                    <span className="pixlo-badge-category-label">LIFETIME SUPPORT</span>
                  </div>
                  <h4>Donor badges</h4>
                  <p>Every donation contributes towards your next donor badge. Higher tiers replace lower tiers.</p>
                  <div className="pixlo-badge-progress-meta"><strong>{badgeDonorStatus?.authenticated ? "£" + (Number(badgeDonorStatus.totalDonatedPence || 0) / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "Sign in to track"}</strong><span>{badgeDonorStatus?.tiers?.find(tier => tier.amountPence > Number(badgeDonorStatus.totalDonatedPence || 0)) ? "Next: " + badgeDonorStatus.tiers.find(tier => tier.amountPence > Number(badgeDonorStatus.totalDonatedPence || 0))!.name : badgeDonorStatus?.authenticated ? "Top tier reached" : "7 lifetime tiers"}</span></div>
                  <div className="pixlo-badge-progress-track"><span style={{ width: (badgeDonorStatus?.tiers?.find(tier => tier.amountPence > Number(badgeDonorStatus.totalDonatedPence || 0)) ? Math.max(2, Math.min(100, Math.round((Number(badgeDonorStatus.totalDonatedPence || 0) / (badgeDonorStatus.tiers.find(tier => tier.amountPence > Number(badgeDonorStatus.totalDonatedPence || 0))?.amountPence || 1)) * 100))) : badgeDonorStatus?.authenticated ? 100 : 0) + "%" }} /></div>
                  <button type="button" className="pixlo-badge-primary-button" onClick={() => setBadgeTierModal("donor")}>View tiers <span>↗</span></button>
                </article>
                <article className="pixlo-badge-progression-card">
                  <div className="pixlo-badge-progression-top">
                    <span className="pixlo-badge-progression-icon recruiter-icon"><img src="/badges/recruiter-scout.svg" alt="" /></span>
                    <span className="pixlo-badge-category-label">COMMUNITY GROWTH</span>
                  </div>
                  <h4>Recruiter badges</h4>
                  <p>Invite people to the official Pixlo Discord and progress through five recruiter milestones.</p>
                  <div className="pixlo-badge-progress-meta"><strong>{badgeDiscordLinked ? totalRecruiterInvites.toLocaleString("en-GB") + " invites" : "Link Discord to track"}</strong><span>{effectiveRecruiterTiers.find(tier => Number(tier.threshold_invites || 0) > totalRecruiterInvites) ? "Next: " + effectiveRecruiterTiers.find(tier => Number(tier.threshold_invites || 0) > totalRecruiterInvites)!.name : badgeDiscordLinked ? "All tiers reached" : "5 → 100 invites"}</span></div>
                  <div className="pixlo-badge-progress-track"><span style={{ width: (badgeDiscordLinked ? (effectiveRecruiterTiers.find(tier => Number(tier.threshold_invites || 0) > totalRecruiterInvites) ? Math.max(2, Math.min(100, Math.round((totalRecruiterInvites / (effectiveRecruiterTiers.find(tier => Number(tier.threshold_invites || 0) > totalRecruiterInvites)?.threshold_invites || 1)) * 100))) : 100) : 0) + "%" }} /></div>
                  <button type="button" className="pixlo-badge-primary-button" onClick={() => setBadgeTierModal("recruiter")}>View tiers <span>↗</span></button>
                </article>
              </div>

              <div className="pixlo-badge-catalog-heading"><h3>Collectable badges</h3><span>{badgeCatalog.filter(badge => !DONOR_BADGE_KEYS.has(String(badge.badge_key || "").toLowerCase()) && badge.name.trim().toLowerCase() !== "donor").length} badges</span></div>
              {dashboardBadgesLoading && badgeCatalog.length === 0 ? <div className="pixlo-badge-loading">Loading the badge catalogue…</div>
              : badgeCatalog.filter(badge => !DONOR_BADGE_KEYS.has(String(badge.badge_key || "").toLowerCase()) && badge.name.trim().toLowerCase() !== "donor").length === 0
                ? <div className="pixlo-badge-empty pixlo-badge-empty-compact"><strong>No collectable badges to display yet.</strong><p>New badges will appear here as they are added to Pixlo.</p></div>
                : <div className="pixlo-badge-card-grid">
                  {badgeCatalog.filter(badge => !DONOR_BADGE_KEYS.has(String(badge.badge_key || "").toLowerCase()) && badge.name.trim().toLowerCase() !== "donor").map(badge => {
                    const earned = dashboardBadges.some(item => item.id === badge.id);
                    return <article className={"pixlo-badge-card pixlo-catalog-badge-card" + (earned ? " is-earned" : "")} key={badge.id}>
                      <div className="pixlo-badge-card-mark">{badge.icon_url ? <img src={badge.icon_url} alt="" /> : <span>✦</span>}</div>
                      <div className="pixlo-badge-card-copy"><strong>{badge.name}</strong><p>{badge.description || "A collectable Pixlo badge."}</p></div>
                      <span className={earned ? "pixlo-badge-state is-equipped" : "pixlo-badge-state"}>{earned ? "Earned" : "Not earned"}</span>
                    </article>;
                  })}
                </div>}
            </section>}

            {badgeHubTab === "Customize" && <section className="pixlo-badge-tab-panel pixlo-badge-customize-panel">
              <div className="pixlo-badge-panel-heading"><div><h3>Customise your badges</h3><p>Choose which earned badges appear on your public profile and tune their style.</p></div></div>
              <div className="pixlo-badge-custom-grid">
                <Setting label="Badge position" text="Place badges beside your profile picture or underneath the profile content."><select value={settings.badgePosition} onChange={e => { set("badgePosition", e.target.value as "left" | "right" | "bottom"); setSaved(false); }}><option value="left">Left side of profile picture</option><option value="right">Right side of profile picture</option><option value="bottom">Underneath everything</option></select></Setting>
                <Setting label="Badge appearance" text="Choose a pill background or show only the badge icon."><select value={settings.badgeStyle} onChange={e => { set("badgeStyle", e.target.value as "default" | "icon"); setSaved(false); }}><option value="default">Background and border</option><option value="icon">Icon only — no background or border</option></select></Setting>
                <Colour label="Badge colour" value={settings.badgeColour} onChange={v => { set("badgeColour", v); setSaved(false); }} />
                <Setting label="Badge glow" text="Add a coloured glow to equipped badges."><Toggle value={settings.badgeGlow} onChange={v => { set("badgeGlow", v); setSaved(false); }} /></Setting>
                <Range label="Badge glow intensity" value={settings.badgeGlowIntensity} min={0} max={200} suffix="%" onChange={v => { set("badgeGlowIntensity", v); setSaved(false); }} />
                <Range label="Badge size" value={settings.badgeScale} min={50} max={300} suffix="%" onChange={v => { set("badgeScale", v); setSaved(false); }} />
                <Setting label="Double underline" text="Show two centred lines beneath your badges."><Toggle value={settings.badgeUnderline} onChange={v => { set("badgeUnderline", v); setSaved(false); }} /></Setting>
                <Setting label="Underline glow" text="Add a matching glow to the double underline."><Toggle value={settings.badgeUnderlineGlow} onChange={v => { set("badgeUnderlineGlow", v); setSaved(false); }} /></Setting>
                {dashboardBadges.some(badge => badge.name.trim().toLowerCase() === "verified") && <Setting label="Show Verified badge beside display name" text="Place the Verified icon immediately to the right of your display name on your public profile."><Toggle value={settings.showVerifiedBadgeNextToUsername} onChange={v => { set("showVerifiedBadgeNextToUsername", v); setSaved(false); }} /></Setting>}
                {settings.showVerifiedBadgeNextToUsername && dashboardBadges.some(badge => badge.name.trim().toLowerCase() === "verified") && <Colour label="Verified check colour" value={settings.verifiedBadgeColour} onChange={v => { set("verifiedBadgeColour", v); setSaved(false); }} />}
              </div>

              <div className="pixlo-badge-panel-heading pixlo-badge-equip-heading"><div><h3>Equip and order badges</h3><p>Toggle badges on or off. Drag a card with the handle to change the display order. Save your dashboard to apply the changes.</p></div></div>
              {dashboardBadgesLoading ? <div className="pixlo-badge-loading">Loading earned badges…</div>
              : dashboardBadgesError ? <div className="pixlo-badge-error" role="alert">{dashboardBadgesError}</div>
              : dashboardBadges.filter(badge => badge.badge_key !== "donor" && badge.name.trim().toLowerCase() !== "donor").length === 0
                ? <div className="pixlo-badge-empty pixlo-badge-empty-compact"><strong>No earned badges to customise yet.</strong><p>Earn a badge first, then you can equip it here.</p></div>
                : <div className="pixlo-badge-equipped-list">
                  {[...dashboardBadges].filter(badge => badge.badge_key !== "donor" && badge.name.trim().toLowerCase() !== "donor").sort((a,b) => {
                    const order = settings.activeBadgeOrder || [];
                    const ai = order.indexOf(a.id), bi = order.indexOf(b.id);
                    return (ai < 0 ? 9999 : ai) - (bi < 0 ? 9999 : bi);
                  }).map(badge => {
                    const equipped = settings.activeBadgeIds.includes(badge.id);
                    return <div className="pixlo-badge-equip-row" key={badge.id} draggable onDragStart={event => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", badge.id); event.currentTarget.classList.add("dragging"); }} onDragEnd={event => event.currentTarget.classList.remove("dragging")} onDragOver={event => event.preventDefault()} onDrop={event => {
                      event.preventDefault();
                      const from = event.dataTransfer.getData("text/plain");
                      if (!from || from === badge.id) return;
                      setSettings(current => {
                        const valid = dashboardBadges.filter(item => item.badge_key !== "donor" && item.name.trim().toLowerCase() !== "donor").map(item => item.id);
                        const order = [...(current.activeBadgeOrder || []).filter(id => valid.includes(id)), ...valid.filter(id => !(current.activeBadgeOrder || []).includes(id))];
                        const a = order.indexOf(from), b = order.indexOf(badge.id);
                        if (a < 0 || b < 0) return current;
                        const next = [...order]; const [moved] = next.splice(a, 1); next.splice(b, 0, moved);
                        return { ...current, activeBadgeOrder: next };
                      });
                      setSaved(false);
                    }}>
                      <span className="pixlo-badge-drag-handle" title="Drag to reorder" aria-hidden="true">⠿</span>
                      <div className="pixlo-badge-mini-mark">{badge.icon_url ? <img src={badge.icon_url} alt="" /> : <span>✦</span>}</div>
                      <div className="pixlo-badge-equip-copy"><strong>{badge.name}</strong><small>{badge.description || "Pixlo badge"}</small></div>
                      <Toggle value={equipped} onChange={v => { setSettings(current => ({ ...current, activeBadgeIds: v ? [...current.activeBadgeIds, badge.id] : current.activeBadgeIds.filter(id => id !== badge.id) })); setSaved(false); }} />
                    </div>;
                  })}
                </div>}
            </section>}

            {badgeHubTab === "Shop" && <section className="pixlo-badge-tab-panel">
              <div className="pixlo-badge-panel-heading"><div><h3>Badge shop</h3><p>Explore ways to support Pixlo and add more to your profile.</p></div></div>
              <div className="pixlo-badge-shop-grid">
                <article className="pixlo-badge-shop-card"><span className="pixlo-badge-shop-icon premium-shop-icon">◆</span><div><h4>Premium badge</h4><p>Unlock lifetime Premium and its exclusive customisation features with one payment.</p></div><a href="/pricing#premium">Explore Premium ↗</a></article>
                <article className="pixlo-badge-shop-card"><span className="pixlo-badge-shop-icon donor-shop-icon">$</span><div><h4>Donor badge tiers</h4><p>Donations add up over time. Reach higher tiers to upgrade your donor badge.</p></div><a href="/pricing#extras">View donations ↗</a></article>
              </div>
              <p className="pixlo-badge-shop-note">Badges that require special events, staff recognition, or Discord roles cannot be purchased here.</p>
            </section>}

            {badgeTierModal && <div className="pixlo-badge-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setBadgeTierModal(null); }}>
              <section className={"pixlo-badge-tier-modal" + (badgeTierModal === "donor" ? " is-donor" : "")} role="dialog" aria-modal="true" aria-labelledby="pixlo-badge-tier-title">
                <button type="button" className="pixlo-badge-modal-close" aria-label="Close badge tiers" onClick={() => setBadgeTierModal(null)}>×</button>
                <div className="pixlo-badge-modal-heading">
                  <span className={"pixlo-badge-modal-emblem " + (badgeTierModal === "views" ? "views-icon" : "donor-icon")}>{badgeTierModal === "views" ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.8 10-6.8S22 12 22 12s-3.6 6.8-10 6.8S2 12 2 12Z"/><circle cx="12" cy="12" r="3.2"/></svg> : "$"}</span>
                  <div><h3 id="pixlo-badge-tier-title">{badgeTierModal === "views" ? "Profile view tiers" : "Donor badge tiers"}</h3><p>{badgeTierModal === "views" ? "Build your profile audience and unlock the next milestone." : "Your lifetime donations determine your donor badge tier."}</p></div>
                </div>
                {badgeTierModal === "views" ? <div className="pixlo-badge-tier-grid">
                  {PROFILE_VIEW_TIERS.map(tier => {
                    const reached = badgeViews >= tier.views;
                    const previous = PROFILE_VIEW_TIERS[PROFILE_VIEW_TIERS.findIndex(item => item.key === tier.key) - 1]?.views || 0;
                    const progress = reached ? 100 : Math.max(0, Math.min(100, Math.round(((badgeViews - previous) / (tier.views - previous)) * 100)));
                    return <article key={tier.key} className={"pixlo-badge-tier-item" + (reached ? " is-reached" : "")}>
                      <span className="pixlo-badge-tier-icon views-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.8 10-6.8S22 12 22 12s-3.6 6.8-10 6.8S2 12 2 12Z"/><circle cx="12" cy="12" r="3.2"/></svg></span>
                      <strong>{tier.name}</strong><small>{tier.views.toLocaleString("en-GB")} views</small>
                      <div className="pixlo-badge-tier-mini-track"><span style={{ width: progress + "%" }} /></div>
                      <span className="pixlo-badge-tier-lock">{reached ? "✓ Reached" : "🔒 Locked"}</span>
                    </article>;
                  })}
                </div> : <div className="pixlo-badge-tier-grid">
                  {(badgeDonorStatus?.tiers || []).map(tier => {
                    const total = Number(badgeDonorStatus?.totalDonatedPence || 0);
                    const reached = Boolean(badgeDonorStatus?.authenticated && total >= tier.amountPence);
                    return <article key={tier.key} className={"pixlo-badge-tier-item" + (reached ? " is-reached" : "")}>
                      <span className="pixlo-badge-tier-icon donor-icon">{tier.icon ? <img src={tier.icon} alt="" /> : "$"}</span>
                      <strong>{tier.name}</strong><small>{"£" + (tier.amountPence / 100).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} lifetime</small>
                      <div className="pixlo-badge-tier-mini-track"><span style={{ width: (badgeDonorStatus?.authenticated ? Math.max(0, Math.min(100, Math.round((total / tier.amountPence) * 100))) : 0) + "%" }} /></div>
                      <span className="pixlo-badge-tier-lock">{reached ? "✓ Reached" : "🔒 Locked"}</span>
                    </article>;
                  })}
                  {!badgeDonorStatus?.tiers?.length && <p className="pixlo-badge-tier-empty">Donor tiers are temporarily unavailable. Check back in a moment.</p>}
                </div>}
                <footer className="pixlo-badge-tier-footer">
                  {badgeTierModal === "views" ? <>
                    <span>Profile views</span><strong>{badgeViews.toLocaleString("en-GB")}</strong>
                    <span>Next tier</span><strong>{PROFILE_VIEW_TIERS.find(tier => tier.views > badgeViews) ? PROFILE_VIEW_TIERS.find(tier => tier.views > badgeViews)!.name + ", " + (PROFILE_VIEW_TIERS.find(tier => tier.views > badgeViews)!.views - badgeViews).toLocaleString("en-GB") + " to go" : "All milestones reached"}</strong>
                  </> : <>
                    <span>Lifetime donations</span><strong>{badgeDonorStatus?.authenticated ? "£" + (Number(badgeDonorStatus.totalDonatedPence || 0) / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "Sign in to track"}</strong>
                    <span>Next tier</span><strong>{badgeDonorStatus?.tiers?.find(tier => tier.amountPence > Number(badgeDonorStatus.totalDonatedPence || 0)) ? badgeDonorStatus.tiers.find(tier => tier.amountPence > Number(badgeDonorStatus.totalDonatedPence || 0))!.name + ", £" + ((badgeDonorStatus.tiers.find(tier => tier.amountPence > Number(badgeDonorStatus.totalDonatedPence || 0))!.amountPence - Number(badgeDonorStatus.totalDonatedPence || 0)) / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " to go" : badgeDonorStatus?.authenticated ? "Top donor tier reached" : "Open Pricing to learn more"}</strong>
                  </>}
                </footer>
                <p className="pixlo-badge-modal-note">{badgeTierModal === "views" ? "View milestones track the live profile-view counter. Your catalogue will show any badges that have actually been awarded to your account." : "Donor tier rewards are awarded from confirmed Stripe donations. A higher donor tier replaces the lower tier rather than stacking."}</p>
              </section>
            </div>}
          </div>}
{activePrimary === "optimise" && active === "Cursor Trail" && <div className="form-stack cursor-trail-page">
  <SectionIntro title="Cursor trail" text="Customise how your trail looks. Move your cursor over the live profile preview to test it." />
  {!presetsPremiumReady ? <div className="premium-gradient-card">Checking Premium access…</div> : !presetsPremium ? <div className="premium-gradient-card"><h3>Premium feature</h3><p>Cursor trails and their custom colour, glow, movement and lifetime settings are available to Pixlo Premium members.</p><a className="presets-unlock-button" href="/premium">Explore Premium ↗</a></div> : <>
    <section className="cursor-trail-settings-card">
      <div className="cursor-trail-card-heading">
        <div><h3>Trail settings</h3><p>Settings update the live preview and your public profile.</p></div>
        <span className={settings.cursorTrailEnabled ? "cursor-trail-state is-enabled" : "cursor-trail-state"}><i />{settings.cursorTrailEnabled ? "ENABLED" : "DISABLED"}</span>
      </div>
      <Setting label="Enable cursor trail" text="Show the trail in the live preview and on your public profile."><Toggle value={settings.cursorTrailEnabled} onChange={v => set("cursorTrailEnabled", v)} /></Setting>
      <div className="cursor-trail-control-grid">
        <div className="cursor-trail-colour-control"><Colour label="Trail colour" value={settings.cursorTrailColour} onChange={v => set("cursorTrailColour", v)} /></div>
        <Range label="Glow intensity" value={settings.cursorTrailGlow} min={0} max={200} suffix="%" onChange={v => set("cursorTrailGlow", v)} />
        <Range label="Trail size" value={settings.cursorTrailSize} min={50} max={350} suffix="%" onChange={v => set("cursorTrailSize", v)} />
        <Range label="Trail density" value={settings.cursorTrailDensity} min={20} max={250} suffix="%" onChange={v => set("cursorTrailDensity", v)} />
        <Range label="Trail speed" value={settings.cursorTrailSpeed} min={50} max={300} suffix="%" onChange={v => set("cursorTrailSpeed", v)} />
        <Range label="Trail lifetime" value={settings.cursorTrailLifetime} min={300} max={15000} step={100} displayValue={(settings.cursorTrailLifetime / 1000).toFixed(1) + "s"} onChange={v => set("cursorTrailLifetime", v)} />
      </div>
      <p className="cursor-trail-footnote">The trail is drawn directly over the live profile preview, does not block clicks, and respects reduced-motion settings.</p>
    </section>
  </>}
</div>}
{activePrimary === "optimise" && active === "Gradients" && <div className="form-stack">
            <SectionIntro title="Animated gradients" text="Create smoothly looping gradients for your profile text, socials and badges." />
            {!presetsPremiumReady ? <div className="premium-gradient-card">Checking Premium access…</div> : !presetsPremium ? <div className="premium-gradient-card"><h3>✦ Premium feature</h3><p>Animated gradients are available to Pixlo Premium members.</p><button type="button" className="save-button" onClick={() => navigateDashboard("premium", "Presets")}>View Premium</button></div> : <>
              <div className="premium-gradient-note">When enabled, each gradient overrides that category’s regular colours. Disable it to restore your existing colours. Animation loops smoothly and continuously.</div>
              {([{key:"Text",enabled:"gradientTextEnabled",colours:"gradientTextColours",description:"Display name, username, description and location"},{key:"Socials",enabled:"gradientSocialsEnabled",colours:"gradientSocialsColours",description:"Social icons and custom-link icons"},{key:"Badges",enabled:"gradientBadgesEnabled",colours:"gradientBadgesColours",description:"Profile badges and badge icons"}] as const).map(group => <div className="premium-gradient-card" key={group.key}><div className="premium-gradient-card-head"><div><h3>{group.key} gradient</h3><p>{group.description}</p></div><Toggle value={Boolean(settings[group.enabled])} onChange={value => set(group.enabled, value)} /></div><div className="premium-gradient-swatch" style={{background: `linear-gradient(110deg, ${settings[group.colours][0]}, ${settings[group.colours][1]}, ${settings[group.colours][2]}, ${settings[group.colours][0]})`}} /><div className="premium-gradient-colours">{([0,1,2] as const).map(index => <Colour key={index} label={`Colour ${index+1}`} value={settings[group.colours][index]} onChange={value => set(group.colours, settings[group.colours].map((colour, i) => i === index ? value : colour) as [string,string,string])} />)}</div></div>)}
            </>}
          </div>}
          {active === "General" && <div className="form-stack">
            <SectionIntro number="01" title="Identity, presence and first impression" text="Control exactly what visitors see before they explore anything else." />
            <Field label="Username" hint={usernameHint}><input value={settings.username} maxLength={24} autoCapitalize="none" autoCorrect="off" onChange={e => { set("username", e.target.value.replace(/[^a-zA-Z0-9._-]/g, "").toLowerCase().slice(0, 24)); setSaved(false); }} /></Field>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: -6 }}><button type="button" className="save-button" disabled={usernameSaveBusy || settings.username.trim().toLowerCase() === savedIdentity.username.trim().toLowerCase()} onClick={() => { setUsernameSaveError(""); setShowUsernameConfirm(true); }}>Change username</button>{settings.username.trim().toLowerCase() !== savedIdentity.username.trim().toLowerCase() && <span style={{ fontSize: 12, opacity: 0.7 }}>Your new username is not saved yet.</span>}</div>
            <div className="url-preview" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><span>Your profile: <b style={{ overflowWrap: "anywhere" }}>{profileUrl}</b></span><button type="button" onClick={() => void copyProfileUrl()} style={{ flexShrink: 0, padding: "8px 12px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.08)", color: "inherit", cursor: "pointer", font: "inherit" }}>{profileCopied ? "✓ Copied!" : "Copy link"}</button></div>
            <Field label="Display name"><input value={settings.displayName} maxLength={48} onChange={e => { set("displayName", e.target.value.slice(0, 48)); setSaved(false); }} /></Field>
<div className="identity-change-row">
  <button type="button" className="save-button" disabled={displayNameSaveBusy || !settings.displayName.trim() || settings.displayName.trim() === savedIdentity.displayName.trim()} onClick={() => { setDisplayNameSaveError(""); setShowDisplayNameConfirm(true); }}>Change display name</button>
  {settings.displayName.trim() !== savedIdentity.displayName.trim() && <span className="identity-change-note">Not saved yet</span>}
</div>
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
              <Range label="Glow intensity" value={settings.glowIntensity} min={0} max={150} suffix="%" onChange={v => set("glowIntensity", v)} />
            </div>
            <div className="colour-grid"><Colour label="Accent" value={settings.accentColour} onChange={v => set("accentColour", v)} /><Colour label="Page background" value={settings.backgroundColour} onChange={v => set("backgroundColour", v)} /><Colour label="Text" value={settings.textColour} onChange={v => set("textColour", v)} /><Colour label="Avatar border" value={settings.avatarBorderColour} onChange={v => set("avatarBorderColour", v)} /></div>
            <div className="presets"><span>Accent presets</span><div>{["#ffffff","#8b5cf6","#3b82f6","#22c55e","#f59e0b","#ec4899","#06b6d4","#ef4444"].map(c => <button type="button" key={c} style={{ background: c }} className={settings.accentColour === c ? "selected" : ""} onClick={() => set("accentColour", c)} />)}</div></div>
            <Range label="Profile opacity" value={settings.profileOpacity} min={0} max={100} suffix="%" onChange={v => set("profileOpacity", v)} />
            <Range label="Text opacity" value={Math.max(85, settings.textOpacity)} min={85} max={100} suffix="%" onChange={v => set("textOpacity", v)} />
            <Range label="Glass blur" value={settings.profileBlur} min={0} max={120} suffix="px" onChange={v => set("profileBlur", v)} />
            <Range label="Card border opacity" value={settings.borderOpacity} min={0} max={100} suffix="%" onChange={v => set("borderOpacity", v)} />
            <Range label="Shadow opacity" value={settings.shadowOpacity} min={0} max={100} suffix="%" onChange={v => set("shadowOpacity", v)} />
            <Range label="Shadow blur" value={settings.shadowBlur} min={0} max={320} suffix="px" onChange={v => set("shadowBlur", v)} />
            <Range label="Corner radius" value={settings.borderRadius} min={0} max={100} suffix="px" onChange={v => set("borderRadius", v)} />

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
            <Range label="Background blur" value={settings.backgroundBlur} min={0} max={100} suffix="px" onChange={v => set("backgroundBlur", v)} />
            <Range label="Background darkness" value={settings.backgroundOverlay} min={0} max={100} suffix="%" onChange={v => set("backgroundOverlay", v)} />
            <Range label="Background scale" value={settings.backgroundScale} min={100} max={300} suffix="%" onChange={v => set("backgroundScale", v)} />
            <Range label="Background X position" value={settings.backgroundPositionX} min={0} max={100} suffix="%" onChange={v => set("backgroundPositionX", v)} />
            <Range label="Background Y position" value={settings.backgroundPositionY} min={0} max={100} suffix="%" onChange={v => set("backgroundPositionY", v)} />
            <Range label="Vignette" value={settings.vignette} min={0} max={100} suffix="%" onChange={v => set("vignette", v)} />
          </div>}

          {active === "Profile" && <div className="form-stack">
            <SectionIntro number="05" title="Make the card yours" text="Control every major profile surface instead of being locked into one fixed design." />
            <FileUpload label="Avatar" value={settings.avatar} accept="image/*" type="image" onChange={v => set("avatar", v)} />
            <FileUpload label="Banner" value={settings.banner} accept="image/*" type="image" onChange={v => set("banner", v)} />
            <Range label="Card width" value={settings.cardWidth} min={420} max={1400} suffix="px" onChange={v => set("cardWidth", v)} />
            <Range label="Banner height" value={settings.bannerHeight} min={0} max={600} suffix="px" onChange={v => set("bannerHeight", v)} />
            <Range label="Avatar size" value={settings.avatarSize} min={56} max={350} suffix="px" onChange={v => set("avatarSize", v)} />
            <Range label="Avatar roundness" value={settings.avatarRadius} min={0} max={50} suffix="%" onChange={v => set("avatarRadius", v)} />
            <Range label="Avatar border" value={settings.avatarBorderWidth} min={0} max={24} suffix="px" onChange={v => set("avatarBorderWidth", v)} />
            <Field label="Avatar decoration"><select value={settings.avatarDecoration} onChange={e => set("avatarDecoration", e.target.value as ProfileSettings["avatarDecoration"])}><option value="none">None</option><option value="halo">Halo</option><option value="orbit">Orbit</option><option value="flame">Flame</option></select></Field>
            <Range label="Content spacing" value={settings.contentSpacing} min={6} max={80} suffix="px" onChange={v => set("contentSpacing", v)} />
            <p className="hint">Adjust the inner padding between the card edge and its content. This does not change the card width.</p>
            <Setting label="Show footer" text="Keep the online and view information at the bottom."><Toggle value={settings.showFooter} onChange={v => set("showFooter", v)} /></Setting>
          </div>}


          {activePrimary === "optimise" && active === "Share cover" && <div className="form-stack share-cover-page">
            {!presetsPremiumReady ? <div className="premium-gradient-card">Checking Premium access…</div> : !presetsPremium ? <div className="premium-gradient-card"><h3>✦ Premium feature</h3><p>Custom shared-link covers, uploaded backgrounds, text gradients and display-name glow are exclusive to Pixlo Premium. Free profiles use a clean Pixlo-branded cover with a centered avatar and white text.</p><a className="presets-unlock-button" href="/premium">Explore Premium ↗</a></div> : <>
              <SectionIntro title="Shared profile cover" text="Design the static preview people see when your Pixlo profile is shared. The live preview matches the static image used by Discord and other apps." />
              <div className="share-cover-editor-layout">
                <section className="share-cover-preview-panel" aria-label="Live shared-link cover preview">
                  <div className="share-cover-preview">
                    {settings.shareCoverImage && <img className="share-cover-preview-background" src={settings.shareCoverImage} alt="" />}
                    <div className="share-cover-preview-overlay" />
                    <div className="share-cover-preview-content">
                      <div className="share-cover-preview-avatar-wrap">
                        {previewAvatar ? <img className="share-cover-preview-avatar" src={previewAvatar} alt="" /> : <span className="share-cover-preview-avatar-fallback">{(settings.displayName || settings.username || "P").slice(0, 1).toUpperCase()}</span>}
                        {previewDecoration && <img className="share-cover-preview-decoration" src={previewDecoration} alt="" aria-hidden="true" />}
                      </div>
                      <div className={settings.shareCoverNameGlow && settings.shareCoverNameGlowIntensity > 0 ? "share-cover-preview-name-wrap has-glow" : "share-cover-preview-name-wrap"} style={{ "--share-cover-name-size": `${(settings.shareCoverNameSize * 1.18 / 1200) * 100}cqw`, "--share-cover-name-font": fontFamily(settings.shareCoverFont), "--share-cover-name-solid-colour": settings.shareCoverNameColour, "--share-cover-glow-colour": rgbaFromHex(settings.shareCoverNameGradientEnabled ? settings.shareCoverNameGradientColours[1] : settings.shareCoverNameColour, 1), "--share-cover-glow-strength": settings.shareCoverNameGlowIntensity } as React.CSSProperties}>
                      {settings.shareCoverNameGlow && settings.shareCoverNameGlowIntensity > 0 && <div className="share-cover-preview-name-glow" aria-hidden="true">{settings.displayName || settings.username}</div>}
                      <div className={settings.shareCoverNameGradientEnabled ? "share-cover-preview-name gradient-on" : "share-cover-preview-name solid-on"} style={{
                        color: settings.shareCoverNameGradientEnabled ? "transparent" : settings.shareCoverNameColour,
                        backgroundImage: settings.shareCoverNameGradientEnabled ? `linear-gradient(90deg, ${settings.shareCoverNameGradientColours.join(", ")})` : "none",
                        backgroundClip: settings.shareCoverNameGradientEnabled ? "text" : "border-box",
                        WebkitBackgroundClip: settings.shareCoverNameGradientEnabled ? "text" : "border-box",
                        WebkitTextFillColor: settings.shareCoverNameGradientEnabled ? "transparent" : settings.shareCoverNameColour,
                        fontFamily: fontFamily(settings.shareCoverFont),
                        fontSize: `${(settings.shareCoverNameSize * 1.18 / 1200) * 100}cqw`,
                      }}>{settings.displayName || settings.username}</div>
                      </div>
                      <div className="share-cover-preview-credit" style={{
                        color: settings.shareCoverCreditGradientEnabled ? "transparent" : settings.shareCoverCreditColour,
                        backgroundImage: settings.shareCoverCreditGradientEnabled ? `linear-gradient(90deg, ${settings.shareCoverCreditGradientColours.join(", ")})` : "none",
                        backgroundClip: settings.shareCoverCreditGradientEnabled ? "text" : "border-box",
                        WebkitBackgroundClip: settings.shareCoverCreditGradientEnabled ? "text" : "border-box",
                        WebkitTextFillColor: settings.shareCoverCreditGradientEnabled ? "transparent" : settings.shareCoverCreditColour,
                        fontFamily: fontFamily(settings.shareCoverFont),
                      }}>Made with Pixlo</div>
                    </div>
                  </div>
                  <p className="share-cover-preview-help">Static 1200 × 630 PNG used by Discord and other link previews.</p>
                </section>
                <div className="share-cover-controls">
                  <section className="share-cover-control-group share-cover-control-group-background">
                    <div className="share-cover-control-heading"><span>01</span><div><b>Background & typography</b><small>Choose the cover image and typeface.</small></div></div>
                    <FileUpload label="Cover background" value={settings.shareCoverImage} accept="image/*" type="image" note="Animated uploads use their first frame in the static share image." onChange={v => { set("shareCoverImage", v); setSaved(false); }} />
                    <div className="share-cover-font-control"><label className="field-label">Share cover font</label><FontDropdown value={settings.shareCoverFont} onChange={v => set("shareCoverFont", v)} id="share-cover-font" open={openDropdown} setOpen={setOpenDropdown} /></div>
                  </section>
                  <section className="share-cover-control-group share-cover-control-group-name">
                    <div className="share-cover-control-heading"><span>02</span><div><b>Display name</b><small>Control the main name, glow and gradient.</small></div></div>
                    <Colour label="Display name colour" value={settings.shareCoverNameColour} onChange={v => { set("shareCoverNameColour", v); setSaved(false); }} />
                    <Range label="Display name size" value={settings.shareCoverNameSize} min={28} max={110} suffix="px" throttleMs={80} onChange={v => set("shareCoverNameSize", v)} />
                    <Setting label="Display name glow" text="A broad, coloured halo around the name."><Toggle value={settings.shareCoverNameGlow} onChange={v => { set("shareCoverNameGlow", v); setSaved(false); }} /></Setting>
                    {settings.shareCoverNameGlow && <Range label="Glow intensity" value={settings.shareCoverNameGlowIntensity} min={0} max={200} suffix="%" throttleMs={80} onChange={v => set("shareCoverNameGlowIntensity", v)} />}
                    <Setting label="Display name gradient" text="Blend three colours across the name."><Toggle value={settings.shareCoverNameGradientEnabled} onChange={v => { set("shareCoverNameGradientEnabled", v); setSaved(false); }} /></Setting>
                    {settings.shareCoverNameGradientEnabled && <div className="share-cover-gradient-colours"><Colour label="Name gradient · start" value={settings.shareCoverNameGradientColours[0]} onChange={v => { set("shareCoverNameGradientColours", [v, settings.shareCoverNameGradientColours[1], settings.shareCoverNameGradientColours[2]]); setSaved(false); }} /><Colour label="Name gradient · middle" value={settings.shareCoverNameGradientColours[1]} onChange={v => { set("shareCoverNameGradientColours", [settings.shareCoverNameGradientColours[0], v, settings.shareCoverNameGradientColours[2]]); setSaved(false); }} /><Colour label="Name gradient · end" value={settings.shareCoverNameGradientColours[2]} onChange={v => { set("shareCoverNameGradientColours", [settings.shareCoverNameGradientColours[0], settings.shareCoverNameGradientColours[1], v]); setSaved(false); }} /></div>}
                  </section>
                  <section className="share-cover-control-group share-cover-control-group-credit">
                    <div className="share-cover-control-heading"><span>03</span><div><b>Pixlo credit</b><small>Style the small “Made with Pixlo” line.</small></div></div>
                    <Colour label="Made with Pixlo colour" value={settings.shareCoverCreditColour} onChange={v => { set("shareCoverCreditColour", v); setSaved(false); }} />
                    <Setting label="Made with Pixlo gradient" text="Give the credit line its own gradient."><Toggle value={settings.shareCoverCreditGradientEnabled} onChange={v => { set("shareCoverCreditGradientEnabled", v); setSaved(false); }} /></Setting>
                    {settings.shareCoverCreditGradientEnabled && <div className="share-cover-gradient-colours"><Colour label="Credit gradient · start" value={settings.shareCoverCreditGradientColours[0]} onChange={v => { set("shareCoverCreditGradientColours", [v, settings.shareCoverCreditGradientColours[1], settings.shareCoverCreditGradientColours[2]]); setSaved(false); }} /><Colour label="Credit gradient · middle" value={settings.shareCoverCreditGradientColours[1]} onChange={v => { set("shareCoverCreditGradientColours", [settings.shareCoverCreditGradientColours[0], v, settings.shareCoverCreditGradientColours[2]]); setSaved(false); }} /><Colour label="Credit gradient · end" value={settings.shareCoverCreditGradientColours[2]} onChange={v => { set("shareCoverCreditGradientColours", [settings.shareCoverCreditGradientColours[0], settings.shareCoverCreditGradientColours[1], v]); setSaved(false); }} /></div>}
                  </section>
                </div>
              </div>
            </>}
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
              <Range label="Social icon size" value={settings.socialIconSize} min={16} max={96} suffix="px" onChange={v => set("socialIconSize", v)} />
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
            <Range label="Glow intensity" value={settings.glowIntensity} min={0} max={150} suffix="%" onChange={v => set("glowIntensity", v)} />
            <Setting label="Floating card" text="Give the profile a slow floating motion."><Toggle value={settings.floating} onChange={v => set("floating", v)} /></Setting>
            <Setting label="Profile-card parallax" text="Give the profile card a smooth 3D tilt that follows your mouse or finger. The background stays completely still."><Toggle value={settings.parallax} onChange={v => set("parallax", v)} /></Setting>
            <Range label="Parallax intensity" value={settings.parallaxStrength} min={0} max={100} suffix="%" onChange={v => set("parallaxStrength", v)} />
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

          {active === "Admin" && profileUserId === "3f29f647-4b99-4f53-adf0-eb678bef1c5f" && <div className="form-stack admin-hub-page">
            <SectionIntro title="Pixlo Admin" />
            <p className="hint">Owner-only controls for managing Pixlo. This button is hidden from every other account.</p>
            <a className="badge-admin-dashboard-link" href="/dashboard/badges">Manage Pixlo badges <span>→</span></a>
            <div className="view-admin-tool">
              <div><b>Gift lifetime Premium for free</b><p>Grant lifetime Premium and the Premium badge to any Pixlo account. This owner-only action does not open Stripe checkout.</p></div>
              <Field label="Recipient username"><input value={premiumGiftUsername} onChange={event => setPremiumGiftUsername(event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 24))} placeholder="username" autoComplete="off" maxLength={24} /></Field>
              <div className="view-admin-actions"><button type="button" disabled={premiumGiftBusy || premiumGiftUsername.trim().length < 3} onClick={() => void giftFreePremium()}>{premiumGiftBusy ? "Granting Premium…" : "Gift free Premium"}</button></div>
              {premiumGiftMessage && <p className="view-admin-message" role="status">{premiumGiftMessage}</p>}
            </div>
            <div className="view-admin-tool">
              <div><b>Revoke lifetime Premium</b><p>Remove a Pixlo account’s Premium entitlement and Premium badge. The Discord bot announces the revocation when its next sync removes their Premium role.</p></div>
              <Field label="Account username"><input value={premiumRevokeUsername} onChange={event => setPremiumRevokeUsername(event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 24))} placeholder="username" autoComplete="off" maxLength={24} /></Field>
              <div className="view-admin-actions"><button type="button" disabled={premiumRevokeBusy || premiumRevokeUsername.trim().length < 3} onClick={() => void revokePremium()}>{premiumRevokeBusy ? "Revoking Premium…" : "Revoke Premium"}</button></div>
              {premiumRevokeMessage && <p className="view-admin-message" role="status">{premiumRevokeMessage}</p>}
            </div>
            <div className="view-admin-tool">
              <div><b>Profile view controls</b><p>Adjust the view total for a Pixlo profile.</p></div>
              <Field label="Target username" hint="Enter any Pixlo username, or leave blank to use your own profile."><input value={viewToolUsername} onChange={e => setViewToolUsername(e.target.value)} placeholder={settings.username || "username"} autoComplete="off" /></Field>
              <Field label="Number of views"><input type="number" min={1} max={1000000} step={1} inputMode="numeric" value={viewToolAmount} onChange={e => setViewToolAmount(e.target.value)} /></Field>
              <div className="view-admin-actions">
                <button type="button" disabled={viewToolBusy} onClick={() => void adjustOwnViews("add")}>{viewToolBusy ? "Working…" : "Generate views"}</button>
                <button type="button" disabled={viewToolBusy} onClick={() => void adjustOwnViews("remove")}>Remove views</button>
              </div>
              {viewToolMessage && <p className="view-admin-message" role="status">{viewToolMessage}</p>}
            </div>
            <Field label="Custom cursor image URL" hint="Optional"><input value={settings.customCursor} onChange={e => set("customCursor", e.target.value)} placeholder="https://..." /></Field>
            <Setting label="Keep the browser-native cursor" text="Leave this enabled by clearing the custom cursor URL."><span className="info-pill">AUTO</span></Setting>
          </div>}
          {activePrimary === "optimise" && active === "Layouts" && <div className="form-stack optimise-layouts-page">
  <SectionIntro title="Layouts" text="Choose how visitors move between the widgets and extra content on your public profile." />
  {!presetsPremiumReady ? <div className="premium-gradient-card">Checking Premium access…</div> : !presetsPremium ? <div className="premium-gradient-card"><h3>Premium feature</h3><p>Custom profile layouts are available to Pixlo Premium members.</p><a className="presets-unlock-button" href="/premium">Explore Premium ↗</a></div> : <>
    <div className="extras-settings-card">
                <div className="extras-card-heading"><div><h3>Profile layouts</h3><p>Choose how visitors move between your profile extras. The selected layout is used on your public page.</p></div></div>
                <div className="extras-layout-options">
                  <button type="button" className={settings.extrasLayout === "pages" ? "chosen" : ""} onClick={() => set("extrasLayout", "pages")}><span className="extras-layout-preview extras-pages-preview"><i /><i /><i /></span><b>Pages</b><small>Animated page transitions</small></button>
                  <button type="button" className={settings.extrasLayout === "horizontal" ? "chosen" : ""} onClick={() => set("extrasLayout", "horizontal")}><span className="extras-layout-preview extras-horizontal-preview"><i /><i /><i /></span><b>Side scroll</b><small>Swipe or scroll sideways</small></button>
                  <button type="button" className={settings.extrasLayout === "vertical" ? "chosen" : ""} onClick={() => set("extrasLayout", "vertical")}><span className="extras-layout-preview extras-vertical-preview"><i /><i /><i /></span><b>Scroll down</b><small>Stacked widget cards</small></button>
                </div>
              </div>
  </>}
</div>}
{activePrimary === "optimise" && active === "Extras" && <div className="form-stack extras-page">
            <SectionIntro number="14" title="Extra" text="Premium-only widgets and little details that make your Pixlo page feel alive." />
            {!presetsPremiumReady ? <div className="premium-gradient-card">Checking Premium access…</div> : !presetsPremium ? <div className="premium-gradient-card"><h3>✦ Extra is a Premium feature</h3><p>Unlock live timezone widgets, animated layouts, and future profile extras with Pixlo Premium.</p><button type="button" onClick={() => setPremiumOpen(true)}>Premium features</button></div> : <>
              <div className="extras-hero-card">
                <div><span className="extras-eyebrow">PIXLO / PREMIUM</span><h3>Make room for more.</h3><p>Extra lives in its own animated area beneath your profile card, keeping the main profile clean while giving you space for more widgets later.</p></div>
                <div className="extras-clock-mark" aria-hidden="true"><span>12</span><i>:</i><span>45</span></div>
              </div>
              <div className="extras-settings-card">
                <div className="extras-card-heading"><div><h3>Timezone comparison</h3><p>Show a live clock and date for another city alongside the visitor’s own local time.</p></div><span className="extras-live-pill"><i /> LIVE</span></div>
                <Setting label="Show timezone widget" text="Adds the timezone card to your public profile’s Extra area."><Toggle value={settings.timezoneEnabled} onChange={v => set("timezoneEnabled", v)} /></Setting>
                <Field label="Timezone / city" hint="Uses the IANA timezone database"><select value={settings.timezone} onChange={e => set("timezone", e.target.value)} className="extras-select">
                  <option value="Europe/London">London · United Kingdom</option><option value="Europe/Paris">Paris · France</option><option value="Europe/Berlin">Berlin · Germany</option><option value="Europe/Istanbul">Istanbul · Türkiye</option><option value="America/New_York">New York · United States</option><option value="America/Los_Angeles">Los Angeles · United States</option><option value="America/Chicago">Chicago · United States</option><option value="America/Toronto">Toronto · Canada</option><option value="America/Sao_Paulo">São Paulo · Brazil</option><option value="Asia/Dubai">Dubai · UAE</option><option value="Asia/Kolkata">Mumbai · India</option><option value="Asia/Singapore">Singapore</option><option value="Asia/Tokyo">Tokyo · Japan</option><option value="Asia/Seoul">Seoul · South Korea</option><option value="Australia/Sydney">Sydney · Australia</option><option value="Pacific/Auckland">Auckland · New Zealand</option><option value="UTC">UTC</option>
                </select></Field>
                <Field label="Place timezone on page" hint="Page 1 is intentionally reserved for the Extra intro — timezone can never be placed there."><select value={String(settings.timezonePage)} onChange={e => set("timezonePage", Math.max(2, Number(e.target.value)))} className="extras-select">{Array.from({length: 11}, (_, i) => i + 2).map(page => <option key={page} value={page}>Page {page}</option>)}</select></Field>
              </div>
              

            </>}
          </div>}
          {active === "Stats" && <div className="form-stack stats-page">
            <SectionIntro number="12" title="Your stats" text="Your Pixlo profile performance, all in one place." />
            <div className="stats-grid">
              <div className="stats-card stats-views-card"><span><i>◉</i> Total profile views</span><strong>{Number(settings.views || 0).toLocaleString()}</strong><small>Unique visitors per browser/device</small></div>
              <div className="stats-card"><span><i>↗</i> Social links</span><strong>{socials.filter(([key]) => Boolean(settings.socials[key]?.trim())).length + settings.customLinks.filter(link => Boolean(link.url.trim())).length}</strong><small>Connected social and custom links</small></div>
              <div className="stats-card"><span><i>♫</i> Music tracks</span><strong>{settings.musicTracks.length}</strong><small>Tracks saved to your profile</small></div>
              <div className="stats-card"><span><i>✳</i> Profile completion</span><strong>{Math.round(([settings.avatar, settings.description, ...socials.map(([key]) => settings.socials[key]), ...settings.customLinks.map(link => link.url)].filter(value => Boolean(String(value || "").trim())).length / (3 + socials.length + settings.customLinks.length)) * 100)}%</strong><small>Based on your profile details</small></div>
            </div>
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
            <Range label="Card corner roundness" value={settings.enterScreenCardRadius} min={0} max={96} suffix="px" onChange={v => set("enterScreenCardRadius", v)} />
            <Range label="Card width" value={settings.enterScreenCardWidth} min={180} max={1100} suffix="px" onChange={v => set("enterScreenCardWidth", v)} />
            <Range label="Card horizontal position" value={settings.enterScreenCardPositionX} min={0} max={100} suffix="%" onChange={v => set("enterScreenCardPositionX", v)} />
            <Range label="Card vertical position" value={settings.enterScreenCardPositionY} min={0} max={100} suffix="%" onChange={v => set("enterScreenCardPositionY", v)} />
            <Range label="Card padding" value={settings.enterScreenCardPadding} min={4} max={100} suffix="px" onChange={v => set("enterScreenCardPadding", v)} />
            <Range label="Screen background blur" value={settings.enterScreenCardBlur} min={0} max={100} suffix="px" onChange={v => set("enterScreenCardBlur", v)} />
          </div>}
        </section>

        <aside className={`preview-panel ${previewVisible ? "" : "preview-panel-loading"}`} aria-hidden={!previewVisible}>
          {previewVisible && <>
          <div className="preview-label"><div><span>Live preview</span><small>updates instantly</small></div><a href={profileUrl} target="_blank" rel="noreferrer">Open ↗</a></div>
          <div className={`preview-frame preview-layout-${settings.layout.toLowerCase().replace(/\s+/g, "-")} ${settings.parallax ? "preview-parallax-on" : ""} ${previewParallaxReturning ? "preview-parallax-returning" : ""} ${settings.animated ? "preview-animated" : ""} ${settings.glow ? "preview-glow" : ""} ${settings.floating ? "preview-float" : ""} ${settings.particles ? "preview-particles-on" : ""} ${settings.grain ? "preview-grain-on" : ""} ${settings.scanlines ? "preview-scanlines-on" : ""} ${settings.textGlow ? "preview-text-glow" : ""}`} style={previewStyle}
            onPointerMove={updatePreviewPointer}
            onPointerUp={handlePreviewPointerUp}
            onPointerCancel={resetPreviewPointer}
            onPointerLeave={resetPreviewPointer}>
            {previewAssets.backgroundVideo && <video key={previewAssets.backgroundVideo} className="preview-media" src={previewAssets.backgroundVideo} autoPlay={active !== "Enter Screen" || previewEntered} muted loop playsInline preload="auto" onLoadedData={event => { const video = event.currentTarget; if (active === "Enter Screen" && !previewEntered) { video.pause(); video.currentTime = 0; } else { void video.play().catch(() => {}); } }} onCanPlay={event => { if (active === "Enter Screen" && !previewEntered) { event.currentTarget.pause(); event.currentTarget.currentTime = 0; } }} />}
            {previewAssets.backgroundImage && <div className="preview-bg" style={{ backgroundImage: `url("${previewAssets.backgroundImage}")`, filter: `blur(${settings.backgroundBlur}px)`, transform: `scale(${Math.max(1, settings.backgroundScale / 100)})`, backgroundPosition: `${settings.backgroundPositionX}% ${settings.backgroundPositionY}%`, backgroundSize: `${settings.backgroundScale}% auto` }} />}
            <div className="preview-overlay" />
            <div className="preview-vignette" />
            {settings.particles && <div className="preview-particle-field" aria-hidden="true">{Array.from({ length: 12 }).map((_, i) => <i key={i} style={{ "--i": i } as React.CSSProperties} />)}</div>}
            {settings.grain && <div className="preview-effect-grain" aria-hidden="true" />}
            {settings.scanlines && <div className="preview-effect-scanlines" aria-hidden="true" />}
            <div
              ref={previewCardRef}
              className={`preview-card ${settings.gradientTextEnabled ? "gradient-text-on" : ""} ${settings.gradientSocialsEnabled ? "gradient-socials-on" : ""} ${settings.gradientBadgesEnabled ? "gradient-badges-on" : ""} ${settings.glow ? "effects-glow" : ""} ${settings.layout === "Minimal" ? "layout-minimal" : ""} ${settings.layout === "Modern" ? "layout-modern" : ""} ${settings.layout === "Sleek" ? "layout-sleek" : ""} ${settings.layout === "Text Only" ? "layout-text-only" : ""} ${settings.alignment === "left" ? "text-left" : ""}`}
              style={{ borderRadius: settings.layout === "Text Only" ? 0 : settings.borderRadius, fontFamily: "var(--preview-font)", background: settings.layout === "Text Only" ? "transparent" : "var(--preview-card-bg)", color: "var(--preview-text-color)", opacity: 1, boxShadow: settings.layout === "Text Only" ? "none" : previewShadow, border: settings.layout === "Text Only" ? "none" : undefined, backdropFilter: settings.layout === "Text Only" ? "none" : undefined, WebkitBackdropFilter: settings.layout === "Text Only" ? "none" : undefined, "--preview-card-shadow": settings.layout === "Text Only" ? "none" : previewShadow, "--gradient-text": `linear-gradient(110deg, ${settings.gradientTextColours.join(", ")}, ${settings.gradientTextColours[0]}, ${settings.gradientTextColours.slice(1).join(", ")}, ${settings.gradientTextColours[0]})`, "--gradient-socials": `linear-gradient(110deg, ${settings.gradientSocialsColours.join(", ")}, ${settings.gradientSocialsColours[0]}, ${settings.gradientSocialsColours.slice(1).join(", ")}, ${settings.gradientSocialsColours[0]})`, "--gradient-badges": `linear-gradient(110deg, ${settings.gradientBadgesColours.join(", ")}, ${settings.gradientBadgesColours[0]}, ${settings.gradientBadgesColours.slice(1).join(", ")}, ${settings.gradientBadgesColours[0]})` } as React.CSSProperties}
              onPointerEnter={handlePreviewPointerEnter}
              onPointerDown={handlePreviewPointerDown}
            >
              {previewAssets.banner && settings.bannerHeight > 0 && <img className="preview-banner" src={previewAssets.banner} alt="" style={{ height: settings.bannerHeight, borderRadius: `${settings.borderRadius}px ${settings.borderRadius}px 0 0` }} />}
              <div className="preview-card-inner" style={{ "--preview-content-spacing-setting": `${settings.contentSpacing}px` } as React.CSSProperties}>
                  <svg className="pixlo-gradient-defs" aria-hidden="true" width="0" height="0" style={{position:"absolute",width:0,height:0,overflow:"hidden"}}><defs><linearGradient id="pixlo-social-gradient" x1="0%" y1="0%" x2="100%" y2="0%" spreadMethod="repeat"><stop offset="0%" stopColor={settings.gradientSocialsColours[0]} /><stop offset="33.333%" stopColor={settings.gradientSocialsColours[1]} /><stop offset="66.666%" stopColor={settings.gradientSocialsColours[2]} /><stop offset="100%" stopColor={settings.gradientSocialsColours[0]} /><animateTransform attributeName="gradientTransform" type="translate" from="0 0" to="-1 0" dur="8s" repeatCount="indefinite" /></linearGradient></defs></svg>
                <div className="preview-avatar-badge-row">
                  {settings.badgePosition === "left" && previewBadges.some(badge => settings.activeBadgeIds.includes(badge.id)) && <div className={`pixlo-profile-badges preview-equipped-badges pixlo-side-badges pixlo-side-badges-left ${settings.badgeGlow ? "pixlo-badges-glow" : ""} ${settings.badgeUnderline ? "pixlo-double-underline" : ""} ${settings.badgeUnderlineGlow ? "pixlo-underline-glow" : ""} ${settings.badgeStyle === "icon" ? "pixlo-badges-icon-only" : ""}`} style={{ "--badge-colour": settings.badgeColour, "--badge-glow-intensity": settings.badgeGlowIntensity / 100, "--badge-scale": settings.badgeScale / 100 } as React.CSSProperties}><div className="pixlo-profile-badges-list">{previewBadges.filter(badge => settings.activeBadgeIds.includes(badge.id)).sort((a,b) => settings.activeBadgeOrder.indexOf(a.id)-settings.activeBadgeOrder.indexOf(b.id)).map(badge => <span className="pixlo-profile-badge" key={badge.id} data-badge-name={badge.name} aria-label={badge.name}>{badge.icon_url ? <span className="pixlo-badge-icon-tint" style={{ maskImage: `url("${badge.icon_url}")`, WebkitMaskImage: `url("${badge.icon_url}")` } as React.CSSProperties} /> : <span>✦</span>}</span>)}</div></div>}
                                  <div className={`preview-avatar-wrap preview-avatar-decoration-${settings.avatarDecoration}`}><div className="preview-avatar" style={{ borderRadius: `${settings.avatarRadius}%`, borderWidth: settings.avatarBorderWidth, borderColor: settings.avatarBorderColour }}>{previewAvatar ? <img src={previewAvatar} alt="" /> : (settings.displayName || settings.username).slice(0, 1).toUpperCase()}</div>{previewDecoration && <img className="preview-discord-avatar-decoration" src={previewDecoration} alt="" aria-hidden="true" />}{settings.showDiscord && <span className="preview-status-dot" title="Online" />}</div>
                  {settings.badgePosition === "right" && previewBadges.some(badge => settings.activeBadgeIds.includes(badge.id)) && <div className={`pixlo-profile-badges preview-equipped-badges pixlo-side-badges pixlo-side-badges-right ${settings.badgeGlow ? "pixlo-badges-glow" : ""} ${settings.badgeUnderline ? "pixlo-double-underline" : ""} ${settings.badgeUnderlineGlow ? "pixlo-underline-glow" : ""} ${settings.badgeStyle === "icon" ? "pixlo-badges-icon-only" : ""}`} style={{ "--badge-colour": settings.badgeColour, "--badge-glow-intensity": settings.badgeGlowIntensity / 100, "--badge-scale": settings.badgeScale / 100 } as React.CSSProperties}><div className="pixlo-profile-badges-list">{previewBadges.filter(badge => settings.activeBadgeIds.includes(badge.id)).sort((a,b) => settings.activeBadgeOrder.indexOf(a.id)-settings.activeBadgeOrder.indexOf(b.id)).map(badge => <span className="pixlo-profile-badge" key={badge.id} data-badge-name={badge.name} aria-label={badge.name}>{badge.icon_url ? <span className="pixlo-badge-icon-tint" style={{ maskImage: `url("${badge.icon_url}")`, WebkitMaskImage: `url("${badge.icon_url}")` } as React.CSSProperties} /> : <span>✦</span>}</span>)}</div></div>}
                </div>
                <div className="preview-name-row" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%" }}><b className={`${settings.nameGlow ? "element-glow-name " : ""}${animationClass(settings.nameAnimation)}`} style={{ fontFamily: fontFamily(settings.nameFont), fontWeight: settings.nameBold ? 700 : 400, fontStyle: settings.nameItalic ? "italic" : "normal" }}>{settings.displayName || settings.username}</b>{settings.showVerifiedBadgeNextToUsername && (() => { const verifiedBadge = previewBadges.find(badge => badge.name.trim().toLowerCase() === "verified" && badge.icon_url); return verifiedBadge?.icon_url ? <span className="pixlo-name-badge pixlo-badge-icon-tint" role="img" aria-label="Verified" title="Verified" style={{ width: 17, height: 17, backgroundColor: settings.verifiedBadgeColour, maskImage: `url("${verifiedBadge.icon_url}")`, WebkitMaskImage: `url("${verifiedBadge.icon_url}")`, maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat", maskPosition: "center", WebkitMaskPosition: "center", maskSize: "contain", WebkitMaskSize: "contain", flex: "0 0 auto" } as React.CSSProperties} /> : null; })()}</div>
                
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
                {settings.badgePosition === "bottom" && previewBadges.some(badge => settings.activeBadgeIds.includes(badge.id)) && <section className={`pixlo-profile-badges pixlo-active-badges preview-equipped-badges ${settings.badgeGlow ? "pixlo-badges-glow" : ""} ${settings.badgeUnderline ? "pixlo-double-underline" : ""} ${settings.badgeUnderlineGlow ? "pixlo-underline-glow" : ""} ${settings.badgeStyle === "icon" ? "pixlo-badges-icon-only" : ""}`} style={{ "--badge-colour": settings.badgeColour, "--badge-glow-intensity": settings.badgeGlowIntensity / 100, "--badge-scale": settings.badgeScale / 100 } as React.CSSProperties}><div className="pixlo-profile-badges-list">{previewBadges.filter(badge => settings.activeBadgeIds.includes(badge.id)).sort((a,b) => settings.activeBadgeOrder.indexOf(a.id)-settings.activeBadgeOrder.indexOf(b.id)).map(badge => <span className="pixlo-profile-badge" key={badge.id} data-badge-name={badge.name} aria-label={badge.name}>{badge.icon_url ? <span className="pixlo-badge-icon-tint" style={{ maskImage: `url("${badge.icon_url}")`, WebkitMaskImage: `url("${badge.icon_url}")` } as React.CSSProperties} /> : <span>✦</span>}</span>)}</div></section>}
                {settings.showFooter && <div className="preview-profile-footer"><span><i className="preview-online-dot" /> Online</span>{settings.showViews && <span className="profile-view-count" aria-label={Number(settings.views || 0).toLocaleString() + " profile views"} title="Profile views"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.7" /></svg>{Number(settings.views || 0).toLocaleString()}</span>}</div>}
              </div>
            </div>
            {active === "Enter Screen" && !previewEntered && <button type="button" onClick={() => setPreviewEntering(true)} onTransitionEnd={() => { if (previewEntering) { setPreviewEntered(true); setPreviewEntering(false); } }} style={{ position: "absolute", inset: 0, zIndex: 20, width: "100%", height: "100%", padding: 16, border: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer", backgroundColor: `rgba(${parseInt(settings.enterScreenBackgroundColour.slice(1,3),16)||0},${parseInt(settings.enterScreenBackgroundColour.slice(3,5),16)||0},${parseInt(settings.enterScreenBackgroundColour.slice(5,7),16)||0},${previewAssets.backgroundVideo ? Math.min(settings.enterScreenBackgroundOpacity / 100, 0.28) : settings.enterScreenBackgroundOpacity / 100})`, backdropFilter: `blur(${settings.enterScreenCardBlur}px)`, WebkitBackdropFilter: `blur(${settings.enterScreenCardBlur}px)`, color: settings.enterScreenTextColour, textAlign: "center", fontFamily: fontFamily(settings.enterScreenFont), opacity: previewEntering ? 0 : 1, transition: "opacity 450ms ease" }}>
              <span style={{ position: "absolute", zIndex: 2, left: `${settings.enterScreenCardPositionX}%`, top: `${settings.enterScreenCardPositionY}%`, transform: "translate(-50%, -50%)", display: "block", width: `min(90%, ${settings.enterScreenCardWidth}px)`, boxSizing: "border-box", padding: `${settings.enterScreenCardPadding}px`, borderRadius: settings.enterScreenCardRadius, border: `1px solid ${settings.enterScreenCardBorderColour}${Math.round(settings.enterScreenCardBorderOpacity*2.55).toString(16).padStart(2,"0")}`, background: `${settings.enterScreenCardBackgroundColour}${Math.round(settings.enterScreenCardOpacity*2.55).toString(16).padStart(2,"0")}`, color: settings.enterScreenTextColour, fontSize: "clamp(12px, 2.5vw, 20px)", fontWeight: 700, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere", textShadow: "0 2px 18px rgba(0,0,0,0.45)" }}>{settings.enterScreenMessage || "Click to enter"}</span>
            </button>}
            {presetsPremiumReady && presetsPremium && settings.cursorTrailEnabled && <CursorTrailCanvas enabled={presetsPremiumReady && presetsPremium && settings.cursorTrailEnabled} mode="container" colour={settings.cursorTrailColour} glow={settings.cursorTrailGlow} size={settings.cursorTrailSize} density={settings.cursorTrailDensity} speed={settings.cursorTrailSpeed} lifetime={settings.cursorTrailLifetime} className={settings.parallax ? "parallax-lite" : ""} />}
            <div className="preview-badge"><i /> LIVE</div>
          </div>
          </>}
        </aside>
      </div>
    </div>
  </main>
  </>;
}
