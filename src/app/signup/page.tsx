"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "error";

function InputIcon({ kind }: { kind: "user" | "email" | "lock" }) {
  if (kind === "user") return <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>;
  if (kind === "email") return <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.3" y="5.1" width="17.4" height="13.8" rx="3" stroke="currentColor" strokeWidth="1.6"/><path d="m5.2 7.4 6.8 5.1 6.8-5.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  return <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4.4" y="10" width="15.2" height="10.5" rx="2.7" stroke="currentColor" strokeWidth="1.6"/><path d="M8 10V7.1a4 4 0 0 1 8 0V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>;
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [error, setError] = useState("");
  const [emailAlreadyUsed, setEmailAlreadyUsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const normalizedUsername = username.trim().toLowerCase();

  useEffect(() => {
    const requestedUsername = new URLSearchParams(window.location.search).get("username")?.trim().toLowerCase() || "";
    if (/^[a-z0-9._-]{3,24}$/.test(requestedUsername)) setUsername(requestedUsername);
  }, []);

  useEffect(() => {
    if (!normalizedUsername) {
      setUsernameStatus("idle");
      return;
    }
    if (!/^[a-z0-9._-]{3,24}$/.test(normalizedUsername)) {
      setUsernameStatus("invalid");
      return;
    }

    const controller = new AbortController();
    setUsernameStatus("checking");
    const timeout = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/username-availability?username=${encodeURIComponent(normalizedUsername)}`, {
            signal: controller.signal,
            cache: "no-store",
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || typeof data.available !== "boolean") {
            setUsernameStatus("error");
            return;
          }
          setUsernameStatus(data.available ? "available" : "taken");
        } catch {
          if (!controller.signal.aborted) setUsernameStatus("error");
        }
      })();
    }, 240);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [normalizedUsername]);

  function nextStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setEmailAlreadyUsed(false);

    if (step === 1) {
      if (!/^[a-z0-9._-]{3,24}$/.test(normalizedUsername)) {
        setUsernameStatus("invalid");
        setError("Use 3–24 characters: letters, numbers, dots, underscores or hyphens.");
        return;
      }
      if (usernameStatus !== "available") {
        setError(usernameStatus === "taken" ? "That username is already taken. Choose another one." : "Wait for the username availability check to finish.");
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
      return;
    }
    if (step === 3) {
      if (password.length < 8) {
        setError("Your password must be at least 8 characters.");
        return;
      }
      setStep(4);
      return;
    }
    if (password !== confirm) {
      setError("Your passwords do not match.");
      return;
    }

    void createAccount();
  }

  async function createAccount() {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: normalizedUsername, email, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = data.error || "Unable to create your account.";
        if (String(message).toLowerCase().includes("already using this email")) setEmailAlreadyUsed(true);
        setError(message);
        return;
      }
      router.push(data.needsEmailVerification ? `/verify-email?email=${encodeURIComponent(email)}&username=${encodeURIComponent(normalizedUsername)}` : "/dashboard");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const usernameMessage =
    usernameStatus === "checking" ? "Checking if this name is free…" :
    usernameStatus === "available" ? `pixlo1.vercel.app/user/${normalizedUsername} is available` :
    usernameStatus === "taken" ? "That username is already in use" :
    usernameStatus === "invalid" ? normalizedUsername.length < 3 ? "Use at least 3 characters" : "Use letters, numbers, dots, underscores or hyphens" :
    usernameStatus === "error" ? "Availability couldn't be checked. Try again." : "";
  const usernameTone = usernameStatus === "available" ? "is-available" : usernameStatus === "checking" ? "is-checking" : ["taken", "invalid", "error"].includes(usernameStatus) ? "is-unavailable" : "";

  const heading = [
    { title: <>Claim your <em>Pixlo.</em><br />username.</>, copy: "This becomes your link. Pick it before someone else does." },
    { title: <>Where can we <em>reach you?</em></>, copy: "Add an email address so your Pixlo account stays yours." },
    { title: <>Create a <em>password.</em></>, copy: "Choose something unique that you don't use anywhere else." },
    { title: <>One last <em>thing.</em></>, copy: "Check your details and confirm your password to finish." },
  ][step - 1];

  return (
    <main className="auth-page auth-page-signup">
      <div className="auth-glow auth-glow-a" aria-hidden="true" />
      <div className="auth-glow auth-glow-b" aria-hidden="true" />

      <header className="auth-topbar">
        <Link href="/" className="auth-brand" aria-label="Pixlo home"><img className="auth-brand-logo" src="/pixlo-logo.png" alt="Pixlo" /></Link>
        <nav className="auth-tabs" aria-label="Account access">
          <Link href="/login" className="auth-tab">Log in</Link>
          <Link href="/signup" className="auth-tab is-active" aria-current="page">Register <span aria-hidden="true">↗</span></Link>
        </nav>
      </header>

      <section className="auth-card auth-card-signup" aria-labelledby="auth-title">
        <div className="auth-card-rails" aria-hidden="true">
          <i className="auth-rail auth-rail-tl-top" /><i className="auth-rail auth-rail-tl-side" />
          <i className="auth-rail auth-rail-tr-top" /><i className="auth-rail auth-rail-tr-side" />
          <i className="auth-rail auth-rail-bl-side" /><i className="auth-rail auth-rail-bl-bottom" />
          <i className="auth-rail auth-rail-br-bottom" /><i className="auth-rail auth-rail-br-side" />
        </div>

        <div className="auth-card-meta">
        </div>

        <div className="auth-heading auth-heading-signup">
          <h1 id="auth-title">{heading.title}</h1>
          <p>{heading.copy}</p>
        </div>

        <form onSubmit={nextStep} className="auth-form auth-signup-form" key={step}>
          {step === 1 && (
            <label className="auth-field">
              <span className="auth-field-label">Choose your username</span>
              <span className={`auth-input-shell auth-username-shell ${usernameTone}`}>
                <InputIcon kind="user" />
                <span className="auth-input-prefix">pixlo1.vercel.app/user/</span>
                <input value={username} onChange={e => setUsername(e.target.value.toLowerCase())} placeholder="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" minLength={3} maxLength={24} required />
                {usernameStatus === "available" && <svg className="auth-status-icon" viewBox="0 0 24 24" fill="none" aria-label="Available"><path d="m5 12.5 4.3 4.3L19.5 6.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                {usernameStatus === "taken" && <svg className="auth-status-icon" viewBox="0 0 24 24" fill="none" aria-label="Unavailable"><path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}
              </span>
              {usernameMessage && <span className={`auth-username-status ${usernameTone}`} role="status"><i />{usernameMessage}</span>}
            </label>
          )}

          {step === 2 && (
            <label className="auth-field">
              <span className="auth-field-label">Email address</span>
              <span className="auth-input-shell">
                <InputIcon kind="email" />
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" type="email" autoComplete="email" required autoFocus />
              </span>
              <span className="auth-field-hint">We'll use this for account verification and recovery.</span>
            </label>
          )}

          {step === 3 && (
            <label className="auth-field">
              <span className="auth-field-label">Create a password</span>
              <span className="auth-input-shell">
                <InputIcon kind="lock" />
                <input value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} required autoFocus />
                <button type="button" className="auth-password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(value => !value)}>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2.5 12s3.3-6.2 9.5-6.2 9.5 6.2 9.5 6.2-3.3 6.2-9.5 6.2S2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><circle cx="12" cy="12" r="2.7" stroke="currentColor" strokeWidth="1.6"/></svg>
                </button>
              </span>
              <span className="auth-field-hint">Use 8 or more characters.</span>
            </label>
          )}

          {step === 4 && (
            <>
              <div className="auth-review-card">
                <span className="auth-review-avatar">P</span>
                <span className="auth-review-copy"><b>pixlo1.vercel.app/user/{normalizedUsername}</b><small>{email}</small></span>
                <span className="auth-review-check">✓</span>
              </div>
              <label className="auth-field">
                <span className="auth-field-label">Confirm your password</span>
                <span className={`auth-input-shell ${confirm && password !== confirm ? "is-unavailable" : confirm && password === confirm ? "is-available" : ""}`}>
                  <InputIcon kind="lock" />
                  <input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Enter your password again" type={showConfirm ? "text" : "password"} autoComplete="new-password" required autoFocus />
                  <button type="button" className="auth-password-toggle" aria-label={showConfirm ? "Hide password" : "Show password"} onClick={() => setShowConfirm(value => !value)}>
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2.5 12s3.3-6.2 9.5-6.2 9.5 6.2 9.5 6.2-3.3 6.2-9.5 6.2S2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><circle cx="12" cy="12" r="2.7" stroke="currentColor" strokeWidth="1.6"/></svg>
                  </button>
                </span>
                {confirm && password !== confirm && <span className="auth-username-status is-unavailable" role="status"><i />Passwords don't match yet.</span>}
              </label>
            </>
          )}

          {error && <div className="auth-error" role="alert"><span className="auth-message-icon">!</span><span>{error}{emailAlreadyUsed && <> <Link href="/login">Log in instead</Link></>}</span></div>}

          <div className={`auth-form-actions ${step === 1 ? "is-first-step" : ""}`}>
            {step > 1 && <button type="button" className="auth-back-button" onClick={() => { setError(""); setStep(value => value - 1); }}>← <span>Back</span></button>}
            <button className="auth-submit" disabled={loading || (step === 1 && usernameStatus !== "available") || (step === 4 && (!confirm || password !== confirm))}>
              <span>{loading ? "Creating your Pixlo…" : step === 4 ? "Create my Pixlo" : step === 1 ? "Claim username" : "Continue"}</span>
              <span className="auth-submit-arrow" aria-hidden="true">{loading ? "…" : "↗"}</span>
            </button>
          </div>
        </form>

        <div className="auth-progress" aria-label={`Step ${step} of 4`}>
          {[1, 2, 3, 4].map(index => <span key={index} className={index <= step ? "is-complete" : ""} />)}
        </div>

        <div className="auth-card-footer auth-card-footer-signup">
          <p>Already have an account? <Link href="/login">Log in <span aria-hidden="true">→</span></Link></p>
        </div>
      </section>

    </main>
  );
}
