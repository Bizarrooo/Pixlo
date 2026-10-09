"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const verified = params.get("verified") === "1";
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setLoading(true);
    try { const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }); const data = await response.json(); if (!response.ok) return setError(data.error || "Unable to sign in."); router.push("/dashboard"); }
    catch { setError("Something went wrong. Try again."); } finally { setLoading(false); }
  }
  return <main className="auth-page"><div className="auth-glow auth-glow-a" /><div className="auth-glow auth-glow-b" /><section className="auth-card">
    <Link href="/" className="auth-brand"><span>p</span><b>pixlo</b><small>.gg</small></Link>
    <div className="auth-heading"><span>WELCOME BACK</span><h1>Log in to Pixlo.</h1><p>Your profile, your links, your space.</p></div>
    {verified && <div className="auth-success">Email verified. You can log in now.</div>}
    <form onSubmit={submit} className="auth-form"><label>Email<input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" type="email" autoComplete="email" required /></label><label>Password<input value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" type="password" autoComplete="current-password" required /></label>{error && <div className="auth-error">{error}</div>}<button className="auth-submit" disabled={loading}>{loading ? "Signing in…" : "Log in"}</button></form>
    <div className="auth-links"><Link href="/forgot-password">Forgot password?</Link></div><p className="auth-switch">New to Pixlo? <Link href="/signup">Create an account</Link></p>
  </section></main>;
}
