"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type PremiumStatus = { authenticated?: boolean; premium?: boolean; error?: string; entitlement?: { purchasedAt?: string; pricePaid?: number; currency?: string } | null };

export default function PremiumPage() {
  const [status, setStatus] = useState<PremiumStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [message, setMessage] = useState("");

  async function refreshStatus() {
    try {
      const response = await fetch("/api/premium/status", { cache: "no-store", credentials: "include" });
      const data = await response.json().catch(() => ({}));
      setStatus(data);
      if (!response.ok && response.status !== 401) setMessage(data.error || "Could not check Premium status.");
    } catch {
      setMessage("Could not check Premium status. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") setMessage("Payment submitted! Premium unlocks automatically after Stripe confirms the payment.");
    else if (params.get("checkout") === "cancelled") setMessage("Checkout was cancelled. You have not been charged.");
    void refreshStatus();
  }, []);

  async function buyPremium() {
    setBuying(true);
    setMessage("");
    try {
      const response = await fetch("/api/premium/checkout", { method: "POST", credentials: "include" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.url !== "string") {
        if (response.status === 401) {
          window.location.href = "/login?next=/premium";
          return;
        }
        throw new Error(data.error || "Could not start checkout.");
      }
      window.location.href = data.url;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start checkout.");
      setBuying(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 50% 0%, rgba(255,77,95,.16), transparent 42%), #070709", color: "#fff", padding: "32px 20px", display: "grid", placeItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 760 }}>
        <Link href="/" style={{ color: "rgba(255,255,255,.65)", textDecoration: "none", fontSize: 14 }}>← Back to Pixlo</Link>
        <section style={{ marginTop: 28, padding: "clamp(26px, 6vw, 52px)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 28, background: "linear-gradient(145deg, rgba(255,255,255,.075), rgba(255,255,255,.025))", boxShadow: "0 28px 100px rgba(0,0,0,.35)" }}>
          <div style={{ display: "inline-flex", gap: 8, alignItems: "center", border: "1px solid rgba(255,95,105,.35)", background: "rgba(255,77,95,.1)", borderRadius: 999, padding: "7px 12px", color: "#ff9ba3", fontSize: 12, fontWeight: 700, letterSpacing: ".08em" }}>PIXLO PREMIUM BETA</div>
          <h1 style={{ margin: "22px 0 10px", fontSize: "clamp(36px, 7vw, 58px)", letterSpacing: "-.045em", lineHeight: 1.02 }}>Your Pixlo.<br /><span style={{ color: "#ff6978" }}>More possibilities.</span></h1>
          <p style={{ color: "rgba(255,255,255,.68)", fontSize: 16, lineHeight: 1.7, maxWidth: 560 }}>Unlock Premium with one payment. No subscription, no monthly charges, and no future top-up to keep your lifetime access.</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, margin: "28px 0 6px" }}>
            <strong style={{ fontSize: 54, letterSpacing: "-.05em" }}>£3.99</strong>
            <span style={{ color: "rgba(255,255,255,.55)", fontSize: 14 }}>one-time beta price</span>
          </div>
          <p style={{ color: "rgba(255,255,255,.5)", fontSize: 13, margin: "0 0 24px" }}>Buy during beta and keep lifetime Premium even if the price increases later.</p>
          {loading ? <p style={{ color: "rgba(255,255,255,.6)" }}>Checking your account…</p> : status?.premium ? (
            <div style={{ border: "1px solid rgba(80,220,150,.3)", background: "rgba(80,220,150,.08)", borderRadius: 14, padding: 16 }}>
              <strong style={{ color: "#8ce6b5" }}>You own Pixlo Premium</strong>
              <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,.7)", fontSize: 14 }}>Lifetime access is active on this account.</p>
            </div>
          ) : (
            <button type="button" onClick={buyPremium} disabled={buying} style={{ display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 10, border: 0, borderRadius: 13, padding: "15px 22px", minHeight: 52, background: "linear-gradient(100deg, #ff4d5f, #ff824d)", color: "#fff", fontWeight: 750, fontSize: 15, cursor: buying ? "wait" : "pointer", opacity: buying ? .7 : 1 }}>
              {buying ? "Opening secure checkout…" : "Get lifetime Premium — £3.99"}
            </button>
          )}
          {message && <p role="status" style={{ color: "rgba(255,255,255,.75)", fontSize: 13, lineHeight: 1.6, marginTop: 16 }}>{message}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginTop: 30 }}>
            {[
              ["One payment", "Pay once. No recurring billing."],
              ["Lifetime access", "Keep Premium if the public price rises."],
              ["Secure checkout", "Card details are handled by Stripe."],
            ].map(([title, description]) => <div key={title} style={{ padding: 16, borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(0,0,0,.15)" }}><strong style={{ fontSize: 14 }}>{title}</strong><p style={{ color: "rgba(255,255,255,.56)", fontSize: 13, lineHeight: 1.5, margin: "7px 0 0" }}>{description}</p></div>)}
          </div>
          <p style={{ color: "rgba(255,255,255,.35)", fontSize: 11, lineHeight: 1.6, marginTop: 24 }}>Premium is linked to the Pixlo account you are signed into at checkout. Purchases unlock only after Stripe verifies the completed payment.</p>
        </section>
      </div>
    </main>
  );
}
