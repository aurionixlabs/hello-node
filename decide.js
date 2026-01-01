"use strict";

/**
 * decide.js
 * Step 3: rule evaluation + AND composition
 *
 * Priority: refused > degraded > allowed
 * Returns:
 *  { action, reason, scope, constraints }
 */

const rules = require("./rules");
const { composeAND } = require("./compose");

function ruleRefuseDomain(input) {
  const domain = input?.domain || null;
  if (domain && rules.refuseDomains && rules.refuseDomains.has(domain)) {
    return {
      action: "refused",
      reason: "refuse_domain",
      scope: ["domain"],
      constraints: [],
    };
  }
  return { action: "allowed", reason: "domain_ok", scope: [], constraints: [] };
}

function ruleAllowedTools(input) {
  const tool = input?.tool || null;

  if (rules.allowedTools && rules.allowedTools instanceof Set) {
    if (!tool || !rules.allowedTools.has(tool)) {
      return {
        action: "refused",
        reason: "unauthorized_tool",
        scope: ["tool"],
        constraints: [{ type: "allowed_tools", tools: Array.from(rules.allowedTools) }],
      };
    }
    return {
      action: "allowed",
      reason: "tool_allowed",
      scope: [],
      constraints: [{ type: "allowed_tools", tools: Array.from(rules.allowedTools) }],
    };
  }

  return { action: "allowed", reason: "no_tool_allowlist", scope: [], constraints: [] };
}

function ruleConfirmRequiredActions(input) {
  const actionName = input?.action || null;

  if (actionName && rules.confirmRequiredActions && rules.confirmRequiredActions.has(actionName)) {
    return {
      action: "degraded",
      reason: "confirmation_required",
      scope: ["action"],
      constraints: [],
    };
  }

  return { action: "allowed", reason: "rule_passed", scope: [], constraints: [] };
}

function decide(input) {
  if (!input || typeof input !== "object") {
    return {
      action: "refused",
      reason: "invalid_input",
      scope: ["input"],
      constraints: [],
    };
  }

  const results = [
    ruleRefuseDomain(input),
    ruleAllowedTools(input),
    ruleConfirmRequiredActions(input),
  ];

  const out = composeAND(results);

  return {
    action: out.action,
    reason: out.reason,
    scope: out.scope,
    constraints: out.constraints,
  };
}

module.exports = { decide };
