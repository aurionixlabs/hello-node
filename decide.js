const rules = require("./rules");

function decide() {
  const policy = rules.execution;

  if (!policy.allowed) {
    return {
      action: "refused",
      reason: policy.reason || "rule_violation",
      scope: policy.scope || [],
      constraints: policy.constraints || []
    };
  }

  return {
    action: "allowed",
    reason: policy.reason || "rule_passed",
    scope: policy.scope || [],
    constraints: policy.constraints || []
  };
}

module.exports = { decide };

