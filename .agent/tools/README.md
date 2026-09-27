# 自定义 Tool

入口支持 `.ts`、`.js`、`.mjs`：

```text
.agent/tools/
  local-time.ts
  json-format/
    index.ts     # 唯一入口
    run.ts       # 独立脚本，不自动注册
    service.ts   # 业务实现，不自动注册
```

导出 default、tool 或 tools，内容为工具对象或数组。工具必须有唯一 name、description、object JSON Schema 和 execute。工具名与内置能力冲突、重复、缺少导出或 schema 无效都会明确中止启动。

## 推荐写法

- 进程内逻辑用 `src/tools/sdk.ts` 的 defineTool，返回字符串或 JSON。
- 独立 TS 脚本用 `src/tools/script-tool.ts` 的 defineScriptTool，JSON stdin、文本/JSON stdout，支持取消、超时、输出限制及进程树回收。
- 图片和增量输出直接导出原生 Pi ToolDefinition。
- 旧 `.py` 元数据工具不再自动注册；Python 业务可以通过 TS 入口调用 runProcess。

完整可用示例在 [examples/tools](../../examples/tools)。复制到本目录后，在 `../resources.json` 选择注册，在 `../permissions.json` 配置 Tools(name) 的 allow/ask/deny；注册不会自动授权。

工具用法与调用时机写在 description，SYSTEM.md 保留与工具无关的约束。模块导入阶段只定义对象；进程、索引和连接状态应放在服务层。

`npm run resources` 查看发现结果，`npm run check` 检查 TS。资源修改后重启，只有权限规则修改支持即时生效。

MCP 外部服务配置在 `../mcp.json`，不需要复制其工具到这个目录。

详细教程：[Skill、Tool 与 MCP](../../docs/extensions.md)。
