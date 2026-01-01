const { decide } = require("./decide");

const toolCall = {
  tool: "filesystem",
  args: { path: "README.md" },
};

const policy = { allowed: true };

const decision = decide(toolCall, policy);

console.log("DECISION:", decision);
console.log("ACTION:", decision.action);
console.log("REASON:", decision.reason);

if (decision.action !== "allowed") process.exit(1);

console.log("Node is working");
