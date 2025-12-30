const decide = require("./decide");

const result = decide();

console.log("ACTION:", result.action);
console.log("REASON:", result.reason);
console.log("Node is working");
