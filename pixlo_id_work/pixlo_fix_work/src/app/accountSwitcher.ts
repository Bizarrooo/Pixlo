export type SavedPixloAccount = {
  email: string;
  username: string;
  displayName?: string;
  /** Only durable public URLs are stored here; no passwords or auth tokens. */
  avatar?: string;
};

const STORAGE_KEY = "pixlo:saved-accounts:v1";
const MAX_SAVED_ACCOUNTS = 3;

function isBrowser() {
  return typeof window !== "undefined";
}

function normaliseAccount(value: unknown): SavedPixloAccount | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const email = typeof item.email === "string" ? item.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) return null;
  const username = typeof item.username === "string" && item.username.trim()
    ? item.username.trim().slice(0, 32)
    : email.split("@")[0];
  const displayName = typeof item.displayName === "string" && item.displayName.trim()
    ? item.displayName.trim().slice(0, 48)
    : undefined;
  const avatar = typeof item.avatar === "string" && /^https?:\/\//i.test(item.avatar)
    ? item.avatar.slice(0, 2048)
    : undefined;
  return { email, username, ...(displayName ? { displayName } : {}), ...(avatar ? { avatar } : {}) };
}

export function readSavedPixloAccounts(): SavedPixloAccount[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const cleaned: SavedPixloAccount[] = [];
    for (const item of parsed) {
      const account = normaliseAccount(item);
      if (!account || seen.has(account.email)) continue;
      seen.add(account.email);
      cleaned.push(account);
      if (cleaned.length === MAX_SAVED_ACCOUNTS) break;
    }
    return cleaned;
  } catch {
    return [];
  }
}

export function rememberPixloAccount(input: SavedPixloAccount): SavedPixloAccount[] {
  if (!isBrowser()) return [];
  try {
    const account = normaliseAccount(input);
    if (!account) return readSavedPixloAccounts();
    const previous = readSavedPixloAccounts();
    const existing = previous.find(item => item.email === account.email);
    const merged: SavedPixloAccount = {
      ...existing,
      ...account,
      displayName: account.displayName || existing?.displayName,
      avatar: account.avatar || existing?.avatar,
    };
    const next = [merged, ...previous.filter(item => item.email !== account.email)].slice(0, MAX_SAVED_ACCOUNTS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return readSavedPixloAccounts();
  }
}

export function getMaxSavedPixloAccounts() {
  return MAX_SAVED_ACCOUNTS;
}

/** Clear a cached external avatar (used for Discord PFPs) when it's no longer the active Pixlo avatar. */
export function clearSavedPixloAccountAvatar(email: string): SavedPixloAccount[] {
  if (!isBrowser()) return [];
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const next = readSavedPixloAccounts().map(item => item.email === normalizedEmail ? { email: item.email, username: item.username, ...(item.displayName ? { displayName: item.displayName } : {}) } : item);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return readSavedPixloAccounts();
  }
}
