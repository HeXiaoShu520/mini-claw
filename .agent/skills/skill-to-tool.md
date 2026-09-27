---
name: skill-to-tool
description: 把固化的流程封装为脚本能力（写代码、进策略名单）
---

# 流程转脚本（Skill → Script）

当一个流程已经固化（步骤固定、高频使用、需要授权边界），把它从"说明书"升级为"脚本能力"。

## 为什么转

工具把固定流程、参数校验和结果处理封装成实际执行能力。注册后的工具调用受 `.agent/permissions.json` 的个人策略约束；工具内部代码由本人信任并管理，调用门禁不是代码沙箱。

## 什么时候不转

判断型工作（代码审查、调试分析、需求讨论）留在技能里——每一步取决于现场情况，转成脚本反而僵化。

## 转换步骤

### 1. 读取并分析技能

读取 `.agent/skills/{name}.md`，提炼：
- 固定的步骤序列
- 变化的输入（哪些是参数、哪些是常量）
- 外部依赖（命令、API、文件路径）

### 2. 编写脚本

写入 **`.agent/tools/`**（顶层，子目录不扫）——注册表只扫这个目录，别写到 `.agent/scripts/`。
文件必须**导出**含 `name` + `execute` 的对象，`export default` 最省事：

```typescript
// .agent/tools/{name}.ts
export default {
  name: "{name}",
  label: "{name}",
  description: "一句话说明用途 + 何时使用（模型据此决定何时调用）",
  parameters: {
    type: "object",
    properties: { target: { type: "string", description: "目标参数" } },
    required: ["target"],
  },
  execute: async (_toolCallId, params) => {
    const { target } = params as { target: string };
    // 固化流程：校验参数 → 执行 → 返回结果
    return { content: [{ type: "text" as const, text: "完成" }], details: {} };
  },
};
```

要点：
- **变化的做成 `parameters`，固定的写进代码**——参数越少越安全
- 返回值固定为 `{ content: [...], details: {} }`；失败直接 `throw`
- `.ts` 工具在进程内直接执行，**没有超时**（30 秒硬超时只对 `.py` 生效）；逻辑复杂/耗时长时优先拆分
- 名字**不能**与内置 `read` / `write` / `edit` / `bash` / `browser` / `memory` / `background_task` / `mcp` / `ask_user_question` / `schedule_manager` 冲突——注册表跳过并告警
- 需要每次都弹授权卡时，在导出对象上加 `risk: "high"`
- 拿不到 `_caller`（身份只注入给项目内置工具），所以**依赖用户身份的工具不能放这儿**，得写进 `src/`

> ⚠️ **最易踩的坑**：模块里找不到含 `name`+`execute` 的导出时，注册表**静默跳过**——不打日志、不报错，
> 表现就是“工具根本没出现过”。写完先看启动日志里的 Tools 计数，再在会话里试调一次。

也支持 `.py`：首行写 `#! {"name":…,"description":…,"parameters":…}` 元数据，参数从 **stdin** 读 JSON、
结果从 **stdout** 输出 JSON，执行时另起 python 子进程（30 秒超时、10MB 缓冲）。
新工具优先用 `.ts`——不必赌用户机器上有没有 python。

### 3. 策略授权

在 `.agent/permissions.json` 的 `allow` 数组中添加工具名（保留现有条目）：

```json
{ "allow": ["Tools(my-name)"] }
```

需要模型审核时，在 `ask` 数组添加 `Tools(my-name)`；需要直接禁止时，在 `deny` 数组添加它。优先级为 deny、高风险本人确认、ask、allow，未匹配默认拒绝。这里没有用户分组；只有本人能够发起操作。

注册与授权各自独立：工具注册后会把名称、description 和参数 schema 提供给模型；权限配置控制执行，不负责隐藏工具或停止注册。自定义工具只扫描 `.agent/tools/` 顶层，目录不存在时可自行创建。

### 4. 收尾

- 与用户确认效果，必要时删除原技能文件（能力已收进脚本，说明书可留可删）
- **重启进程生效**——工具集在进程内只加载一次（`customToolsOnce`），只 `/new` 不够
