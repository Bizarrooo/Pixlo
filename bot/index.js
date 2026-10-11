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
const BADGE_INFO_CHANNEL_ID = "1558891359572852946";
const EMBED_ORANGE = 0xFFD580;
const INTERVAL_MS = 5 * 60 * 1000;
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

async function getAllPremiumEntitlements() {
  const entitlements = [];
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const liveMode = process.env.PIXLO_PREMIUM_LIVEMODE === "true";
    const page = await db(`pixlo_premium_entitlements?select=user_id,status,livemode&status=eq.active&livemode=eq.${liveMode}&order=user_id.asc&limit=${pageSize}&offset=${offset}`);
    if (!Array.isArray(page) || page.length === 0) break;
    entitlements.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  return entitlements;
}

async function syncPremiumRole(guild, profiles, entitlements) {
  const configuredRoleId = process.env.DISCORD_PREMIUM_ROLE_ID;
  const role = (configuredRoleId && guild.roles.cache.get(configuredRoleId)) ||
    guild.roles.cache.find(item => item.name.trim().toLowerCase() === "premium") ||
    guild.roles.cache.find(item => item.name.trim().toLowerCase() === "pixlo premium") ||
    guild.roles.cache.find(item => /premium/i.test(item.name));
  if (!role) {
    console.error("[premium-role] No Premium role found. Create a dedicated Premium role or set DISCORD_PREMIUM_ROLE_ID in the bot service.");
    return;
  }

  const profileByDiscordId = new Map(profiles.filter(profile => profile.discord_id).map(profile => [String(profile.discord_id), profile]));
  const activeUserIds = new Set(entitlements.filter(item => item.status === "active").map(item => String(item.user_id)));
  let added = 0;
  let removed = 0;
  for (const member of guild.members.cache.values()) {
    if (member.user.bot) continue;
    const profile = profileByDiscordId.get(String(member.id));
    const shouldHaveRole = Boolean(profile && activeUserIds.has(String(profile.id)));
    const alreadyHasRole = member.roles.cache.has(role.id);
    try {
      if (shouldHaveRole && !alreadyHasRole) {
        await member.roles.add(role.id, "Pixlo Premium lifetime entitlement is active");
        added += 1;
      } else if (!shouldHaveRole && alreadyHasRole) {
        await member.roles.remove(role.id, "Pixlo Premium lifetime entitlement is not active or account is not linked");
        removed += 1;
      }
    } catch (error) {
      console.error(`[premium-role] Could not reconcile Premium role for Discord user ${member.id}:`, error instanceof Error ? error.message : error);
    }
  }
  if (added || removed) console.log(`[premium-role] role "${role.name}" synced: ${added} added, ${removed} removed`);
}

const BADGE_EMOJI_BY_KEYWORD = [
  { match: /recruit/i, emoji: "White_Recruiter_Badge" },
  { match: /booster/i, emoji: "White_Server_Booster_Badge" },
  { match: /donor/i, emoji: "White_Donor_Badge" },
  { match: /bug/i, emoji: "White_Bug_Hunter_Badge" },
  { match: /premium/i, emoji: "White_Premium_Badge" },
  { match: /verif/i, emoji: "White_Verification_Badge" },
];

function getBadgeEmoji(guild, roleName) {
  const entry = BADGE_EMOJI_BY_KEYWORD.find(item => item.match.test(roleName || ""));
  return entry ? guild.emojis.cache.find(emoji => emoji.name === entry.emoji) || null : null;
}

function customEmojiText(guild, emojiName) {
  const emoji = guild.emojis.cache.find(item => item.name === emojiName);
  // Custom emojis in bot-authored messages require the emoji's actual Discord ID.
  return emoji ? `<:${emoji.name}:${emoji.id}>` : `:${emojiName}:`;
}

async function postBadgeInfo(guild) {
  const channel = await guild.channels.fetch(BADGE_INFO_CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased() || typeof channel.send !== "function") {
    console.error("[badge-info] Missing or inaccessible info channel " + BADGE_INFO_CHANNEL_ID);
    return;
  }
  let existingMessage = null;
  try {
    const recent = await channel.messages.fetch({ limit: 50 });
    existingMessage = recent.find(message =>
      message.author.id === client.user.id &&
      message.embeds.some(embed => embed.title === "Pixlo Badges — Requirements & How to Earn Them")
    ) || null;
  } catch (error) {
    console.warn("[badge-info] Could not check for an existing requirements embed:", error instanceof Error ? error.message : error);
  }

  const descriptions = [
    { name: `${customEmojiText(guild, "White_Recruiter_Badge")}  __Recruiter:__`, value: "Successfully invite **10 or more people** into the official Pixlo Discord server." },
    { name: `${customEmojiText(guild, "White_Bug_Hunter_Badge")}  __Bug Hunter:__`, value: "Report **2 or more valid bugs** affecting Pixlo. Each report must be reviewed and confirmed as a valid bug." },
    { name: `${customEmojiText(guild, "White_Server_Booster_Badge")}  __Server Booster:__`, value: "Boost the official Pixlo Discord server at least once and **maintain your boost permanently** to keep this badge." },
    { name: `${customEmojiText(guild, "White_Donor_Badge")}  __Donor:__`, value: "Support Pixlo with a donation of **£5 or more**." },
    { name: `${customEmojiText(guild, "White_Premium_Badge")}  __Premium:__`, value: "Purchase a **Pixlo Premium** subscription. **Coming soon.**" },
    { name: `${customEmojiText(guild, "White_Verification_Badge")}  __Verified:__`, value: "Be a content creator with **5,000+ YouTube subscribers** or **10,000+ TikTok followers**, **or receive direct approval from Bizarro**." },
  ];
  const embed = new EmbedBuilder()
    .setColor(EMBED_ORANGE)
    .setTitle("Pixlo Badges — Requirements & How to Earn Them")
    .setDescription("Pixlo badges recognise members who contribute to the community, support the project, and reach specific milestones. Review the requirements below to learn how each badge is earned.")
    .addFields(descriptions)
    .addFields({ name: "__Please Note:__", value: "The Pixlo team may verify eligibility before awarding a badge. Badge requirements must continue to be met where applicable." })
    .setFooter({ text: "Pixlo • Badge requirements" })
    .setTimestamp();
  if (existingMessage) {
    await existingMessage.edit({ embeds: [embed], allowedMentions: { parse: [], users: [], roles: [] } });
    console.log("[badge-info] updated existing badge requirements embed in " + BADGE_INFO_CHANNEL_ID);
  } else {
    await channel.send({ embeds: [embed], allowedMentions: { parse: [], users: [], roles: [] } });
    console.log("[badge-info] posted badge requirements embed to " + BADGE_INFO_CHANNEL_ID);
  }
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
  const badgeEmoji = getBadgeEmoji(guild, roleName);
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
  if (badgeEmoji) embed.setThumbnail(badgeEmoji.imageURL({ extension: "png", size: 256 }));

  // Discord rejects duplicate IDs in allowedMentions.users when the member also performed the action.
  // Embed mentions are rendered as clickable mentions without notifying users.
  // Avoid explicit users arrays: Discord can reject duplicate IDs when member and actor are the same.
  await channel.send({
    embeds: [embed],
    allowedMentions: { parse: [], users: [], roles: [] },
  });
  console.log(`[announcements] sent ${action} embed for role ${roleId} to member ${member.id}`);
}

async function syncBadges() {
  if (syncing) { syncAgain = true; return; }
  syncing = true;
  const started = Date.now();
  try {
    const guild = client.guilds.cache.get(GUILD_ID) || await client.guilds.fetch(GUILD_ID);

    const [roleMappings, profiles, currentAwards] = await Promise.all([
      db("discord_role_badges?select=discord_role_id,badge_id"),
      getAllProfiles(),
      getAllDiscordAwards(),
    ]);

    const mappings = Array.isArray(roleMappings) ? roleMappings : [];
    const linkedProfiles = Array.isArray(profiles) ? profiles : [];
    const awards = Array.isArray(currentAwards) ? currentAwards : [];
    console.log(`[badge-sync] loaded ${mappings.length} role-to-badge mappings and ${linkedProfiles.length} Pixlo profiles linked to Discord; server member cache has ${guild.members.cache.size} members`);

    try {
      const premiumEntitlements = await getAllPremiumEntitlements();
      await syncPremiumRole(guild, linkedProfiles, premiumEntitlements);
    } catch (error) {
      console.error("[premium-role] entitlement sync failed:", error instanceof Error ? error.message : error);
    }
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

    // Announce actual role-change events only after the reconciliation succeeds.
    // This also handles a role that was already reflected in Supabase before this sync.
    const profileByDiscordId = new Map(linkedProfiles.map(profile => [String(profile.discord_id || ""), profile]));
    for (const [key, timestamp] of [...pendingRoleChanges.entries()]) {
      if (Date.now() - timestamp > 60_000) {
        pendingRoleChanges.delete(key);
        continue;
      }
      const [discordId, roleId, action] = key.split(":");
      if (!mappings.some(mapping => String(mapping.discord_role_id) === roleId)) {
        pendingRoleChanges.delete(key);
        continue;
      }
      const profile = profileByDiscordId.get(discordId);
      if (!profile) {
        pendingRoleChanges.delete(key);
        continue;
      }
      const member = guild.members.cache.get(discordId);
      const roleStillPresent = Boolean(member?.roles.cache.has(roleId));
      if ((action === "award" && !roleStillPresent) || (action === "revoke" && roleStillPresent)) {
        pendingRoleChanges.delete(key);
        continue;
      }
      try {
        await announceRoleChange(guild, profile, roleId, action);
      } catch (error) {
        console.error(`[announcements] ${action} message failed:`, error instanceof Error ? error.message : error);
      }
      pendingRoleChanges.delete(key);
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
  let guild;
  try {
    guild = await client.guilds.fetch(GUILD_ID);
    await guild.emojis.fetch().catch(error => {
      console.warn("[badge-info] Could not refresh server emoji cache:", error instanceof Error ? error.message : error);
    });
    // Fetch members once at startup. Reconciliation reuses the cache instead of
    // repeatedly issuing Discord opcode 8 requests and hitting rate limits.
    await guild.members.fetch();
    console.log(`[discord] Connected to configured server: ${guild.name} (${guild.id})`);
  } catch (error) {
    console.error(`[discord] Cannot access configured server ${GUILD_ID}:`, error instanceof Error ? error.message : error);
  }

  // The guild variable must live outside the try block so it remains available here.
  // Do not attempt channel announcements or sync if the configured server could not be fetched.
  if (!guild) {
    console.error("[discord] Startup stopped: configured server is unavailable; badge announcement was not posted.");
    return;
  }

  try {
    await postBadgeInfo(guild);
  } catch (error) {
    console.error("[badge-info] Failed to post requirements embed:", error instanceof Error ? error.message : error);
  }
  await syncBadges();
  setInterval(() => void syncBadges(), INTERVAL_MS);
});

function scheduleSync() {
  if (scheduledSync) clearTimeout(scheduledSync);
  scheduledSync = setTimeout(() => {
    scheduledSync = null;
    void syncBadges();
  }, 750);
}

client.on("guildMemberUpdate", (oldMember, newMember) => {
  const added = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
  const removed = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
  if (added.size || removed.size) {
    for (const role of added.values()) {
      pendingRoleChanges.set(roleChangeKey(newMember.id, role.id, "award"), Date.now());
      console.log(`[discord] role added: ${role.name} (${role.id}) on member ${newMember.id}`);
    }
    for (const role of removed.values()) {
      pendingRoleChanges.set(roleChangeKey(newMember.id, role.id, "revoke"), Date.now());
      console.log(`[discord] role removed: ${role.name} (${role.id}) on member ${newMember.id}`);
    }
    scheduleSync();
  }
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
