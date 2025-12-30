const rules = require("./rules");

function decide() {
  if (rules.allowExecution === true) {
    return {
      action: "allowed",
      reason: "rule_passed"
    };
  }

  return {
    action: "refused",
    reason: "rule_violation"
  };
}

module.exports = decide;

