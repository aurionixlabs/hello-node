"use strict";

// Stage 9: startup integrity gate (fail-closed)
const { verifyIntegrity } = require("./integrity/verify.cjs");
let __integrityPromise;
function __ensureIntegrityOnce() {
  if (!__integrityPromise) __integrityPromise = verifyIntegrity();
  return __integrityPromise;
}

/**
 * Stage 7: Single syscall layer + confirmation handshake + bypass resistance.
 *
 * Key change:
 * - Tools require a secret CAP object.
 * - CAP is created ONLY here and is never exported.
 * - toolRunner is the only place that can successfully execute tools.
 */

const { decide } = require("./decide");
const { writeReceipt } = require("./receipt.cjs");
const { issueConfirmation, consumeConfirmation } = require("./confirm.cjs");
const { buildTools } = require("./internal/tools.cjs");

// Secret capability (not exported)
const CAP = Object.freeze({ __cap: "toolrunner_internal_capability" });

// Tool registry built with CAP requirement
const TOOL_REGISTRY = Object.freeze(buildTools(CAP));

function confirmationScopeKey(toolCall) {
  const tool = toolCall?.tool || "null";
  const args = toolCall?.args ?? null;
  return tool + "|" + JSON.stringify(args);
}

async function runToolWithGate(toolCall) {
  await __ensureIntegrityOnce();
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

  // Validate tool call BEFORE any execution path
  if (!toolCall || typeof toolCall !== "object") {
    writeReceipt({
      policyVersion: "v1",
      decision: "refused",
      reason: "invalid_input",
      tool: null,
      args: null,
      outcome: "blocked",
    });
    throw new Error("Blocked by gate: refused (invalid_input)");
  }
  if (!toolCall.tool || typeof toolCall.tool !== "string") {
    writeReceipt({
      policyVersion: "v1",
      decision: "refused",
      reason: "invalid_input",
      tool: null,
      args: toolCall?.args ?? null,
      outcome: "blocked",
    });
    throw new Error("Blocked by gate: refused (invalid_input)");
  }
  if (!Object.prototype.hasOwnProperty.call(TOOL_REGISTRY, toolCall.tool)) {
    writeReceipt({
      policyVersion: "v1",
      decision: "refused",
      reason: "unauthorized_tool",
      tool: toolCall.tool,
      args: toolCall.args ?? null,
      outcome: "blocked",
    });
    throw new Error("Blocked by gate: refused (unauthorized_tool)");
  }

  // Hard-refuse stays hard-refuse
  if (decision.action === "refused") {
    writeReceipt({
      policyVersion: "v1",
      decision: "refused",
      reason: decision.reason || "rule_blocked",
      tool: toolCall.tool,
      args: toolCall.args ?? null,
      outcome: "blocked",
    });
    throw new Error("Blocked by gate: refused (" + (decision.reason || "missing_reason") + ")");
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

      const result = await TOOL_REGISTRY[toolCall.tool](CAP, toolCall.args || {});

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
    writeReceipt({
      policyVersion: "v1",
      decision: "refused",
      reason: "unknown_decision",
      tool: toolCall.tool,
      args: toolCall.args ?? null,
      outcome: "blocked",
    });
    throw new Error("Blocked by gate: refused (unknown_decision)");
  }

  const result = await TOOL_REGISTRY[toolCall.tool](CAP, toolCall.args || {});

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
