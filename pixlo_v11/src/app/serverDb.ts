import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type PixloUser = {
  id: string;
  username: string;
  displayName: string;
  discordId?: string;
  discordUsername?: string;
  discordDisplayName?: string;
  discordAvatar?: string;
  discordAvatarDecoration?: string;
  useDiscordAvatar?: boolean;
  useDiscordDecoration?: boolean;
  createdAt: string;
  updatedAt: string;
};

const filePath = path.join(process.cwd(), "data", "users.json");

async function readUsers(): Promise<PixloUser[]> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as PixloUser[];
  } catch {
    return [];
  }
}

async function writeUsers(users: PixloUser[]) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(users, null, 2), "utf8");
}

export async function findUserById(id: string) {
  return (await readUsers()).find(user => user.id === id) || null;
}

export async function findUserByDiscordId(discordId: string) {
  return (await readUsers()).find(user => user.discordId === discordId) || null;
}

export async function findUserByUsername(username: string) {
  return (await readUsers()).find(user => user.username.toLowerCase() === username.toLowerCase()) || null;
}

export async function upsertDiscordUser(input: {
  id: string;
  username: string;
  avatar?: string | null;
  avatarDecoration?: string | null;
  pixloUsername: string;
  displayName?: string;
}) {
  const users = await readUsers();
  const now = new Date().toISOString();
  const normalizedPixloUsername = input.pixloUsername.trim().toLowerCase();

  const discordOwner = users.find(user => user.discordId === input.id) || null;
  const pixloOwner = users.find(user => user.username.toLowerCase() === normalizedPixloUsername) || null;

  if (discordOwner && discordOwner.username.toLowerCase() !== normalizedPixloUsername) {
    throw new Error("That Discord account is already linked to another Pixlo account.");
  }

  const existing = discordOwner || pixloOwner;
  if (existing) {
    existing.username = normalizedPixloUsername || existing.username;
    existing.displayName = input.displayName?.trim() || existing.displayName || input.username;
    existing.discordId = input.id;
    existing.discordUsername = input.username;
    existing.discordDisplayName = input.displayName?.trim() || input.username;
    existing.discordAvatar = input.avatar || undefined;
    existing.discordAvatarDecoration = input.avatarDecoration || undefined;
    existing.updatedAt = now;
    await writeUsers(users);
    return existing;
  }

  const user: PixloUser = {
    id: randomUUID(),
    username: normalizedPixloUsername || `user-${input.id.slice(-6)}`,
    displayName: input.displayName?.trim() || input.username,
    discordId: input.id,
    discordUsername: input.username,
    discordDisplayName: input.displayName?.trim() || input.username,
    discordAvatar: input.avatar || undefined,
    discordAvatarDecoration: input.avatarDecoration || undefined,
    createdAt: now,
    updatedAt: now,
  };
  users.push(user);
  await writeUsers(users);
  return user;
}

export async function updateDiscordPreferences(userId: string, input: {
  useDiscordAvatar?: boolean;
  useDiscordDecoration?: boolean;
}) {
  const users = await readUsers();
  const user = users.find(item => item.id === userId);
  if (!user) return null;
  if (typeof input.useDiscordAvatar === "boolean") user.useDiscordAvatar = input.useDiscordAvatar;
  if (typeof input.useDiscordDecoration === "boolean") user.useDiscordDecoration = input.useDiscordDecoration;
  user.updatedAt = new Date().toISOString();
  await writeUsers(users);
  return user;
}

export async function clearDiscordLink(userId: string) {
  const users = await readUsers();
  const user = users.find(item => item.id === userId);
  if (!user) return null;
  delete user.discordId;
  delete user.discordUsername;
  delete user.discordDisplayName;
  delete user.discordAvatar;
  delete user.discordAvatarDecoration;
  user.useDiscordAvatar = false;
  user.useDiscordDecoration = false;
  user.updatedAt = new Date().toISOString();
  await writeUsers(users);
  return user;
}

export async function updateUsername(userId: string, username: string, displayName: string) {
  const users = await readUsers();
  const user = users.find(item => item.id === userId);
  if (!user) return null;
  user.username = username;
  user.displayName = displayName;
  user.updatedAt = new Date().toISOString();
  await writeUsers(users);
  return user;
}
