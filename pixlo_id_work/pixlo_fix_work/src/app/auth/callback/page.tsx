"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Finishing your Pixlo account…");

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      try {
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const query = new URLSearchParams(window.location.search);

        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        const expiresIn = Number(hash.get("expires_in") || 3600);

        if (accessToken) {
          const response = await fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn }),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || "Unable to finish verification.");
          if (!cancelled) router.replace("/dashboard");
          return;
        }

        const error = hash.get("error_description") || query.get("error_description");
        if (error) throw new Error(error.replace(/\+/g, " "));

        // Server-side confirmation links can be configured to land here with
        // token_hash/type. The API endpoint below verifies the token and stores
        // the resulting session in HttpOnly cookies.
        const tokenHash = query.get("token_hash");
        const type = query.get("type") || "email";
        if (tokenHash) {
          const response = await fetch("/api/auth/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tokenHash, type }),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || "Unable to verify your email.");
          if (!cancelled) router.replace("/dashboard");
          return;
        }

        setMessage("Your email is verified. Redirecting you to login…");
        window.setTimeout(() => { if (!cancelled) router.replace("/login?verified=1"); }, 700);
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "Verification could not be completed.");
          window.setTimeout(() => { if (!cancelled) router.replace("/login?verified=1"); }, 1600);
        }
      }
    }

    finish();
    return () => { cancelled = true; };
  }, [router]);

  return <main className="auth-page"><div className="auth-glow auth-glow-a" /><div className="auth-glow auth-glow-b" /><section className="auth-card auth-card-compact"><div className="auth-brand"><img className="auth-brand-logo" src="/pixlo-logo.png" alt="Pixlo" /></div><div className="verify-icon">✓</div><div className="auth-heading"><span>ACCOUNT VERIFICATION</span><h1>One sec.</h1><p>{message}</p></div></section></main>;
}
