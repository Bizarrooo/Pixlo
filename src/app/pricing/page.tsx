"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type PremiumStatus = { authenticated?: boolean; premium?: boolean; error?: string };
type GiftCheck = "idle" | "checking" | "valid" | "invalid";

export default function PricingPage() {
  const [status, setStatus] = useState<PremiumStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [giftUsername, setGiftUsername] = useState("");
  const [giftCheck, setGiftCheck] = useState<GiftCheck>("idle");
  const [giftDisplayName, setGiftDisplayName] = useState("");
  const [giftRecipientPremium, setGiftRecipientPremium] = useState(false);
  const [giftFeedback, setGiftFeedback] = useState("");
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

  useEffect(() => {
    if (!giftOpen) return;
    const username = giftUsername.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,24}$/.test(username)) {
      setGiftCheck("idle");
      setGiftDisplayName("");
      setGiftRecipientPremium(false);
      setGiftFeedback(username.length ? "Use 3–24 letters, numbers, dots, underscores or hyphens." : "");
      return;
    }

    setGiftCheck("checking");
    setGiftDisplayName("");
    setGiftRecipientPremium(false);
    setGiftFeedback("Checking Pixlo username…");
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/public-profile/" + encodeURIComponent(username), {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({}));
        const profile = data?.profile;
        if (response.ok && profile && String(profile.username || "").toLowerCase() === username) {
          setGiftCheck("valid");
          setGiftDisplayName(String(profile.displayName || profile.username || username));
          const recipientAlreadyPremium = Boolean(profile.premium);
          setGiftRecipientPremium(recipientAlreadyPremium);
          setGiftFeedback(recipientAlreadyPremium ? "This account already has Premium. You can preview the profile, but it can't receive a duplicate gift." : "Profile found — check it's the right person before gifting.");
        } else {
          setGiftCheck("invalid");
          setGiftFeedback(response.status === 500 ? "Couldn't verify this username. Try again." : "We couldn't find that Pixlo username.");
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setGiftCheck("invalid");
        setGiftFeedback("Couldn't verify this username. Try again.");
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [giftOpen, giftUsername]);

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

  function updateGiftUsername(value: string) {
    setGiftUsername(value.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 24));
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
            <h1>Your profile.<br /><span>Your rules.</span></h1>
            <p className="pricing-hero-description">Make your Pixlo feel even more like you. Unlock Premium customisation and exclusive extras with one payment — no recurring subscription.</p>

            <div className="pricing-benefits">
              <span><i>✓</i> Premium-only customisation</span>
              <span><i>✓</i> Exclusive profile effects</span>
              <span><i>✓</i> Custom share-cover options</span>
              <span><i>✓</i> Premium badge and tools</span>
            </div>

            <div className="pricing-hero-buy">
              {loading ? (
                <span className="pricing-status">Checking your account…</span>
              ) : status?.premium ? (
                <span className="pricing-owned"><i>✓</i> Premium is active on this account</span>
              ) : (
                <button type="button" className="pricing-cta" onClick={() => void buyPremium()} disabled={buying}>
                  {buying ? "Opening checkout…" : "Get Premium"} <span aria-hidden="true">↗</span>
                </button>
              )}
              <div className="pricing-price"><strong>£3.99</strong><span>/ lifetime</span></div>
            </div>
            <p className="pricing-hero-footnote">Secure checkout through Stripe · One payment · Lifetime access</p>

            <div className={"pricing-gift-launch" + (giftOpen ? " is-open" : "")}>
              <button
                type="button"
                className="pricing-gift-trigger"
                aria-expanded={giftOpen}
                aria-controls="pricing-gift-panel"
                onClick={() => {
                  setGiftOpen(open => !open);
                  setGiftFeedback("");
                  setGiftCheck("idle");
                  setGiftDisplayName("");
                  setGiftRecipientPremium(false);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3.5 10h17v10.5h-17zM2.5 6.5h19v3.5h-19zM12 6.5v14M12 6.5H8.7a2.2 2.2 0 1 1 2.2-2.2C10.9 5.4 12 6.5 12 6.5ZM12 6.5h3.3a2.2 2.2 0 1 0-2.2-2.2C13.1 5.4 12 6.5 12 6.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span>{giftOpen ? "Close gifting" : "Gift Premium"}</span>
                <span className="pricing-gift-trigger-arrow" aria-hidden="true">{giftOpen ? "−" : "+"}</span>
              </button>

              {giftOpen && (
                <div className="pricing-gift-panel" id="pricing-gift-panel">
                  <label htmlFor="pricing-gift-username">Who are you gifting?</label>
                  <div className="pricing-gift-input-row">
                    <input
                      id="pricing-gift-username"
                      value={giftUsername}
                      onChange={event => updateGiftUsername(event.target.value)}
                      placeholder="Pixlo username"
                      autoComplete="off"
                      maxLength={24}
                      aria-describedby="pricing-gift-feedback"
                    />
                    {giftCheck === "valid" && (
                      <Link
                        href={"/user/" + encodeURIComponent(giftUsername.trim().toLowerCase())}
                        target="_blank"
                        rel="noreferrer"
                        className="pricing-gift-preview"
                        aria-label={"Preview " + giftDisplayName + "'s profile in a new tab"}
                        title={"Preview @" + giftUsername}
                      >
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2.2 12s3.4-6.8 9.8-6.8 9.8 6.8 9.8 6.8-3.4 6.8-9.8 6.8S2.2 12 2.2 12Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.7"/></svg>
                      </Link>
                    )}
                  </div>
                  <p className={"pricing-gift-feedback " + "is-" + giftCheck} id="pricing-gift-feedback" role="status">
                    {giftFeedback || "Enter a username to check the profile."}
                  </p>
                  {giftCheck === "valid" && (
                    <div className="pricing-gift-recipient">
                      <span className="pricing-recipient-check">✓</span>
                      <span><strong>{giftDisplayName}</strong><small>@{giftUsername}</small></span>
                    </div>
                  )}
                  <button
                    type="button"
                    className="pricing-gift-checkout"
                    disabled={buying || giftCheck !== "valid" || giftRecipientPremium}
                    onClick={() => void buyPremium(giftUsername.trim().toLowerCase())}
                  >
                    {buying ? "Opening secure checkout…" : giftRecipientPremium ? "Already owns Premium" : "Gift Premium · £3.99"}
                    <span aria-hidden="true">↗</span>
                  </button>
                </div>
              )}
            </div>
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
            <div className="pricing-comparison-row"><strong>Custom share-cover options</strong><span className="pricing-no">×</span><span className="pricing-yes pricing-premium-value">✓</span></div>
            <div className="pricing-comparison-row"><strong>Premium badge and tools</strong><span className="pricing-no">×</span><span className="pricing-yes pricing-premium-value">✓</span></div>
            <div className="pricing-comparison-row"><strong>Recurring subscription</strong><span className="pricing-muted">—</span><span className="pricing-muted pricing-premium-value">Never</span></div>
          </div>
        </section>

        {message && <p className="pricing-message" role="status">{message}</p>}

        <section id="extras" className="pricing-section">
          <div className="pricing-section-heading">
            <div><span className="pricing-eyebrow"><span className="pricing-eyebrow-dot" /> EXTRAS</span><h2>One more way to grow.</h2></div>
            <p>Only the upcoming profile promotion feature lives here. Premium features stay in the Premium comparison above.</p>
          </div>

          <article className="pricing-product-card">
            <div className="pricing-product-art pricing-art-boost" aria-hidden="true">
              <div className="pricing-boost-orb"></div>
              <span className="pricing-boost-arrow">↗</span>
              <span className="pricing-boost-bars"><i /><i /><i /><i /></span>
            </div>
            <div className="pricing-product-body">
              <span className="pricing-product-tag pricing-tag-soon">COMING SOON</span>
              <h3>Profile Boosts</h3>
              <p>Give your Pixlo more visibility in discovery. Any promoted placement will be clearly labelled, and Boosts won't be sold until the feature is ready.</p>
              <div className="pricing-product-bottom">
                <strong>Coming soon</strong>
                <span className="pricing-unavailable">Not available yet</span>
              </div>
            </div>
          </article>
        </section>

        <section className="pricing-faq">
          <span className="pricing-eyebrow">GOOD TO KNOW</span>
          <h2>Questions about <span>buying</span></h2>
          <div className="pricing-faq-grid">
            <details><summary>Is anything a subscription?</summary><p>No. Premium is currently a one-time £3.99 payment for lifetime access. There are no recurring Premium charges.</p></details>
            <details><summary>How does gifting work?</summary><p>Open Gift Premium, enter the recipient's Pixlo username, then use the eye button to preview their profile. Continue to checkout when you've confirmed you've got the right person.</p></details>
            <details><summary>Can I use Pixlo for free?</summary><p>Yes. You can make and share a standard Pixlo profile without paying.</p></details>
            <details><summary>Are Profile Boosts available?</summary><p>Not yet. Profile Boosts are shown as an upcoming feature and cannot currently be purchased.</p></details>
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
