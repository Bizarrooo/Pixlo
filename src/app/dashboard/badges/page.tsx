"use client";

import { useCallback, useEffect, useState } from "react";

type Badge = { id: string; badge_key: string; name: string; description: string; icon_url: string | null; is_active: boolean };
type Mapping = { discord_role_id: string; badge_id: string; created_at: string };

export default function BadgeManagementPage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
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

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/badges", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load badge settings.");
      setBadges(data.badges || []);
      setMappings(data.mappings || []);
      setMapBadgeId((current: string) => current || data.badges?.[0]?.id || "");
      setAwardBadgeId((current: string) => current || data.badges?.[0]?.id || "");
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load badge settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function act(payload: Record<string, unknown>, success: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/badges", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The action failed.");
      setMessage(success);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The action failed.");
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
    await act({ action: "create_badge", badge_key: key, name, description, icon_url: finalIconUrl || null }, "Badge created.");
    setName(""); setKey(""); setDescription(""); setIconUrl(""); setIconFile(null);
  }

  return (
    <main className="badge-admin-page">
      <div className="badge-admin-shell">
        <a className="badge-admin-back" href="/dashboard">← Back to dashboard</a>
        <header className="badge-admin-heading">
          <span className="badge-admin-eyebrow">PIXLO ADMIN</span>
          <h1>Badge management</h1>
          <p>Create profile badges, connect Discord roles, and award badges manually.</p>
        </header>
        {message && <div className="badge-admin-message" role="status">{message}</div>}
        {loading ? <p className="badge-admin-muted">Loading badge settings…</p> : <>
          <section className="badge-admin-panel">
            <h2>Create a badge</h2>
            <form className="badge-admin-form" onSubmit={createBadge}>
              <label>Badge name<input required maxLength={48} value={name} onChange={event => setName(event.target.value)} placeholder="Early Supporter" /></label>
              <label>Badge key<input required maxLength={48} value={key} onChange={event => setKey(event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "-"))} placeholder="early-supporter" /></label>
              <label>Description<input maxLength={240} value={description} onChange={event => setDescription(event.target.value)} placeholder="Supported Pixlo early on" /></label>
              <label>Upload icon (PNG, JPG, WebP, GIF; max 2 MB)<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={event => setIconFile(event.target.files?.[0] || null)} /></label>
              <label>Or use an icon image URL<input type="url" value={iconUrl} onChange={event => setIconUrl(event.target.value)} placeholder="https://…" /></label>
              <button disabled={busy} type="submit">Create badge</button>
            </form>
            <p className="badge-admin-note">Uploaded icons are stored in the Pixlo Supabase Storage bucket and served as public badge images.</p>
          </section>

          <section className="badge-admin-panel">
            <h2>Existing badges <span>{badges.length}</span></h2>
            {badges.length === 0 ? <p className="badge-admin-muted">No badges created yet.</p> : <div className="badge-admin-list">
              {badges.map(badge => <article className="badge-admin-item" key={badge.id}>
                <div className="badge-admin-icon">{badge.icon_url ? <img src={badge.icon_url} alt="" /> : <span>✦</span>}</div>
                <div className="badge-admin-info"><strong>{badge.name}</strong><small>{badge.badge_key}</small>{badge.description && <p>{badge.description}</p>}</div>
                <button className="badge-admin-danger" disabled={busy} onClick={() => { if (window.confirm(`Delete the ${badge.name} badge and its awards?`)) void act({ action: "delete_badge", id: badge.id }, "Badge deleted."); }}>Delete</button>
              </article>)}
            </div>}
          </section>

          <section className="badge-admin-panel">
            <h2>Connect a Discord role</h2>
            <p className="badge-admin-muted">Copy the role ID from Discord Developer Mode. The separate bot will use these mappings during its 15-minute sync.</p>
            <form className="badge-admin-form" onSubmit={event => { event.preventDefault(); void act({ action: "map_role", discord_role_id: roleId, badge_id: mapBadgeId }, "Discord role mapped to badge."); setRoleId(""); }}>
              <label>Discord role ID<input required inputMode="numeric" value={roleId} onChange={event => setRoleId(event.target.value)} placeholder="123456789012345678" /></label>
              <label>Badge<select value={mapBadgeId} onChange={event => setMapBadgeId(event.target.value)} required>{badges.map(badge => <option key={badge.id} value={badge.id}>{badge.name}</option>)}</select></label>
              <button disabled={busy || !badges.length} type="submit">Map role</button>
            </form>
            <div className="badge-admin-list">
              {mappings.map(mapping => {
                const badge = badges.find(item => item.id === mapping.badge_id);
                return <article className="badge-admin-item" key={mapping.discord_role_id + mapping.badge_id}>
                  <div className="badge-admin-info"><strong>{badge?.name || "Unknown badge"}</strong><small>Role ID: {mapping.discord_role_id}</small></div>
                  <button className="badge-admin-danger" disabled={busy} onClick={() => void act({ action: "unmap_role", discord_role_id: mapping.discord_role_id, badge_id: mapping.badge_id }, "Discord role mapping removed.")}>Remove</button>
                </article>;
              })}
            </div>
          </section>

          <section className="badge-admin-panel">
            <h2>Manually award a badge</h2>
            <form className="badge-admin-form" onSubmit={event => { event.preventDefault(); void act({ action: "award_badge", username: awardUsername, badge_id: awardBadgeId }, `Badge awarded to @${awardUsername}.`); }}>
              <label>Pixlo username<input required maxLength={24} value={awardUsername} onChange={event => setAwardUsername(event.target.value)} placeholder="username" /></label>
              <label>Badge<select value={awardBadgeId} onChange={event => setAwardBadgeId(event.target.value)} required>{badges.map(badge => <option key={badge.id} value={badge.id}>{badge.name}</option>)}</select></label>
              <button disabled={busy || !badges.length} type="submit">Award badge</button>
            </form>
            <p className="badge-admin-note">Manual awards are separate from Discord-role awards, so unlinking Discord will not remove them.</p>
          </section>
        </>}
      </div>
    </main>
  );
}
