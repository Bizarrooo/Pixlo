"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type PremiumStatus = { authenticated?: boolean; premium?: boolean; error?: string };
type GiftCheck = "idle" | "checking" | "valid" | "invalid";
type DonationProgress = { authenticated?: boolean; totalDonatedPence?: number };

const donorBadgeTiers = [
  { key: "donor_supporter", name: "Supporter", amountPence: 500, icon: "/badges/donor-supporter.svg" },
  { key: "donor_patron", name: "Patron", amountPence: 1500, icon: "/badges/donor-patron.svg" },
  { key: "donor_benefactor", name: "Benefactor", amountPence: 3000, icon: "/badges/donor-benefactor.svg" },
  { key: "donor_sponsor", name: "Sponsor", amountPence: 5000, icon: "/badges/donor-sponsor.svg" },
  { key: "donor_elite_sponsor", name: "Elite Sponsor", amountPence: 10000, icon: "/badges/donor-elite-sponsor.svg" },
  { key: "donor_mythic_patron", name: "Mythic Patron", amountPence: 25000, icon: "/badges/donor-mythic-patron.svg" },
  { key: "donor_eternal_benefactor", name: "Eternal Benefactor", amountPence: 50000, icon: "/badges/donor-eternal-benefactor.svg" },
] as const;

function formatGBP(pence: number) {
  return `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const pricingPixelSquares = [
  { left: 2, bottom: 4, size: 58, color: "#ff4e39", opacity: .86 },
  { left: 9, bottom: 34, size: 42, color: "#ff8a35", opacity: .82 },
  { left: 15, bottom: 8, size: 28, color: "#ffc35d", opacity: .76 },
  { left: 21, bottom: 55, size: 32, color: "#ff593b", opacity: .72 },
  { left: 28, bottom: 20, size: 20, color: "#ffad45", opacity: .72 },
  { left: 34, bottom: 72, size: 23, color: "#ff7434", opacity: .64 },
  { left: 40, bottom: 12, size: 17, color: "#ffc65e", opacity: .62 },
  { left: 47, bottom: 43, size: 20, color: "#ff4e39", opacity: .58 },
  { left: 53, bottom: 7, size: 13, color: "#ff9a3d", opacity: .52 },
  { left: 59, bottom: 61, size: 17, color: "#ffc35d", opacity: .46 },
  { left: 65, bottom: 26, size: 12, color: "#ff593b", opacity: .43 },
  { left: 71, bottom: 80, size: 14, color: "#ff8a35", opacity: .39 },
  { left: 77, bottom: 15, size: 9, color: "#ffc35d", opacity: .35 },
  { left: 82, bottom: 47, size: 10, color: "#ff4e39", opacity: .31 },
  { left: 88, bottom: 22, size: 7, color: "#ff9a3d", opacity: .28 },
  { left: 93, bottom: 59, size: 6, color: "#ffc35d", opacity: .24 },
  { left: 97, bottom: 10, size: 5, color: "#ff593b", opacity: .2 },
];

function PricingCubeFade() {
  return (
    <div className="pricing-pixel-fade" aria-hidden="true">
      {pricingPixelSquares.map((square, index) => (
        <span
          key={index}
          className="pricing-pixel-square"
          style={{
            left: `${square.left}%`,
            bottom: square.bottom,
            width: square.size,
            height: square.size,
            backgroundColor: square.color,
            opacity: square.opacity,
          }}
        />
      ))}
    </div>
  );
}


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
  const [donationAmount, setDonationAmount] = useState(500);
  const [donationCustomMode, setDonationCustomMode] = useState(false);
  const [customDonationInput, setCustomDonationInput] = useState("");
  const [donating, setDonating] = useState(false);
  const [donorStatus, setDonorStatus] = useState<DonationProgress | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") setMessage("Payment submitted! Premium unlocks after Stripe confirms the payment.");
    if (params.get("checkout") === "cancelled") setMessage("Checkout was cancelled. You have not been charged.");
    if (params.get("donation") === "success") setMessage("Thank you for supporting Pixlo! Stripe has returned you from checkout.");
    if (params.get("donation") === "cancelled") setMessage("Donation checkout was cancelled. You have not been charged.");
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
    const controller = new AbortController();
    fetch("/api/donations/status", { cache: "no-store", credentials: "include", signal: controller.signal })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (response.ok) setDonorStatus(data);
        else setDonorStatus({ authenticated: false, totalDonatedPence: 0 });
      })
      .catch(() => {
        if (!controller.signal.aborted) setDonorStatus({ authenticated: false, totalDonatedPence: 0 });
      });
    return () => controller.abort();
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


  const customDonationValid = /^\d{1,4}(?:\.\d{1,2})?$/.test(customDonationInput)
    && Number(customDonationInput) >= 1
    && Number(customDonationInput) <= 1000;

  async function startDonation() {
    if (donationCustomMode && !customDonationValid) {
      setMessage("Enter a donation between £1 and £1,000, with up to two decimal places.");
      return;
    }
    setDonating(true);
    setMessage("");
    try {
      const response = await fetch("/api/donations/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountPence: donationAmount }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.url !== "string") {
        throw new Error(data.error || "Could not start donation checkout.");
      }
      window.location.href = data.url;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start donation checkout.");
      setDonating(false);
    }
  }

  function updateGiftUsername(value: string) {
    setGiftUsername(value.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 24));
  }

  const lifetimeDonatedPence = donorStatus?.authenticated ? Number(donorStatus.totalDonatedPence || 0) : 0;
  const currentDonorTier = [...donorBadgeTiers].reverse().find(tier => lifetimeDonatedPence >= tier.amountPence) || null;
  const nextDonorTier = donorBadgeTiers.find(tier => lifetimeDonatedPence < tier.amountPence) || null;
  const previousTierThreshold = currentDonorTier?.amountPence || 0;
  const donorProgressPercent = nextDonorTier
    ? Math.max(0, Math.min(100, Math.round(((lifetimeDonatedPence - previousTierThreshold) / (nextDonorTier.amountPence - previousTierThreshold)) * 100)))
    : 100;

  return (
    <main className="pricing-global">
      <header className="pricing-header">
        <Link href="/" className="pricing-brand" aria-label="Pixlo home"><img src="/pixlo-logo.png" alt="Pixlo" /></Link>
        <nav className="pricing-nav" aria-label="Site navigation">
          <Link href="/">Home</Link>
          <a href="https://discord.gg/rdAyWGGDCe" target="_blank" rel="noreferrer">Discord</a>
          <Link href="/leaderboard">Leaderboard</Link>
        </nav>
      </header>

      <div className="pricing-container">
        <section id="premium" className="pricing-hero">
          <div className="pricing-hero-art" aria-hidden="true" />
          <div className="pricing-hero-shade" aria-hidden="true" />
          <PricingCubeFade />
          <div className="pricing-hero-copy">
            <span className="pricing-eyebrow"><span className="pricing-eyebrow-dot" /> LIFETIME UPGRADE</span>
            <h1>Your profile.<br /><span>Your rules.</span></h1>
            <p className="pricing-hero-description">Make your Pixlo feel even more like you. Unlock Premium customisation and exclusive extras with one payment — no recurring subscription.</p>

            <div className="pricing-benefits">
              <span><i>✓</i> Dashboard customisation</span>
              <span><i>✓</i> Cursor trails</span>
              <span><i>✓</i> Customisable Share covers</span>
              <span><i>✓</i> Premium badge</span>
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

            <div className={"pricing-gift-area" + (giftOpen ? " is-open" : "")}>
              <div className="pricing-gift-row">
                <button
                  type="button"
                  className="pricing-gift-icon"
                  aria-label={giftOpen ? "Close Premium gifting" : "Gift Premium"}
                  title="Gift Premium"
                  aria-expanded={giftOpen}
                  aria-controls="pricing-gift-controls"
                  onClick={() => {
                    setGiftOpen(open => !open);
                    setGiftFeedback("");
                    setGiftCheck("idle");
                    setGiftDisplayName("");
                    setGiftRecipientPremium(false);
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3.5 10h17v10.5h-17zM2.5 6.5h19v3.5h-19zM12 6.5v14M12 6.5H8.7a2.2 2.2 0 1 1 2.2-2.2C10.9 5.4 12 6.5 12 6.5ZM12 6.5h3.3a2.2 2.2 0 1 0-2.2-2.2C13.1 5.4 12 6.5 12 6.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                {giftOpen && (
                  <div className="pricing-gift-controls" id="pricing-gift-controls">
                    <div className={"pricing-gift-field" + (giftCheck === "valid" ? " is-valid" : giftCheck === "invalid" ? " is-invalid" : "")}>
                      <input
                        id="pricing-gift-username"
                        value={giftUsername}
                        onChange={event => updateGiftUsername(event.target.value)}
                        placeholder="Pixlo username"
                        autoComplete="off"
                        maxLength={24}
                        aria-label="Premium gift recipient username"
                        aria-describedby="pricing-gift-feedback"
                      />
                      {giftCheck === "valid" && (
                        <Link
                          href={"/user/" + encodeURIComponent(giftUsername.trim().toLowerCase())}
                          target="_blank"
                          rel="noreferrer"
                          className="pricing-gift-eye"
                          aria-label={"Preview " + giftDisplayName + "'s profile"}
                          title={"Preview @" + giftUsername}
                        >
                          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2.2 12s3.4-6.8 9.8-6.8 9.8 6.8 9.8 6.8-3.4 6.8-9.8 6.8S2.2 12 2.2 12Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.7"/></svg>
                        </Link>
                      )}
                    </div>
                    <button
                      type="button"
                      className="pricing-gift-confirm"
                      disabled={buying || giftCheck !== "valid" || giftRecipientPremium}
                      onClick={() => void buyPremium(giftUsername.trim().toLowerCase())}
                    >
                      {buying ? "Opening Stripe…" : giftRecipientPremium ? "Already Premium" : "Gift Premium"}
                      <span aria-hidden="true">↗</span>
                    </button>
                  </div>
                )}
              </div>
              {giftOpen && (giftCheck === "checking" || giftCheck === "invalid" || giftRecipientPremium) && (
                <p className={"pricing-gift-feedback is-" + giftCheck} id="pricing-gift-feedback" role="status">
                  {giftFeedback}
                </p>
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
            <div className="pricing-comparison-row"><strong>Cursor trails</strong><span className="pricing-no">×</span><span className="pricing-yes pricing-premium-value">✓</span></div>
            <div className="pricing-comparison-row"><strong>Customisable Share covers</strong><span className="pricing-no">×</span><span className="pricing-yes pricing-premium-value">✓</span></div>
            <div className="pricing-comparison-row"><strong>Premium badge</strong><span className="pricing-no">×</span><span className="pricing-yes pricing-premium-value">✓</span></div>
            <div className="pricing-comparison-row"><strong>Recurring subscription</strong><span className="pricing-muted">—</span><span className="pricing-muted pricing-premium-value">Never</span></div>
          </div>
        </section>

        {message && <p className="pricing-message" role="status">{message}</p>}

        <section id="extras" className="pricing-section">
          <div className="pricing-section-heading">
            <div><span className="pricing-eyebrow"><span className="pricing-eyebrow-dot" /> EXTRAS</span><h2>Support the future of Pixlo.</h2></div>
            <p>Choose an optional one-time donation, or keep an eye out for Profile Boosts.</p>
          </div>

          <div className="pricing-product-grid">
            <article className="pricing-product-card">
              <div className="pricing-product-art pricing-art-boost" aria-hidden="true">
                <div className="pricing-boost-orb" />
                <span className="pricing-boost-arrow">↗</span>
                <span className="pricing-boost-bars"><i /><i /><i /><i /></span>
              </div>
              <div className="pricing-product-body">
                <span className="pricing-product-tag pricing-tag-soon">COMING SOON</span>
                <h3>Profile Boosts</h3>
                <p>Give your Pixlo more visibility in discovery. Sponsored placement will always be clearly labelled, and Boosts won't be sold until the feature is ready.</p>
                <div className="pricing-product-bottom">
                  <strong>Coming soon</strong>
                  <span className="pricing-unavailable">Not available yet</span>
                </div>
              </div>
            </article>

            <article className="pricing-product-card">
              <div className="pricing-product-art pricing-art-donation" aria-hidden="true">
                <span className="pricing-donation-mark">
                  <svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="12.5" stroke="currentColor" strokeWidth="1.6"/><path d="M20.4 11.6c-.7-1.1-2-1.8-4.1-1.8-2.4 0-3.9 1.2-3.9 2.9 0 4.4 7.7 1.8 7.7 6 0 1.9-1.6 3.3-4.2 3.3-1.9 0-3.4-.7-4.3-2M16 7.7v16.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                </span>
                <span className="pricing-donation-orbit" />
              </div>
              <div className="pricing-product-body">
                <span className="pricing-product-tag">OPTIONAL SUPPORT</span>
                <h3>Donations</h3>
                <p>Enjoying Pixlo? A small one-time contribution helps support ongoing development. Checkout is handled securely by Stripe.</p>
                <section className="pricing-donor-tier-panel" aria-label="Donor badge tiers">
                  <div className="pricing-donor-tier-heading">
                    <div><span className="pricing-donor-kicker">BADGE TIERS</span><strong>Every donation adds up.</strong></div>
                    <span className="pricing-donor-total">{donorStatus?.authenticated ? formatGBP(lifetimeDonatedPence) : "7 tiers"}</span>
                  </div>
                  <div className="pricing-donor-tier-rail">
                    {donorBadgeTiers.map((tier, index) => {
                      const unlocked = Boolean(donorStatus?.authenticated && lifetimeDonatedPence >= tier.amountPence);
                      const isCurrent = currentDonorTier?.key === tier.key;
                      return (
                        <div className={`pricing-donor-tier-chip ${unlocked ? "is-unlocked" : ""} ${isCurrent ? "is-current" : ""}`} key={tier.key} title={`${tier.name} — ${formatGBP(tier.amountPence)} lifetime donations`}>
                          <span className={`pricing-donor-tier-icon tier-${index}`}><img src={tier.icon} alt="" aria-hidden="true" /></span>
                          <small>{formatGBP(tier.amountPence).replace(".00", "")}</small>
                          <strong>{tier.name}</strong>
                          {unlocked && <span className="pricing-donor-unlocked" aria-label="Unlocked">✓</span>}
                        </div>
                      );
                    })}
                  </div>
                  {donorStatus?.authenticated ? (
                    <div className="pricing-donor-progress" aria-live="polite">
                      <div className="pricing-donor-progress-copy">
                        <span>{currentDonorTier ? `Current tier: ${currentDonorTier.name}` : "Your donor journey starts here"}</span>
                        <strong>{nextDonorTier ? `${formatGBP(nextDonorTier.amountPence - lifetimeDonatedPence)} to ${nextDonorTier.name}` : "All donor tiers unlocked"}</strong>
                      </div>
                      <div className="pricing-donor-progress-track" role="progressbar" aria-label="Progress towards next donor tier" aria-valuemin={0} aria-valuemax={100} aria-valuenow={donorProgressPercent}>
                        <span style={{ width: `${donorProgressPercent}%` }} />
                      </div>
                      <small>Lifetime donations: {formatGBP(lifetimeDonatedPence)}{nextDonorTier ? ` of ${formatGBP(nextDonorTier.amountPence)}` : " · maximum tier reached"}</small>
                    </div>
                  ) : (
                    <p className="pricing-donor-signin"><Link href="/login?next=%2Fpricing">Sign in</Link> before donating to track your lifetime total and unlock donor badges. Guest donations are still welcome, but cannot be attached to a Pixlo profile.</p>
                  )}
                  <details className="pricing-donor-tier-details">
                    <summary>View all donor badge tiers</summary>
                    <div className="pricing-donor-tier-list">
                      {donorBadgeTiers.map(tier => (
                        <div key={tier.key} className={`pricing-donor-tier-list-row ${donorStatus?.authenticated && lifetimeDonatedPence >= tier.amountPence ? "is-unlocked" : ""}`}>
                          <span>{tier.name}</span><strong>{formatGBP(tier.amountPence)}</strong>
                          {donorStatus?.authenticated && lifetimeDonatedPence >= tier.amountPence && <i>Unlocked</i>}
                        </div>
                      ))}
                    </div>
                  </details>
                </section>
                <div className="pricing-donation-options" aria-label="Choose a donation amount">
                  {[100, 300, 500, 1000].map(amount => (
                    <button
                      type="button"
                      key={amount}
                      className={!donationCustomMode && donationAmount === amount ? "is-selected" : ""}
                      aria-pressed={!donationCustomMode && donationAmount === amount}
                      onClick={() => {
                        setDonationCustomMode(false);
                        setCustomDonationInput("");
                        setDonationAmount(amount);
                      }}
                    >
                      £{amount / 100}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={donationCustomMode ? "is-selected" : ""}
                    aria-pressed={donationCustomMode}
                    onClick={() => {
                      setDonationCustomMode(true);
                      setCustomDonationInput("");
                    }}
                  >Custom</button>
                </div>
                {donationCustomMode && (
                  <label className="pricing-custom-donation" htmlFor="pricing-custom-donation">
                    <span>£</span>
                    <input
                      id="pricing-custom-donation"
                      type="number"
                      min="1"
                      max="1000"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="Enter amount"
                      value={customDonationInput}
                      onChange={event => {
                        const value = event.target.value;
                        setCustomDonationInput(value);
                        if (/^\d{1,4}(?:\.\d{1,2})?$/.test(value) && Number(value) >= 1 && Number(value) <= 1000) {
                          setDonationAmount(Math.round(Number(value) * 100));
                        }
                      }}
                      aria-label="Custom donation amount in pounds"
                    />
                    <small>£1–£1,000</small>
                  </label>
                )}
                <div className="pricing-product-bottom pricing-donation-bottom">
                  <strong>{donationCustomMode && !customDonationValid ? "Enter amount" : `£${(donationAmount / 100).toFixed(2)}`}<small>one-time donation</small></strong>
                  <button type="button" onClick={() => void startDonation()} disabled={donating || (donationCustomMode && !customDonationValid)}>
                    {donating ? "Opening Stripe…" : "Donate"} <span>›</span>
                  </button>
                </div>
              </div>
            </article>
          </div>
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
          <Link href="/" className="pricing-brand pricing-footer-brand" aria-label="Pixlo home"><img src="/pixlo-logo.png" alt="Pixlo" /></Link>
          <span>YOUR SPACE ON THE WEB.</span>
          <nav className="pricing-footer-nav" aria-label="Site navigation">
            <Link href="/">Home</Link>
            <a href="https://discord.gg/rdAyWGGDCe" target="_blank" rel="noreferrer">Discord</a>
            <Link href="/leaderboard">Leaderboard</Link>
          </nav>
        </footer>
      </div>
    </main>
  );
}
