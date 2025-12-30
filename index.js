const { decide } = require("./decide");

const decision = decide();

console.log("ACTION:", decision.action);
console.log("REASON:", decision.reason);

if (decision.action !== "allowed") {
  process.exit(1);
}

console.log("Node is working");
