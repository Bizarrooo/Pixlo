"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { readSavedPixloAccounts, type SavedPixloAccount } from "../accountSwitcher";

export type DashboardPrimarySection = "account" | "customize" | "optimise" | "links" | "premium" | "admin";

type DashboardNavIconName = "user" | "overview" | "chart" | "badge" | "profile" | "settings" | "connections" | "palette" | "link" | "crown" | "sparkles" | "layers" | "music" | "image" | "layout" | "shield" | "chevron" | "plus" | "external" | "clock";

const DASHBOARD_ICON_PATHS: Record<DashboardNavIconName, string> = {
  user: "M20 21v-1a7 7 0 0 0-14 0v1M13 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  overview: "M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z",
  chart: "M4 20h16M6 16v-5M12 16V4M18 16V8",
  badge: "M12 3 20 6v5.5c0 4.6-3.1 7.8-8 9.5-4.9-1.7-8-4.9-8-9.5V6l8-3Zm-3.5 9 2.2 2.2 4.8-5",
  profile: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 21a7.5 7.5 0 0 1 15 0",
  settings: "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8 4.8v-2.6l-1.9-.6-.6-1.4.9-1.8-1.8-1.8-1.8.9-1.4-.6L12.8 3h-2.6l-.6 1.9-1.4.6-1.8-.9-1.8 1.8.9 1.8-.6 1.4-1.9.6v2.6l1.9.6.6 1.4-.9 1.8 1.8 1.8 1.8-.9 1.4.6.6 1.9h2.6l.6-1.9 1.4-.6 1.8.9 1.8-1.8-.9-1.8.6-1.4 1.9-.6Z",
  connections: "M10 13.5 8.4 15a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0M14 10.5l1.6-1.5a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-5 0M8.5 15.5l7-7",
  palette: "M12 3a9 9 0 1 0 0 18h1.4a2 2 0 0 0 1.4-3.4 1.7 1.7 0 0 1 1.2-2.9H18a3 3 0 0 0 3-3A8.7 8.7 0 0 0 12 3ZM7.5 10h.01M10.5 7h.01M15 7.8h.01",
  link: "M10 13.5 8.4 15a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0M14 10.5l1.6-1.5a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-5 0M8.5 15.5l7-7",
  crown: "m3 8 5 4 4-7 4 7 5-4-2 11H5L3 8ZM5 21h14",
  sparkles: "m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3ZM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z",
  layers: "m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5",
  music: "M9 18V5l11-2v13M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM17 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  image: "M3 4h18v16H3zM8.5 9a1.5 1.5 0 1 0 0-.01ZM4 19l6-6 3 3 3-4 4 4",
  layout: "M3 3h18v18H3zM3 9h18M9 9v12",
  shield: "M12 3 20 6v5.5c0 4.6-3.1 7.8-8 9.5-4.9-1.7-8-4.9-8-9.5V6l8-3Z",
  chevron: "m7 10 5 5 5-5",
  plus: "M12 5v14M5 12h14",
  external: "M14 4h6v6M20 4l-9 9M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2",
};

export function DashboardNavIcon({ name, className = "" }: { name: DashboardNavIconName; className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={DASHBOARD_ICON_PATHS[name]} /></svg>;
}

export const customizeTabs = [
  { value: "General", label: "General", icon: "overview" },
  { value: "Appearance", label: "Colors", icon: "palette" },
  { value: "Effects", label: "Effects", icon: "sparkles" },
  { value: "Profile", label: "Avatar", icon: "profile" },
  { value: "Fonts", label: "Fonts", icon: "layers" },
  { value: "Background", label: "Media", icon: "image" },
  { value: "Music", label: "Sound", icon: "music" },
  { value: "Layout", label: "Sections", icon: "layout" },
  { value: "Enter Screen", label: "Intro", icon: "external" },
] as const;

export const optimiseTabs = [
  { value: "Gradients", label: "Gradients", icon: "sparkles" },
  { value: "Dashboard", label: "Workspace theme", icon: "settings" },
  { value: "Extras", label: "Widgets", icon: "clock" },
  { value: "Cursor Trail", label: "Cursor trail", icon: "sparkles" },
] as const;


type Props = {
  active: string;
  activePrimary: DashboardPrimarySection;
  accountNavOpen: boolean;
  setAccountNavOpen: Dispatch<SetStateAction<boolean>>;
  premiumOpen: boolean;
  setPremiumOpen: Dispatch<SetStateAction<boolean>>;
  mobileMenu: boolean;
  profileUserId: string;
  currentAccountEmail: string;
  username: string;
  displayName: string;
  avatar: string;
  isOwner: boolean;
  onNavigate: (primary: DashboardPrimarySection, destination: string) => void;
  onReset: () => void;
};

export default function DashboardSidebar({
  active, activePrimary, accountNavOpen, setAccountNavOpen, premiumOpen, setPremiumOpen,
  mobileMenu, profileUserId, currentAccountEmail, username, displayName, avatar, isOwner, onNavigate, onReset,
}: Props) {
  const [accountSwitcherOpen, setAccountSwitcherOpen] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedPixloAccount[]>([]);
  const [switchingAccountEmail, setSwitchingAccountEmail] = useState("");
  const [accountSwitchError, setAccountSwitchError] = useState("");

  useEffect(() => {
    setSavedAccounts(readSavedPixloAccounts());
  }, [currentAccountEmail, profileUserId]);

  async function switchAccount(account: SavedPixloAccount) {
    if (account.userId === profileUserId || account.email === currentAccountEmail) {
      setAccountSwitcherOpen(false);
      return;
    }
    setSwitchingAccountEmail(account.email);
    setAccountSwitchError("");
    try {
      const response = await fetch("/api/auth/switch-account", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: account.userId, email: account.email }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not switch to that Pixlo account.");
      window.location.assign("/dashboard");
    } catch (error) {
      setAccountSwitchError(error instanceof Error ? error.message : "Could not switch accounts.");
      setSwitchingAccountEmail("");
    }
  }

  const currentAvatar = savedAccounts.find(item => item.email === currentAccountEmail)?.avatar || (/^https?:\/\//i.test(avatar) ? avatar : "");
  const select = (primary: DashboardPrimarySection, section: string) => {
    setAccountSwitcherOpen(false);
    setAccountSwitchError("");
    onNavigate(primary, section);
  };

  return (
    <aside className={`sidebar dashboard-sidebar-organised ${mobileMenu ? "mobile-open" : ""}`}>
      <div className="brand dashboard-brand">
        <div className="brand-logo-shell"><img className="brand-logo" src="/pixlo-logo.png" alt="Pixlo" /></div>
        <small>YOUR CREATIVE SPACE</small>
      </div>

      <div className="dashboard-account-switcher">
        <button type="button" className={`dashboard-account-picker ${accountSwitcherOpen ? "is-open" : ""}`} aria-expanded={accountSwitcherOpen} onClick={() => { setSavedAccounts(readSavedPixloAccounts()); setAccountSwitcherOpen(value => !value); setAccountSwitchError(""); }}>
          <span className="dashboard-account-avatar">{currentAvatar ? <img src={currentAvatar} alt="" /> : <span>{(displayName || username || "P").slice(0,1).toUpperCase()}</span>}</span>
          <span className="dashboard-account-copy"><b>{displayName || username || "Pixlo account"}</b><small>@{username || "loading"}</small></span>
          <DashboardNavIcon name="chevron" className={`dashboard-account-caret ${accountSwitcherOpen ? "is-open" : ""}`} />
        </button>
        {accountSwitcherOpen && <div className="dashboard-account-menu">
          <div className="dashboard-account-menu-heading"><span>SWITCH ACCOUNT</span><b>{savedAccounts.length}/3</b></div>
          {savedAccounts.map(account => {
            const current = account.email === currentAccountEmail || account.userId === profileUserId;
            return <button key={account.email} type="button" className={`dashboard-account-option ${current ? "is-current" : ""}`} disabled={Boolean(switchingAccountEmail)} aria-current={current ? "true" : undefined} onClick={() => void switchAccount(account)}>
              <span className="dashboard-account-avatar dashboard-account-avatar-small">{account.avatar ? <img src={account.avatar} alt="" /> : <span>{(account.displayName || account.username).slice(0,1).toUpperCase()}</span>}</span>
              <span className="dashboard-account-option-copy"><b>{account.displayName || account.username}</b><small>@{account.username}</small></span>
              <span className="dashboard-account-option-status">{switchingAccountEmail === account.email ? "…" : current ? "✓" : "↗"}</span>
            </button>;
          })}
          {savedAccounts.length === 0 && <p className="dashboard-account-empty">Your saved accounts will appear here.</p>}
          {accountSwitchError && <p className="dashboard-account-error" role="alert">{accountSwitchError}</p>}
          {savedAccounts.length < 3 && <button type="button" className="dashboard-add-account" onClick={() => { window.location.href = "/login?next=/dashboard"; }}><DashboardNavIcon name="plus" /><span>Add another account</span></button>}
        </div>}
      </div>

      <nav className="dashboard-sidebar-nav dashboard-sidebar-organised-nav" aria-label="Dashboard navigation">
        <div className="dashboard-nav-group">
          <button type="button" className={`dashboard-nav-item dashboard-nav-group-trigger ${activePrimary === "account" ? "is-primary-active" : ""}`} aria-expanded={accountNavOpen} onClick={() => {
            if (activePrimary !== "account") { select("account", "Overview"); setAccountNavOpen(true); setPremiumOpen(false); }
            else setAccountNavOpen(value => !value);
          }}><DashboardNavIcon name="user" className="dashboard-nav-icon" /><b>Account</b><DashboardNavIcon name="chevron" className={`dashboard-nav-caret ${accountNavOpen ? "is-open" : ""}`} /></button>
          {accountNavOpen && <div className="dashboard-nav-submenu">
            <button type="button" className={`dashboard-nav-subitem ${activePrimary === "account" && active === "Overview" ? "active" : ""}`} onClick={() => select("account", "Overview")}><DashboardNavIcon name="overview" className="dashboard-nav-icon" /><span>Overview</span></button>
            <button type="button" className={`dashboard-nav-subitem ${activePrimary === "account" && active === "Stats" ? "active" : ""}`} onClick={() => select("account", "Stats")}><DashboardNavIcon name="chart" className="dashboard-nav-icon" /><span>Analytics</span></button>
            <button type="button" className={`dashboard-nav-subitem ${activePrimary === "account" && active === "Badges" ? "active" : ""}`} onClick={() => select("account", "Badges")}><DashboardNavIcon name="badge" className="dashboard-nav-icon" /><span>Badges</span></button>
            <button type="button" className={`dashboard-nav-subitem ${activePrimary === "account" && active === "Profile" ? "active" : ""}`} onClick={() => select("account", "Profile")}><DashboardNavIcon name="profile" className="dashboard-nav-icon" /><span>Profile</span></button>
            <button type="button" className={`dashboard-nav-subitem ${activePrimary === "account" && active === "General" ? "active" : ""}`} onClick={() => select("account", "General")}><DashboardNavIcon name="settings" className="dashboard-nav-icon" /><span>Settings</span></button>
            <button type="button" className={`dashboard-nav-subitem ${activePrimary === "account" && active === "Connections" ? "active" : ""}`} onClick={() => select("account", "Connections")}><DashboardNavIcon name="connections" className="dashboard-nav-icon" /><span>Connections</span></button>
          </div>}
        </div>

        <button type="button" className={`dashboard-nav-item ${activePrimary === "customize" ? "active" : ""}`} onClick={() => select("customize", "General")}><DashboardNavIcon name="palette" className="dashboard-nav-icon" /><b>Customize</b></button>
        <button type="button" className={`dashboard-nav-item ${activePrimary === "links" ? "active" : ""}`} onClick={() => select("links", "Socials")}><DashboardNavIcon name="link" className="dashboard-nav-icon" /><b>Links</b></button>

        <div className={`premium-nav-group ${premiumOpen || activePrimary === "premium" || activePrimary === "optimise" ? "premium-nav-group-open" : ""}`}>
          <button type="button" className={`dashboard-nav-item dashboard-nav-group-trigger premium-nav-heading premium-nav-toggle ${activePrimary === "premium" || activePrimary === "optimise" ? "active" : ""}`} aria-expanded={premiumOpen || activePrimary === "premium" || activePrimary === "optimise"} onClick={() => {
            if (activePrimary !== "premium" && activePrimary !== "optimise") { select("premium", "Presets"); setPremiumOpen(true); }
            else setPremiumOpen(value => !value);
          }}><DashboardNavIcon name="crown" className="dashboard-nav-icon" /><b>Premium</b><DashboardNavIcon name="chevron" className={`dashboard-nav-caret ${premiumOpen || activePrimary === "premium" || activePrimary === "optimise" ? "is-open" : ""}`} /></button>
          <div className="premium-nav-items">
            <button type="button" className={active === "Presets" ? "active premium-nav-button premium-presets-nav-button" : "premium-nav-button premium-presets-nav-button"} onClick={() => select("premium", "Presets")}><DashboardNavIcon name="layers" className="dashboard-nav-icon" /><b>Presets</b></button>
            <button type="button" className={activePrimary === "optimise" ? "active premium-nav-button premium-optimise-nav-button" : "premium-nav-button premium-optimise-nav-button"} onClick={() => select("optimise", "Cursor Trail")}><DashboardNavIcon name="sparkles" className="dashboard-nav-icon" /><b>Optimise</b><span className="dashboard-nav-badge">PREMIUM</span></button>
          </div>
        </div>

        {isOwner && <button type="button" className={`dashboard-nav-item dashboard-admin-nav-item ${activePrimary === "admin" ? "active" : ""}`} onClick={() => select("admin", "Admin")}><DashboardNavIcon name="shield" className="dashboard-nav-icon" /><b>Admin</b><span className="dashboard-nav-badge">OWNER</span></button>}
      </nav>
      <div className="sidebar-bottom"><button type="button" className="reset-button" style={{ color: "#ffffff", WebkitTextFillColor: "#ffffff" }} onClick={onReset}>Reset to default</button></div>
    </aside>
  );
}
