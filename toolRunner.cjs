"use strict";

/**
 * Stage 5: Single syscall layer.
 * Every tool execution must route through this module.
 */

const path = require("path");
const fsp = require("fs/promises");

const { decide } = require("./decide");
const { writeReceipt } = require("./receipt.cjs");

const TOOL_REGISTRY = {
  "filesystem.writeFile": async ({ path: relPath, content }) => {
    const abs = path.resolve(process.cwd(), relPath);

    const tmpRoot = path.resolve(process.cwd(), "tmp") + path.sep;
    if (!abs.startsWith(tmpRoot)) {
      throw new Error("filesystem.writeFile: path must be under ./tmp");
    }

    await fsp.mkdir(path.dirname(abs), { recursive: true });
    await fsp.writeFile(abs, String(content ?? ""), "utf8");

    return { ok: true, wrote: abs, bytes: Buffer.byteLength(String(content ?? ""), "utf8") };
  },

  // Deliberately dangerous; should be blocked by rules.allowedTools
  "filesystem.deleteFile": async ({ path: relPath }) => {
    const abs = path.resolve(process.cwd(), relPath);
    await fsp.unlink(abs);
    return { ok: true, deleted: abs };
  },
};

async function runToolWithGate(toolCall) {
  const decision = decide(toolCall);

  // Fail-closed: block unless explicitly allowed
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
  if (!Object.prototype.hasOwnProperty.call(TOOL_REGISTRY, toolCall.tool)) {
    throw new Error("runToolWithGate: unknown tool: " + toolCall.tool);
  }

  // Execute tool
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

module.exports = { runToolWithGate };
