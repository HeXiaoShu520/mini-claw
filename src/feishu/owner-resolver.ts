import { readFile } from "node:fs/promises";
import { join } from "node:path";

const OPEN_ID = /^ou_[A-Za-z0-9_-]+$/;

function normalizeName(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase();
}

/** 本人配置只匹配一个 Open ID 或已缓存姓名，不在启动时查询通讯录。 */
export async function resolveOwnerOpenId(
  identifier: string,
  appId: string,
  dataDir = join(process.cwd(), "data", "users"),
): Promise<string | undefined> {
  identifier = identifier.trim();
  if (OPEN_ID.test(identifier)) return identifier;
  if (!identifier) return undefined;
  const cache = await readFile(join(dataDir, `${appId}_users.json`), "utf8")
    .then((text) => JSON.parse(text) as unknown)
    .catch(() => ({}));
  if (!cache || typeof cache !== "object" || Array.isArray(cache))
    return undefined;
  const name = normalizeName(identifier);
  const matches = Object.entries(cache).filter(([openId, profile]) => {
    if (!OPEN_ID.test(openId) || !profile || typeof profile !== "object")
      return false;
    const person = profile as { name?: unknown; en_name?: unknown };
    return [person.name, person.en_name].some(
      (value) => typeof value === "string" && normalizeName(value) === name,
    );
  });
  return matches.length === 1 ? matches[0][0] : undefined;
}
