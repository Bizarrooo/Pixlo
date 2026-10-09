"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [emailAlreadyUsed, setEmailAlreadyUsed] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setEmailAlreadyUsed(false);

    const normalizedUsername = username.trim().toLowerCase();
    if (normalizedUsername.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (normalizedUsername.length > 24) {
      setError("Username must be 24 characters or fewer.");
      return;
    }
    if (!/^[a-z0-9._-]+$/.test(normalizedUsername)) {
      setError("Use only lowercase letters, numbers, dots, underscores or hyphens in your username.");
      return;
    }
    if (password !== confirm) {
      setError("Your passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: normalizedUsername, email, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = data.error || "Unable to create your account.";
        if (String(message).toLowerCase().includes("already using this email")) {
          setEmailAlreadyUsed(true);
        }
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

  return <main className="auth-page">
    <div className="auth-glow auth-glow-a" /><div className="auth-glow auth-glow-b" />
    <section className="auth-card">
      <Link href="/" className="auth-brand"><span>p</span><b>pixlo</b><small>.gg</small></Link>
      <div className="auth-heading"><span>CREATE YOUR PIXLO</span><h1>Build your identity.</h1><p>Make your own profile, customise it, and share it anywhere.</p></div>
      <form onSubmit={submit} className="auth-form">
        <label>Username<input value={username} onChange={e => setUsername(e.target.value)} placeholder="bizarro" autoComplete="username" minLength={3} maxLength={24} required /></label>
        <label>Email<input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" type="email" autoComplete="email" required /></label>
        <label>Password<input value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" type="password" autoComplete="new-password" minLength={8} required /></label>
        <label>Confirm password<input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Enter it again" type="password" autoComplete="new-password" minLength={8} required /></label>
        {error && <div className="auth-error">{error}{emailAlreadyUsed && <> <Link href="/login">Log in</Link></>}</div>}
        <button className="auth-submit" disabled={loading}>{loading ? "Creating account…" : "Create Pixlo account"}</button>
      </form>
      <p className="auth-switch">Already have an account? <Link href="/login">Log in</Link></p>
    </section>
  </main>;
}
