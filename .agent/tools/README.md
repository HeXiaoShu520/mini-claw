# 自定义 Tool

把自己编写的工具放在本目录顶层，例如 `.agent/tools/my_tool.ts`。加载器支持 `.ts`、`.js`、`.py`，不递归扫描子目录；这个 README 不会注册为工具。

TS/JS 文件导出工具对象，推荐 `export default`：

```ts
export default {
  name: "my_tool",
  label: "我的工具",
  description: "说明工具的用途、何时使用、参数含义及结果处理要求。",
  parameters: {
    type: "object",
    properties: {
      target: { type: "string", description: "处理目标" },
    },
    required: ["target"],
  },
  execute: async (_toolCallId, params, signal) => {
    signal?.throwIfAborted();
    const { target } = params;
    // 在这里调用实际业务逻辑；失败直接 throw。
    return {
      content: [{ type: "text", text: `收到目标：${target}` }],
      details: {},
    };
  },
};
```

这段代码是结构示例，没有实现具体业务。Python 工具的元数据和输入输出约定见 [工具编写指南](../skills/skill-to-tool.md)。

## 授权和生效

- 将 `Tools(my_tool)` 添加到 `../permissions.json` 的 `allow` 数组可直接放行，添加到 `ask` 数组会进入模型审核，添加到 `deny` 数组会直接拒绝。保留现有条目。
- 工具对象可声明 `risk: "high"`，每次都需要本人确认；该标记不能覆盖 deny。
- 工具名不能与 `read/write/edit/bash/browser/memory/background_task/mcp/ask_user_question/schedule_manager` 冲突。
- 新增或修改工具文件后重启进程；只新建会话不足以重新加载。
- `description` 和 `parameters` 会随工具注册提供给模型；权限配置控制执行，不控制注册或隐藏。

## MCP

`../mcp.json` 保存外部 MCP 服务的启动命令、地址和连接参数。MCP 服务提供的工具通过内置 `mcp` 工具按需发现和调用，不需要复制到本目录。当前 `mcpServers: {}` 表示没有配置外部服务。

完整配置见 [能力与配置](../../docs/assistant-capabilities.md)。
