const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "api", "auth", "account", "accounts",
  "dashboard", "login", "logout", "signup", "register",
  "verify-email", "forgot-password", "reset-password",
  "settings", "profile", "profiles", "premium", "pricing",
  "billing", "checkout", "payment", "payments", "success", "cancel",
  "terms", "privacy", "support", "contact", "about", "help",
  "status", "docs", "blog", "home", "index", "www",
  "robots.txt", "sitemap.xml", "favicon.ico", "manifest.json",
]);

export function isReservedPixloUsername(username: string) {
  return RESERVED_USERNAMES.has(username.trim().toLowerCase());
}
