import Link from "next/link";
import HomeAccountNav from "./HomeAccountNav";

function Icon({ name, size = 20 }: { name: "spark" | "arrow" | "play" | "palette" | "music" | "link" | "bolt" | "shield" | "chevron" | "discord" | "youtube" | "github" | "roblox" | "twitch" | "instagram"; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "spark") {
    return <svg {...common}><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></svg>;
  }
  if (name === "arrow") return <svg {...common}><path d="M5 12h13" /><path d="m13 6 6 6-6 6" /></svg>;
  if (name === "play") return <svg {...common} fill="currentColor" stroke="none"><path d="M8 5.7v12.6a1 1 0 0 0 1.52.86l9.6-6.3a1 1 0 0 0 0-1.72l-9.6-6.3A1 1 0 0 0 8 5.7Z" /></svg>;
  if (name === "palette") return <svg {...common}><path d="M12 3.5a8.5 8.5 0 0 0 0 17h1.1a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h3.5a4.5 4.5 0 0 0 4.5-4.5A8.5 8.5 0 0 0 12 3.5Z" /><circle cx="7.7" cy="9" r="1" fill="currentColor" stroke="none" /><circle cx="10.2" cy="6.7" r="1" fill="currentColor" stroke="none" /><circle cx="14.2" cy="6.7" r="1" fill="currentColor" stroke="none" /></svg>;
  if (name === "music") return <svg {...common}><path d="M9 18V6l10-2v12" /><circle cx="6.5" cy="18.5" r="3.5" /><circle cx="16.5" cy="16.5" r="3.5" /></svg>;
  if (name === "link") return <svg {...common}><path d="M10 13.8 8.7 15a3.4 3.4 0 0 1-4.8-4.8l3-3A3.4 3.4 0 0 1 11.7 7" /><path d="m14 10.2 1.3-1.3a3.4 3.4 0 0 1 4.8 4.8l-3 3A3.4 3.4 0 0 1 12.3 17" /><path d="m8.8 15.2 6.4-6.4" /></svg>;
  if (name === "bolt") return <svg {...common}><path d="m13.2 2.8-8 10.1h6.2l-.7 8.3 8.1-11h-6.2l.6-7.4Z" /></svg>;
  if (name === "shield") return <svg {...common}><path d="M12 3 20 6v5.7c0 4.5-3.1 7.7-8 9.3-4.9-1.6-8-4.8-8-9.3V6l8-3Z" /><path d="m8.7 12 2.1 2.1 4.7-4.7" /></svg>;
  if (name === "discord") return <svg {...common} fill="currentColor" stroke="none"><path d="M19.54 5.12a16.9 16.9 0 0 0-3.98-1.25l-.52 1.06a15.4 15.4 0 0 0-6.08 0L8.44 3.87a16.9 16.9 0 0 0-3.98 1.25C1.94 8.86 1.24 12.5 1.59 16.08a16.98 16.98 0 0 0 5.05 2.55l1.22-1.67c-.68-.25-1.33-.56-1.94-.94l.48-.37a12.35 12.35 0 0 0 11.2 0l.49.37c-.61.38-1.26.69-1.94.94l1.22 1.67a16.98 16.98 0 0 0 5.05-2.55c.41-4.15-.7-7.76-2.88-10.96ZM8.4 14.1c-1.05 0-1.9-.98-1.9-2.19s.84-2.19 1.9-2.19 1.92.98 1.9 2.19c0 1.21-.85 2.19-1.9 2.19Zm7.2 0c-1.05 0-1.9-.98-1.9-2.19s.84-2.19 1.9-2.19 1.92.98 1.9 2.19c0 1.21-.85 2.19-1.9 2.19Z" /></svg>;
  if (name === "youtube") return <svg {...common} fill="currentColor" stroke="none"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.6 3.5 12 3.5 12 3.5s-7.6 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.8.6 9.4.6 9.4.6s7.6 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.9V8.1l6.8 3.9-6.8 3.9Z" /></svg>;
  if (name === "roblox") return <svg {...common} fill="currentColor" stroke="none"><path d="M18.926 23.998 0 18.892 5.075.002 24 5.108ZM15.348 10.09l-5.282-1.453-1.414 5.273 5.282 1.453z" /></svg>;
  if (name === "github") return <svg {...common} fill="currentColor" stroke="none"><path d="M12 2.1a9.9 9.9 0 0 0-3.13 19.3c.5.1.68-.22.68-.48v-1.69c-2.78.61-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.02 1.53 1.02.9 1.53 2.36 1.09 2.94.83.09-.65.35-1.09.64-1.34-2.22-.25-4.55-1.11-4.55-4.95 0-1.09.39-1.98 1.02-2.68-.1-.25-.44-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.54 1.37.2 2.39.1 2.64.63.7.68 1.24.68 1.85v2.74c0 .26.18.58.69.48A9.9 9.9 0 0 0 12 2.1Z" /></svg>;
  if (name === "twitch") return <svg {...common} fill="currentColor" stroke="none"><path d="M4 3h17v12.2l-5.3 5.3h-4.1L8 24v-3.5H4V3Zm2 2v13.5h3v1.9l2.1-1.9h3.8l4.1-4.1V5H6Zm4 3h2v5h-2V8Zm4 0h2v5h-2V8Z" /></svg>;
  if (name === "instagram") return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>;
  return <svg {...common}><path d="m9 18 6-6-6-6" /></svg>;
}

function MiniSocials() {
  const socials = ["discord", "youtube", "github", "roblox", "instagram"] as const;
  return (
    <div className="home-mini-socials" aria-label="Social platforms">
      {socials.map(name => <span key={name} title={name}><Icon name={name} size={17} /></span>)}
    </div>
  );
}

function ProfileMockup({ variant = "main" }: { variant?: "main" | "alt" }) {
  return (
    <div className={`home-profile-mock ${variant === "alt" ? "home-profile-mock-alt" : ""}`}>
      <div className="home-profile-glow" />
      <div className="home-profile-cover">
        <div className="home-cover-grid" />
        <span className="home-cover-orb" />
      </div>
      <div className="home-profile-body">
        <div className="home-profile-avatar">{variant === "alt" ? "P" : "B"}</div>
        <div className="home-profile-title">
          <strong>{variant === "alt" ? "Pixlo" : "Bizarro"}</strong>
          <span className="home-verified">✓</span>
        </div>
        <span className="home-profile-handle">@{variant === "alt" ? "pixlo" : "bizarro"}</span>
        <p>{variant === "alt" ? "Your profile. Your identity. Your space." : "building cool things on the internet ✦"}</p>
        <MiniSocials />
        <div className="home-profile-link">Explore my world <Icon name="arrow" size={15} /></div>
        <div className="home-profile-link muted-link">Latest project <Icon name="arrow" size={15} /></div>
        <div className="home-profile-music">
          <div className="home-music-art"><Icon name="music" size={15} /></div>
          <div><b>now playing</b><span>your favourite track</span></div>
          <span className="home-music-play"><Icon name="play" size={11} /></span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="pixlo-home">
      <div className="home-noise" aria-hidden="true" />
      <div className="home-grid" aria-hidden="true" />
      <div className="home-orb home-orb-one" aria-hidden="true" />
      <div className="home-orb home-orb-two" aria-hidden="true" />

      <header className="home-nav-wrap">
        <nav className="home-nav" aria-label="Main navigation">
          <Link href="/" className="home-brand" aria-label="Pixlo home">
            <img className="home-brand-logo" src="/pixlo-logo.png" alt="Pixlo" />
          </Link>

          <div className="home-nav-links">
            <a href="#features">Features</a>
            <a href="#showcase">Showcase</a>
            <a href="#why-pixlo">Why Pixlo</a>
            <a href="#pricing">Pricing</a>
          </div>

          <div className="home-nav-actions">
            <HomeAccountNav />
          </div>
        </nav>
      </header>

      <section className="home-hero">
        <div className="home-hero-copy">
          <div className="home-eyebrow"><span><Icon name="spark" size={13} /></span> the new home for your online identity</div>
          <h1>Make your profile<br /><em>impossible to ignore.</em></h1>
          <p>Build a profile that feels like you. Add your socials, music, links, effects and everything else that makes your corner of the internet yours.</p>
          <div className="home-hero-actions">
            <Link href="/dashboard" className="home-primary-btn">Build your Pixlo <Icon name="arrow" size={17} /></Link>
            <a href="#showcase" className="home-secondary-btn"><span className="home-play"><Icon name="play" size={11} /></span> See it in action</a>
          </div>
          <div className="home-trust-row">
            <span><i /> Free to start</span>
            <span><i /> No design skills needed</span>
            <span><i /> Fully customisable</span>
          </div>
        </div>

        <div className="home-hero-visual" aria-label="Pixlo profile preview">
          <div className="home-visual-backdrop" />
          <div className="home-floating-chip chip-top"><span className="chip-icon"><Icon name="palette" size={15} /></span><span><b>Unlimited style</b><small>Make it yours</small></span></div>
          <div className="home-floating-chip chip-bottom"><span className="chip-icon"><Icon name="music" size={15} /></span><span><b>Music ready</b><small>Set the mood</small></span></div>
          <ProfileMockup />
        </div>
      </section>

      <section className="home-stat-strip" id="why-pixlo">
        <div><strong>01</strong><span>One profile for<br />everything.</span></div>
        <div><strong>02</strong><span>Built to look<br />like you.</span></div>
        <div><strong>03</strong><span>Fast, clean and<br />easy to share.</span></div>
        <div><strong>04</strong><span>Your style,<br />your rules.</span></div>
      </section>

      <section className="home-section home-features" id="features">
        <div className="home-section-heading">
          <div>
            <span className="home-section-kicker">WHAT YOU CAN BUILD</span>
            <h2>More than a link page.</h2>
          </div>
          <p>Pixlo gives you the controls to turn a simple profile into a proper personal homepage.</p>
        </div>

        <div className="home-feature-grid">
          <article className="home-feature-card feature-large">
            <div className="home-feature-icon"><Icon name="palette" size={21} /></div>
            <div>
              <span className="home-feature-number">01</span>
              <h3>Make it completely yours.</h3>
              <p>Change colours, backgrounds, typography, spacing, glow, motion and more without touching code.</p>
            </div>
            <div className="home-card-preview home-style-preview">
              <div className="style-preview-bar"><span /><span /><span /></div>
              <div className="style-preview-lines"><i /><i /><i /><i /></div>
              <div className="style-preview-gradient" />
            </div>
          </article>

          <article className="home-feature-card">
            <div className="home-feature-icon"><Icon name="link" size={21} /></div>
            <span className="home-feature-number">02</span>
            <h3>Everything in one place.</h3>
            <p>Socials, custom links and your important pages, all under one clean username.</p>
            <div className="home-link-stack" aria-label="Social links">
              <span><Icon name="discord" size={19} /></span>
              <span><Icon name="youtube" size={19} /></span>
              <span><Icon name="github" size={19} /></span>
              <span><Icon name="roblox" size={19} /></span>
            </div>
          </article>

          <article className="home-feature-card">
            <div className="home-feature-icon"><Icon name="music" size={21} /></div>
            <span className="home-feature-number">03</span>
            <h3>Set the atmosphere.</h3>
            <p>Add your music, cover art and subtle effects to make the page feel alive.</p>
            <div className="home-wave"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
          </article>

          <article className="home-feature-card feature-wide">
            <div className="home-feature-icon"><Icon name="bolt" size={21} /></div>
            <div>
              <span className="home-feature-number">04</span>
              <h3>Looks good everywhere.</h3>
              <p>Designed for desktop and mobile so your profile stays clean when someone opens it anywhere.</p>
            </div>
            <div className="home-device-preview">
              <div className="home-device phone"><div className="device-notch" /><ProfileMockup variant="alt" /></div>
              <div className="home-device desktop"><div className="device-top"><span /><span /><span /></div><div className="device-content"><b>pixlo/you</b><span>your profile, your way.</span><i /></div></div>
            </div>
          </article>
        </div>
      </section>

      <section className="home-showcase" id="showcase">
        <div className="home-showcase-copy">
          <span className="home-section-kicker">YOUR PROFILE, NOT A TEMPLATE</span>
          <h2>Give people a reason<br /><em>to stay.</em></h2>
          <p>From the first glance to the last click, every part of your Pixlo can be tuned to your style. Keep it minimal, go loud, or land somewhere in between.</p>
          <Link href="/dashboard" className="home-text-link">Open the dashboard <Icon name="arrow" size={16} /></Link>
        </div>
        <div className="home-showcase-stage">
          <div className="showcase-ring ring-one" />
          <div className="showcase-ring ring-two" />
          <ProfileMockup variant="alt" />
          <div className="showcase-label"><span>Pixlo</span><b>your space on the web.</b></div>
        </div>
      </section>

      <section className="home-cta" id="pricing">
        <div className="home-cta-glow" />
        <div className="home-cta-inner">
          <span className="home-section-kicker">READY WHEN YOU ARE</span>
          <h2>Your corner of the internet<br /><em>starts here.</em></h2>
          <p>Create your Pixlo, customise it until it feels right, then share one simple link everywhere.</p>
          <Link href="/dashboard" className="home-primary-btn">Create your Pixlo <Icon name="arrow" size={17} /></Link>
        </div>
      </section>

      <footer className="home-footer">
        <Link href="/" className="home-brand" aria-label="Pixlo home"><img className="home-brand-logo" src="/pixlo-logo.png" alt="Pixlo" /></Link>
        <span>Build something that feels like you.</span>
        <div><a href="#features">Features</a><a href="#showcase">Showcase</a><Link href="/dashboard">Dashboard</Link></div>
      </footer>
    </main>
  );
}
