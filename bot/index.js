const { Client, GatewayIntentBits, EmbedBuilder, AuditLogEvent } = require("discord.js");

const required = ["DISCORD_BOT_TOKEN", "DISCORD_GUILD_ID", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
for (const name of required) {
  if (!process.env[name]) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL.replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const AWARD_CHANNEL_ID = "1558891440891891712";
const REVOCATION_CHANNEL_ID = "1558891471963168778";
const EMBED_ORANGE = 0xF59E0B;
const INTERVAL_MS = 60 * 1000;
const pendingRoleChanges = new Map();
let syncing = false;
let syncAgain = false;
let scheduledSync = null;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

async function db(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${body.slice(0, 500)}`);
  return body ? JSON.parse(body) : null;
}

async function getAllProfiles() {
  const profiles = [];
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const page = await db(`profiles?select=id,discord_id&discord_id=not.is.null&order=id.asc&limit=${pageSize}&offset=${offset}`);
    if (!Array.isArray(page) || page.length === 0) break;
    profiles.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  return profiles;
}

async function getAllDiscordAwards() {
  const awards = [];
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const page = await db(`user_badges?select=id,user_id,badge_id,source_role_id&source=eq.discord_role&order=id.asc&limit=${pageSize}&offset=${offset}`);
    if (!Array.isArray(page) || page.length === 0) break;
    awards.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  return awards;
}

function roleChangeKey(discordId, roleId, action) {
  return `${discordId}:${roleId}:${action}`;
}

async function findRoleChangeActor(guild, memberId, roleId, action) {
  try {
    const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberRoleUpdate, limit: 10 });
    const expectedChange = action === "award" ? "$add" : "$remove";
    const now = Date.now();
    const entry = logs.entries.find(item => {
      if (item.target?.id !== memberId || now - item.createdTimestamp > 30_000) return false;
      return (item.changes || []).some(change =>
        change.key === expectedChange &&
        Array.isArray(change.new) &&
        change.new.some(role => String(role.id) === String(roleId))
      );
    });
    return entry?.executor || null;
  } catch (error) {
    console.warn("[discord] Could not identify role-change actor. Give the bot View Audit Log permission to enable this:", error instanceof Error ? error.message : error);
    return null;
  }
}

async function announceRoleChange(guild, profile, roleId, action) {
  const channelId = action === "award" ? AWARD_CHANNEL_ID : REVOCATION_CHANNEL_ID;
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased() || typeof channel.send !== "function") {
    console.error(`[announcements] Missing or inaccessible ${action} channel ${channelId}`);
    return;
  }

  const member = guild.members.cache.get(String(profile.discord_id));
  if (!member) return;
  const role = guild.roles.cache.get(String(roleId));
  const roleName = role?.name || "Mapped Pixlo badge role";
  const actor = await findRoleChangeActor(guild, member.id, roleId, action);
  const actorText = actor ? `<@${actor.id}>` : "Unknown / System";
  const isAward = action === "award";
  const embed = new EmbedBuilder()
    .setColor(EMBED_ORANGE)
    .setTitle(isAward ? "🏆 Badge Awarded!" : "🚫 Badge Revoked")
    .setDescription(isAward
      ? `🎉 Congratulations, <@${member.id}>! You've earned the **${roleName}** role in the Pixlo Discord server.\n\nYou should now have been awarded the corresponding badge on **Pixlo** too. Head over to your Pixlo account and check it out!`
      : `Hey <@${member.id}> — your **${roleName}** role has been removed from the Pixlo Discord server. Your corresponding Discord-earned badge has been removed from Pixlo. Visit your account to check your current badges.`)
    .addFields(
      { name: isAward ? "🏅 Role Earned" : "🛡️ Revoked Role", value: roleName, inline: true },
      { name: "👤 Member", value: `<@${member.id}>`, inline: true },
      { name: isAward ? "🛡️ Awarded By" : "🛡️ Removed By", value: actorText, inline: true },
    )
    .setFooter({ text: "Pixlo • Keep earning, keep flexing." })
    .setTimestamp();

  const allowedUserIds = [member.id, actor?.id].filter(Boolean);
  await channel.send({
    embeds: [embed],
    allowedMentions: { users: allowedUserIds, roles: [], parse: [] },
  });
  console.log(`[announcements] sent ${action} embed for role ${roleId} to member ${member.id}`);
}

async function syncBadges() {
  if (syncing) { syncAgain = true; return; }
  syncing = true;
  const started = Date.now();
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.members.fetch();

    const [roleMappings, profiles, currentAwards] = await Promise.all([
      db("discord_role_badges?select=discord_role_id,badge_id"),
      getAllProfiles(),
      getAllDiscordAwards(),
    ]);

    const mappings = Array.isArray(roleMappings) ? roleMappings : [];
    const linkedProfiles = Array.isArray(profiles) ? profiles : [];
    const awards = Array.isArray(currentAwards) ? currentAwards : [];
    console.log(`[badge-sync] loaded ${mappings.length} role-to-badge mappings and ${linkedProfiles.length} Pixlo profiles linked to Discord; server member cache has ${guild.members.cache.size} members`);
    const mappingKeys = new Set(mappings.map(item => `${item.discord_role_id}:${item.badge_id}`));
    const profileById = new Map(linkedProfiles.map(profile => [profile.id, profile]));
    const desired = new Set();
    let linkedMemberCount = 0;

    for (const profile of linkedProfiles) {
      const discordId = String(profile.discord_id || "");
      const member = guild.members.cache.get(discordId);
      if (!member) continue;
      linkedMemberCount += 1;
      for (const mapping of mappings) {
        if (member.roles.cache.has(mapping.discord_role_id)) {
          desired.add(`${profile.id}:${mapping.badge_id}:${mapping.discord_role_id}`);
        }
      }
    }

    const removals = awards.filter(award => {
      const profile = profileById.get(award.user_id);
      const member = profile?.discord_id ? guild.members.cache.get(String(profile.discord_id)) : null;
      const key = `${award.user_id}:${award.badge_id}:${award.source_role_id}`;
      if (!profile || !member) return true;
      if (!mappingKeys.has(`${award.source_role_id}:${award.badge_id}`)) return true;
      return !desired.has(key);
    });

    for (const award of removals) {
      await db(`user_badges?id=eq.${encodeURIComponent(award.id)}&source=eq.discord_role`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      const profile = profileById.get(award.user_id);
      const key = profile?.discord_id ? roleChangeKey(String(profile.discord_id), String(award.source_role_id), "revoke") : null;
      if (profile && key && pendingRoleChanges.has(key)) {
        try {
          await announceRoleChange(guild, profile, award.source_role_id, "revoke");
        } catch (error) {
          console.error("[announcements] revoke message failed:", error instanceof Error ? error.message : error);
        }
        pendingRoleChanges.delete(key);
      }
    }

    const removedIds = new Set(removals.map(remove => remove.id));
    const existing = new Set(awards.filter(award => !removedIds.has(award.id)).map(award => `${award.user_id}:${award.badge_id}:${award.source_role_id}`));
    const inserts = [...desired].filter(key => !existing.has(key)).map(key => {
      const [userId, badgeId, roleId] = key.split(":");
      return { user_id: userId, badge_id: badgeId, source: "discord_role", source_role_id: roleId };
    });

    for (let index = 0; index < inserts.length; index += 100) {
      await db("user_badges", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(inserts.slice(index, index + 100)),
      });
    }

    for (const award of inserts) {
      const profile = profileById.get(award.user_id);
      const key = profile?.discord_id ? roleChangeKey(String(profile.discord_id), String(award.source_role_id), "award") : null;
      if (profile && key && pendingRoleChanges.has(key)) {
        try {
          await announceRoleChange(guild, profile, award.source_role_id, "award");
        } catch (error) {
          console.error("[announcements] award message failed:", error instanceof Error ? error.message : error);
        }
        pendingRoleChanges.delete(key);
      }
    }

    console.log(`[badge-sync] done: ${linkedMemberCount} linked guild members, ${inserts.length} awards added, ${removals.length} awards removed in ${Date.now() - started}ms`);
  } catch (error) {
    console.error("[badge-sync] failed:", error instanceof Error ? error.message : error);
  } finally {
    syncing = false;
    if (syncAgain) {
      syncAgain = false;
      void syncBadges();
    }
  }
}

client.once("ready", async () => {
  console.log(`[discord] Logged in as ${client.user.tag} (bot ID: ${client.user.id})`);
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    console.log(`[discord] Connected to configured server: ${guild.name} (${guild.id})`);
  } catch (error) {
    console.error(`[discord] Cannot access configured server ${GUILD_ID}:`, error instanceof Error ? error.message : error);
  }
  await syncBadges();
  setInterval(() => void syncBadges(), INTERVAL_MS);
});

function scheduleSync() {
  if (scheduledSync) clearTimeout(scheduledSync);
  scheduledSync = setTimeout(() => {
    scheduledSync = null;
    void syncBadges();
  }, 3000);
}

client.on("guildMemberUpdate", (oldMember, newMember) => {
  const added = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
  const removed = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
  for (const role of added.values()) {
    pendingRoleChanges.set(roleChangeKey(newMember.id, role.id, "award"), Date.now());
  }
  for (const role of removed.values()) {
    pendingRoleChanges.set(roleChangeKey(newMember.id, role.id, "revoke"), Date.now());
  }
  if (added.size || removed.size) scheduleSync();
});

setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [key, timestamp] of pendingRoleChanges) {
    if (timestamp < cutoff) pendingRoleChanges.delete(key);
  }
}, 15_000).unref();

client.on("guildMemberAdd", scheduleSync);
client.on("guildMemberRemove", scheduleSync);

client.on("error", error => console.error("[discord] client error:", error.message));
process.on("unhandledRejection", error => console.error("[worker] unhandled rejection:", error));

client.login(process.env.DISCORD_BOT_TOKEN).catch(error => {
  console.error("[discord] login failed:", error.message);
  process.exit(1);
});
