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
    <main className={styles.page + " pricing-page pricing-global"}>
      <header className={styles.header + " pricing-header"}>
        <Link href="/" className={styles.logo + " pricing-logo"} aria-label="Pixlo home"><span className={styles.wordmark + " pricing-wordmark"}>pixlo<span>.</span></span></Link>
        <nav className={styles.nav + " pricing-nav"} aria-label="Pricing navigation">
          <Link href="/">Home</Link>
          <a href="#plans">Plans</a>
          <a href="#extras">Creator tools</a>
        </nav>
        <Link href="/dashboard" className={styles.dashboardLink + " pricing-dashboardLink"}>Dashboard <span aria-hidden="true">↗</span></Link>
      </header>

      <div className={styles.container + " pricing-container"}>
        <section className={styles.hero + " pricing-hero"}>
          <div className={styles.heroCopy + " pricing-heroCopy"}>
            <span className={styles.eyebrow + " pricing-eyebrow"}><span className={styles.eyebrowDot + " pricing-eyebrowDot"} /> PIXLO PRICING</span>
            <h1>Your Pixlo.<br /><span>Your way.</span></h1>
            <p className={styles.heroDescription + " pricing-heroDescription"}>Start with everything you need for free. Add more when it makes sense for you — no confusing tiers, no surprise subscriptions.</p>
            <div className={styles.heroActions + " pricing-heroActions"}>
              <a href="#plans" className={styles.heroPrimary + " pricing-heroPrimary"}>Explore pricing <span aria-hidden="true">↓</span></a>
              <Link href="/signup" className={styles.heroSecondary + " pricing-heroSecondary"}>Create your profile <span aria-hidden="true">↗</span></Link>
            </div>
            <div className={styles.heroNotes + " pricing-heroNotes"}>
              <span><b>✓</b> Free to start</span>
              <span><b>✓</b> Clear pricing</span>
              <span><b>✓</b> Secure checkout</span>
            </div>
          </div>
          <div className={styles.heroVisual + " pricing-heroVisual"} aria-label="Pixlo profile preview illustration">
            <div className={styles.visualGlow + " pricing-visualGlow"} aria-hidden="true" />
            <div className={styles.visualOrbit + " pricing-visualOrbit"} aria-hidden="true" />
            <div className={styles.profilePreview + " pricing-profilePreview"}>
              <div className={styles.previewTop + " pricing-previewTop"}><span /><span /><span /><small>YOUR PIXLO</small><b>•••</b></div>
              <div className={styles.previewCover + " pricing-previewCover"} />
              <div className={styles.previewIdentity + " pricing-previewIdentity"}>
                <div className={styles.previewAvatar + " pricing-previewAvatar"}>P<span>✦</span></div>
                <div className={styles.previewNames + " pricing-previewNames"}><strong>yourname</strong><small>your corner of the internet</small></div>
                <span className={styles.previewBadge + " pricing-previewBadge"}>✧</span>
              </div>
              <div className={styles.previewLines + " pricing-previewLines"}><i /><i /><i /></div>
              <div className={styles.previewSocials + " pricing-previewSocials"}><span>◎</span><span>♫</span><span>↗</span><span>⌘</span></div>
            </div>
            <div className={styles.floatPrice + " pricing-floatPrice"}><span className={styles.floatIcon + " pricing-floatIcon"}>✧</span><span><small>OPTIONAL UPGRADE</small><strong>Lifetime Premium</strong></span><b>£3.99</b></div>
            <div className={styles.floatFree + " pricing-floatFree"}><span>✓</span> Start free. Upgrade when you want.</div>
          </div>
        </section>

        <div className={styles.promiseStrip + " pricing-promiseStrip"}>
          <span>01 <b>MAKE A PROFILE</b></span><i />
          <span>02 <b>MAKE IT YOURS</b></span><i />
          <span>03 <b>ADD EXTRAS WHEN YOU NEED THEM</b></span>
        </div>

        <section id="plans" className={styles.section + " pricing-section"}>
          <div className={styles.sectionHeading + " pricing-sectionHeading"}>
            <div><span className={styles.sectionEyebrow + " pricing-sectionEyebrow"}>CHOOSE WHAT FITS</span><h2>One home. More possibilities.</h2></div>
            <p>Only pay for extras you want. Your standard Pixlo profile stays free.</p>
          </div>
          <div className={styles.planGrid + " pricing-planGrid"}>
            <article className={styles.planCard + " pricing-planCard" + " " + styles.freeCard + " pricing-freeCard"}>
              <div className={styles.planTop + " pricing-planTop"}><span className={styles.planIcon + " pricing-planIcon"}>✳</span><span className={styles.planType + " pricing-planType"}>START HERE</span></div>
              <h3>Free</h3>
              <p className={styles.description + " pricing-description"}>Everything you need to create your own corner of the internet.</p>
              <div className={styles.price + " pricing-price"}><strong>£0</strong><span>forever</span></div>
              <Link href="/signup" className={styles.secondaryButton + " pricing-secondaryButton"}>Create a profile <span>↗</span></Link>
              <div className={styles.divider + " pricing-divider"} />
              <ul className={styles.features + " pricing-features"}>
                <li><b>✓</b> Your own /user/username page</li>
                <li><b>✓</b> Socials and custom links</li>
                <li><b>✓</b> Backgrounds and profile styling</li>
                <li><b>✓</b> Music and profile sharing</li>
              </ul>
            </article>

            <article className={styles.planCard + " pricing-planCard" + " " + styles.premiumCard + " pricing-premiumCard"}>
              <div className={styles.glow + " pricing-glow"} aria-hidden="true" />
              <div className={styles.planTop + " pricing-planTop"}><span className={styles.planIcon + " pricing-planIcon" + " " + styles.premiumIcon + " pricing-premiumIcon"}>✧</span><span className={styles.featuredTag + " pricing-featuredTag"}>LIFETIME ACCESS</span></div>
              <h3>Pixlo <span>Premium</span></h3>
              <p className={styles.description + " pricing-description"}>Take your profile further with Premium customisation and exclusive tools.</p>
              <div className={styles.price + " pricing-price"}><strong>£3.99</strong><span>one payment</span></div>
              <p className={styles.priceNote + " pricing-priceNote"}>Beta price · Lifetime access</p>
              {loading ? <div className={styles.status + " pricing-status"}>Checking your account…</div> : status?.premium ? (
                <div className={styles.owned + " pricing-owned"}><b>✓</b><span><strong>You own Premium</strong><small>Lifetime access is active on this account.</small></span></div>
              ) : (
                <button type="button" className={styles.primaryButton + " pricing-primaryButton"} onClick={() => void buyPremium()} disabled={buying}>
                  {buying ? "Opening secure checkout…" : "Get lifetime Premium"} <span>↗</span>
                </button>
              )}
              <div className={styles.divider + " pricing-divider"} />
              <ul className={styles.features + " pricing-features"}>
                <li><b>✓</b> Premium-only customisation</li>
                <li><b>✓</b> Exclusive effects and options</li>
                <li><b>✓</b> Premium badge</li>
                <li><b>✓</b> No recurring subscription</li>
              </ul>
              <details className={styles.gift + " pricing-gift"}>
                <summary>Gift Premium to someone</summary>
                <p>Enter their Pixlo username. They receive lifetime Premium after payment is verified.</p>
                <label htmlFor="pricing-gift-username">Recipient username</label>
                <input id="pricing-gift-username" value={giftUsername} onChange={event => setGiftUsername(event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 24))} placeholder="username" autoComplete="off" maxLength={24} />
                <button type="button" className={styles.giftButton + " pricing-giftButton"} disabled={buying || giftUsername.trim().length < 3} onClick={() => void buyPremium(giftUsername.trim())}>{buying ? "Opening checkout…" : "Gift Premium — £3.99"}</button>
              </details>
            </article>
          </div>
          {message && <p className={styles.message + " pricing-message"} role="status">{message}</p>}
          <p className={styles.paymentNote + " pricing-paymentNote"}>Payments are processed through Stripe. Premium is only activated after a verified payment. The beta price may change for future purchases; completed lifetime purchases remain active.</p>
        </section>

        <section id="extras" className={styles.section + " pricing-section"}>
          <div className={styles.sectionHeading + " pricing-sectionHeading"}>
            <div><span className={styles.sectionEyebrow + " pricing-sectionEyebrow"}>COMING TO PIXLO</span><h2>More ways to grow.</h2></div>
            <p>Optional tools for people who want to reach more visitors and support creators.</p>
          </div>
          <div className={styles.extraGrid + " pricing-extraGrid"}>
            <article className={styles.extraCard + " pricing-extraCard"}>
              <div className={styles.artwork + " pricing-artwork" + " " + styles.boostArtwork + " pricing-boostArtwork"} aria-hidden="true"><span className={styles.boostIcon + " pricing-boostIcon"}>↗</span><span className={styles.boostRing + " pricing-boostRing"} /><span className={styles.boostSpark + " pricing-boostSpark"}>✦</span></div>
              <div className={styles.extraBody + " pricing-extraBody"}><span className={styles.comingTag + " pricing-comingTag"}>COMING SOON</span><h3>Profile Boosts</h3><p>Promote your Pixlo in discovery for a set amount of time, with sponsored placement clearly labelled.</p><button type="button" className={styles.upcoming + " pricing-upcoming"} disabled>Boosts aren't available yet</button></div>
            </article>
            <article className={styles.extraCard + " pricing-extraCard"}>
              <div className={styles.artwork + " pricing-artwork" + " " + styles.supportArtwork + " pricing-supportArtwork"} aria-hidden="true"><span className={styles.heart + " pricing-heart"}>♡</span><span className={styles.coin + " pricing-coin"}>✳</span><span className={styles.supportLine + " pricing-supportLine"} /></div>
              <div className={styles.extraBody + " pricing-extraBody"}><span className={styles.comingTag + " pricing-comingTag"}>COMING SOON</span><h3>Support &amp; Tips</h3><p>Let visitors support your work through your profile, with creator payouts set up securely.</p><button type="button" className={styles.upcoming + " pricing-upcoming"} disabled>Creator support isn't available yet</button></div>
            </article>
          </div>
        </section>

        <section className={styles.faq + " pricing-faq"}>
          <span className={styles.sectionEyebrow + " pricing-sectionEyebrow"}>GOOD TO KNOW</span><h2>Pricing, without the guesswork.</h2>
          <div className={styles.faqGrid + " pricing-faqGrid"}>
            <article><h3>Can I use Pixlo for free?</h3><p>Yes. Creating and sharing a standard profile does not require payment.</p></article>
            <article><h3>Is Premium a subscription?</h3><p>No. The current beta offer is a one-time £3.99 payment for lifetime Premium.</p></article>
            <article><h3>Are Boosts and Tips live?</h3><p>Not yet. They're shown here as upcoming features; we won't take payment until the systems are ready.</p></article>
            <article><h3>When does Premium activate?</h3><p>After Stripe verifies payment through Pixlo's server-side webhook. Returning from checkout alone doesn't unlock it.</p></article>
          </div>
        </section>

        <footer className={styles.footer + " pricing-footer"}>
          <Link href="/" className={styles.footerLogo + " pricing-footerLogo"}><span className={styles.wordmark + " pricing-wordmark" + " " + styles.footerWordmark + " pricing-footerWordmark"}>pixlo<span>.</span></span></Link>
          <span>YOUR SPACE ON THE WEB.</span>
          <Link href="/dashboard">Open dashboard ↗</Link>
        </footer>
      </div>
    </main>
  );
}
