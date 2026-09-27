import { getDefaultEnvironment } from "@modelcontextprotocol/client/stdio";

/** External executors inherit operating-system settings, never the application's keys. */
export function processEnvironment(
  extra: Record<string, string> = {},
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = getDefaultEnvironment();
  for (const key of [
    "PATH",
    "PATHEXT",
    "SYSTEMROOT",
    "WINDIR",
    "TEMP",
    "TMP",
    "LANG",
    "LC_ALL",
    "COMSPEC",
    "LOCALAPPDATA",
    "APPDATA",
  ]) {
    if (process.env[key]) env[key] = process.env[key];
  }
  return { ...env, ...extra };
}
