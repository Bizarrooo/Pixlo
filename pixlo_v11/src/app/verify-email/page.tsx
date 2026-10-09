"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const email = params.get("email") || "your email address";
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  async function resend() {
    if (loading || cooldown > 0) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error || "Unable to resend the email.");
        return;
      }
      setMessage("Verification email sent. Check your inbox and spam folder.");
      setCooldown(60);
      const timer = window.setInterval(() => {
        setCooldown(value => {
          if (value <= 1) {
            window.clearInterval(timer);
            return 0;
          }
          return value - 1;
        });
      }, 1000);
    } catch {
      setMessage("Unable to resend the email. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth-page"><div className="auth-glow auth-glow-a" /><div className="auth-glow auth-glow-b" /><section className="auth-card auth-card-compact">
    <Link href="/" className="auth-brand"><span>p</span><b>pixlo</b><small>.gg</small></Link>
    <div className="verify-icon">@</div>
    <div className="auth-heading"><span>CHECK YOUR INBOX</span><h1>Verify your email.</h1><p>We sent a verification email to <strong>{email}</strong>. Click the confirmation link to finish creating your Pixlo account.</p></div>
    {message && <div className={message.startsWith("Verification email sent") ? "auth-success" : "auth-error"}>{message}</div>}
    <button className="auth-submit" type="button" onClick={resend} disabled={loading || cooldown > 0}>{loading ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend verification email"}</button>
    <Link className="auth-submit auth-submit-link" href="/login">Back to login</Link>
    <p className="auth-switch">No email? Check spam/junk. Supabase's default SMTP is restricted for testing, so public signup needs custom SMTP configured.</p>
  </section></main>;
}
