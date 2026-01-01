"use strict";

/**
 * demo-filesystem.cjs
 *
 * Baseline demo proving:
 * - Decision gate (allow / degraded / refused)
 * - Degraded mode blocks (requires explicit confirmation elsewhere)
 * - Unauthorized tools are blocked (even with "polite" intent)
 * - Separation between decision() and execution (runToolWithGate)
 * - Stage 2 receipts emitted for blocked + executed (hash-chained in receipts.jsonl)
 */

const path = require("path");
const fs = require("fs/promises");

const { decide } = require("./decide");
const { writeReceipt } = require("./receipt.cjs");

// -------------------------------------
// Demo tools
// -------------------------------------
const tools = {
  "filesystem.writeFile": async ({ path: relPath, content }) => {
    const abs = path.resolve(process.cwd(), relPath);

    const tmpRoot = path.resolve(process.cwd(), "tmp") + path.sep;
    if (!abs.startsWith(tmpRoot)) {
      throw new Error("filesystem.writeFile: path must be under ./tmp");
    }

    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, String(content ?? ""), "utf8");

    return {
      ok: true,
      wrote: abs,
      bytes: Buffer.byteLength(String(content ?? ""), "utf8"),
    };
  },

  "filesystem.deleteFile": async ({ path: relPath }) => {
    const abs = path.resolve(process.cwd(), relPath);
    await fs.unlink(abs);
    return { ok: true, deleted: abs };
  },
};

// -------------------------------------
// Gate + receipt boundary
// -------------------------------------
async function runToolWithGate(toolCall, decision) {
  if (!decision || typeof decision !== "object") {
    writeReceipt({
      policyVersion: "v1",
      decision: "refused",
      reason: "missing_decision",
      tool: toolCall?.tool || null,
      args: toolCall?.args ?? null,
      outcome: "blocked",
    });
    throw new Error("Blocked by gate: refused (missing_decision)");
  }

  if (decision.action !== "allowed") {
    writeReceipt({
      policyVersion: "v1",
      decision: decision.action,
      reason: decision.reason || null,
      tool: toolCall?.tool || null,
      args: toolCall?.args ?? null,
      outcome: "blocked",
    });
    throw new Error(
      "Blocked by gate: " +
        decision.action +
        " (" +
        (decision.reason || "no_reason") +
        ")"
    );
  }

  if (
    !toolCall ||
    typeof toolCall !== "object" ||
    typeof toolCall.tool !== "string"
  ) {
    throw new Error("Invalid tool call");
  }
  if (typeof tools[toolCall.tool] !== "function") {
    throw new Error("Unknown tool: " + toolCall.tool);
  }

  const result = await tools[toolCall.tool](toolCall.args || {});

  writeReceipt({
    policyVersion: "v1",
    decision: decision.action,
    reason: decision.reason || null,
    tool: toolCall.tool,
    args: toolCall.args ?? null,
    outcome: "executed",
  });

  return result;
}

// -------------------------------------
// Tests
// -------------------------------------
async function main() {
  try {
    const toolCall = {
      tool: "filesystem.writeFile",
      args: { path: "tmp/demo1.txt", content: "blocked" },
    };
    const decision = decide({
      domain: "filesystem",
      tool: toolCall.tool,
      action: "write",
    });
    console.log("\nTEST 1 decision:", decision);
    await runToolWithGate(toolCall, decision);
  } catch (e) {
    console.log("TEST 1 blocked as expected:", String(e));
  }

  try {
    const toolCall = {
      tool: "filesystem.writeFile",
      args: { path: "tmp/demo2.txt", content: "Hello receipts\n" },
    };
    const decision = decide({
      domain: "filesystem",
      tool: toolCall.tool,
      action: "read",
    });
    console.log("\nTEST 2 decision:", decision);
    console.log("TEST 2 success:", await runToolWithGate(toolCall, decision));
  } catch (e) {
    console.log("TEST 2 unexpected block:", String(e));
  }

  try {
    const toolCall = {
      tool: "filesystem.deleteFile",
      args: { path: "tmp/demo2.txt" },
    };
    const decision = decide({
      domain: "filesystem",
      tool: toolCall.tool,
      action: "write",
    });
    console.log("\nTEST 3 decision:", decision);
    await runToolWithGate(toolCall, decision);
  } catch (e) {
    console.log("TEST 3 blocked as expected:", String(e));
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
