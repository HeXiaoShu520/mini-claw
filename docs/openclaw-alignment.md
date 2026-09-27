# 个人助理的 OpenClaw 对齐路线

核对日期：2026-09-27。本机安装的 OpenClaw 为 2026.9.6；`E:/源丶工程/openclaw-main` 的 package.json 为 2026.6.11，旧目录只能用于模块参考。以下 OpenClaw 能力核对官方现行文档；优先级和实现方案是针对本工程的判断，并不表示本次已经实现这些后续能力。[发布记录](https://github.com/openclaw/openclaw/releases)

目标是部署在本人电脑上的个人 Agent：能执行操作、保留任务进展、随时被打断、扩展业务能力。以下对比覆盖执行、上下文、模型、记忆、自动化、扩展和运行维护。

## 已有能力应继续复用

| 领域 | 本工程已具备 | 与 OpenClaw 的差距 |
|---|---|---|
| Agent 循环 | Pi 工具循环、流式响应、会话恢复 | 产品层的任务状态、预算和进度展示较薄 |
| Skill | Pi 发现 SKILL.md/顶层 md、短描述注入、正文按需读取、显式调用；本次增加选择配置，默认只读项目技能，外部目录显式加入 | OpenClaw 的依赖门禁、安装器、专用分派字段未兼容；不能保证所有第三方技能直接运行。[Skill](https://docs.openclaw.ai/tools/skills) |
| Tool | 原生 TS/JS/MJS 定义、目录 index 入口、简化 SDK、独立 TS 脚本、统一权限 | 缺少完整插件安装/升级/卸载、版本化 SDK 和扩展包清单。[插件开发](https://docs.openclaw.ai/plugins/building-plugins) |
| MCP | 按需连接、工具 schema 校验、具体工具审核、资源/模板/提示、分页、取消和回收 | 缺交互式 OAuth；以通用 mcp 工具按需调用，没有把每个外部工具直接注册成原生工具。[MCP 配置](https://docs.openclaw.ai/gateway/config-extensions) |
| 浏览器 | Playwright CLI、独立持久化 profile、页面交互、截图、人工接管 | 缺多 profile、已有浏览器会话接管、远端 CDP 配置和完整诊断。[浏览器](https://docs.openclaw.ai/tools/browser) |
| 文件/命令 | read/write/edit、受控 shell、CLI 机器人身份与权限审核 | 权限规则与进程回收已具备，尚无 OS 执行沙箱。[沙箱](https://docs.openclaw.ai/gateway/sandboxing) |
| 记忆 | Markdown 记忆、改写归档、增量关键词历史索引与原文读取 | 缺语义/混合检索、压缩前记忆保留、独立偏好与任务检查点层。[检索](https://docs.openclaw.ai/concepts/memory-search)、[记忆](https://docs.openclaw.ai/concepts/memory) |
| 上下文压缩/重试 | Pi 依赖已提供自动 compaction 和瞬时模型错误重试，默认启用 | 本工程没暴露完整配置，也未把压缩/重试事件映射到飞书；不能把这两项算成完全缺失。[OpenClaw 压缩](https://docs.openclaw.ai/concepts/compaction) |
| 后台任务 | 本地进程、状态、日志、取消、超时、完成通知、重启标记 interrupted | 不是独立的后台 AI 会话；没有模型子任务协调与可恢复工作流 |
| 自动化 | 一次性、间隔、cron、时区、持久化任务 | 缺通用事件触发、文件变化、Webhook 入口与任务去重/重入策略。[Hooks](https://docs.openclaw.ai/automation/hooks) |
| 飞书入口 | 多种消息、引用、人物信息、交互卡片、本人授权 | 个人范围已经够用；多平台与多用户能力的收益取决于新的实际需求 |
| 运维 | 单实例锁、退出回收、资料/会话持久化、资源清单命令 | 缺统一 doctor、安装服务/开机启动、升级回滚、备份恢复与完整运行面板。[Doctor](https://docs.openclaw.ai/gateway/doctor) |

Pi 的确认依据是本机锁定版本 0.85.1：`dist/core/settings-manager.js` 中 compaction 和 retry 的缺省开关为 true；`dist/core/agent-session.d.ts` 提供 compact、自动压缩、自动重试以及 steer/followUp 接口。是否被本地 settings 覆盖，需要看实际运行配置。本工程没有重写这些内核功能。

## 推荐顺序

难度说明：低＝可以独立实现一个适配模块；中＝需要调整状态、生命周期或调用链；高＝依赖操作系统、可靠恢复或多个执行后端。

| 顺序 | 能力 | 为什么值得做 | 难度 | 合适的实现位置与 token 影响 |
|---|---|---|---|---|
| 1 | 工具循环检测、单次任务预算 | 重复失败、反复轮询或一直不结束时及时停止；本人得到明确原因。OpenClaw 提供重复/无进展检测，滚动检测默认关闭，压缩后的保护有独立缺省行为。[循环检测](https://docs.openclaw.ai/tools/loop-detection) | 中 | runtime 下独立 RunController，记录次数/耗时/结果摘要；确定性判定，无额外模型调用，主要节省失控消耗 |
| 2 | 任务检查点与上下文状态 | 长任务明确保存目标、已完成步骤、下一步、文件位置；压缩或重启后继续做 | 中 | 独立 task state store，复用 Pi compaction 生命周期；检查点按事件更新，避免默认后台总结。压缩本身仍会消耗模型 token |
| 3 | 联网搜索与网页正文读取 | 查询事实时通常比反复开浏览器更省步骤；浏览器继续负责交互与登录页面。[搜索](https://docs.openclaw.ai/tools/web)、[正文读取](https://docs.openclaw.ai/tools/web-fetch) | 低到中 | 先用合适 MCP 或 TS 工具；有稳定需求后抽 SearchProvider。限制结果长度，按调用收费/消耗 |
| 4 | Windows 桌面控制 | 才能操作没有 CLI/API 的本地软件：读取界面、点击、输入、截图、结果确认。OpenClaw 也依赖平台/节点能力和具体执行后端，不能仅靠一个 Skill 实现。[Nodes](https://docs.openclaw.ai/nodes) | 高 | 新增独立 ComputerService，可接 UI Automation、桌面控制 MCP 或其他实际后端。画面与操作按需进入上下文，图像可能增加消耗 |
| 5 | 更可靠的记忆检索 | 解决换一种表达就搜不到；保留来源、时间和被替换状态 | 中 | MemoryIndex 接口下增加 lexical/embedding 实现；默认关键词，语义索引可选、本地优先。embedding 成本与主模型 token 分开记录 |
| 6 | 模型故障切换与 provider 抽象 | API 故障、限流时更稳；支持真正的多个供应商配置。OpenClaw 已提供认证 profile 与模型 fallback。[故障切换](https://docs.openclaw.ai/concepts/model-failover) | 中 | runtime/model 层；先区分可重试错误和有副作用的工具执行，不重放已完成操作。重试可能增加 token |
| 7 | 诊断、开机启动与备份 | 使用和维护成本更低，遇到卡住能区分网络、模型、权限和进程问题 | 低到中 | 独立 CLI/诊断服务，先读取本地状态；联网探测显式运行。系统服务、备份各自成模块，默认无需模型 |
| 8 | 事件触发和轻量 Hooks | 文件变化、日历到期、外部事件可启动工作；有清晰的去重和防递归规则。[Hooks](https://docs.openclaw.ai/automation/hooks) | 中 | 独立 EventSource → TaskDispatcher，外部事件不直接拼成系统指令；仅实际事件启动模型 |
| 9 | 可控的后台 AI 子任务 | 研究、长编码任务能独立执行、查询进度、取消；多个单用户任务不等于多用户管理。[子代理](https://docs.openclaw.ai/tools/subagents) | 中到高 | 显式任务才启动额外 Pi session，独立预算/权限/上下文；完成事件汇总。会增加 token，不能和后台进程工具混为一谈 |
| 10 | 可版本化的本地扩展包 | 一个目录打包 Skill+Tool+脚本/MCP 引用，方便迁移、启停和回滚 | 中 | 先稳定现有 SDK 和配置再加 manifest；业务层不引用飞书实现。原生 OpenClaw 插件 SDK 仍需专门适配 |

前三项先改善长任务的成本和可恢复性；桌面控制决定个人电脑助理的能力范围，可同步设计执行后端，但实施难度明显更高。优先级来自本工程的现状和个人助理目标，不是对所有部署的通用排名。

## 可以以后按需补的领域

- **文档、表格、图片、邮件、日历**：先通过实际可用的 Skill+Tool/MCP 组合接入，分别处理文件格式与账号授权；需要稳定的服务状态时再抽独立服务。本人的用户令牌限制继续遵守现有固定用途，扩展不能默认取得它。
- **浏览器多 profile/登录会话接管**：遇到真实多账号或接管需求时补 BrowserService 配置，保留页面交互队列。
- **MCP OAuth 与工具检索**：远端服务要求浏览器登录或工具数量变大时再做。当前通用入口已避免开机塞入全部 MCP schema。
- **多设备/远端节点**：另一台电脑或手机需要参与执行时再加；当前本机部署不需要完整节点管理。
- **语音合成、实时语音、电话/会议**：需要额外模型、设备或服务，宜做可关闭的适配，不恢复已删除的默认外部转写配置。
- **执行沙箱**：自主下载/执行外来代码或扩大自动授权时价值增加。单独评估 Windows、本地软件访问和隔离后端，不把 glob 权限当作 OS 隔离。
- **本地控制界面、可交互展示**：未来 MiniPet 或其他 UI 应消费独立状态与事件 API，不把前端状态放进 Agent 业务模块。

## 扩展方式的边界

Skill 能指导模型，但不能提供不存在的桌面执行器、可靠后台调度或会话状态。固定流程可放 TS Tool；已有外部服务可放 MCP；持有生命周期、任务状态、索引或设备连接的能力需要独立 Service 和一个薄 Tool 适配。

本工程继续保留本人模式、按需浏览器/MCP、无默认模型心跳。对齐上述能力时分别配置启动条件与消耗预算；运行维护、确定性检查和索引不应为了执行一次检查就调用主模型。
