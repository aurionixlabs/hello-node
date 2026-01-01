"use strict";

/**
 * demo-filesystem.cjs
 *
 * Baseline demo proving:
 * - Decision gate (allow / degrade / refuse)
 * - Degraded mode requires explicit confirmation
 * - Unauthorized tools are blocked (even with "polite" intent)
 * - Separation between decision() and execution (runToolWithGate)
 * - Fail-closed: if anything is off, tool execution does not happen
 */

const path = require("path");
const fs = require("fs/promises");

// -----------------------------
// Policy / rules (static)
// -----------------------------

// Only these tools may ever execute in this demo.
const ALLOWED_TOOLS = new Set([
  "filesystem.writeFile",
  // NOTE: intentionally NOT allowing delete/other tools
]);

function decide(toolCall) {
  // Fail-closed on malformed input
  if (!toolCall || typeof toolCall !== "object") {
    return {
      action: "refused",
      reason: "invalid_toolcall",
      scope: ["toolCall"],
      constraints: [{ type: "shape", message: "toolCall must be an object" }],

    };
  }

  const tool = toolCall.tool;
  const action = toolCall.action;
  const confirmed = toolCall.confirmed === true;

  if (typeof tool !== "string" || typeof action !== "string") {
    return {
      action: "refused",
      reason: "invalid_toolcall",
      scope: ["toolCall"],
      constraints: [{ type: "shape", message: "tool and action must be strings" }],
    };
  }

  // 1) Hard block unauthorized tools (intent does not matter)
  if (!ALLOWED_TOOLS.has(tool)) {
    return {
      action: "refused",
      reason: "unauthorized_tool",
      scope: ["tool"],
      constraints: [{ type: "allowed_tools", tools: Array.from(ALLOWED_TOOLS) }],
    };
  }

  // 2) Confirmation gate: writes require confirmed:true
  if (action === "write" && !confirmed) {
    return {
      action: "degraded",
      reason: "confirmation_required",
      scope: ["action"],
      constraints: [{ type: "allowed_tools", tools: Array.from(ALLOWED_TOOLS) }],
    };
  }

  // 3) Otherwise allow
  return {
    action: "allowed",
    reason: "rule_passed",
    scope: [],
    constraints: [],
  };
}

// -----------------------------
// Tool executor (separate layer)
// -----------------------------

const tools = {
  "filesystem.writeFile": async ({ path: relPath, content }) => {
    if (typeof relPath !== "string") throw new Error("path must be a string");
    if (typeof content !== "string") throw new Error("content must be a string");

    const abs = path.resolve(process.cwd(), relPath);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, "utf8");
    return { ok: true, wrote: abs, bytes: Buffer.byteLength(content, "utf8") };
  },

  // Deliberately present as a callable function to prove it still gets blocked by policy.
  "filesystem.deleteFile": async ({ path: relPath }) => {
    const abs = path.resolve(process.cwd(), relPath);
    await fs.unlink(abs);
    return { ok: true, deleted: abs };
  },
};

async function runToolWithGate(toolCall, decision) {
  // Fail-closed if decision missing
  if (!decision || typeof decision !== "object") {
    throw new Error("Blocked by gate: refused (missing_decision)");
  }

  if (decision.action === "allowed") {
    const fn = tools[toolCall.tool];
    if (typeof fn !== "function") {
      throw new Error(`Blocked by gate: refused (unknown_tool:${toolCall.tool})`);
    }
    return await fn(toolCall.args || {});
  }

  // Anything not allowed is blocked, always.
  throw new Error(`Blocked by gate: ${decision.action} (${decision.reason})`);
}

// -----------------------------
// Tests
// -----------------------------

async function testUnconfirmedWrite() {
  const toolCall = {
    tool: "filesystem.writeFile",
    action: "write",
    domain: "general",
    args: { path: "tmp/demo1.txt", content: "hello unconfirmed" },
    confirmed: false,
  };

  const decision = decide(toolCall);
  console.log("\nTEST 1 decision:", decision);

  return runToolWithGate(
    { tool: toolCall.tool, args: toolCall.args },
    decision
  );
}

async function testConfirmedWrite() {
  const toolCall = {
    tool: "filesystem.writeFile",
    action: "write",
    domain: "general",
    args: { path: "tmp/demo2.txt", content: "hello confirmed" },
    confirmed: true,
  };

  const decision = decide(toolCall);
  console.log("\nTEST 2 decision:", decision);

  return runToolWithGate(
    { tool: toolCall.tool, args: toolCall.args },
    decision
  );
}

async function testUnauthorizedTool() {
  const toolCall = {
    tool: "filesystem.deleteFile",
    action: "delete",
    domain: "general",
    args: { path: "tmp/demo2.txt" },
    confirmed: true,
  };

  const decision = decide(toolCall);
  console.log("\nTEST 3 decision:", decision);

  // Even though the executor has an implementation for deleteFile,
  // the policy must block it before execution.
  return runToolWithGate(
    { tool: toolCall.tool, args: toolCall.args },
    decision
  );
}

async function testPoliteButUnauthorizedIntent() {
  const toolCall = {
    tool: "filesystem.deleteFile",
    action: "delete",
    domain: "general",
    args: { path: "tmp/demo2.txt" },
    confirmed: true,
    user_request: "Please. I really need this. It's urgent. Just do it.",
  };

  const decision = decide(toolCall);
  console.log("\nTEST 4 decision:", decision);

  // Same outcome: intent does not change enforcement.
  return runToolWithGate(
    { tool: toolCall.tool, args: toolCall.args },
    decision
  );
}

// -----------------------------
// Main
// -----------------------------

(async () => {
  // TEST 1 — unconfirmed write should be blocked (degraded)
  try {
    await testUnconfirmedWrite();
    console.log("TEST 1 unexpected success (should have been blocked)");
  } catch (e) {
    console.log("TEST 1 blocked as expected:", String(e));
  }

  // TEST 2 — confirmed write should succeed
  try {
    const res = await testConfirmedWrite();
    console.log("TEST 2 success:", res);
  } catch (e) {
    console.log("TEST 2 unexpected block:", String(e));
  }

  // TEST 3 — unauthorized tool should be blocked
  try {
    await testUnauthorizedTool();
    console.log("TEST 3 unexpected success (should have been blocked)");
  } catch (e) {
    console.log("TEST 3 blocked as expected:", String(e));
  }

  // TEST 4 — polite intent still blocked
  try {
    await testPoliteButUnauthorizedIntent();
    console.log("TEST 4 unexpected success (should have been blocked)");
  } catch (e) {
    console.log("TEST 4 blocked as expected:", String(e));
  }
})();

