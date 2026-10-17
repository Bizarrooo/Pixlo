"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./pricing.module.css";

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
        method: "POST", credentials: "include",
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
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo} aria-label="Pixlo home"><img src="/pixlo-logo.png" alt="Pixlo" /></Link>
        <nav className={styles.nav} aria-label="Pricing navigation">
          <Link href="/">Home</Link>
          <a href="#plans">Plans</a>
          <a href="#extras">Creator tools</a>
        </nav>
        <Link href="/dashboard" className={styles.dashboardLink}>Dashboard <span aria-hidden="true">↗</span></Link>
      </header>

      <div className={styles.container}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}><span className={styles.eyebrowDot} /> PIXLO PRICING</span>
          <h1>Make more of<br /><span>your Pixlo.</span></h1>
          <p>Start free. Unlock more customisation when you're ready, and discover new ways to grow your profile as Pixlo expands.</p>
          <div className={styles.heroNotes}>
            <span><b>✓</b> Free to get started</span>
            <span><b>✓</b> Clear, upfront pricing</span>
            <span><b>✓</b> Secure checkout</span>
          </div>
        </section>

        <section id="plans" className={styles.section}>
          <div className={styles.sectionHeading}>
            <div><span className={styles.sectionEyebrow}>CHOOSE WHAT FITS</span><h2>One home. More possibilities.</h2></div>
            <p>Only pay for extras you want. Your standard Pixlo profile stays free.</p>
          </div>
          <div className={styles.planGrid}>
            <article className={styles.planCard + " " + styles.freeCard}>
              <div className={styles.planTop}><span className={styles.planIcon}>✳</span><span className={styles.planType}>START HERE</span></div>
              <h3>Free</h3>
              <p className={styles.description}>Everything you need to create your own corner of the internet.</p>
              <div className={styles.price}><strong>£0</strong><span>forever</span></div>
              <Link href="/signup" className={styles.secondaryButton}>Create a profile <span>↗</span></Link>
              <div className={styles.divider} />
              <ul className={styles.features}>
                <li><b>✓</b> Your own /user/username page</li>
                <li><b>✓</b> Socials and custom links</li>
                <li><b>✓</b> Backgrounds and profile styling</li>
                <li><b>✓</b> Music and profile sharing</li>
              </ul>
            </article>

            <article className={styles.planCard + " " + styles.premiumCard}>
              <div className={styles.glow} aria-hidden="true" />
              <div className={styles.planTop}><span className={styles.planIcon + " " + styles.premiumIcon}>✧</span><span className={styles.featuredTag}>LIFETIME ACCESS</span></div>
              <h3>Pixlo <span>Premium</span></h3>
              <p className={styles.description}>Take your profile further with Premium customisation and exclusive tools.</p>
              <div className={styles.price}><strong>£3.99</strong><span>one payment</span></div>
              <p className={styles.priceNote}>Beta price · Lifetime access</p>
              {loading ? <div className={styles.status}>Checking your account…</div> : status?.premium ? (
                <div className={styles.owned}><b>✓</b><span><strong>You own Premium</strong><small>Lifetime access is active on this account.</small></span></div>
              ) : (
                <button type="button" className={styles.primaryButton} onClick={() => void buyPremium()} disabled={buying}>
                  {buying ? "Opening secure checkout…" : "Get lifetime Premium"} <span>↗</span>
                </button>
              )}
              <div className={styles.divider} />
              <ul className={styles.features}>
                <li><b>✓</b> Premium-only customisation</li>
                <li><b>✓</b> Exclusive effects and options</li>
                <li><b>✓</b> Premium badge</li>
                <li><b>✓</b> No recurring subscription</li>
              </ul>
              <details className={styles.gift}>
                <summary>Gift Premium to someone</summary>
                <p>Enter their Pixlo username. They receive lifetime Premium after payment is verified.</p>
                <label htmlFor="pricing-gift-username">Recipient username</label>
                <input id="pricing-gift-username" value={giftUsername} onChange={event => setGiftUsername(event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 24))} placeholder="username" autoComplete="off" maxLength={24} />
                <button type="button" className={styles.giftButton} disabled={buying || giftUsername.trim().length < 3} onClick={() => void buyPremium(giftUsername.trim())}>{buying ? "Opening checkout…" : "Gift Premium — £3.99"}</button>
              </details>
            </article>
          </div>
          {message && <p className={styles.message} role="status">{message}</p>}
          <p className={styles.paymentNote}>Payments are processed through Stripe. Premium is only activated after a verified payment. The beta price may change for future purchases; completed lifetime purchases remain active.</p>
        </section>

        <section id="extras" className={styles.section}>
          <div className={styles.sectionHeading}>
            <div><span className={styles.sectionEyebrow}>COMING TO PIXLO</span><h2>More ways to grow.</h2></div>
            <p>Optional tools for people who want to reach more visitors and support creators.</p>
          </div>
          <div className={styles.extraGrid}>
            <article className={styles.extraCard}>
              <div className={styles.artwork + " " + styles.boostArtwork} aria-hidden="true"><span className={styles.boostIcon}>↗</span><span className={styles.boostRing} /><span className={styles.boostSpark}>✦</span></div>
              <div className={styles.extraBody}><span className={styles.comingTag}>COMING SOON</span><h3>Profile Boosts</h3><p>Promote your Pixlo in discovery for a set amount of time, with sponsored placement clearly labelled.</p><button type="button" className={styles.upcoming} disabled>Boosts aren't available yet</button></div>
            </article>
            <article className={styles.extraCard}>
              <div className={styles.artwork + " " + styles.supportArtwork} aria-hidden="true"><span className={styles.heart}>♡</span><span className={styles.coin}>✳</span><span className={styles.supportLine} /></div>
              <div className={styles.extraBody}><span className={styles.comingTag}>COMING SOON</span><h3>Support &amp; Tips</h3><p>Let visitors support your work through your profile, with creator payouts set up securely.</p><button type="button" className={styles.upcoming} disabled>Creator support isn't available yet</button></div>
            </article>
          </div>
        </section>

        <section className={styles.faq}>
          <span className={styles.sectionEyebrow}>GOOD TO KNOW</span><h2>Pricing, without the guesswork.</h2>
          <div className={styles.faqGrid}>
            <article><h3>Can I use Pixlo for free?</h3><p>Yes. Creating and sharing a standard profile does not require payment.</p></article>
            <article><h3>Is Premium a subscription?</h3><p>No. The current beta offer is a one-time £3.99 payment for lifetime Premium.</p></article>
            <article><h3>Are Boosts and Tips live?</h3><p>Not yet. They're shown here as upcoming features; we won't take payment until the systems are ready.</p></article>
            <article><h3>When does Premium activate?</h3><p>After Stripe verifies payment through Pixlo's server-side webhook. Returning from checkout alone doesn't unlock it.</p></article>
          </div>
        </section>

        <footer className={styles.footer}>
          <Link href="/" className={styles.footerLogo}><img src="/pixlo-logo.png" alt="Pixlo" /></Link>
          <span>YOUR SPACE ON THE WEB.</span>
          <Link href="/dashboard">Open dashboard ↗</Link>
        </footer>
      </div>
    </main>
  );
}
