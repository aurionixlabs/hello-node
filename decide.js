// decide.js
"use strict";

const rules = require("./rules.js");

/**
 * toolCall shape (minimal for demo):
 * {
 *   tool: "filesystem.writeFile" | "filesystem.readFile",
 *   action: "write" | "read",
 *   domain: "fraud" | "general" | ...,
 *   args: {...},
 *   confirmed: boolean (optional)
 * }
 */
function decide(toolCall) {
  if (!toolCall || typeof toolCall !== "object") {
    return {
      action: "refused",
      reason: "invalid_tool_call",
      scope: [],
      constraints: [],
    };
  }

  const domain = toolCall.domain || "general";
  const action = toolCall.action || "unknown";

  // 1) Hard refusals
  if (rules.refuseDomains.has(domain)) {
    return {
      action: "refused",
      reason: "refuse_domain",
      scope: ["domain"],
      constraints: [],
    };
  }

  // 2) Confirmation-gated actions => downgrade if not confirmed
  if (rules.confirmRequiredActions.has(action) && toolCall.confirmed 
!== true) {
    return {
      action: "degraded",
      reason: "confirmation_required",
      scope: ["action"],
      constraints: [
        {
          type: "allowed_tools",
          tools: rules.downgrade.readOnlyAllowedTools,
        },
      ],
    };
  }

  // 3) Default allow
  return {
    action: "allowed",
    reason: "rule_passed",
    scope: [],
    constraints: [],
  };
}

module.exports = { decide };
