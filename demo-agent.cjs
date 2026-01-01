"use strict";

/**
 * demo-agent.cjs
 *
 * Stage 5 proof: the agent proposes tool calls, but execution MUST route through:
 *   toolRunner.runToolWithGate()
 *
 * We demonstrate:
 *  - normal allowed call executes
 *  - degraded call blocks
 *  - unauthorized tool blocks
 *  - "polite intent" does NOT bypass
 *  - malformed input fail-closes
 *
 * NOTE: In Stage 5, demos do not define tool registries. Only toolRunner.cjs does.
 */

const { decide } = require("./decide");
const { runToolWithGate } = require("./toolRunner.cjs");

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

  console.log("\n=== STAGE 5: AGENT LOOP START ===");
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
  console.log("\n=== STAGE 5: AGENT LOOP END ===\n");
}

agentLoop().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
