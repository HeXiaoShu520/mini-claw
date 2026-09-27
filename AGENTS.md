# mini-claw

部署在本人电脑上的个人 Agent，以 Pi AgentSession 为内核，飞书是交互入口。只接受本人指令，不做团队、角色或多用户管理。模型能力受 `.agent/permissions.json` 约束；MiniPet 应用保留在本机，暂不提交。

## 常用命令

- 启动：`npm start`（`tsx src/main.ts`）
- 开发热重载：`npm run dev`
- 类型检查：`npm run check`
- 测试：`npm test`（vitest）
- 初始化向导：`npm run setup`
- 资源清单：`npm run resources`（不连接飞书/MCP）

## 目录结构

- `src/` — 源码
  - `main.ts` 装配与启动
  - `feishu/` 飞书接入（消息、卡片、传输、用户授权）
  - `runtime/` Pi 运行时封装（会话、资源加载、系统提示）
  - `permission/` 权限策略解析
  - `guard/` 工具调用审核（deny 拒绝、ask 模型审核、本人确认）
  - `assistant/` 个人能力装配；不承载各能力业务逻辑
  - `browser/` 浏览器服务与 Pi 工具适配
  - `memory/` 个人记忆、增量历史索引与工具适配
  - `tasks/` 后台进程、任务记录、日志与工具适配
  - `mcp/` 配置、按需连接、工具/资源/提示调用
  - `process/` 子进程环境、执行与进程树回收
  - `resources/` 扩展选择配置、Pi 资源适配与资源快照
  - `tools/` 本地工具发现/校验、简化 SDK 与独立脚本适配
- `.agent/` — Agent 配置目录（详见 `.agent/README.md`）
  - `SYSTEM.md` 系统提示 / 人格（pi 原生发现，本仓库的 agentDir 指向此目录）
  - `skills/` 技能（pi 原生约定）
  - `permissions.json` 权限策略（本工程自研）
  - `tools/` 自定义工具（本工程自研）
  - `resources.json` Skill/自定义 Tool 的注册选择（执行授权另走 permissions.json）
  - `mcp.json` 外部 MCP 服务配置（按需连接）
- `data/` — 非会话运行时数据（记忆、用户、凭证、会话索引、共享缓存），已被 `.gitignore` 排除
- `work_space/` — 会话目录根：一次会话一个目录（`{sessionId}/`），jsonl、图片、附件、OCR 过程文件全在里面
- `docs/` — 架构与命令文档：`architecture.md`、`commands.md`

## 约定与已知坑

- **给模型的指令集中在 `.agent/SYSTEM.md`**。pi 自行发现 `<agentDir>/SYSTEM.md`（本仓库 `agentDir = <仓库>/.agent`），代码里不再有自写的人格/规则常量。
- **指令分层准则**：`.agent/SYSTEM.md` 只写「与工具无关的恒真约束」（身份、口吻、安全行为、输出形态）；凡「某个工具怎么用 / 什么时候用」的策略，一律写在该工具的 `description` 里（如 `src/memory/tool.ts` 返回对象上的 `description` 字段）。工具描述随注册进入请求，注册与否自动同增同减；写进静态的 `SYSTEM.md` 就会出现「提示教模型用一个不存在的工具」。
- **本文件由 pi 自动追加为项目上下文**（`<project_context><project_instructions>`），无需任何自写加载代码。
- pi 的 `promptSnippet` / `promptGuidelines` 在本工程**不会生效**：`buildSystemPrompt` 在 customPrompt（= `SYSTEM.md`）分支会提前 `return`，这两个字段只在 pi 的默认提示分支被消费，别在这上面绕。
- 项目上下文有白名单（`agentsFilesOverride`）：只接受工程目录内的文件，避免祖先目录（含盘根）的 `AGENTS.md` 不经任何信任检查地进入系统提示。
- 改动 `.agent/SYSTEM.md` **需要重启进程**才生效（ResourceLoader 在进程内只创建一次）。
- 权限是 **fail-safe**：`permissions.json` 未明确放行的调用一律拦截，规则写错的表现是"工具全不可用"而不是"全部放行"。
- 权限顺序：deny 硬拒绝 → 高风险本人确认 → ask 审核模型 → allow 放行 → 默认拒绝。ask 才调用模型，审核失败回退本人确认。后台命令和 MCP 具体工具另行审核，不能借通用工具名绕过规则。
- 服务层不依赖飞书和 Pi；工具适配层不持有进程、凭证或索引的生命周期。`main.ts` 负责装配与退出回收。
- Skill 解析使用 Pi 原生实现；工具只扫描顶层 TS/JS/MJS 与子目录 index 入口，不扫描业务辅助文件。工具导出与 schema 校验失败、重复名称或内置名称冲突会明确中止启动；不静默跳过。
- Skill 默认只发现 `.agent/skills`，外部来源须在 resources.json 的 skills.paths 显式加入；不自动读入电脑全局 `.agents/skills`。
- 独立脚本用 `defineScriptTool`，参数走 JSON stdin；业务 stdout、诊断 stderr，非零退出码 throw。子进程复用 process/ 的环境、取消、超时和进程树回收，不另造一套执行器。
- 浏览器、MCP、记忆索引按需启动；不添加默认心跳、自我学习或后台模型轮询。
- 思考档位支持 `off` / `low` / `high` / `max`，默认 `off`；旧档位 minimal/medium/xhigh/ultra 会告警并折算，未知值告警后回退 `off`。
- `.gitignore` 忽略了 `.pi/`，配置不要放到 `.pi/`（会被静默排除出版本库）。
- 模型与档位等运行时配置走 `.env`（不入库），字段说明见 `.env.example`。
