"use client";

import "./badges.css";
import { useCallback, useEffect, useState } from "react";

type Badge = { id: string; badge_key: string; name: string; description: string; icon_url: string | null; is_active: boolean };
type Mapping = { discord_role_id: string; badge_id: string; created_at: string };
type DonorTier = { tier_key: string; badge_id: string; name: string; description: string; icon_url: string | null; threshold_pence: number; discord_role_id: string };
type ManagedTier = { tier_key: string; badge_id: string; name: string; description: string; icon_url: string | null; threshold_views?: number; threshold_invites?: number; discord_role_id: string };
type DonorTierDraft = { amount: string; roleId: string };
type ManagedTierDraft = { threshold: string; roleId: string; iconUrl: string };

export default function BadgeManagementPage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [donorTiers, setDonorTiers] = useState<DonorTier[]>([]);
  const [donorTierSetupRequired, setDonorTierSetupRequired] = useState(false);
  const [donorTierDrafts, setDonorTierDrafts] = useState<Record<string, DonorTierDraft>>({});
  const [viewTiers, setViewTiers] = useState<ManagedTier[]>([]);
  const [viewTierSetupRequired, setViewTierSetupRequired] = useState(false);
  const [viewTierDrafts, setViewTierDrafts] = useState<Record<string, ManagedTierDraft>>({});
  const [recruiterTiers, setRecruiterTiers] = useState<ManagedTier[]>([]);
  const [recruiterTierSetupRequired, setRecruiterTierSetupRequired] = useState(false);
  const [recruiterTierDrafts, setRecruiterTierDrafts] = useState<Record<string, ManagedTierDraft>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [roleId, setRoleId] = useState("");
  const [mapBadgeId, setMapBadgeId] = useState("");
  const [awardUsername, setAwardUsername] = useState("");
  const [awardBadgeId, setAwardBadgeId] = useState("");

  const refresh = useCallback(async (): Promise<string | null> => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/badges", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load badge settings.");
      setBadges(Array.isArray(data.badges) ? data.badges : []);
      setMappings(Array.isArray(data.mappings) ? data.mappings : []);
      const loadedDonorTiers: DonorTier[] = Array.isArray(data.donorTiers) ? data.donorTiers : [];
      setDonorTiers(loadedDonorTiers);
      setDonorTierSetupRequired(Boolean(data.donorTierSetupRequired));
      setDonorTierDrafts(Object.fromEntries(loadedDonorTiers.map((tier) => [tier.tier_key, {
        amount: (Number(tier.threshold_pence || 0) / 100).toFixed(2),
        roleId: tier.discord_role_id || "",
      }])));
      const loadedViewTiers: ManagedTier[] = Array.isArray(data.viewTiers) ? data.viewTiers : [];
      setViewTiers(loadedViewTiers);
      setViewTierSetupRequired(Boolean(data.viewTierSetupRequired));
      setViewTierDrafts(Object.fromEntries(loadedViewTiers.map((tier) => [tier.tier_key, {
        threshold: String(Number(tier.threshold_views || 0)), roleId: tier.discord_role_id || "", iconUrl: tier.icon_url || "",
      }])));
      const loadedRecruiterTiers: ManagedTier[] = Array.isArray(data.recruiterTiers) ? data.recruiterTiers : [];
      setRecruiterTiers(loadedRecruiterTiers);
      setRecruiterTierSetupRequired(Boolean(data.recruiterTierSetupRequired));
      setRecruiterTierDrafts(Object.fromEntries(loadedRecruiterTiers.map((tier) => [tier.tier_key, {
        threshold: String(Number(tier.threshold_invites || 0)), roleId: tier.discord_role_id || "", iconUrl: tier.icon_url || "",
      }])));
      const standardBadges = (Array.isArray(data.badges) ? data.badges : []).filter((badge: Badge) => !badge.badge_key.startsWith("views_") && !badge.badge_key.startsWith("recruiter_") && !badge.badge_key.startsWith("donor_"));
      setMapBadgeId((current: string) => standardBadges.some((badge: Badge) => badge.id === current) ? current : standardBadges?.[0]?.id || "");
      setAwardBadgeId((current: string) => standardBadges.some((badge: Badge) => badge.id === current) ? current : standardBadges?.[0]?.id || "");
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Could not load badge settings.";
      setMessage(errorMessage);
      return errorMessage;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function act(payload: Record<string, unknown>, success: string): Promise<boolean> {
    setBusy(true);
    setMessage("Saving…");
    try {
      const response = await fetch("/api/admin/badges", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), cache: "no-store" });
      const raw = await response.text();
      let data: { error?: string } = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error("Pixlo returned an unexpected response (HTTP " + response.status + "). Try refreshing the page."); }
      if (!response.ok) throw new Error(data.error || "The action failed (HTTP " + response.status + ").");
      const refreshError = await refresh();
      if (refreshError) {
        setMessage("The action was saved, but the badge list could not reload: " + refreshError);
      } else {
        setMessage(success);
      }
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The action failed. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function createBadge(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let finalIconUrl = iconUrl.trim();
    if (iconFile) {
      setBusy(true);
      setMessage("");
      try {
        const form = new FormData();
        form.append("file", iconFile);
        const upload = await fetch("/api/admin/badges/icon", { method: "POST", body: form });
        const uploadData = await upload.json();
        if (!upload.ok) throw new Error(uploadData.error || "Could not upload badge icon.");
        finalIconUrl = uploadData.url;
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not upload badge icon.");
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    const created = await act({ action: "create_badge", badge_key: key, name, description, icon_url: finalIconUrl || null }, "Badge created successfully.");
    if (created) { setName(""); setKey(""); setDescription(""); setIconUrl(""); setIconFile(null); }
  }

  return (
    <main className="badge-admin-page">
      <div className="badge-admin-shell">
        <a className="badge-admin-back" href="/dashboard">← Back to dashboard</a>
        <header className="badge-admin-heading">
          <div>
            <span className="badge-admin-eyebrow">PIXLO ADMIN CONTROL CENTRE</span>
            <h1>Manage badges <span>&amp; tiers</span></h1>
            <p>Configure tier milestones, Discord role links, badge icons and manual awards from one organised workspace.</p>
          </div>
          <button className="badge-admin-refresh" type="button" onClick={() => void refresh()} disabled={loading || busy}>{loading ? "Loading…" : "Refresh settings ↻"}</button>
        </header>
        {message && <div className="badge-admin-message" role="status">{message}</div>}
        {loading ? <div className="badge-admin-loading"><span className="badge-admin-spinner" />Loading badge settings…</div> : <>
          <div className="badge-admin-metrics">
            <article><span className="badge-admin-metric-icon">✦</span><div><small>Badge definitions</small><strong>{badges.length}</strong></div></article>
            <article><span className="badge-admin-metric-icon">⇄</span><div><small>Standard role links</small><strong>{mappings.length}</strong></div></article>
            <article><span className="badge-admin-metric-icon">＄</span><div><small>Donor tiers</small><strong>{donorTiers.length || "—"}</strong></div></article>
            <article><span className="badge-admin-metric-icon">◉</span><div><small>Views tiers</small><strong>{viewTiers.length || "—"}</strong></div></article>
            <article><span className="badge-admin-metric-icon">♧</span><div><small>Recruiter tiers</small><strong>{recruiterTiers.length || "—"}</strong></div></article>
          </div>

          <div className="badge-admin-workspace">
            <details className="badge-admin-accordion" open>
              <summary>
                <span className="badge-admin-accordion-icon">◉</span>
                <span className="badge-admin-accordion-title"><strong>Views badge tiers</strong><small>Milestones, individual icons and optional Discord roles</small></span>
                <span className="badge-admin-accordion-count">{viewTiers.length || 6} tiers</span><span className="badge-admin-chevron">⌄</span>
              </summary>
              <div className="badge-admin-accordion-body">
                <div className="badge-admin-section-intro"><div><h2>Profile view progression</h2><p>Each tier awards the highest view badge reached. Use a different icon for every milestone; icon paths can be relative to Pixlo or HTTPS image URLs.</p></div><span className="badge-admin-inline-note">OWNER ONLY</span></div>
                {viewTierSetupRequired ? <div className="badge-admin-setup-note"><strong>Views tier setup is required</strong><p>Run <code>supabase/migrations/202610180004_pixlo_view_and_recruiter_tiers.sql</code> in Supabase → SQL Editor after the main badge migration, then refresh.</p></div>
                : viewTiers.length === 0 ? <p className="badge-admin-muted">No view tiers found. Run the Views and Recruiter tier migration, then refresh.</p>
                : <div className="badge-admin-tier-grid">
                  {viewTiers.map((tier, index) => {
                    const draft = viewTierDrafts[tier.tier_key] || { threshold: String(tier.threshold_views || 0), roleId: tier.discord_role_id || "", iconUrl: tier.icon_url || "" };
                    return <article className="badge-admin-tier-card" key={tier.tier_key}>
                      <div className="badge-admin-tier-card-head"><div className="badge-admin-tier-art">{tier.icon_url ? <img src={tier.icon_url} alt="" /> : <span>{index + 1}</span>}</div><div className="badge-admin-tier-title"><strong>{tier.name}</strong><small>{tier.tier_key}</small><span>Current target: {(tier.threshold_views || 0).toLocaleString("en-GB")} views</span></div><span className="badge-admin-tier-order">{String(index + 1).padStart(2, "0")}</span></div>
                      <div className="badge-admin-tier-fields">
                        <label>View target<input type="number" min="1" max="1000000000000" step="1" value={draft.threshold} onChange={event => setViewTierDrafts(current => ({ ...current, [tier.tier_key]: { ...draft, threshold: event.target.value } }))} /></label>
                        <label>Discord role ID<input inputMode="numeric" value={draft.roleId} onChange={event => setViewTierDrafts(current => ({ ...current, [tier.tier_key]: { ...draft, roleId: event.target.value.replace(/[^0-9]/g, "").slice(0, 22) } }))} placeholder="Optional — paste role ID" /></label>
                        <label className="badge-admin-tier-icon-field">Icon image URL<input value={draft.iconUrl} onChange={event => setViewTierDrafts(current => ({ ...current, [tier.tier_key]: { ...draft, iconUrl: event.target.value } }))} placeholder="/badges/views-seen.svg" /></label>
                      </div>
                      <button className="badge-admin-tier-save" type="button" disabled={busy || !Number.isSafeInteger(Number(draft.threshold)) || Number(draft.threshold) < 1 || Number(draft.threshold) > 1000000000000 || (draft.roleId !== "" && !/^\d{15,22}$/.test(draft.roleId))} onClick={() => void act({ action: "save_view_tier", tier_key: tier.tier_key, threshold_views: Number(draft.threshold), discord_role_id: draft.roleId, icon_url: draft.iconUrl }, tier.name + " saved.")}>Save view tier <span>→</span></button>
                    </article>;
                  })}
                </div>}
                <p className="badge-admin-note">The worker checks profile view totals and keeps a single highest view-tier badge. Role syncing is optional; leave a role blank for web badges only.</p>
              </div>
            </details>

            <details className="badge-admin-accordion">
              <summary>
                <span className="badge-admin-accordion-icon">♧</span>
                <span className="badge-admin-accordion-title"><strong>Recruiter badge tiers</strong><small>Invite milestones and Discord role syncing</small></span>
                <span className="badge-admin-accordion-count">{recruiterTiers.length || 5} tiers</span><span className="badge-admin-chevron">⌄</span>
              </summary>
              <div className="badge-admin-accordion-body">
                <div className="badge-admin-section-intro"><div><h2>Recruiter progression</h2><p>Recruiter rewards use attributed Discord invite uses. One invitee can only count once, and the highest tier replaces lower tiers.</p></div><span className="badge-admin-inline-note">OWNER ONLY</span></div>
                {recruiterTierSetupRequired ? <div className="badge-admin-setup-note"><strong>Recruiter tier setup is required</strong><p>Run <code>supabase/migrations/202610180004_pixlo_view_and_recruiter_tiers.sql</code> in Supabase → SQL Editor, then refresh.</p></div>
                : recruiterTiers.length === 0 ? <p className="badge-admin-muted">No recruiter tiers found. Run the Views and Recruiter tier migration, then refresh.</p>
                : <div className="badge-admin-tier-grid badge-admin-recruiter-grid">
                  {recruiterTiers.map((tier, index) => {
                    const draft = recruiterTierDrafts[tier.tier_key] || { threshold: String(tier.threshold_invites || 0), roleId: tier.discord_role_id || "", iconUrl: tier.icon_url || "" };
                    return <article className="badge-admin-tier-card" key={tier.tier_key}>
                      <div className="badge-admin-tier-card-head"><div className="badge-admin-tier-art">{tier.icon_url ? <img src={tier.icon_url} alt="" /> : <span>{index + 1}</span>}</div><div className="badge-admin-tier-title"><strong>{tier.name}</strong><small>{tier.tier_key}</small><span>Current target: {(tier.threshold_invites || 0).toLocaleString("en-GB")} invited members</span></div><span className="badge-admin-tier-order">{String(index + 1).padStart(2, "0")}</span></div>
                      <div className="badge-admin-tier-fields">
                        <label>Invite target<input type="number" min="1" max="1000000" step="1" value={draft.threshold} onChange={event => setRecruiterTierDrafts(current => ({ ...current, [tier.tier_key]: { ...draft, threshold: event.target.value } }))} /></label>
                        <label>Discord role ID<input inputMode="numeric" value={draft.roleId} onChange={event => setRecruiterTierDrafts(current => ({ ...current, [tier.tier_key]: { ...draft, roleId: event.target.value.replace(/[^0-9]/g, "").slice(0, 22) } }))} placeholder="Optional — paste role ID" /></label>
                        <label className="badge-admin-tier-icon-field">Icon image URL<input value={draft.iconUrl} onChange={event => setRecruiterTierDrafts(current => ({ ...current, [tier.tier_key]: { ...draft, iconUrl: event.target.value } }))} placeholder="/badges/recruiter-scout.svg" /></label>
                      </div>
                      <button className="badge-admin-tier-save" type="button" disabled={busy || !Number.isSafeInteger(Number(draft.threshold)) || Number(draft.threshold) < 1 || Number(draft.threshold) > 1000000 || (draft.roleId !== "" && !/^\d{15,22}$/.test(draft.roleId))} onClick={() => void act({ action: "save_recruiter_tier", tier_key: tier.tier_key, threshold_invites: Number(draft.threshold), discord_role_id: draft.roleId, icon_url: draft.iconUrl }, tier.name + " saved.")}>Save recruiter tier <span>→</span></button>
                    </article>;
                  })}
                </div>}
                <div className="badge-admin-setup-note"><strong>Discord invite tracking requirements</strong><p>The Railway bot needs <b>Manage Server</b> permission, Server Members and Guild Invites intents, and the latest bot code deployed. New attributed joins are tracked from deployment onward; past invite history cannot be reconstructed automatically. Vanity URL joins or joins with no detectable invite-use change do not count.</p></div>
              </div>
            </details>

            <details className="badge-admin-accordion">
              <summary>
                <span className="badge-admin-accordion-icon">＄</span>
                <span className="badge-admin-accordion-title"><strong>Donor badge tiers</strong><small>Lifetime donation thresholds and role mapping</small></span>
                <span className="badge-admin-accordion-count">{donorTiers.length || 7} tiers</span><span className="badge-admin-chevron">⌄</span>
              </summary>
              <div className="badge-admin-accordion-body">
                <div className="badge-admin-section-intro"><div><h2>Lifetime supporter progression</h2><p>Set each donation threshold and Discord role. The highest tier replaces the one below it.</p></div><span className="badge-admin-inline-note">OWNER ONLY</span></div>
                {donorTierSetupRequired ? <div className="badge-admin-setup-note"><strong>Donor tier database setup needed</strong><p>Run <code>supabase/migrations/202610180001_pixlo_donor_badge_tiers.sql</code> and <code>supabase/migrations/202610180002_pixlo_donor_tier_admin.sql</code> in order, then refresh.</p></div>
                : donorTiers.length === 0 ? <p className="badge-admin-muted">No donor tiers found.</p>
                : <div className="badge-admin-tier-grid badge-admin-donor-grid">
                  {donorTiers.map((tier, index) => {
                    const draft = donorTierDrafts[tier.tier_key] || { amount: (tier.threshold_pence / 100).toFixed(2), roleId: tier.discord_role_id || "" };
                    return <article className="badge-admin-tier-card" key={tier.tier_key}>
                      <div className="badge-admin-tier-card-head"><div className="badge-admin-tier-art">{tier.icon_url ? <img src={tier.icon_url} alt="" /> : <span>{index + 1}</span>}</div><div className="badge-admin-tier-title"><strong>{tier.name}</strong><small>{tier.tier_key}</small><span>Current threshold: £{(tier.threshold_pence / 100).toFixed(2)}</span></div><span className="badge-admin-tier-order">{String(index + 1).padStart(2, "0")}</span></div>
                      <div className="badge-admin-tier-fields badge-admin-donor-fields">
                        <label>Donation amount (£)<input type="number" min="1" max="1000" step="0.01" value={draft.amount} onChange={event => setDonorTierDrafts(current => ({ ...current, [tier.tier_key]: { ...draft, amount: event.target.value } }))} /></label>
                        <label>Discord role ID<input inputMode="numeric" value={draft.roleId} onChange={event => setDonorTierDrafts(current => ({ ...current, [tier.tier_key]: { ...draft, roleId: event.target.value.replace(/[^0-9]/g, "").slice(0, 22) } }))} placeholder="Optional — paste role ID" /></label>
                      </div>
                      <button className="badge-admin-tier-save" type="button" disabled={busy || !Number.isFinite(Number(draft.amount)) || Number(draft.amount) < 1 || Number(draft.amount) > 1000 || (draft.roleId !== "" && !/^\d{15,22}$/.test(draft.roleId))} onClick={() => void act({ action: "save_donor_tier", tier_key: tier.tier_key, threshold_pence: Math.round(Number(draft.amount) * 100), discord_role_id: draft.roleId }, tier.name + " saved.")}>Save donor tier <span>→</span></button>
                    </article>;
                  })}
                </div>}
                <p className="badge-admin-note">The bot reconciles linked accounts and configured Discord roles. Its highest role must be above every managed donor role.</p>
              </div>
            </details>

            <details className="badge-admin-accordion">
              <summary>
                <span className="badge-admin-accordion-icon">✚</span>
                <span className="badge-admin-accordion-title"><strong>Create or manage badge definitions</strong><small>Upload icons, create badges, and delete legacy entries</small></span>
                <span className="badge-admin-accordion-count">{badges.length} badges</span><span className="badge-admin-chevron">⌄</span>
              </summary>
              <div className="badge-admin-accordion-body">
                <section className="badge-admin-subpanel">
                  <h2>Create a badge</h2>
                  <form className="badge-admin-form" onSubmit={createBadge}>
                    <label>Badge name<input required maxLength={48} value={name} onChange={event => setName(event.target.value)} placeholder="Early Supporter" /></label>
                    <label>Badge key<input required maxLength={48} value={key} onChange={event => setKey(event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "-"))} placeholder="early-supporter" /></label>
                    <label>Description<input maxLength={240} value={description} onChange={event => setDescription(event.target.value)} placeholder="Supported Pixlo early on" /></label>
                    <label>Upload icon (PNG, JPG, WebP, GIF; max 2 MB)<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={event => setIconFile(event.target.files?.[0] || null)} /></label>
                    <label>Or use an icon image URL<input type="url" value={iconUrl} onChange={event => setIconUrl(event.target.value)} placeholder="https://…" /></label>
                    <button disabled={busy} type="submit">{busy ? "Saving…" : "Create badge"}</button>
                  </form>
                  <p className="badge-admin-note">Uploaded icons are stored in Pixlo's public badge-image storage.</p>
                </section>
                <section className="badge-admin-subpanel">
                  <div className="badge-admin-section-intro"><div><h2>Existing badges <span>{badges.length}</span></h2><p>Delete only legacy badges. Tier badges managed above are referenced by tier tables and should not be removed.</p></div></div>
                  {badges.length === 0 ? <p className="badge-admin-muted">No badges created yet.</p> : <div className="badge-admin-list">
                    {badges.map(badge => <article className="badge-admin-item" key={badge.id}>
                      <div className="badge-admin-icon">{badge.icon_url ? <img src={badge.icon_url} alt="" /> : <span>✦</span>}</div>
                      <div className="badge-admin-info"><strong>{badge.name}</strong><small>{badge.badge_key}</small>{badge.description && <p>{badge.description}</p>}</div>
                      <button className="badge-admin-danger" disabled={busy} onClick={() => { if (window.confirm("Delete the " + badge.name + " badge and its awards? Tier-managed badges cannot be deleted while their tier configuration exists.")) void act({ action: "delete_badge", id: badge.id }, "Badge deleted."); }}>Delete</button>
                    </article>)}
                  </div>}
                </section>
              </div>
            </details>

            <details className="badge-admin-accordion">
              <summary>
                <span className="badge-admin-accordion-icon">⇄</span>
                <span className="badge-admin-accordion-title"><strong>Discord role mappings</strong><small>Standard badges connected to regular Discord roles</small></span>
                <span className="badge-admin-accordion-count">{mappings.length} mappings</span><span className="badge-admin-chevron">⌄</span>
              </summary>
              <div className="badge-admin-accordion-body">
                <p className="badge-admin-muted">Use this for regular one-off role badges. Managed Views, Donor and Recruiter tiers belong in their own sections.</p>
                <form className="badge-admin-form badge-admin-map-form" onSubmit={event => { event.preventDefault(); void act({ action: "map_role", discord_role_id: roleId, badge_id: mapBadgeId }, "Discord role mapped to badge."); setRoleId(""); }}>
                  <label>Discord role ID<input required inputMode="numeric" value={roleId} onChange={event => setRoleId(event.target.value.replace(/[^0-9]/g, "").slice(0, 22))} placeholder="123456789012345678" /></label>
                  <label>Badge<select value={mapBadgeId} onChange={event => setMapBadgeId(event.target.value)} required>{badges.filter(badge => !badge.badge_key.startsWith("views_") && !badge.badge_key.startsWith("recruiter_") && !badge.badge_key.startsWith("donor_")).map(badge => <option key={badge.id} value={badge.id}>{badge.name}</option>)}</select></label>
                  <button disabled={busy || !badges.some(badge => badge.id === mapBadgeId)} type="submit">Map role</button>
                </form>
                <div className="badge-admin-list">{mappings.map(mapping => {
                  const badge = badges.find(item => item.id === mapping.badge_id);
                  return <article className="badge-admin-item" key={mapping.discord_role_id + mapping.badge_id}>
                    <div className="badge-admin-info"><strong>{badge?.name || "Unknown badge"}</strong><small>Role ID: {mapping.discord_role_id}</small></div>
                    <button className="badge-admin-danger" disabled={busy} onClick={() => void act({ action: "unmap_role", discord_role_id: mapping.discord_role_id, badge_id: mapping.badge_id }, "Discord role mapping removed.")}>Remove</button>
                  </article>;
                })}</div>
              </div>
            </details>

            <details className="badge-admin-accordion">
              <summary>
                <span className="badge-admin-accordion-icon">♙</span>
                <span className="badge-admin-accordion-title"><strong>Manual badge awards</strong><small>Award or revoke a badge for a Pixlo username</small></span><span className="badge-admin-chevron">⌄</span>
              </summary>
              <div className="badge-admin-accordion-body">
                <p className="badge-admin-muted">Use manual awards for special recognition. Count-based tiers are managed automatically and can be replaced by the tier worker.</p>
                <form className="badge-admin-form" onSubmit={event => { event.preventDefault(); void act({ action: "award_badge", username: awardUsername, badge_id: awardBadgeId }, "Badge awarded to @" + awardUsername + "."); }}>
                  <label>Pixlo username<input required maxLength={24} value={awardUsername} onChange={event => setAwardUsername(event.target.value)} placeholder="username" /></label>
                  <label>Badge<select value={awardBadgeId} onChange={event => setAwardBadgeId(event.target.value)} required>{badges.filter(badge => !badge.badge_key.startsWith("views_") && !badge.badge_key.startsWith("recruiter_") && !badge.badge_key.startsWith("donor_")).map(badge => <option key={badge.id} value={badge.id}>{badge.name}</option>)}</select></label>
                  <div className="badge-admin-actions"><button disabled={busy || !badges.some(badge => badge.id === awardBadgeId)} type="submit">Award badge</button><button className="badge-admin-danger" type="button" disabled={busy || !badges.some(badge => badge.id === awardBadgeId) || !awardUsername.trim()} onClick={() => { if (window.confirm("Revoke this manually awarded badge from @" + awardUsername.trim() + "?")) void act({ action: "revoke_badge", username: awardUsername, badge_id: awardBadgeId }, "Badge revoked from @" + awardUsername.trim() + "."); }}>Revoke badge</button></div>
                </form>
              </div>
            </details>
          </div>
        </>}
      </div>
    </main>
  );
}
