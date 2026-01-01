"use strict";

/**
 * Stage 6: Single syscall layer + confirmation handshake for degraded actions.
 * Every tool execution must route through this module.
 */

const path = require("path");
const fsp = require("fs/promises");

const { decide } = require("./decide");
const { writeReceipt } = require("./receipt.cjs");
const { issueConfirmation, consumeConfirmation } = require("./confirm.cjs");

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

function confirmationScopeKey(toolCall) {
  const tool = toolCall?.tool || "null";
  const args = toolCall?.args ?? null;
  return tool + "|" + JSON.stringify(args);
}

async function runToolWithGate(toolCall) {
  const decision = decide(toolCall);

  // Fail-closed if decision is missing/malformed
  if (!decision || typeof decision.action !== "string") {
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

  // Hard-refuse stays hard-refuse
  if (decision.action === "refused") {
    writeReceipt({
      policyVersion: "v1",
      decision: "refused",
      reason: decision.reason || "rule_blocked",
      tool: toolCall?.tool || null,
      args: toolCall?.args ?? null,
      outcome: "blocked",
    });
    throw new Error("Blocked by gate: refused (" + (decision.reason || "missing_reason") + ")");
  }

  // Validate tool call BEFORE any execution path
  if (!toolCall || typeof toolCall !== "object") throw new Error("runToolWithGate: invalid tool call");
  if (!toolCall.tool || typeof toolCall.tool !== "string") throw new Error("runToolWithGate: missing tool name");
  if (!Object.prototype.hasOwnProperty.call(TOOL_REGISTRY, toolCall.tool)) {
    throw new Error("runToolWithGate: unknown tool: " + toolCall.tool);
  }

  // Degraded path: require confirmation token to execute
  if (decision.action === "degraded") {
    const scopeKey = confirmationScopeKey(toolCall);

    // If token provided, validate+consume then execute
    if (toolCall.confirmToken) {
      const ok = consumeConfirmation(toolCall.confirmToken, scopeKey);
      if (!ok) {
        writeReceipt({
          policyVersion: "v1",
          decision: "refused",
          reason: "invalid_confirmation",
          tool: toolCall.tool,
          args: toolCall.args ?? null,
          outcome: "blocked",
        });
        throw new Error("Blocked by gate: refused (invalid_confirmation)");
      }

      const result = await TOOL_REGISTRY[toolCall.tool](toolCall.args || {});

      writeReceipt({
        policyVersion: "v1",
        decision: "allowed",
        reason: "confirmed:" + (decision.reason || "confirmation_required"),
        tool: toolCall.tool,
        args: toolCall.args ?? null,
        outcome: "executed",
      });

      return result;
    }

    // No token: issue one + return handshake object (do NOT throw)
    const token = issueConfirmation(scopeKey);

    writeReceipt({
      policyVersion: "v1",
      decision: "degraded",
      reason: decision.reason || "confirmation_required",
      tool: toolCall.tool,
      args: toolCall.args ?? null,
      outcome: "blocked",
    });

    return {
      ok: false,
      blocked: true,
      needsConfirmation: true,
      reason: decision.reason || "confirmation_required",
      confirmToken: token,
    };
  }

  // Allowed path: execute normally
  if (decision.action !== "allowed") {
    // fail-closed for any unknown decision action
    writeReceipt({
      policyVersion: "v1",
      decision: "refused",
      reason: "unknown_decision",
      tool: toolCall?.tool || null,
      args: toolCall?.args ?? null,
      outcome: "blocked",
    });
    throw new Error("Blocked by gate: refused (unknown_decision)");
  }

  const result = await TOOL_REGISTRY[toolCall.tool](toolCall.args || {});

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
