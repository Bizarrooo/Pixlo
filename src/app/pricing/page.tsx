"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type PremiumStatus = { authenticated?: boolean; premium?: boolean; error?: string };

export default function PricingPage() {
  const [status, setStatus] = useState<PremiumStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [giftUsername, setGiftUsername] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") setMessage("Payment submitted! Premium unlocks after Stripe confirms the payment.");
    if (params.get("checkout") === "cancelled") setMessage("Checkout was cancelled. You have not been charged.");
    fetch("/api/premium/status", { cache: "no-store", credentials: "include" })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        setStatus(data);
        if (!response.ok && response.status !== 401) setMessage(data.error || "Could not check Premium status.");
      })
      .catch(() => setMessage("Could not check Premium status. Please refresh the page."))
      .finally(() => setLoading(false));
  }, []);

  async function buyPremium(recipientUsername?: string) {
    setBuying(true);
    setMessage("");
    try {
      const response = await fetch("/api/premium/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recipientUsername ? { recipientUsername } : {}),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.url !== "string") {
        if (response.status === 401) {
          window.location.href = "/login?next=%2Fpricing";
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
    <main className="pricing-global">
      <header className="pricing-header">
        <Link href="/" className="pricing-wordmark" aria-label="Pixlo home">pixlo<span>.</span></Link>
        <nav className="pricing-nav" aria-label="Pricing navigation">
          <Link href="/">Home</Link>
          <a href="#premium">Premium</a>
          <a href="#extras">Extras</a>
        </nav>
        <Link href="/dashboard" className="pricing-dashboard-link">Dashboard <span aria-hidden="true">↗</span></Link>
      </header>

      <div className="pricing-container">
        <section id="premium" className="pricing-hero">
          <div className="pricing-hero-copy">
            <span className="pricing-eyebrow"><span className="pricing-eyebrow-dot" /> LIFETIME UPGRADE</span>
            <h1>Pixlo <span>Premium.</span></h1>
            <p className="pricing-hero-description">Unlock more ways to make your profile yours. One payment, lifetime access — no recurring subscription.</p>

            <div className="pricing-benefits">
              <span><i>✓</i> Premium-only customisation</span>
              <span><i>✓</i> Exclusive profile effects</span>
              <span><i>✓</i> Custom share cover</span>
              <span><i>✓</i> Premium templates and badge</span>
            </div>

            <div className="pricing-hero-buy">
              {loading ? (
                <span className="pricing-status">Checking your account…</span>
              ) : status?.premium ? (
                <span className="pricing-owned"><i>✓</i> Premium is active on this account</span>
              ) : (
                <button type="button" className="pricing-cta" onClick={() => void buyPremium()} disabled={buying}>
                  {buying ? "Opening checkout…" : "Get Premium"} <span aria-hidden="true">›</span>
                </button>
              )}
              <div className="pricing-price"><strong>£3.99</strong><span>/ lifetime</span></div>
            </div>
            <p className="pricing-hero-footnote">Secure checkout through Stripe · Beta price · Lifetime access</p>
          </div>

          <div className="pricing-comparison">
            <div className="pricing-comparison-heading">
              <span>FEATURES</span><span>FREE</span><span>PREMIUM</span>
            </div>
            <div className="pricing-comparison-row"><strong>Profile page and custom links</strong><span className="pricing-yes">✓</span><span className="pricing-yes pricing-premium-value">✓</span></div>
            <div className="pricing-comparison-row"><strong>Backgrounds and profile styling</strong><span className="pricing-yes">✓</span><span className="pricing-yes pricing-premium-value">✓</span></div>
            <div className="pricing-comparison-row"><strong>Music and profile sharing</strong><span className="pricing-yes">✓</span><span className="pricing-yes pricing-premium-value">✓</span></div>
            <div className="pricing-comparison-row"><strong>Premium customisation</strong><span className="pricing-no">×</span><span className="pricing-yes pricing-premium-value">✓</span></div>
            <div className="pricing-comparison-row"><strong>Exclusive profile effects</strong><span className="pricing-no">×</span><span className="pricing-yes pricing-premium-value">✓</span></div>
            <div className="pricing-comparison-row"><strong>Custom share cover options</strong><span className="pricing-no">×</span><span className="pricing-yes pricing-premium-value">✓</span></div>
            <div className="pricing-comparison-row"><strong>Premium templates and badge</strong><span className="pricing-no">×</span><span className="pricing-yes pricing-premium-value">✓</span></div>
            <div className="pricing-comparison-row"><strong>Recurring subscription</strong><span className="pricing-muted">—</span><span className="pricing-muted pricing-premium-value">Never</span></div>
          </div>
        </section>

        {message && <p className="pricing-message" role="status">{message}</p>}

        <section id="extras" className="pricing-section">
          <div className="pricing-section-heading">
            <div><span className="pricing-eyebrow">EXTRAS</span><h2>Get more from Pixlo</h2></div>
            <p>Choose lifetime Premium, gift it to someone, or see what is on the way.</p>
          </div>

          <div className="pricing-product-grid">
            <article className="pricing-product-card">
              <div className="pricing-product-art pricing-art-premium" aria-hidden="true"><span className="pricing-art-spark">✦</span><span className="pricing-art-ring" /><span className="pricing-art-diamond">✧</span></div>
              <div className="pricing-product-body">
                <span className="pricing-product-tag">LIFETIME ACCESS</span>
                <h3>Pixlo Premium</h3>
                <p>Unlock additional customisation, exclusive effects, premium templates and your Premium badge.</p>
                <div className="pricing-product-bottom"><strong>£3.99 <small>one payment</small></strong>
                  {status?.premium ? <span className="pricing-included">Already yours</span> : <button type="button" onClick={() => void buyPremium()} disabled={buying}>{buying ? "Opening…" : "Buy"} <span>›</span></button>}
                </div>
              </div>
            </article>

            <article className="pricing-product-card">
              <div className="pricing-product-art pricing-art-gift" aria-hidden="true"><span className="pricing-gift-box">✳</span><span className="pricing-gift-orbit" /></div>
              <div className="pricing-product-body">
                <span className="pricing-product-tag">GIFT SOMEONE</span>
                <h3>Gift Premium</h3>
                <p>Send lifetime Premium to a Pixlo username. It activates when the payment is verified.</p>
                <label className="pricing-input-label" htmlFor="pricing-gift-username">Recipient username</label>
                <input className="pricing-gift-input" id="pricing-gift-username" value={giftUsername} onChange={event => setGiftUsername(event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 24))} placeholder="Enter username" autoComplete="off" maxLength={24} />
                <div className="pricing-product-bottom"><strong>£3.99 <small>one payment</small></strong><button type="button" onClick={() => void buyPremium(giftUsername.trim())} disabled={buying || giftUsername.trim().length < 3}>{buying ? "Opening…" : "Gift"} <span>›</span></button></div>
              </div>
            </article>

            <article className="pricing-product-card">
              <div className="pricing-product-art pricing-art-cover" aria-hidden="true"><span className="pricing-cover-mini"><b>YOU</b><i /><i /><i /></span><span className="pricing-cover-flare" /></div>
              <div className="pricing-product-body">
                <span className="pricing-product-tag pricing-tag-included">PREMIUM FEATURE</span>
                <h3>Share cover</h3>
                <p>Give your shared Pixlo link a more personal look with Premium cover customisation.</p>
                <div className="pricing-product-bottom"><strong>Included <small>with Premium</small></strong><a href="#premium">View Premium <span>›</span></a></div>
              </div>
            </article>

            <article className="pricing-product-card">
              <div className="pricing-product-art pricing-art-effects" aria-hidden="true"><span className="pricing-effect-orbit" /><span className="pricing-effect-core">✧</span><span className="pricing-effect-dot" /></div>
              <div className="pricing-product-body">
                <span className="pricing-product-tag pricing-tag-included">PREMIUM FEATURE</span>
                <h3>Exclusive effects</h3>
                <p>Bring more movement and personality to your profile with additional visual effects.</p>
                <div className="pricing-product-bottom"><strong>Included <small>with Premium</small></strong><a href="#premium">View Premium <span>›</span></a></div>
              </div>
            </article>

            <article className="pricing-product-card">
              <div className="pricing-product-art pricing-art-boost" aria-hidden="true"><span className="pricing-boost-arrow">↗</span><span className="pricing-boost-bars"><i /><i /><i /><i /></span></div>
              <div className="pricing-product-body">
                <span className="pricing-product-tag pricing-tag-soon">COMING SOON</span>
                <h3>Profile Boosts</h3>
                <p>Promote your Pixlo in discovery, with sponsored placement clearly labelled.</p>
                <div className="pricing-product-bottom"><strong>Coming soon</strong><span className="pricing-unavailable">Not available yet</span></div>
              </div>
            </article>

            <article className="pricing-product-card">
              <div className="pricing-product-art pricing-art-support" aria-hidden="true"><span className="pricing-support-heart">♡</span><span className="pricing-support-coin">✦</span><span className="pricing-support-glow" /></div>
              <div className="pricing-product-body">
                <span className="pricing-product-tag pricing-tag-soon">COMING SOON</span>
                <h3>Support &amp; tips</h3>
                <p>Let visitors support your work through your profile when creator payouts are ready.</p>
                <div className="pricing-product-bottom"><strong>Coming soon</strong><span className="pricing-unavailable">Not available yet</span></div>
              </div>
            </article>
          </div>
        </section>

        <section className="pricing-faq">
          <span className="pricing-eyebrow">GOOD TO KNOW</span>
          <h2>Questions about <span>buying</span></h2>
          <div className="pricing-faq-grid">
            <details><summary>Is anything a subscription?</summary><p>No. Premium is currently a one-time £3.99 payment for lifetime access. There are no recurring Premium charges.</p></details>
            <details><summary>How does gifting work?</summary><p>Enter the recipient's Pixlo username and complete checkout. Premium is granted after the payment has been verified.</p></details>
            <details><summary>Can I use Pixlo for free?</summary><p>Yes. You can make and share a standard Pixlo profile without paying.</p></details>
            <details><summary>Are Profile Boosts and Support &amp; Tips available?</summary><p>Not yet. They're shown as upcoming features and cannot currently be purchased.</p></details>
          </div>
        </section>

        <footer className="pricing-footer">
          <Link href="/" className="pricing-wordmark" aria-label="Pixlo home">pixlo<span>.</span></Link>
          <span>YOUR SPACE ON THE WEB.</span>
          <Link href="/dashboard">Open dashboard ↗</Link>
        </footer>
      </div>
    </main>
  );
}
