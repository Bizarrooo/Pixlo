"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { rememberPixloAccount } from "../accountSwitcher";

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(() => params.get("email") || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const verified = params.get("verified") === "1";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to sign in.");
        return;
      }

      const user = data.user || {};
      const savedEmail = String(user.email || email).trim().toLowerCase();
      const username = String(user.user_metadata?.username || savedEmail.split("@")[0]);
      rememberPixloAccount({
        email: savedEmail,
        username,
        userId: String(user.id || ""),
        displayName: user.user_metadata?.display_name || user.user_metadata?.full_name,
      });

      const requestedNext = params.get("next");
      const nextPath = requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
        ? requestedNext
        : "/dashboard";
      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page auth-page-login">
      <div className="auth-glow auth-glow-a" aria-hidden="true" />
      <div className="auth-glow auth-glow-b" aria-hidden="true" />

      <header className="auth-topbar">
        <Link href="/" className="auth-brand" aria-label="Pixlo home">
          <img className="auth-brand-logo" src="/pixlo-logo.png" alt="Pixlo" />
        </Link>
        <nav className="auth-tabs" aria-label="Account access">
          <Link href="/login" className="auth-tab is-active" aria-current="page">Log in</Link>
          <Link href="/signup" className="auth-tab">Register <span aria-hidden="true">↗</span></Link>
        </nav>
      </header>

      <section className="auth-card auth-card-login" aria-labelledby="auth-title">
        <div className="auth-card-rails" aria-hidden="true">
          <i className="auth-rail auth-rail-tl-top" /><i className="auth-rail auth-rail-tl-side" />
          <i className="auth-rail auth-rail-tr-top" /><i className="auth-rail auth-rail-tr-side" />
          <i className="auth-rail auth-rail-bl-side" /><i className="auth-rail auth-rail-bl-bottom" />
          <i className="auth-rail auth-rail-br-bottom" /><i className="auth-rail auth-rail-br-side" />
        </div>

        <div className="auth-card-meta">
          <span className="auth-step-pill"><i /> SECURE SIGN-IN</span>
        </div>

        <div className="auth-heading auth-heading-login">
          <span className="auth-heading-kicker">GOOD TO HAVE YOU BACK</span>
          <h1 id="auth-title">Your space is<br />waiting <em>for you.</em></h1>
          <p>Sign in and pick up right where your corner of the internet left off.</p>
        </div>

        {verified && (
          <div className="auth-success"><span className="auth-message-icon">✓</span><span><b>Email verified.</b> You're all set to log in.</span></div>
        )}
        {params.get("email") && (
          <div className="auth-switching-account">Switching accounts? Enter the password for <b>{params.get("email")}</b>.</div>
        )}

        <form onSubmit={submit} className="auth-form auth-login-form">
          <label className="auth-field">
            <span className="auth-field-label">Email address</span>
            <span className="auth-input-shell">
              <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.3" y="5.1" width="17.4" height="13.8" rx="3" stroke="currentColor" strokeWidth="1.6"/><path d="m5.2 7.4 6.8 5.1 6.8-5.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" type="email" autoComplete="username" required />
            </span>
          </label>

          <label className="auth-field">
            <span className="auth-label-row"><span className="auth-field-label">Password</span><Link href="/forgot-password">Forgot password?</Link></span>
            <span className="auth-input-shell">
              <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4.4" y="10" width="15.2" height="10.5" rx="2.7" stroke="currentColor" strokeWidth="1.6"/><path d="M8 10V7.1a4 4 0 0 1 8 0V10M12 14.1v2.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" type={showPassword ? "text" : "password"} autoComplete="current-password" required />
              <button type="button" className="auth-password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(value => !value)}>
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 3 21 21M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 5.2A10.6 10.6 0 0 1 12 5c5.3 0 8.5 4.2 9.5 6.1a1.8 1.8 0 0 1 0 1.8 15 15 0 0 1-3.1 3.7M6.2 6.3A15.4 15.4 0 0 0 2.5 11a1.8 1.8 0 0 0 0 1.8C3.5 14.7 6.7 19 12 19c1 0 1.9-.2 2.7-.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2.5 12s3.3-6.2 9.5-6.2 9.5 6.2 9.5 6.2-3.3 6.2-9.5 6.2S2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><circle cx="12" cy="12" r="2.7" stroke="currentColor" strokeWidth="1.6"/></svg>
                )}
              </button>
            </span>
          </label>

          {error && <div className="auth-error" role="alert"><span className="auth-message-icon">!</span><span>{error}</span></div>}

          <button className="auth-submit auth-login-submit" disabled={loading}>
            <span>{loading ? "Signing you in…" : "Continue to Pixlo"}</span>
            <span className="auth-submit-arrow" aria-hidden="true">{loading ? "…" : "↗"}</span>
          </button>
          <div className="auth-submit-note"><span /> Secure account access <b>·</b> No password shared publicly</div>
        </form>

        <div className="auth-card-footer">
          <p>New to Pixlo? <Link href="/signup">Create your account <span aria-hidden="true">→</span></Link></p>
        </div>
      </section>

    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="auth-page auth-page-login" />}>
      <LoginContent />
    </Suspense>
  );
}
