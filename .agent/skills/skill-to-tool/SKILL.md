---
name: skill-to-tool
description: 将固定、高频流程封装为 TypeScript 工具或独立脚本，配置注册与执行授权。
---

# 流程转工具

判断依赖现场情况的工作保留在 Skill；步骤固定且需要重复执行的工作封装为 Tool。

## 目录与入口

工具放在 `.agent/tools/name.ts`，或者 `.agent/tools/name/index.ts`。支持 TS/JS/MJS。
文件导出 `default`、`tool` 或 `tools`；对象为一个工具，数组为多个工具。
工具目录只扫描 index 入口，其余脚本和业务模块由入口引用，不自动注册。

推荐从工程根目录的 `examples/tools/local-time.ts` 或 `examples/tools/json-format/` 复制。
完整接口、路径和权限说明见工程根目录 `docs/extensions.md`。

## 两种实现

1. **进程内工具**：从 `src/tools/sdk.ts` 导入 `defineTool`，声明 name、description、parameters、execute。
   execute 接收业务参数和 `{ cwd, signal }`，返回普通字符串或 JSON 数据，SDK 转成工具文本结果。
   signal 应传给支持取消的 API。进程内代码不能被强制终止，耗时任务使用独立脚本。
2. **独立 TS 脚本**：从 `src/tools/script-tool.ts` 导入 `defineScriptTool`。
   script 用 `new URL("./run.ts", import.meta.url)` 定位；默认超时 30 秒。
   脚本从 stdin 读 JSON 参数，stdout 输出业务文本或 JSON，stderr 写诊断，失败用非零退出码。
   框架负责受限环境、超时、取消和进程树回收，不继承应用与用户密钥。

需要原生图片内容或增量进度时，可直接导出 Pi ToolDefinition，不必使用简化 SDK。
工具用法、调用时机及参数要求写入 description，不写进 SYSTEM.md。

## 注册与授权

- `.agent/resources.json` 选择工具是否注册，按工具名匹配 include/exclude。
- `.agent/permissions.json` 决定调用是否执行：`Tools(name)` 加入 allow、ask 或 deny。
- `risk: "high"` 强制本人确认，仍不能覆盖 deny。
- 工具名不得与内置能力冲突；重复名称、缺少导出、无效 schema 会在启动时明确报错。
- 原生模块在服务进程内运行，属于本人信任的代码。工具名门禁不会自动检查其内部每个文件/API 操作。
- 旧 Python 元数据工具不再自动注册；Python 业务可由 TS 入口使用 runProcess 调用。

## 收尾

运行 `npm run check` 检查 TS，包括 `.agent/tools` 和示例；运行 `npm run resources` 查看实际发现结果。
资源快照在进程内缓存，Skill、Tool、resources.json 修改后重启；仅 `/new` 不重新加载。
权限策略按 mtime 重载，修改权限不需要重启。
