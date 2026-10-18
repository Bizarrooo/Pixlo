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
const PREMIUM_SYNC_INTERVAL_MS = 15 * 1000;
const checkedPurchaseAnnouncements = new Set();
const announcedRevocationRecipients = new Set();
const processingPremiumGiftIds = new Set();
const processingPremiumPurchaseKeys = new Set();
let premiumFastSyncing = false;
let donorTierSyncing = false;
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
    const page = await db(`profiles?select=id,username,display_name,discord_id&order=id.asc&limit=${pageSize}&offset=${offset}`);
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
    const page = await db(`pixlo_premium_entitlements?select=user_id,status,livemode,price_paid,currency,purchased_at,updated_at&status=eq.active&livemode=eq.${liveMode}&order=user_id.asc&limit=${pageSize}&offset=${offset}`);
    if (!Array.isArray(page) || page.length === 0) break;
    entitlements.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  return entitlements;
}

async function getAllPremiumGifts() {
  const gifts = [];
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const page = await db(`pixlo_premium_gifts?select=id,giver_user_id,recipient_user_id,gift_type,value_pence,currency,status,created_at,announced_at,award_announced_at&status=in.(completed,revoked)&order=created_at.asc&limit=${pageSize}&offset=${offset}`);
    if (!Array.isArray(page) || page.length === 0) break;
    gifts.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  return gifts;
}

async function getAllPremiumRevocations() {
  const events = [];
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const page = await db(`pixlo_premium_revocation_events?select=id,user_id,username,discord_id,revoked_at,announced_at&announced_at=is.null&order=revoked_at.asc&limit=${pageSize}&offset=${offset}`);
    if (!Array.isArray(page) || page.length === 0) break;
    events.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  return events;
}

async function announcePremiumGift(guild, profiles, gift) {
  const giftId = String(gift?.id || "");
  if (!giftId) {
    console.error("[premium-gift] Skipping a gift record without an id.");
    return;
  }
  if (processingPremiumGiftIds.has(giftId)) {
    console.log(`[premium-gift] duplicate in-flight processing skipped for gift ${giftId}`);
    return;
  }
  processingPremiumGiftIds.add(giftId);
  try {
    await announcePremiumGiftOnce(guild, profiles, gift);
  } finally {
    processingPremiumGiftIds.delete(giftId);
  }
}

async function announcePremiumGiftOnce(guild, profiles, gift) {
  const giverProfile = profiles.find(profile => String(profile.id) === String(gift.giver_user_id));
  const recipientProfile = profiles.find(profile => String(profile.id) === String(gift.recipient_user_id));
  const giverMember = giverProfile?.discord_id ? guild.members.cache.get(String(giverProfile.discord_id)) : null;
  const recipientMember = recipientProfile?.discord_id ? guild.members.cache.get(String(recipientProfile.discord_id)) : null;
  if (!recipientProfile) {
    console.error(`[premium-gift] Cannot announce gift ${gift.id}: recipient profile ${gift.recipient_user_id} was not found`);
    return;
  }

  // Award and revoke are separate events. A revoke must never erase an award that
  // the bot has not yet announced, so award_announced_at is independent of announced_at.
  const awardAlreadyAnnounced = Boolean(gift.award_announced_at) ||
    (gift.status === "completed" && Boolean(gift.announced_at));
  if (!awardAlreadyAnnounced) {
    const channel = await guild.channels.fetch(AWARD_CHANNEL_ID).catch(() => null);
    if (!channel || !channel.isTextBased() || typeof channel.send !== "function") {
      console.error("[premium-gift] Missing or inaccessible gift announcement channel " + AWARD_CHANNEL_ID);
      return;
    }

    // Do not deduplicate by giver/recipient: the same people can exchange multiple gifts.
    // award_announced_at is the per-gift idempotency marker; an old message must not
    // suppress a new gift's announcement.
    const value = Number(gift.value_pence);
    const currency = String(gift.currency || "gbp").toUpperCase();
    let valueText = "Value unavailable";
    try {
      if (Number.isFinite(value)) valueText = new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(value / 100);
    } catch {}
    const giftDate = new Date(gift.created_at || Date.now());
    const validDate = !Number.isNaN(giftDate.getTime());
    const premiumBadgeEmoji = guild.emojis.cache.find(emoji => emoji.name === "White_Premium_Badge") || null;
    const giverText = giverMember ? `<@${giverMember.id}>` : `@${giverProfile?.username || "Pixlo"}`;
    const recipientText = recipientMember ? `<@${recipientMember.id}>` : `@${recipientProfile.username}`;
    const embed = new EmbedBuilder()
      .setColor(EMBED_ORANGE)
      .setTitle("💎 Pixlo Premium Gifted!")
      .setDescription(`🎁 ${giverText} has gifted ${recipientText} **lifetime Pixlo Premium**!`)
      .addFields(
        { name: "💝 Gifted By", value: giverText, inline: true },
        { name: "🎁 Recipient", value: recipientText, inline: true },
        { name: "✨ Gift Value", value: `${valueText} lifetime value`, inline: true },
        { name: "♾️ Access", value: "Lifetime Premium", inline: true },
        { name: "🎟️ Gift Type", value: gift.gift_type === "free" ? "Owner gift" : "Purchased gift", inline: true },
      )
      .setFooter({ text: "Pixlo • Keep earning, keep flexing." })
      .setTimestamp(validDate ? giftDate : new Date());
    if (premiumBadgeEmoji) embed.setThumbnail(premiumBadgeEmoji.imageURL({ extension: "png", size: 256 }));
    else embed.setThumbnail("https://pixlo1.vercel.app/pixlo-premium-icon.svg");

    await channel.send({ embeds: [embed], allowedMentions: { parse: [], users: [], roles: [] } });
    console.log(`[premium-gift] posted ${gift.gift_type} Premium gift announcement for recipient ${recipientProfile.username} (gift ${gift.id})`);

    const awardAnnouncedAt = new Date().toISOString();
    const patch = await db(`pixlo_premium_gifts?id=eq.${encodeURIComponent(String(gift.id))}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ award_announced_at: awardAnnouncedAt }),
    });
    if (patch === null) console.warn(`[premium-gift] Award announcement sent/verified but award marker could not be confirmed for gift ${gift.id}`);
    return;
  }

  // Legacy gift-row revocations are only a fallback. The durable revocation-event
  // queue owns the actual revocation announcement, so never send a second one here.
}
async function announcePremiumPurchase(guild, member, entitlement) {
  const purchaseKey = `${member.id}:${entitlement.purchased_at || entitlement.updated_at || "unknown"}`;
  if (checkedPurchaseAnnouncements.has(purchaseKey) || processingPremiumPurchaseKeys.has(purchaseKey)) return;
  processingPremiumPurchaseKeys.add(purchaseKey);
  try {
    await announcePremiumPurchaseOnce(guild, member, entitlement, purchaseKey);
  } finally {
    processingPremiumPurchaseKeys.delete(purchaseKey);
  }
}

async function announcePremiumPurchaseOnce(guild, member, entitlement, purchaseKey) {
  if (checkedPurchaseAnnouncements.has(purchaseKey)) return;
  const channel = await guild.channels.fetch(AWARD_CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased() || typeof channel.send !== "function") {
    console.error("[premium-role] Missing or inaccessible Premium purchase announcement channel " + AWARD_CHANNEL_ID);
    return;
  }

  // Avoid duplicate purchase confirmations during periodic reconciliation/restarts.
  try {
    const recent = await channel.messages.fetch({ limit: 100 });
    const alreadyAnnounced = recent.some(message =>
      message.author.id === client.user.id &&
      message.embeds.some(embed =>
        embed.title === "💎 Pixlo Premium Successfully Purchased!" &&
        (embed.fields || []).some(field =>
          field.name === "👤 Member" && field.value.includes(member.id)
        )
      )
    );
    if (alreadyAnnounced) { checkedPurchaseAnnouncements.add(purchaseKey); return; }
  } catch (error) {
    console.warn("[premium-role] Could not check existing purchase announcements:", error instanceof Error ? error.message : error);
  }

  const purchasedAt = entitlement.purchased_at || entitlement.updated_at || new Date().toISOString();
  const purchasedDate = new Date(purchasedAt);
  const validDate = !Number.isNaN(purchasedDate.getTime());
  const amount = Number(entitlement.price_paid);
  const currency = String(entitlement.currency || "gbp").toUpperCase();
  const amountText = Number.isFinite(amount)
    ? new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount / 100)
    : "Amount unavailable";

  const premiumBadgeEmoji = guild.emojis.cache.find(emoji => emoji.name === "White_Premium_Badge") || null;
  const embed = new EmbedBuilder()
    .setColor(EMBED_ORANGE)
    .setTitle("💎 Pixlo Premium Successfully Purchased!")
    .setDescription(`🎉 <@${member.id}> has successfully purchased **Pixlo Premium — Lifetime**.`)
    .addFields(
      { name: "👤 Member", value: `<@${member.id}>`, inline: true },
      { name: "💳 Amount Spent", value: amountText, inline: true },
      { name: "📅 Purchase Date", value: validDate ? purchasedDate.toLocaleDateString("en-GB", { timeZone: "Europe/London" }) : "Unavailable", inline: true },
      { name: "🕒 Purchase Time", value: validDate ? purchasedDate.toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }) : "Unavailable", inline: true },
    )
    .setFooter({ text: "Pixlo • Premium purchase confirmation" })
    .setTimestamp(validDate ? purchasedDate : new Date());

  if (premiumBadgeEmoji) {
    embed.setThumbnail(premiumBadgeEmoji.imageURL({ extension: "png", size: 256 }));
  } else {
    embed.setThumbnail("https://pixlo1.vercel.app/pixlo-premium-icon.svg");
  }

  await channel.send({ embeds: [embed], allowedMentions: { parse: [], users: [], roles: [] } });
  checkedPurchaseAnnouncements.add(purchaseKey);
  console.log(`[premium-role] posted purchase confirmation for Discord user ${member.id}`);
}

async function announcePremiumRevocation(guild, member, profile) {
  const discordId = String(member?.id || profile?.discord_id || "");
  const channel = await guild.channels.fetch(REVOCATION_CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased() || typeof channel.send !== "function") {
    console.error("[premium-role] Missing or inaccessible Premium revocation channel " + REVOCATION_CHANNEL_ID);
    return false;
  }
  const username = profile?.username ? `@${profile.username}` : (member?.user?.username || "Pixlo member");
  const memberText = discordId ? `<@${discordId}>` : username;
  const embed = new EmbedBuilder()
    .setColor(0xE05A47)
    .setTitle("🚫 Pixlo Premium Revoked")
    .setDescription(`Premium access for ${memberText} (${username}) has been revoked. Their Pixlo Premium access is no longer active.`)
    .addFields(
      { name: "👤 Member", value: discordId ? `<@${discordId}>` : username, inline: true },
      { name: "💎 Access", value: "Pixlo Premium — Lifetime", inline: true },
      { name: "📌 Status", value: "Revoked", inline: true },
    )
    .setFooter({ text: "Pixlo • Premium access update" })
    .setTimestamp();
  await channel.send({ embeds: [embed], allowedMentions: { parse: [], users: [], roles: [] } });
  console.log(`[premium-role] posted revocation announcement for ${discordId ? `Discord user ${discordId}` : username}`);
  return true;
}

async function announcePremiumRevocationEvent(guild, profiles, event) {
  const profile = profiles.find(item => String(item.id) === String(event.user_id)) || {
    id: event.user_id,
    username: event.username,
    discord_id: event.discord_id || null,
  };
  const discordId = String(event.discord_id || profile.discord_id || "");
  const member = discordId ? guild.members.cache.get(discordId) || null : null;
  const posted = await announcePremiumRevocation(guild, member, profile);
  if (!posted) return;
  await db(`pixlo_premium_revocation_events?id=eq.${encodeURIComponent(String(event.id))}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ announced_at: new Date().toISOString() }),
  });
  console.log(`[premium-revocation-queue] marked event ${event.id} announced`);
}

async function syncPremiumRole(guild, profiles, entitlements, gifts = [], revocations = []) {
  const configuredRoleId = process.env.DISCORD_PREMIUM_ROLE_ID || "1558112636044836946";
  const role = guild.roles.cache.get(configuredRoleId) ||
    guild.roles.cache.find(item => item.name.trim().toLowerCase() === "premium") ||
    guild.roles.cache.find(item => item.name.trim().toLowerCase() === "pixlo premium") ||
    guild.roles.cache.find(item => /premium/i.test(item.name));
  if (!role) {
    console.error("[premium-role] No Premium role found. Check DISCORD_PREMIUM_ROLE_ID and the bot's role access.");
    return;
  }

  const profileByDiscordId = new Map(profiles.filter(profile => profile.discord_id).map(profile => [String(profile.discord_id), profile]));
  const activeEntitlementByUserId = new Map(entitlements.filter(item => item.status === "active").map(item => [String(item.user_id), item]));
  const giftedRecipientIds = new Set(gifts.filter(gift => gift.status === "completed").map(gift => String(gift.recipient_user_id)));
  const queuedGiftRevocations = new Set(gifts.filter(gift => gift.status === "revoked" && !gift.announced_at).map(gift => String(gift.recipient_user_id)));
  const queuedRevocationUserIds = new Set(revocations.filter(event => !event.announced_at).map(event => String(event.user_id)));
  let added = 0;
  let removed = 0;
  for (const member of guild.members.cache.values()) {
    if (member.user.bot) continue;
    const profile = profileByDiscordId.get(String(member.id));
    const entitlement = profile ? activeEntitlementByUserId.get(String(profile.id)) : null;
    const shouldHaveRole = Boolean(entitlement);
    const alreadyHasRole = member.roles.cache.has(role.id);
    try {
      if (shouldHaveRole && !alreadyHasRole) {
        await member.roles.add(role.id, "Pixlo Premium lifetime entitlement is active");
        added += 1;
      } else if (!shouldHaveRole && alreadyHasRole) {
        await member.roles.remove(role.id, "Pixlo Premium lifetime entitlement is not active or account is not linked");
        removed += 1;
        if (!queuedGiftRevocations.has(String(profile?.id || "")) && !queuedRevocationUserIds.has(String(profile?.id || ""))) await announcePremiumRevocation(guild, member, profile);
      }
      if (shouldHaveRole && !giftedRecipientIds.has(String(profile?.id || ""))) {
        await announcePremiumPurchase(guild, member, entitlement);
      }
    } catch (error) {
      console.error(`[premium-role] Could not reconcile Premium role or purchase announcement for Discord user ${member.id}:`, error instanceof Error ? error.message : error);
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
    { name: `${customEmojiText(guild, "White_Premium_Badge")}  __Premium:__`, value: "Purchase **Pixlo Premium — Lifetime** through the official Pixlo website." },
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

const DONOR_TIER_KEYS = [
  "donor_supporter",
  "donor_patron",
  "donor_benefactor",
  "donor_sponsor",
  "donor_elite_sponsor",
  "donor_mythic_patron",
  "donor_eternal_benefactor",
];

async function getAllDonationTotals(liveMode) {
  const totals = new Map();
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const page = await db(`pixlo_donations?select=user_id,amount_pence&user_id=not.is.null&livemode=eq.${liveMode}&order=created_at.asc&limit=${pageSize}&offset=${offset}`);
    if (!Array.isArray(page) || page.length === 0) break;
    for (const donation of page) {
      if (typeof donation.user_id !== "string") continue;
      const amount = Number(donation.amount_pence);
      if (Number.isInteger(amount) && amount > 0) totals.set(donation.user_id, (totals.get(donation.user_id) || 0) + amount);
    }
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  return totals;
}

async function syncDonorTierRoles(guild, profiles) {
  if (donorTierSyncing) return;
  donorTierSyncing = true;
  try {
    const configuredDonationsMode = String(process.env.PIXLO_DONATIONS_LIVEMODE || "").trim().toLowerCase();
    const liveMode = configuredDonationsMode
      ? configuredDonationsMode === "true"
      : process.env.PIXLO_PREMIUM_LIVEMODE === "true";

    const [totals, tierRows, badgeDefinitions] = await Promise.all([
      getAllDonationTotals(liveMode),
      db("pixlo_donor_tiers?select=tier_key,badge_id,threshold_pence,discord_role_id&order=threshold_pence.asc"),
      db(`badges?select=id,badge_key&is_active=eq.true&badge_key=in.(${DONOR_TIER_KEYS.join(",")})`),
    ]);
    const badges = Array.isArray(badgeDefinitions)
      ? badgeDefinitions.filter(badge => typeof badge?.id === "string" && typeof badge?.badge_key === "string")
      : [];
    const badgeByKey = new Map(badges.map(badge => [badge.badge_key, badge]));
    if (!Array.isArray(tierRows) || tierRows.length !== DONOR_TIER_KEYS.length || badges.length !== DONOR_TIER_KEYS.length) {
      console.error("[donor-role] donor tier configuration is incomplete. Run the donor badge and donor tier admin migrations in Supabase.");
      return;
    }

    const tierConfigs = tierRows
      .filter(tier => DONOR_TIER_KEYS.includes(String(tier.tier_key)) && badgeByKey.has(String(tier.tier_key)))
      .map(tier => ({
        key: String(tier.tier_key),
        badgeId: String(tier.badge_id),
        thresholdPence: Number(tier.threshold_pence),
        roleId: typeof tier.discord_role_id === "string" ? tier.discord_role_id.trim() : "",
      }))
      .filter(tier => Number.isInteger(tier.thresholdPence) && tier.thresholdPence >= 100 && tier.thresholdPence <= 100000)
      .sort((a, b) => a.thresholdPence - b.thresholdPence)
      .map((tier, index) => ({ ...tier, index }));

    if (tierConfigs.length !== DONOR_TIER_KEYS.length) {
      console.error("[donor-role] one or more database donor tiers are invalid.");
      return;
    }

    const donorBadgeIds = badges.map(badge => badge.id);

    // Read existing awards across all sources so this tier group can stay mutually exclusive.
    const existingAwards = [];
    let awardOffset = 0;
    const pageSize = 1000;
    while (true) {
      const page = await db(`user_badges?select=id,user_id,badge_id,source&badge_id=in.(${donorBadgeIds.join(",")})&order=id.asc&limit=${pageSize}&offset=${awardOffset}`);
      if (!Array.isArray(page) || page.length === 0) break;
      existingAwards.push(...page);
      if (page.length < pageSize) break;
      awardOffset += pageSize;
    }
    const awardsByUser = new Map();
    for (const award of existingAwards) {
      const current = awardsByUser.get(String(award.user_id)) || [];
      current.push(award);
      awardsByUser.set(String(award.user_id), current);
    }

    const configuredTiers = tierConfigs
      .filter(tier => /^\d{15,22}$/.test(tier.roleId))
      .map(tier => {
        const role = guild.roles.cache.get(tier.roleId);
        if (!role) console.error(`[donor-role] Could not find Discord role ${tier.roleId} configured in the Pixlo admin area for ${tier.key}.`);
        return { ...tier, role };
      })
      .filter(tier => Boolean(tier.role));

    let assigned = 0;
    let removed = 0;
    let badgesAwarded = 0;
    let badgesReplaced = 0;

    for (const profile of profiles) {
      const userId = String(profile.id || "");
      if (!userId) continue;

      const totalPence = totals.get(userId) || 0;
      let donationTierIndex = -1;
      for (const tier of tierConfigs) {
        if (totalPence >= tier.thresholdPence) donationTierIndex = tier.index;
      }

      const discordId = String(profile.discord_id || "");
      const member = discordId
        ? (guild.members.cache.get(discordId) || await guild.members.fetch(discordId).catch(() => null))
        : null;

      // A role granted in Discord can upgrade a profile badge. If a donor's
      // donation tier is higher, the tier reached by donations takes precedence.
      let heldRoleTierIndex = -1;
      if (member) {
        for (const tier of configuredTiers) {
          if (member.roles.cache.has(tier.roleId)) heldRoleTierIndex = Math.max(heldRoleTierIndex, tier.index);
        }
      }
      const effectiveTierIndex = Math.max(donationTierIndex, heldRoleTierIndex);
      const effectiveTier = effectiveTierIndex >= 0 ? tierConfigs[effectiveTierIndex] : null;
      const desiredBadge = effectiveTier ? badgeByKey.get(effectiveTier.key) || null : null;

      // Sync to exactly one donor role. Blank role fields simply mean that tier's
      // Discord automation is disabled; the profile badge can still be awarded.
      if (member && configuredTiers.length) {
        const exactDesiredRole = configuredTiers.find(tier => tier.index === effectiveTierIndex);
        if (effectiveTierIndex < 0 || exactDesiredRole) {
          for (const tier of configuredTiers) {
            const hasRole = member.roles.cache.has(tier.roleId);
            const shouldHaveRole = effectiveTierIndex >= 0 && tier.index === effectiveTierIndex;
            if (shouldHaveRole && !hasRole) {
              await member.roles.add(tier.roleId, `Pixlo donor reached ${effectiveTier.key}`);
              assigned += 1;
            } else if (!shouldHaveRole && hasRole) {
              await member.roles.remove(tier.roleId, "Pixlo donor tier upgraded or reconciled");
              removed += 1;
            }
          }
        } else if (effectiveTier) {
          console.warn(`[donor-role] ${effectiveTier.key} has no mapped role in the Pixlo admin area; existing donor roles were left unchanged.`);
        }
      }

      // Donor tiers are a single upgrade slot, not a cumulative stack.
      const previousAwards = awardsByUser.get(userId) || [];
      let keptDesiredManualBadge = false;
      for (const award of previousAwards) {
        const shouldKeep = Boolean(
          desiredBadge &&
          award.badge_id === desiredBadge.id &&
          award.source === "manual" &&
          !keptDesiredManualBadge
        );
        if (shouldKeep) {
          keptDesiredManualBadge = true;
          continue;
        }
        await db(`user_badges?id=eq.${encodeURIComponent(award.id)}`, {
          method: "DELETE",
          headers: { Prefer: "return=minimal" },
        });
        badgesReplaced += 1;
      }

      if (desiredBadge && !keptDesiredManualBadge) {
        await db("user_badges", {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ user_id: userId, badge_id: desiredBadge.id, source: "manual" }),
        });
        badgesAwarded += 1;
      }
    }

    console.log(`[donor-role] synced database-managed tiers: ${assigned} role(s) added, ${removed} removed; ${badgesAwarded} current tier badge(s) awarded and ${badgesReplaced} old donor badge(s) replaced.`);
  } finally {
    donorTierSyncing = false;
  }
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

    const linkedProfiles = Array.isArray(profiles) ? profiles : [];
    const awards = Array.isArray(currentAwards) ? currentAwards : [];

    // Donor tiers are synchronised by amount + highest donor role, not by the
    // generic role-mapping table, so older donor badges cannot stack back up.
    let donorBadgeIds = new Set();
    try {
      const donorDefinitions = await db(`badges?select=id,badge_key&badge_key=in.(${DONOR_TIER_KEYS.join(",")})`);
      if (Array.isArray(donorDefinitions)) {
        donorBadgeIds = new Set(donorDefinitions.map(badge => String(badge.id)));
      }
    } catch (error) {
      console.error("[badge-sync] Could not load donor badge definitions for role-mapping exclusion:", error instanceof Error ? error.message : error);
    }
    const mappings = (Array.isArray(roleMappings) ? roleMappings : [])
      .filter(mapping => !donorBadgeIds.has(String(mapping.badge_id)));
    console.log(`[badge-sync] loaded ${mappings.length} non-donor role-to-badge mappings and ${linkedProfiles.length} Pixlo profiles linked to Discord; server member cache has ${guild.members.cache.size} members`);

    try {
      const [premiumEntitlements, premiumGifts, premiumRevocations] = await Promise.all([
        getAllPremiumEntitlements(),
        getAllPremiumGifts(),
        getAllPremiumRevocations().catch(error => {
          console.error("[premium-revocation-queue] could not read revocation events (run the latest Supabase migration):", error instanceof Error ? error.message : error);
          return [];
        }),
      ]);
      await syncPremiumRole(guild, linkedProfiles, premiumEntitlements, premiumGifts, premiumRevocations);
      for (const gift of premiumGifts) {
        try { await announcePremiumGift(guild, linkedProfiles, gift); }
        catch (error) { console.error("[premium-gift] announcement failed:", error instanceof Error ? error.message : error); }
      }
      for (const event of premiumRevocations) {
        try { await announcePremiumRevocationEvent(guild, linkedProfiles, event); }
        catch (error) { console.error("[premium-revocation-queue] announcement failed:", error instanceof Error ? error.message : error); }
      }
    } catch (error) {
      console.error("[premium-role] entitlement sync failed:", error instanceof Error ? error.message : error);
    }
    try {
      await syncDonorTierRoles(guild, linkedProfiles);
    } catch (error) {
      console.error("[donor-role] donor tier role sync failed (check the donor SQL migration and configured role IDs):", error instanceof Error ? error.message : error);
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
      const premiumRoleId = process.env.DISCORD_PREMIUM_ROLE_ID || "1558112636044836946";
      if (roleId === premiumRoleId) {
        pendingRoleChanges.delete(key);
        continue;
      }
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

  // Premium payments and gifts are time-sensitive; reconcile separately from badge sync.
  // This reduces announcement latency from up to five minutes to roughly 15 seconds.
  setInterval(() => {
    if (premiumFastSyncing || syncing) return;
    premiumFastSyncing = true;
    void (async () => {
      try {
        const guild = client.guilds.cache.get(GUILD_ID) || await client.guilds.fetch(GUILD_ID);
        const [profiles, entitlements, gifts, revocations] = await Promise.all([
          getAllProfiles(),
          getAllPremiumEntitlements(),
          getAllPremiumGifts(),
          getAllPremiumRevocations().catch(error => {
            console.error("[premium-revocation-queue] could not read revocation events (run the latest Supabase migration):", error instanceof Error ? error.message : error);
            return [];
          }),
        ]);
        await syncPremiumRole(guild, profiles, entitlements, gifts, revocations);
        await syncDonorTierRoles(guild, profiles);
        console.log(`[premium-fast-sync] loaded ${profiles.length} profiles, ${entitlements.length} active entitlements, ${gifts.filter(gift => gift.status === "completed" && !gift.award_announced_at && !gift.announced_at).length + gifts.filter(gift => gift.status === "revoked" && !gift.award_announced_at).length} unannounced completed gifts, ${revocations.length} pending revocations`);
        for (const gift of gifts) {
          try { await announcePremiumGift(guild, profiles, gift); }
          catch (error) { console.error("[premium-gift] fast announcement check failed:", error instanceof Error ? error.message : error); }
        }
        for (const event of revocations) {
          try { await announcePremiumRevocationEvent(guild, profiles, event); }
          catch (error) { console.error("[premium-revocation-queue] fast announcement check failed:", error instanceof Error ? error.message : error); }
        }
      } catch (error) {
        console.error("[premium-fast-sync] failed:", error instanceof Error ? error.message : error);
      } finally {
        premiumFastSyncing = false;
      }
    })();
  }, PREMIUM_SYNC_INTERVAL_MS);
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
