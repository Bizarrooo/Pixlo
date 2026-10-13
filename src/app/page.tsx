"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

function VerifiedIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="home-verified-icon"><path fill="currentColor" d="M12 1.5 14.7 3l3.1-.1 1.4 2.8 2.6 1.7-.5 3.1 1 3-2.2 2.2-.8 3-3 .8-2.2 2.2-3-1-3.1.5-1.7-2.6-2.8-1.4.1-3.1-1.5-2.7 1.5-2.7-.1-3.1 2.8-1.4 1.7-2.6 3.1.5Z" /><path d="m7.6 12.2 2.8 2.8 6.1-6.1" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ProfileMockup({ variant = "main" }: { variant?: "main" | "alt" }) {
  const [demoPlaying, setDemoPlaying] = useState(false);
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
          <span className="home-verified"><VerifiedIcon /></span>
        </div>
        <span className="home-profile-handle">@{variant === "alt" ? "pixlo" : "bizarro"}</span>
        <p>{variant === "alt" ? "Your profile. Your identity. Your space." : "building cool things on the internet ✦"}</p>
        <MiniSocials />
        <div className="home-profile-link">Explore my world <Icon name="arrow" size={15} /></div>
        <div className="home-profile-link muted-link">Latest project <Icon name="arrow" size={15} /></div>
        <div className="home-profile-music">
          <div className="home-music-art"><Icon name="music" size={15} /></div>
          <div><b>now playing</b><span>your favourite track</span></div>
          <button type="button" className="home-music-play" aria-label={demoPlaying ? "Pause music preview control" : "Play music preview control"} aria-pressed={demoPlaying} onClick={() => setDemoPlaying(value => !value)}>{demoPlaying ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM15 5h4v14h-4z" fill="currentColor" /></svg> : <Icon name="play" size={14} />}</button>
        </div>
      </div>
    </div>
  );
}


function LiveProfileCard() {
  return (
    <div className="home-live-profile-card" aria-label="Live Pixlo profile preview">
      <iframe
        className="home-live-profile-iframe"
        src="/user/biz?embed=1"
        title="Live Pixlo profile for @biz"
        loading="eager"
        referrerPolicy="strict-origin-when-cross-origin"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}

export default function Home() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".pixlo-home");
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const groups = [
      [".home-hero-copy", "home-reveal-left"],
      [".home-hero-visual", "home-reveal-right"],
      [".home-stat-strip > div", "home-reveal-up"],
      [".home-section-heading", "home-reveal-up"],
      [".home-feature-card", "home-reveal-up"],
      [".home-showcase-copy", "home-reveal-left"],
      [".home-showcase-stage", "home-reveal-right"],
      [".home-cta-inner", "home-reveal-up"],
      [".home-footer", "home-reveal-up"]
    ] as const;
    const observed: HTMLElement[] = [];
    groups.forEach(([selector, motionClass]) => {
      root.querySelectorAll<HTMLElement>(selector).forEach((element, index) => {
        element.classList.add("home-reveal-target", motionClass);
        element.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 75}ms`);
        observed.push(element);
      });
    });
    root.classList.add("motion-ready");
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -5% 0px" });
    observed.forEach(element => observer.observe(element));

    // Soft, eased parallax: elements drift with the pointer and settle back instead of snapping.
    const motionAreas = Array.from(root.querySelectorAll<HTMLElement>(".revamp-hero, .revamp-showcase-art, .home-live-profile-card"));
    const cleanups: (() => void)[] = [];
    motionAreas.forEach(area => {
      const onMove = (event: PointerEvent) => {
        const rect = area.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        area.style.setProperty("--drift-x", x.toFixed(3));
        area.style.setProperty("--drift-y", y.toFixed(3));
        area.classList.add("has-pointer-drift");
      };
      const onLeave = () => {
        area.style.setProperty("--drift-x", "0");
        area.style.setProperty("--drift-y", "0");
        area.classList.remove("has-pointer-drift");
      };
      area.addEventListener("pointermove", onMove, { passive: true });
      area.addEventListener("pointerleave", onLeave, { passive: true });
      cleanups.push(() => {
        area.removeEventListener("pointermove", onMove);
        area.removeEventListener("pointerleave", onLeave);
      });
    });
    return () => {
      observer.disconnect();
      cleanups.forEach(cleanup => cleanup());
    };
  }, []);
  return (
    <main className="pixlo-home pixlo-revamp-home">
      <div className="revamp-grain" aria-hidden="true" />
      <div className="revamp-grid" aria-hidden="true" />
      <header className="revamp-header">
        <Link href="/" className="revamp-logo" aria-label="Pixlo home"><img src="/pixlo-logo.png" alt="Pixlo" /></Link>
        <nav className="revamp-nav" aria-label="Main navigation">
          <a href="#features">Platform</a><a href="#showcase">Showcase</a><a href="#showcase">About</a><a href="#pricing">Premium</a>
        </nav>
        <div className="revamp-account"><HomeAccountNav /></div>
      </header>

      <section className="revamp-hero">
        <div className="revamp-hero-main">
          
          <h1>Your corner<br />of the internet<span className="revamp-title-period">.</span></h1>
          <div className="revamp-hero-bottom">
            <p>A profile that looks like <em>you</em>. Your links, music, socials and style — brought together in one space that feels unmistakably yours.</p>
            <div className="revamp-hero-actions">
              <Link href="/dashboard" className="revamp-button revamp-button-hot">Build your Pixlo <Icon name="arrow" size={17} /></Link>
              <a href="#showcase" className="revamp-quiet-link">Explore the platform <span>↘</span></a>
            </div>
          </div>
          
        </div>
        <div className="revamp-hero-side">
          <LiveProfileCard />
        </div>
        <div className="revamp-hero-index" aria-hidden="true">P</div>
      </section>

      <section className="revamp-platform" id="features">
        <div className="revamp-section-intro"><div><h2>All of you.<br /><em>In one place.</em></h2></div><p>Start simple. Get specific. Shape every detail until your page feels like an extension of you — not a preset someone else made.</p></div>
        <div className="revamp-feature-layout">
          <article className="revamp-feature revamp-feature-custom">
            <span className="revamp-feature-no">CUSTOMISE</span><div className="revamp-feature-art revamp-art-controls"><div className="revamp-control-window"><div className="revamp-control-head"><i /><i /><i /><span>APPEARANCE.SYS</span></div><div className="revamp-control-body"><div className="revamp-control-sidebar"><i /><i /><i /><i /></div><div className="revamp-control-content"><b>Make it yours.</b><span /><span /><div><i /><i /><i /></div></div></div></div></div>
            <h3>Every detail, under your control.</h3><p>Colours, fonts, backgrounds, layouts, motion and effects — no code needed.</p>
          </article>
          <article className="revamp-feature revamp-feature-links">
            <span className="revamp-feature-no">CONNECT</span><div className="revamp-social-art"><div>in</div><div>▶</div><div>◈</div><div>◎</div><div>⌘</div><span>ALL YOUR PLACES<br />ONE PROFILE ↗</span></div><h3>Your internet, connected.</h3><p>Socials, custom links and the places people can find you.</p>
          </article>
          <article className="revamp-feature revamp-feature-music">
            <span className="revamp-feature-no">ATMOSPHERE</span><div className="revamp-music-art"><div className="revamp-disc"><i /></div><div className="revamp-wave"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><span>PRESS PLAY. SET THE MOOD.</span></div><h3>Give your page a pulse.</h3><p>Music, artwork and subtle movement make your space feel alive.</p>
          </article>
          <article className="revamp-feature revamp-feature-badges">
            <span className="revamp-feature-no">RECOGNITION</span><div className="revamp-badge-art"><div>✦</div><div>✓</div><div>↗</div><span>BUILT AROUND<br />YOUR IDENTITY</span></div><h3>Show what makes you, you.</h3><p>Discord integration, profile badges and Premium tools when you want more.</p>
          </article>
        </div>
      </section>

      <section className="revamp-showcase" id="showcase">
        <div className="revamp-showcase-art"><div className="revamp-showcase-grid" /><div className="revamp-showcase-stamp">PX</div><div className="revamp-showcase-copy-card"><span>YOUR PROFILE, YOUR RULES</span><b>Make a first<br />impression.</b></div><div className="revamp-showcase-line" /></div>
        <div className="revamp-showcase-text"><h2>Make it feel<br />like <em>your world.</em></h2><p>Minimal or expressive. Quiet or unapologetically loud. Build the profile you want people to remember, then share it with one clean link.</p><Link href="/dashboard" className="revamp-text-link">Open your dashboard <Icon name="arrow" size={16} /></Link></div>
      </section>

      <section className="revamp-support" id="donate">
        <div className="revamp-support-main"><h2>Help us build<br /><em>what comes next.</em></h2><p>Pixlo is growing. Optional donations help cover running costs, improve the platform and bring us closer to our own custom domain.</p><a href="https://buy.stripe.com/7sYaEY7DJbSigko0Nj9EI00" target="_blank" rel="noopener noreferrer" className="revamp-button revamp-button-outline">Support Pixlo with Stripe <Icon name="arrow" size={16} /></a></div>
        <div className="revamp-premium-panel" id="pricing"><div className="revamp-premium-top"><span>Premium</span><span className="revamp-premium-mark">✳</span></div><span className="revamp-premium-kicker">BETA ACCESS</span><h3>More room<br />to make it yours.</h3><p>Get lifetime Pixlo Premium for £3.99 during beta. Pay once, no subscription, and keep your access.</p><Link href="/premium" className="revamp-button revamp-button-premium">Get lifetime Premium <Icon name="arrow" size={16} /></Link></div>
      </section>

      <footer className="revamp-footer"><Link href="/" className="revamp-logo"><img src="/pixlo-logo.png" alt="Pixlo" /></Link><span>YOUR SPACE ON THE WEB.</span><div><a href="#features">Platform</a><a href="#showcase">Showcase</a><a href="#donate">Support</a><Link href="/dashboard">Dashboard ↗</Link></div><small>© PIXLO — MADE TO BE YOURS.</small></footer>
    </main>
  );
}
