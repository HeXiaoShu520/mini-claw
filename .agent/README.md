# Agent 配置

本工程把 Pi 的 `agentDir` 指向这个目录。个人权限与前端访问控制各自负责一层边界，技能只是业务说明。

| 位置 | 用途 |
|---|---|
| `SYSTEM.md` | 身份、口吻、与具体工具无关的行为约束 |
| `skills/` | 目录式 SKILL.md 或顶层 md，由 Pi 发现；外部来源须在 resources.json 显式添加 |
| `tools/` | TS/JS/MJS 工具入口；可封装独立 TS 脚本 |
| `resources.json` | Skill/自定义 Tool 的启停、include/exclude；Skill 额外路径 |
| `permissions.json` | 个人 `deny / ask / allow` 策略 |
| `mcp.json` | MCP 服务配置；默认没有服务 |
| `extensions/`、`prompts/`、`themes/` | Pi 原生扩展槽位 |

## 权限

所有能力都走同一门禁，顺序为：

1. `deny` 命中立即拒绝，不调用模型、不发确认卡。
2. 工具标记 `risk: "high"` 时，必须本人确认。
3. `ask` 命中进入审核模型，结论为 `allow / confirm / deny`。模型缺失或失败回退本人确认。
4. `allow` 命中直接通过；否则拒绝。

三种数组均使用 `Bash(命令glob)`、`Read(路径glob)`、`Write(路径glob)`、`Tools(工具名glob)`。`Tools(browser:click)` 可以匹配具体动作。`ask` 优先于 `allow`；想降低审核调用量，应缩小 `ask` 范围。

后台 start 另审其 Bash 命令；MCP call 另审具体工具的 `permissionName`；浏览器上传另审本地文件读取。损坏配置清空所有授权，不保留上一版允许项。

## 新增工具

工具说明、参数 schema、执行方法写在工具文件里；工具使用方法和时机写在 `description`。`SYSTEM.md` 不重复工具用法。

工具名不能与内置 `read/write/edit/bash/browser/memory/background_task/mcp/ask_user_question/schedule_manager` 冲突。

运行时加载后缓存技能和自定义工具，修改后重启。权限文件每次调用检查 mtime；MCP 配置在使用时读取，变化后重新连接。MCP 配置中的密钥使用 `${ENV_NAME}` 引用，不写明文。

新增工具不会自动放行，需配置 Tools(name)。工具入口缺失、schema 无效、名称冲突会中止启动并报错。`npm run resources` 查看实际资源，不连接 MCP；`npm run check` 也检查 `.agent/tools` 中的 TS。

完整教程与可用示例见 [扩展教程](../docs/extensions.md)。
