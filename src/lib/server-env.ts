import fs from "node:fs";
import path from "node:path";

function parseEnvFile(file: string): Record<string, string> {
  try {
    if (!fs.existsSync(file)) return {};
    const source = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
    const values: Record<string, string> = {};
    for (const rawLine of source.split(/\r?\n/)) {
      let line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      if (line.startsWith("export ")) line = line.slice(7).trim();
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      } else {
        value = value.replace(/\s+#.*$/, "").trim();
      }
      values[match[1]] = value;
    }
    return values;
  } catch {
    return {};
  }
}

function readProjectEnv(): Record<string, string> {
  const values: Record<string, string> = {};
  let current = path.resolve(process.cwd());
  for (let depth = 0; depth < 6; depth += 1) {
    // .env.local is deliberately read first and wins over inherited process.env.
    for (const filename of [".env.local", ".env"]) {
      const parsed = parseEnvFile(path.join(current, filename));
      for (const [key, value] of Object.entries(parsed)) {
        if (!(key in values) && value.trim()) values[key] = value.trim();
      }
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return values;
}

export function serverEnv(name: string): string | undefined {
  const localValue = readProjectEnv()[name];
  if (localValue) return localValue;
  const runtimeValue = process.env[name];
  return runtimeValue?.trim() || undefined;
}
