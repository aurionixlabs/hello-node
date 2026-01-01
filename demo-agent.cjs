"use strict";

/**
 * demo-agent.cjs
 *
 * Stage 4: Agent integration demo.
 * The "agent" proposes tool calls; ALL execution must pass through:
 *   decide() -> runToolWithGate()
 *
 * We demonstrate:
 *  - normal allowed call executes
 *  - degraded call blocks
 *  - unauthorized tool blocks
 *  - "polite intent" does NOT bypass
 *  - malformed input fail-closes
 */

const path = require("path");
const fs = require("fs/promises");

const { decide } = require("./decide");
const { writeReceipt } = require("./receipt.cjs");

// ---------------------------
// Tool registry (execution layer)
// ---------------------------
const TOOL_REGISTRY = {
  "filesystem.writeFile": async ({ path: relPath, content }) => {
    const abs = path.resolve(process.cwd(), relPath);

    const tmpRoot = path.resolve(process.cwd(), "tmp") + path.sep;
    if (!abs.startsWith(tmpRoot)) {
      throw new Error("filesystem.writeFile: path must be under ./tmp");
    }

    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, String(content ?? ""), "utf8");

    return { ok: true, wrote: abs, bytes: Buffer.byteLength(String(content ?? ""), "utf8") };
  },

  // Deliberately dangerous, should be blocked by rules.allowedTools
  "filesystem.deleteFile": async ({ path: relPath }) => {
    const abs = path.resolve(process.cwd(), relPath);
    await fs.unlink(abs);
    return { ok: true, deleted: abs };
  },
};

// ---------------------------
// Gate wrapper (decision -> execution -> receipts)
// ---------------------------
async function runToolWithGate(toolCall) {
  const decision = decide(toolCall);

  // Block (fail closed) unless explicitly allowed
  if (!decision || decision.action !== "allowed") {
    writeReceipt({
      policyVersion: "v1",
      decision: decision?.action || "refused",
      reason: decision?.reason || "missing_decision",
      tool: toolCall?.tool || null,
      args: toolCall?.args ?? null,
      outcome: "blocked",
    });

    throw new Error(
      "Blocked by gate: " +
        (decision?.action || "refused") +
        " (" +
        (decision?.reason || "missing_reason") +
        ")"
    );
  }

  // Validate tool call
  if (!toolCall || typeof toolCall !== "object") throw new Error("runToolWithGate: invalid tool call");
  if (!toolCall.tool || typeof toolCall.tool !== "string") throw new Error("runToolWithGate: missing tool name");
  if (!TOOL_REGISTRY[toolCall.tool]) throw new Error("runToolWithGate: unknown tool: " + toolCall.tool);

  // Execute
  const result = await TOOL_REGISTRY[toolCall.tool](toolCall.args || {});

  // Executed receipt
  writeReceipt({
    policyVersion: "v1",
    decision: "allowed",
    reason: decision.reason || "rule_passed",
    tool: toolCall.tool,
    args: toolCall.args ?? null,
    outcome: "executed",
  });

  return result;
}

// ---------------------------
// Agent simulation (planning loop)
// ---------------------------
async function agentLoop() {
  const tasks = [
    {
      name: "NORMAL allowed read (executes)",
      toolCall: {
        domain: "filesystem",
        tool: "filesystem.writeFile",
        action: "read",
        args: { path: "tmp/agent_ok.txt", content: "ok\n" },
      },
    },
    {
      name: "WRITE requires confirmation (degraded -> blocked)",
      toolCall: {
        domain: "filesystem",
        tool: "filesystem.writeFile",
        action: "write",
        args: { path: "tmp/agent_degraded.txt", content: "should_block\n" },
      },
    },
    {
      name: "UNAUTHORIZED delete (refused -> blocked)",
      toolCall: {
        domain: "filesystem",
        tool: "filesystem.deleteFile",
        action: "write",
        args: { path: "tmp/agent_ok.txt" },
      },
    },
    {
      name: "POLITE INTENT BYPASS attempt (still refused)",
      toolCall: {
        domain: "filesystem",
        tool: "filesystem.deleteFile",
        action: "write",
        args: { path: "tmp/agent_ok.txt", intent: "please, only trying to help" },
      },
    },
    {
      name: "MALFORMED tool call (fail-closed)",
      toolCall: null,
    },
  ];

  console.log("\n=== STAGE 4: AGENT LOOP START ===");
  for (const t of tasks) {
    console.log("\nTASK:", t.name);
    try {
      const d = decide(t.toolCall);
      console.log("DECISION:", d);

      const result = await runToolWithGate(t.toolCall);
      console.log("RESULT:", result);
    } catch (e) {
      console.log("BLOCKED/ERROR:", String(e?.message || e));
    }
  }
  console.log("\n=== STAGE 4: AGENT LOOP END ===\n");

  // NOTE: A true bypass would look like this:
  // await TOOL_REGISTRY["filesystem.deleteFile"]({ path: "tmp/agent_ok.txt" });
  // We do NOT do that. The claim is: legitimate execution must route via runToolWithGate().
}

agentLoop().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
