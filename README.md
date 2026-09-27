# mini-claw

部署在本人电脑上的个人 Agent，基于 Pi AgentSession。飞书提供远程交互入口；浏览器、记忆、后台任务和 MCP 提供执行能力。只接受本人指令，使用一套个人权限，不做团队或角色管理。

这是从 feishu-pi 整理出的新工程。本仓库使用全新的 Git 历史。MiniPet 应用暂不包含在仓库里，本机的应用文件仍可保留。

## 开始使用

需要 Node.js 22+、npm、可用的模型接口，以及自己的飞书机器人。浏览器默认复用 Windows 上已安装的 Edge；可改为 Chrome。Python 仅在使用 Python 自定义工具时需要。

```sh
npm ci
npm run setup
```

向导配置飞书应用。在生成的 `.env` 中填写：

```dotenv
FEISHU_PI_OWNER=ou_你的飞书OpenID
FEISHU_PI_MODEL_NAME=你的模型名称
FEISHU_PI_MODEL_BASE_URL=你的模型接口地址
FEISHU_PI_MODEL_API_KEY=你的模型密钥
```

然后运行：

```sh
npm start
```

机器人只处理 `FEISHU_PI_OWNER` 的私聊，以及本人在群中 @机器人的消息。其他人不能启动 Agent 或批准卡片。本人尚未配置或无法识别时，服务停止启动，不自动开放给所有人。

飞书应用需要启用机器人、长连接和 `im.message.receive_v1`、`card.action.trigger`。向导提供预置权限；应用后台提示待发布时，需要发布才能生效。Open ID 可以通过飞书开发者后台的用户 ID 查询工具获取；使用本机器人应用对应的 ID。

## 个人能力

| 能力 | 实现 |
|---|---|
| 权限 | `deny` 硬拒绝；`ask` 审核模型；`allow` 确定性放行；未匹配默认拒绝 |
| 浏览器 | 按需启动 Playwright CLI，持久化独立登录状态，页面快照、点击、输入、上传、截图和人工接管 |
| 记忆 | 一份个人 Markdown 记忆；按需增量索引，关键词、时间过滤、跨会话检索和原文读取 |
| 后台任务 | 启动、状态、日志、取消、超时、并发限制、持久化记录和完成通知 |
| MCP | 按需连接 stdio / Streamable HTTP / 显式 legacy SSE；工具发现与调用、资源和提示读取 |
| 飞书 | 文本、图片、语音、附件、引用、CardKit 2.0 流式回复、人物提及与本人授权 |
| 定时任务 | 一次性、固定间隔、cron、时区、启停和手动执行 |
| 扩展 | Markdown 技能，TS/JS/Python 工具和 Pi 扩展 |

没有默认模型心跳、自动自我学习或后台记忆总结。浏览器和 MCP 未使用时不启动；记忆索引在查询时更新。只有你明确创建的定时任务会定期启动 Agent。

## 权限配置

配置文件：`.agent/permissions.json`。

```json
{
  "deny": ["Read(**/.env*)", "Bash(**.env**)"],
  "ask": ["Bash(*)", "Tools(browser:click)", "Tools(mcp__*)"],
  "allow": ["Read(**)", "Tools(memory)", "Tools(browser)", "Tools(mcp)"]
}
```

顺序为 `deny → 高风险本人确认 → ask → allow → 默认拒绝`。`ask` 优先于 `allow`，所以 `ask: Bash(*)` 表示所有 Bash 调用都审核。默认文件采用这个行为；想让特定命令直接通过，应缩小 `ask` 的范围，并在 `allow` 中列出这些命令。

`FEISHU_GUARD_BASE_URL / FEISHU_GUARD_MODELS / FEISHU_GUARD_API_KEY` 配置 OpenAI 兼容审核接口。未配置、失败或超时回退本人确认。审核结论可以放行、请求本人确认或拒绝；模型和确认卡都不能覆盖 `deny`。权限文件按 mtime 重载，系统提示和技能修改后需重启。

规则约束工具调用参数，不能替代操作系统沙箱。普通 shell 和自定义扩展能执行代码，应只用于本人信任的本机环境。

## 本人账号与机器人身份

- 回复和通知使用当前机器人的应用凭证。
- `MINICLAW_USER_CLI=0` 保留原来的限制：AI 不能使用用户令牌，只允许机器人身份和固定人物资料查询。
- 明确启用 `MINICLAW_USER_CLI=1` 后，用户态 CLI 只使用本人通过本工程 `/login lark` 或 `/login meegle` 授权的令牌。
- 不读取本机 CLI 的默认登录账号；没有有效令牌就拒绝，并引导授权。
- 普通 shell、浏览器和 MCP 不继承模型、飞书应用及用户令牌。MCP 所需密钥必须在配置中明确引用环境变量。

## 扩展与开发

```sh
npm run dev
npm run check
npm test
```

| 目录 | 职责 |
|---|---|
| `src/main.ts`、`src/assistant/` | 依赖装配和生命周期 |
| `src/runtime/` | Pi 会话、身份执行与队列 |
| `src/feishu/` | 消息、卡片、用户授权 |
| `src/permission/`、`src/guard/` | 规则匹配、模型审核、本人确认 |
| `src/browser/` | 浏览器服务和工具适配 |
| `src/memory/` | 记忆存储、历史索引和工具适配 |
| `src/tasks/`、`src/process/` | 后台任务、子进程和回收 |
| `src/mcp/` | MCP 配置、连接和工具适配 |
| `.agent/` | 系统提示、技能、权限、自定义工具、MCP 配置 |

依赖版本由 `package-lock.json` 固定，安装使用 `npm ci`。运行数据、会话、浏览器状态、密钥和本机 MiniPet 应用不入库。

文档：[能力与配置](docs/assistant-capabilities.md) · [架构](docs/architecture.md) · [命令](docs/commands.md) · [账号授权](docs/user-auth.md) · [数据](docs/data-management.md) · [工具扩展](.agent/README.md)。
