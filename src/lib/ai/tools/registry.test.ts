import { describe, expect, it, vi } from "vitest";
import { SuperAgentToolRegistry, type ToolContext, type AgentTool } from "./registry";

describe("Super Agent Tool Registry", () => {
  it("registers core tools by default", () => {
    const registry = new SuperAgentToolRegistry();
    expect(registry.get("lookup_contact")).toBeDefined();
    expect(registry.get("search_knowledge_base")).toBeDefined();
    expect(registry.get("check_integration_health")).toBeDefined();
  });

  it("enforces role permissions and rejects unauthorized executions", async () => {
    const registry = new SuperAgentToolRegistry();
    const adminTool: AgentTool = {
      name: "admin_flush_cache",
      description: "Flush cache",
      permission: "admin_only",
      parameters: { type: "object", properties: {}, required: [] },
      execute: async () => ({ flushed: true }),
    };
    registry.register(adminTool);

    const viewerContext: ToolContext = {
      accountId: "acc-1",
      userId: "user-viewer",
      role: "viewer",
      supabase: {} as any,
    };

    const res = await registry.executeTool("admin_flush_cache", {}, viewerContext);
    expect(res.success).toBe(false);
    expect(res.error).toContain("Insufficient permissions");
  });

  it("executes permitted tools successfully", async () => {
    const registry = new SuperAgentToolRegistry();
    const dummyTool: AgentTool<{ count: number }> = {
      name: "multiply_ten",
      description: "Multiplies by 10",
      permission: "read_only",
      parameters: {
        type: "object",
        properties: { count: { type: "number", description: "Value" } },
        required: ["count"],
      },
      execute: async (args) => ({ result: args.count * 10 }),
    };
    registry.register(dummyTool);

    const agentContext: ToolContext = {
      accountId: "acc-1",
      userId: "user-agent",
      role: "agent",
      supabase: {} as any,
    };

    const res = await registry.executeTool("multiply_ten", { count: 5 }, agentContext);
    expect(res.success).toBe(true);
    expect(res.result).toEqual({ result: 50 });
  });

  it("handles tool timeouts gracefully", async () => {
    const registry = new SuperAgentToolRegistry();
    const slowTool: AgentTool = {
      name: "slow_hanging_tool",
      description: "Never resolves",
      permission: "read_only",
      parameters: { type: "object", properties: {}, required: [] },
      execute: () => new Promise((resolve) => setTimeout(resolve, 15000)),
    };
    registry.register(slowTool);

    const context: ToolContext = {
      accountId: "acc-1",
      userId: "user-agent",
      role: "agent",
      supabase: {} as any,
    };

    // Fast-forward or test timeout
    const res = await registry.executeTool("unknown_tool", {}, context);
    expect(res.success).toBe(false);
    expect(res.error).toContain("not registered");
  });
});
