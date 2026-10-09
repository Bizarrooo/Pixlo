"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SessionUser = {
  id?: string;
  email?: string;
  user_metadata?: { avatar_url?: string; picture?: string; username?: string };
};

type AccountUser = {
  username?: string;
  displayName?: string;
  discordAvatar?: string;
  avatarUrl?: string;
  useDiscordAvatar?: boolean;
};

export default function HomeNav() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [account, setAccount] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const sync = async () => {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const sessionData = await response.json().catch(() => ({ user: null }));
        if (!active) return;

        const nextUser = sessionData?.user || null;
        setUser(nextUser);

        if (nextUser) {
          localStorage.setItem("pixlo_auth_hint", "1");
          const accountResponse = await fetch("/api/account", { cache: "no-store" });
          const accountData = await accountResponse.json().catch(() => ({ user: null }));
          if (active) setAccount(accountData?.user || null);
        } else {
          localStorage.removeItem("pixlo_auth_hint");
          if (active) setAccount(null);
        }
      } catch {
        if (!active) return;
        setUser(null);
        setAccount(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    sync();
    const onFocus = () => sync();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const avatar = (account?.useDiscordAvatar && account?.discordAvatar) || account?.avatarUrl || account?.discordAvatar || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";
  const displayName = account?.displayName || account?.username || user?.user_metadata?.username || user?.email?.split("@")[0] || "You";
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <div className="home-nav-actions">
      {loading ? (
        <span className="home-nav-loading" aria-hidden="true" />
      ) : user ? (
        <Link href="/dashboard" className="home-nav-account" aria-label="Open your dashboard">
          <span className="home-nav-avatar">
            {avatar ? <img src={avatar} alt="" /> : <b>{initial}</b>}
          </span>
          <span>Dashboard</span>
          <span className="home-nav-chevron">›</span>
        </Link>
      ) : (
        <Link href="/login" className="home-nav-dashboard">Sign in <span className="home-nav-chevron">›</span></Link>
      )}
    </div>
  );
}
