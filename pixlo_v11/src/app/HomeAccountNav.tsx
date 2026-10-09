"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadAsset } from "./assetStore";

type SessionState = "loading" | "logged-in" | "logged-out";

export default function HomeAccountNav() {
  const [state, setState] = useState<SessionState>("loading");
  const [avatar, setAvatar] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store", credentials: "include" });
        const data = await response.json().catch(() => ({}));
        if (!active) return;
        if (!response.ok || !data.user) {
          setState("logged-out");
          return;
        }
        setState("logged-in");
        try {
          const raw = window.localStorage.getItem("profileSettings");
          if (!raw) return;
          const settings = JSON.parse(raw) as { avatar?: string };
          if (!settings.avatar) return;
          const loadedAvatar = await loadAsset(settings.avatar);
          if (active && loadedAvatar) setAvatar(loadedAvatar);
        } catch {}
      } catch {
        if (active) setState("logged-out");
      }
    }

    loadAccount();
    return () => { active = false; };
  }, []);

  if (state === "loading") return <span className="home-nav-account-placeholder" aria-hidden="true" />;
  if (state === "logged-out") {
    return <Link href="/login" className="home-nav-dashboard">Sign in <span className="home-nav-arrow" aria-hidden="true">›</span></Link>;
  }
  return (
    <Link href="/dashboard" className="home-nav-account" aria-label="Open your Pixlo dashboard">
      {avatar ? <img className="home-nav-avatar" src={avatar} alt="" /> : <span className="home-nav-avatar home-nav-avatar-fallback" aria-hidden="true">P</span>}
      <span>Dashboard</span>
      <span className="home-nav-arrow" aria-hidden="true">›</span>
    </Link>
  );
}
