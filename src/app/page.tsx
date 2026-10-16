"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import HomeAccountNav from "./HomeAccountNav";

type SiteStats = {
  totalProfileViews: number;
  members: number;
  premiumMembers: number | null;
};

function ArrowIcon({ diagonal = false }: { diagonal?: boolean }) {
  return diagonal ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M7 17 17 7M8 7h9v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M4.5 12h14M12.5 5.5 19 12l-6.5 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
  );
}

function FeatureIcon({ kind }: { kind: "style" | "links" | "music" | "badge" }) {
  if (kind === "style") return <svg viewBox="0 0 32 32" aria-hidden="true" fill="none"><path d="M16 3.5 19.4 12.6 28.5 16 19.4 19.4 16 28.5 12.6 19.4 3.5 16 12.6 12.6 16 3.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="m25 3 .9 3.1L29 7l-3.1.9L25 11l-.9-3.1L21 7l3.1-.9L25 3Z" fill="currentColor"/></svg>;
  if (kind === "links") return <svg viewBox="0 0 32 32" aria-hidden="true" fill="none"><path d="M13.1 19.3 10 22.4a5.1 5.1 0 0 1-7.2-7.2l5.1-5.1a5.1 5.1 0 0 1 7.2 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="m18.9 12.7 3.1-3.1a5.1 5.1 0 0 1 7.2 7.2l-5.1 5.1a5.1 5.1 0 0 1-7.2 0M11 21l10-10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
  if (kind === "music") return <svg viewBox="0 0 32 32" aria-hidden="true" fill="none"><path d="M19 22V5l10-2v16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="22" r="5" stroke="currentColor" strokeWidth="1.8"/><circle cx="24" cy="19" r="5" stroke="currentColor" strokeWidth="1.8"/></svg>;
  return <svg viewBox="0 0 32 32" aria-hidden="true" fill="none"><path d="M16 3 26 7v7.2c0 6-4 10.2-10 12.8C10 24.4 6 20.2 6 14.2V7l10-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="m11.5 15.5 3.1 3.1 6.2-6.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function ProfileArtwork() {
  return (
    <a href="/user/biz" className="px-live-profile-card" aria-label="Open Bizarro's real Pixlo profile">
      <span className="px-live-profile-orbit px-live-profile-orbit-one" aria-hidden="true" />
      <span className="px-live-profile-orbit px-live-profile-orbit-two" aria-hidden="true" />
      <div className="px-live-profile-frame">
        <div className="px-live-profile-chrome">
          <span className="px-window-dot px-window-dot-red" />
          <span className="px-window-dot px-window-dot-orange" />
          <span className="px-window-dot px-window-dot-gold" />
          <span className="px-live-profile-caption">PIXLO / BIZARRO</span>
          <span className="px-live-indicator"><i /> LIVE PAGE</span>
        </div>
        <iframe
          src="/user/biz?embed=1"
          title="Bizarro's real Pixlo profile"
          loading="eager"
          referrerPolicy="strict-origin-when-cross-origin"
          tabIndex={-1}
          aria-hidden="true"
        />
        <div className="px-live-profile-footer"><span>@BIZARRO</span><span>OPEN PROFILE <ArrowIcon diagonal /></span></div>
      </div>
      <span className="px-live-profile-caption-bottom"><i /> YOUR REAL PAGE. YOUR REAL STYLE. <b>↗</b></span>
    </Link>
  );
}

function CubeFade() {
  const cubes = [
    { left: 5, bottom: 28, size: 25, color: "#ff5b3f" },
    { left: 12, bottom: 114, size: 19, color: "#ff9a3d" },
    { left: 19, bottom: 54, size: 33, color: "#ffc55f" },
    { left: 28, bottom: 143, size: 22, color: "#ff6a35" },
    { left: 37, bottom: 17, size: 26, color: "#ffad46" },
    { left: 46, bottom: 94, size: 30, color: "#f74739" },
    { left: 58, bottom: 38, size: 18, color: "#ffcc6a" },
    { left: 67, bottom: 127, size: 27, color: "#ff7b35" },
    { left: 77, bottom: 21, size: 31, color: "#ff553a" },
    { left: 86, bottom: 88, size: 20, color: "#ffc45a" },
    { left: 94, bottom: 39, size: 24, color: "#ff8a39" },
  ];
  return (
    <div className="px-cube-fade" aria-hidden="true">
      {cubes.map((cube, index) => (
        <span key={index} className="px-cube" style={{ left: `${cube.left}%`, bottom: cube.bottom, width: cube.size, height: cube.size, color: cube.color }}>
          <i className="px-cube-top" /><i className="px-cube-front" /><i className="px-cube-side" />
        </span>
      ))}
    </div>
  );
}

function StatCard({ label, value, kind, note }: { label: string; value: string; kind: "views" | "members" | "premium"; note: string }) {
  const symbol = kind === "views" ? "↗" : kind === "members" ? "✳" : "✦";
  return (
    <article className={`px-stat-card px-stat-${kind}`}>
      <div className="px-stat-top"><span className="px-stat-symbol">{symbol}</span><span className="px-stat-note">{note}</span></div>
      <strong className="px-stat-value">{value}</strong>
      <span className="px-stat-label">{label}</span>
      <span className="px-stat-rule" />
    </article>
  );
}

export default function Home() {
  const [stats, setStats] = useState<SiteStats | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/site-stats", { signal: controller.signal })
      .then(response => response.ok ? response.json() : Promise.reject(new Error("Stats unavailable")))
      .then((data: SiteStats) => {
        if (Number.isFinite(data.totalProfileViews) && Number.isFinite(data.members)) {
          setStats(data);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const number = (value: number | null | undefined) => value == null ? "—" : value.toLocaleString("en-GB");

  return (
    <main className="px-home">
      <section className="px-hero">
        <div className="px-hero-art" aria-hidden="true" />
        <div className="px-hero-shade" aria-hidden="true" />
        <CubeFade />
        <header className="px-header">
          <Link href="/" className="px-logo" aria-label="Pixlo home"><img src="/pixlo-logo.png" alt="Pixlo" /></Link>
          <nav className="px-nav" aria-label="Main navigation">
            <a href="#platform">Platform</a>
            <a href="#community">Community</a>
            <a href="#premium">Premium</a>
          </nav>
          <div className="revamp-account px-account"><HomeAccountNav /></div>
        </header>

        <div className="px-hero-content">
          <div className="px-hero-copy">
            <div className="px-eyebrow"><span /> MORE THAN A LINK PAGE <i> / </i> PIXLO</div>
            <h1>Your internet.<br /><span>Your identity.</span><b> Your Pixlo.</b></h1>
            <p className="px-hero-description">Bring your links, music, socials and style into one place that feels unmistakably yours. Make a little corner of the internet worth visiting.</p>
            <div className="px-hero-actions">
              <Link href="/dashboard" className="px-button px-button-primary">Build your Pixlo <ArrowIcon /></Link>
              <a href="#platform" className="px-button px-button-ghost">Take a look <span>↓</span></a>
            </div>
            <div className="px-hero-footnote"><span className="px-footnote-mark">✳</span><span>YOUR PAGE. YOUR RULES.<br /><b>BUILT TO BE YOURS.</b></span><span className="px-footnote-line" /></div>
          </div>
          <div className="px-hero-visual"><ProfileArtwork /></div>
        </div>
        <div className="px-hero-bottomline"><span>PERSONAL PROFILE PAGES</span><span>LINKS / MUSIC / STYLE</span><span>THE INTERNET, MADE PERSONAL <b>↘</b></span></div>
      </section>

      <section className="px-community" id="community">
        <div className="px-section-kicker"><span>01</span> THE PIXLO COMMUNITY</div>
        <div className="px-community-heading">
          <div><h2>Join the people<br />already using <em>Pixlo.</em></h2></div>
          <p>Real people. Real pages. One place to bring your whole online world together.</p>
        </div>
        <div className="px-stats-grid" aria-live="polite">
          <StatCard kind="views" label="Total profile views" value={number(stats?.totalProfileViews)} note="ALL-TIME" />
          <StatCard kind="members" label="Members" value={number(stats?.members)} note="THE COMMUNITY" />
          <StatCard kind="premium" label="Premium members" value={number(stats?.premiumMembers)} note="PIXLO PREMIUM" />
        </div>
        <div className="px-community-foot"><span>THE NUMBERS SPEAK FOR THEMSELVES.</span><span>UPDATED FROM PIXLO DATA <i>✳</i></span></div>
      </section>

      <section className="px-platform" id="platform">
        <div className="px-section-kicker"><span>02</span> YOUR SPACE, YOUR WAY</div>
        <div className="px-platform-heading"><h2>Everything you are.<br /><em>In one place.</em></h2><p>Start with a link. Make it a world. Every part of your page is a chance to show a little more of yourself.</p></div>
        <div className="px-feature-grid">
          <article className="px-feature px-feature-style">
            <div className="px-feature-top"><span>01 / PERSONALISE</span><span className="px-feature-icon"><FeatureIcon kind="style" /></span></div>
            <div className="px-feature-art px-art-style"><div className="px-color-orbit" /><div className="px-palette-card"><span /><span /><span /><span /></div><div className="px-type-sample">Aa</div></div>
            <h3>Make it feel like you.</h3><p>Colours, backgrounds, fonts, layouts and effects. Not someone else’s template—your own signature.</p>
            <a href="#showcase" className="px-feature-link">See what you can make <ArrowIcon diagonal /></a>
          </article>
          <article className="px-feature px-feature-links">
            <div className="px-feature-top"><span>02 / CONNECT</span><span className="px-feature-icon"><FeatureIcon kind="links" /></span></div>
            <div className="px-feature-art px-art-links"><div className="px-link-orb px-link-orb-a">◎</div><div className="px-link-orb px-link-orb-b">▶</div><div className="px-link-orb px-link-orb-c">⌘</div><div className="px-link-line px-link-line-a" /><div className="px-link-line px-link-line-b" /><div className="px-link-line px-link-line-c" /></div>
            <h3>Your whole world, linked.</h3><p>Socials, custom links and the places people can find you, together in one clean page.</p>
            <a href="#showcase" className="px-feature-link">Bring it all together <ArrowIcon diagonal /></a>
          </article>
          <article className="px-feature px-feature-music">
            <div className="px-feature-top"><span>03 / SET THE MOOD</span><span className="px-feature-icon"><FeatureIcon kind="music" /></span></div>
            <div className="px-feature-art px-art-music"><div className="px-record"><span /></div><div className="px-sound-wave"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><small>YOUR SOUNDTRACK. YOUR SCENE.</small></div>
            <h3>Give your page a pulse.</h3><p>Add music and ambient details that make your profile feel alive before anyone clicks a link.</p>
            <a href="#showcase" className="px-feature-link">Set your atmosphere <ArrowIcon diagonal /></a>
          </article>
          <article className="px-feature px-feature-badges">
            <div className="px-feature-top"><span>04 / RECOGNITION</span><span className="px-feature-icon"><FeatureIcon kind="badge" /></span></div>
            <div className="px-feature-art px-art-badges"><div className="px-badge-large">✦</div><div className="px-badge-small">✓</div><div className="px-badge-stamp">PIXLO<br />VERIFIED</div></div>
            <h3>A page with personality.</h3><p>Show off your badges, connect Discord and bring your Pixlo identity along wherever you share it.</p>
            <Link href="/premium" className="px-feature-link">Explore the extras <ArrowIcon diagonal /></Link>
          </article>
        </div>
      </section>

      <section className="px-showcase" id="showcase">
        <div className="px-showcase-art"><div className="px-showcase-ring px-showcase-ring-one" /><div className="px-showcase-ring px-showcase-ring-two" /><span className="px-showcase-stamp">PX<br /><i>✳</i></span><div className="px-showcase-quote"><small>THE PIXLO IDEA / 001</small><strong>It should feel<br />like <em>your world.</em></strong><span>PERSONAL BY DESIGN.</span></div></div>
        <div className="px-showcase-copy"><div className="px-section-kicker"><span>03</span> NOT JUST ANOTHER LINK</div><h2>A little corner<br />of the internet.<br /><em>All yours.</em></h2><p>Keep it simple or turn every detail up. Build a page that fits your mood, connects your people and gives your online identity a place to live.</p><div className="px-showcase-points"><span><b>✳</b> No-code customisation</span><span><b>✳</b> Your links, music and socials</span><span><b>✳</b> One profile to share everywhere</span></div><Link href="/dashboard" className="px-button px-button-dark">Make yours <ArrowIcon /></Link></div>
      </section>

      <section className="px-premium" id="premium">
        <div className="px-premium-background" aria-hidden="true" />
        <div className="px-premium-copy"><div className="px-premium-kicker"><span>✳</span> PIXLO / PREMIUM</div><h2>More room<br />to make it <em>yours.</em></h2><p>Take your profile further with the extra customisation and tools that make Pixlo uniquely yours. Pay once during beta and keep your access.</p><Link href="/premium" className="px-button px-button-light">Get lifetime Premium <ArrowIcon /></Link><small>ONE PAYMENT · NO SUBSCRIPTION</small></div>
        <div className="px-premium-price"><span className="px-price-label">BETA ACCESS</span><div>£3<span>.99</span></div><span className="px-price-note">LIFETIME ACCESS</span><span className="px-price-spark">✳</span></div>
      </section>

      <section className="px-final-cta"><div><span className="px-section-kicker"><span>04</span> YOUR NEXT CHAPTER</span><h2>Your name. Your links.<br /><em>Your Pixlo.</em></h2></div><Link href="/dashboard" className="px-button px-button-primary">Create your profile <ArrowIcon /></Link></section>

      <footer className="px-footer"><div className="px-footer-brand"><Link href="/" aria-label="Pixlo home"><img src="/pixlo-logo.png" alt="Pixlo" /></Link><span>YOUR SPACE ON THE WEB.</span></div><div className="px-footer-links"><a href="#platform">Platform</a><a href="#community">Community</a><Link href="/premium">Premium</Link><Link href="/dashboard">Dashboard <ArrowIcon diagonal /></Link></div><small>© PIXLO — MADE TO BE YOURS.</small></footer>
    </main>
  );
}
