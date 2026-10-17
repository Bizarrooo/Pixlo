"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type LeaderboardPerson = {
  username: string;
  displayName: string;
  views: number;
  rank: number;
  avatar?: string | null;
};

function Avatar({ person, large = false }: { person: LeaderboardPerson; large?: boolean }) {
  const label = (person.displayName || person.username || "?").trim();
  return (
    <span className={"lb-avatar" + (large ? " lb-avatar-large" : "")}>
      {person.avatar ? <img src={person.avatar} alt="" loading="lazy" /> : <span aria-hidden="true">{label.slice(0, 1).toUpperCase()}</span>}
    </span>
  );
}

function EyeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="12" cy="12" r="2.7" stroke="currentColor" strokeWidth="1.8"/></svg>;
}

export default function LeaderboardPage() {
  const [people, setPeople] = useState<LeaderboardPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let refreshingInBackground = false;

    const load = async (showInitialLoader: boolean) => {
      if (refreshingInBackground) return;
      refreshingInBackground = true;
      if (showInitialLoader && !people.length) setLoading(true);
      else setRefreshing(true);
      setError("");
      try {
        const response = await fetch("/api/profile-stats?username=pixlo", { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "The leaderboard could not be loaded.");
        if (!cancelled) {
          const ranked = Array.isArray(data.leaderboard) ? data.leaderboard.slice(0, 100) : [];
          setPeople(ranked);
          setLastUpdated(new Date());
          setError("");
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "The leaderboard could not be loaded.");
      } finally {
        refreshingInBackground = false;
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    void load(true);
    const timer = window.setInterval(() => { void load(false); }, 180000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [refreshToken]);

  const featured = [2, 1, 3]
    .map(rank => people.find(person => person.rank === rank))
    .filter((person): person is LeaderboardPerson => Boolean(person));
  const remaining = people.filter(person => person.rank > 3);

  return (
    <main className="lb-page">
      <div className="lb-atmosphere" aria-hidden="true" />
      <header className="lb-header">
        <Link href="/" className="lb-brand" aria-label="Pixlo home"><img src="/pixlo-logo.png" alt="Pixlo" /></Link>
        <nav className="lb-nav" aria-label="Site navigation">
          <Link href="/">Home</Link>
          <a href="https://discord.gg/rdAyWGGDCe" target="_blank" rel="noreferrer">Discord</a>
          <Link href="/pricing">Pricing</Link>
        </nav>
      </header>

      <section className="lb-main">
        <div className="lb-heading">
          <span className="lb-kicker"><i /> LEADERBOARD</span>
          <h1>The most <span>viewed profiles</span></h1>
          <p>Top 100 Pixlo profiles by all-time views. Refreshes every few minutes.</p>
          <div className="lb-toolbar">
            <span>{people.length ? "Showing " + people.length + " profiles" : "Pixlo community rankings"}</span>
            <button type="button" onClick={() => setRefreshToken(value => value + 1)} disabled={refreshing}>
              <span aria-hidden="true" className={refreshing ? "lb-refresh-symbol lb-is-spinning" : "lb-refresh-symbol"}>↻</span>
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          {lastUpdated && <p className="lb-updated">Updated {lastUpdated.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} · next automatic refresh in a few minutes</p>}
        </div>

        {loading && people.length === 0 && <div className="lb-state"><span className="lb-spinner" /><strong>Loading the leaderboard…</strong></div>}
        {!loading && error && <div className="lb-state lb-state-error"><strong>Couldn’t load the leaderboard</strong><p>{error}</p><button type="button" onClick={() => setRefreshToken(value => value + 1)}>Try again</button></div>}
        {!loading && !error && people.length === 0 && <div className="lb-state"><strong>No profiles to rank yet</strong><p>Once Pixlo profiles start receiving views, they’ll appear here.</p></div>}

        {people.length > 0 && (
          <>
            <div className="lb-podium" aria-label="Top three Pixlo profiles">
              {featured.map(person => (
                <Link key={person.username} href={"/user/" + encodeURIComponent(person.username)} className={"lb-podium-card lb-rank-" + person.rank}>
                  <span className="lb-medal">{person.rank}</span>
                  <Avatar person={person} large />
                  <strong className="lb-display-name">{person.displayName || person.username}</strong>
                  <span className="lb-username">@{person.username}</span>
                  <span className="lb-badges" aria-hidden="true">{person.rank === 1 ? <><i className="lb-badge-crown">✦</i><i>TOP PROFILE</i></> : person.rank === 2 ? <i>RUNNER-UP</i> : <i>TOP THREE</i>}</span>
                  <span className="lb-views"><EyeIcon /> {Number(person.views || 0).toLocaleString("en-GB")} views</span>
                </Link>
              ))}
            </div>

            {remaining.length > 0 && <section className="lb-list-panel" aria-label="Leaderboard ranks 4 to 100">
              <div className="lb-list-header"><span>RANK</span><span>PROFILE</span><span>ALL-TIME VIEWS</span></div>
              <div className="lb-list">
                {remaining.map(person => (
                  <Link key={person.username} href={"/user/" + encodeURIComponent(person.username)} className="lb-row">
                    <span className="lb-row-rank">{person.rank}</span>
                    <Avatar person={person} />
                    <span className="lb-row-profile"><strong>{person.displayName || person.username}</strong><small>@{person.username}</small></span>
                    <strong className="lb-row-views"><EyeIcon /> {Number(person.views || 0).toLocaleString("en-GB")} <small>views</small></strong>
                  </Link>
                ))}
              </div>
            </section>}
          </>
        )}
      </section>

      <footer className="lb-footer">
        <Link href="/" className="lb-footer-brand"><img src="/pixlo-logo.png" alt="Pixlo" /></Link>
        <span>YOUR SPACE ON THE WEB.</span>
        <nav aria-label="Footer navigation">
          <Link href="/">Home</Link>
          <a href="https://discord.gg/rdAyWGGDCe" target="_blank" rel="noreferrer">Discord</a>
          <Link href="/pricing">Pricing</Link>
        </nav>
      </footer>
    </main>
  );
}
