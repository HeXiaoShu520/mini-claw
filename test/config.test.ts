import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.ts";

const baseEnv = {
  FEISHU_APP_ID: "cli_x",
  FEISHU_APP_SECRET: "s",
  FEISHU_PI_MODEL_API_KEY: "k",
};

describe("loadConfig", () => {
  it("保留资源配置并读取唯一使用者", () => {
    const config = loadConfig({
      ...baseEnv,
      FEISHU_PI_ADMIN: "ou_owner",
      FEISHU_PI_MAX_RESOURCE_MB: "8",
    });
    expect(config.showModelStats).toBe(true);
    expect(config.maxResourceBytes).toBe(8 * 1024 * 1024);
    expect(config.feishuOwner).toBe("ou_owner");
  });

  it("不再从环境变量读取团队成员名单", () => {
    const config = loadConfig({ ...baseEnv, FEISHU_PI_GROUP: "李雷,韩梅梅" });
    expect("groupMembership" in config).toBe(false);
  });

  it("模型供应商仍由模型名推断", () => {
    expect(
      loadConfig({ ...baseEnv, FEISHU_PI_MODEL_NAME: "claude-sonnet-4-6" })
        .modelProvider,
    ).toBe("anthropic");
    expect(
      loadConfig({ ...baseEnv, FEISHU_PI_MODEL_NAME: "deepseek-v4-flash" })
        .modelProvider,
    ).toBe("deepseek");
    expect(
      loadConfig({ ...baseEnv, FEISHU_PI_MODEL_NAME: "gpt-4o" }).modelProvider,
    ).toBe("openai");
  });
});
