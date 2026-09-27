import type { Client } from "@larksuiteoapi/node-sdk";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Resolve one explicitly configured person. Never enumerate a department or team at startup. */
export async function resolveOwnerOpenId(
  client: Client,
  identifier: string,
  appId: string,
  dataDir = join(process.cwd(), "data", "users"),
): Promise<string | undefined> {
  if (/^ou_[A-Za-z0-9_]+$/.test(identifier)) return identifier;
  if (!identifier) return undefined;
  const cache = await readFile(join(dataDir, `${appId}_users.json`), "utf8")
    .then(
      (text) =>
        JSON.parse(text) as Record<
          string,
          { name?: string; en_name?: string; email?: string }
        >,
    )
    .catch(() => ({}));
  const matches = Object.entries(cache).filter(([, profile]) =>
    [profile.name, profile.en_name, profile.email].includes(identifier),
  );
  if (matches.length === 1) return matches[0][0];
  if (matches.length > 1 || !identifier.includes("@")) return undefined;
  const result = await client.contact.user
    .batchGetId({
      params: { user_id_type: "open_id" },
      data: { emails: [identifier] },
    })
    .catch(() => undefined);
  return result?.code === 0 ? result.data?.user_list?.[0]?.user_id : undefined;
}
