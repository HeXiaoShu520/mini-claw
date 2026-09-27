import type { ToolDefinition } from "@earendil-works/pi-coding-agent";
import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import {
  resourceEnabled,
  type ResourceSelection,
} from "../resources/config.ts";
import { loadToolModule } from "./module-loader.ts";

export const DEFAULT_BUILTIN_TOOLS = ["read", "write", "edit", "bash"] as const;
const RESERVED_TOOL_NAMES = new Set<string>([
  ...DEFAULT_BUILTIN_TOOLS,
  "browser",
  "memory",
  "background_task",
  "mcp",
  "ask_user_question",
  "schedule_manager",
]);
const MODULE_EXTENSIONS = new Set([".ts", ".js", ".mjs"]);

/** Folders contribute only index modules; implementation helpers are never scanned recursively. */
async function toolFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return [];
      throw error;
    },
  );
  const files: string[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (
      entry.isFile() &&
      MODULE_EXTENSIONS.has(extname(entry.name).toLowerCase())
    )
      files.push(join(dir, entry.name));
    else if (entry.isFile() && extname(entry.name) === ".py")
      throw new Error(
        `${join(dir, entry.name)}: Python 工具请改为 TS/JS 入口，脚本可由 runProcess 调用`,
      );
    else if (entry.isDirectory()) {
      const children = await readdir(join(dir, entry.name), {
        withFileTypes: true,
      });
      const indexes = children.filter(
        (file) => file.isFile() && /^index\.(ts|js|mjs)$/.test(file.name),
      );
      if (indexes.length > 1)
        throw new Error(`${join(dir, entry.name)}: 只能保留一个 index 入口`);
      if (indexes[0]) files.push(join(dir, entry.name, indexes[0].name));
    }
  }
  return files;
}

/** Discovery and validation only; tools own business logic, Guard owns authorization. */
export async function createToolRegistryAsync(
  cwd: string,
  selection: ResourceSelection = { enabled: true, include: ["*"], exclude: [] },
): Promise<ToolDefinition[]> {
  if (!selection.enabled) return [];
  const tools = new Map<string, ToolDefinition>();
  for (const file of await toolFiles(join(cwd, ".agent", "tools"))) {
    for (const tool of await loadToolModule(file)) {
      if (RESERVED_TOOL_NAMES.has(tool.name))
        throw new Error(`${file}: 工具名 ${tool.name} 与内置能力冲突`);
      if (tools.has(tool.name))
        throw new Error(`${file}: 工具名 ${tool.name} 重复`);
      tools.set(tool.name, tool);
    }
  }
  return [...tools.values()].filter((tool) =>
    resourceEnabled(selection, tool.name),
  );
}
