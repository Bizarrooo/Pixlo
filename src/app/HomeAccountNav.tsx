"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { loadAsset } from "./assetStore";
import { accountSettingsStorageKey } from "./profile";
import { clearSavedPixloAccountAvatar, getMaxSavedPixloAccounts, readSavedPixloAccounts, rememberPixloAccount, type SavedPixloAccount } from "./accountSwitcher";

type SessionUser = {
  id?: string;
  email?: string;
  user_metadata?: {
    username?: string;
    display_name?: string;
    full_name?: string;
  };
};
type SessionState = "loading" | "logged-in" | "logged-out";

function accountUsername(user: SessionUser) {
  const emailName = user.email?.split("@")[0] || "Pixlo account";
  return (user.user_metadata?.username || emailName).trim();
}

export default function HomeAccountNav() {
  const [state, setState] = useState<SessionState>("loading");
  const [avatar, setAvatar] = useState("");
  const [currentAccount, setCurrentAccount] = useState<SavedPixloAccount | null>(null);
  const [savedAccounts, setSavedAccounts] = useState<SavedPixloAccount[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    setSavedAccounts(readSavedPixloAccounts());

    async function loadAccount() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store", credentials: "include" });
        const data = await response.json().catch(() => ({}));
        if (!active) return;
        if (!response.ok || !data.user?.email) {
          setState("logged-out");
          setCurrentAccount(null);
          setSavedAccounts(readSavedPixloAccounts());
          return;
        }

        const user = data.user as SessionUser;
        const email = user.email!.trim().toLowerCase();
        const accountResponse = await fetch("/api/account", { cache: "no-store", credentials: "include" });
        const accountData = await accountResponse.json().catch(() => ({}));
        if (!active) return;
        const profile = accountData.profile as { username?: string; displayName?: string; discordId?: string; discordAvatar?: string; useDiscordAvatar?: boolean; discordMembershipVerified?: boolean } | undefined;
        const username = String(profile?.username || accountUsername(user)).trim();
        const displayName = String(profile?.displayName || user.user_metadata?.display_name || user.user_metadata?.full_name || username).trim();
        if (profile && (!profile.discordId || !profile.discordMembershipVerified || accountData.discordUnlinkedForMembership)) {
          try {
            const settingsKey = accountSettingsStorageKey(String(user.id || ""));
            const rawSettings = window.localStorage.getItem(settingsKey);
            if (rawSettings) {
              const settings = JSON.parse(rawSettings) as Record<string, unknown>;
              if (settings.useDiscordAvatar || settings.useDiscordDecoration || settings.discordAvatarUrl || settings.discordAvatarDecorationUrl) {
                window.localStorage.setItem(settingsKey, JSON.stringify({ ...settings, discordAvatarUrl: "", discordAvatarDecorationUrl: "", useDiscordAvatar: false, useDiscordDecoration: false }));
              }
            }
          } catch {}
        }
        let durableAvatar = "";
        let displayAvatar = "";
        try {
          const settingsKey = accountSettingsStorageKey(String(user.id || ""));
          let raw = window.localStorage.getItem(settingsKey);
          if (!raw) {
            const legacyRaw = window.localStorage.getItem("profileSettings");
            if (legacyRaw) {
              const legacy = JSON.parse(legacyRaw) as { username?: string };
              if (!legacy.username || legacy.username.toLowerCase() === username.toLowerCase()) raw = legacyRaw;
            }
          }
          if (profile?.discordId && profile.discordMembershipVerified && profile.useDiscordAvatar && profile.discordAvatar?.startsWith("http")) {
            durableAvatar = profile.discordAvatar;
            displayAvatar = profile.discordAvatar;
          } else if (raw) {
            const settings = JSON.parse(raw) as { avatar?: string; discordAvatarUrl?: string; useDiscordAvatar?: boolean; username?: string };
            const identityMatches = !settings.username || settings.username.toLowerCase() === username.toLowerCase();
            if (identityMatches && settings.avatar) displayAvatar = await loadAsset(settings.avatar);
          }
        } catch {}
        if (!active) return;

        if (!durableAvatar) clearSavedPixloAccountAvatar(email);
        const remembered = rememberPixloAccount({ email, username, displayName, avatar: durableAvatar || undefined });
        if (active) {
          setCurrentAccount(remembered.find(item => item.email === email) || { email, username });
          setSavedAccounts(remembered);
          setAvatar(displayAvatar || remembered.find(item => item.email === email)?.avatar || "");
          setState("logged-in");
        }
      } catch {
        if (active) {
          setState("logged-out");
          setSavedAccounts(readSavedPixloAccounts());
        }
      }
    }

    void loadAccount();
    // Revalidate Discord membership periodically while Pixlo is open; if they leave the required server, the link is removed on the next check.
    const membershipTimer = window.setInterval(() => { void loadAccount(); }, 30_000);
    return () => { active = false; window.clearInterval(membershipTimer); };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
        setSwapOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setSwapOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  async function switchToAccount(account: SavedPixloAccount) {
    setMenuOpen(false);
    setSwapOpen(false);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include", cache: "no-store" });
    } finally {
      window.location.assign(`/login?email=${encodeURIComponent(account.email)}&next=%2Fdashboard`);
    }
  }

  async function addAnotherAccount() {
    setMenuOpen(false);
    setSwapOpen(false);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include", cache: "no-store" });
    } finally {
      window.location.assign("/login?next=%2Fdashboard");
    }
  }

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include", cache: "no-store" });
    } finally {
      // Keep the saved account list so it remains available when the user returns.
      window.location.assign("/");
    }
  }

  if (state === "loading") return <span className="home-nav-account-placeholder" aria-hidden="true" />;
  if (state === "logged-out") {
    return <Link href="/login" className="home-nav-dashboard">Sign in <span className="home-nav-arrow" aria-hidden="true">›</span></Link>;
  }

  const activeEmail = currentAccount?.email.toLowerCase() || "";
  const maxAccounts = getMaxSavedPixloAccounts();
  return (
    <div className="home-account-menu" ref={menuRef}>
      <button
        type="button"
        className="home-nav-account"
        aria-label="Open account menu"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => { setMenuOpen(value => !value); setSwapOpen(false); }}
      >
        {avatar ? <img className="home-nav-avatar" src={avatar} alt="" /> : <span className="home-nav-avatar home-nav-avatar-fallback" aria-hidden="true">{(currentAccount?.username || "P").slice(0, 1).toUpperCase()}</span>}
        <span>Account</span>
        <span className={`home-nav-account-chevron ${menuOpen ? "open" : ""}`} aria-hidden="true">⌄</span>
      </button>

      {menuOpen && <div className="home-account-dropdown" role="menu" aria-label="Account options">
        <div className="home-account-dropdown-head">
          <span className="home-account-dropdown-kicker">SIGNED IN AS</span>
          <strong>{currentAccount?.username || "Pixlo account"}</strong>
          <small>{currentAccount?.email}</small>
        </div>
        <Link href="/dashboard" role="menuitem" className="home-account-menu-item" onClick={() => setMenuOpen(false)}>
          <span className="home-account-menu-icon" aria-hidden="true">▦</span>
          <span>Dashboard</span>
          <span className="home-account-menu-chevron" aria-hidden="true">›</span>
        </Link>
        <button type="button" role="menuitem" className={`home-account-menu-item home-account-swap-trigger ${swapOpen ? "active" : ""}`} aria-expanded={swapOpen} onClick={() => setSwapOpen(value => !value)}>
          <span className="home-account-menu-icon" aria-hidden="true">⇄</span>
          <span>Swap accounts</span>
          <span className="home-account-count">{savedAccounts.length}/{maxAccounts}</span>
          <span className={`home-account-menu-chevron ${swapOpen ? "open" : ""}`} aria-hidden="true">⌄</span>
        </button>
        {swapOpen && <div className="home-saved-accounts" aria-label="Saved accounts">
          {savedAccounts.map(account => {
            const isCurrent = account.email.toLowerCase() === activeEmail;
            const label = account.displayName || account.username || account.email.split("@")[0];
            return isCurrent ? (
              <div key={account.email} className="home-saved-account current" aria-current="true">
                {account.avatar ? <img src={account.avatar} alt="" /> : <span className="home-saved-account-fallback">{label.slice(0, 1).toUpperCase()}</span>}
                <span className="home-saved-account-copy"><b>{label}</b><small>{account.email}</small></span>
                <span className="home-saved-account-status">Current</span>
              </div>
            ) : (
              <button key={account.email} type="button" className="home-saved-account" role="menuitem" onClick={() => void switchToAccount(account)}>
                {account.avatar ? <img src={account.avatar} alt="" /> : <span className="home-saved-account-fallback">{label.slice(0, 1).toUpperCase()}</span>}
                <span className="home-saved-account-copy"><b>{label}</b><small>{account.email}</small></span>
                <span className="home-saved-account-status">Switch</span>
              </button>
            );
          })}
          <button type="button" className="home-add-account" role="menuitem" onClick={() => void addAnotherAccount()}>
            <span aria-hidden="true">＋</span>
            <span>{savedAccounts.length < maxAccounts ? "Sign into another account" : "Sign into a different account"}</span>
          </button>
          <p className="home-account-security-note">Up to {maxAccounts} accounts are saved on this device. For security, you’ll confirm the password when switching.</p>
        </div>}
        <div className="home-account-dropdown-divider" />
        <button type="button" role="menuitem" className="home-account-menu-item home-account-logout" onClick={logout} disabled={loggingOut}>
          <span className="home-account-menu-icon" aria-hidden="true">↪</span>
          <span>{loggingOut ? "Logging out…" : "Log out"}</span>
        </button>
      </div>}
    </div>
  );
}
