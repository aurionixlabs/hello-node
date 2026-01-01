"use strict";

/**
 * Stage 8: CAP leak test.
 * Proves toolRunner does NOT export the secret CAP.
 */

const runner = require("./toolRunner.cjs");

console.log("\n=== STAGE 8: CAP LEAK TEST ===");

if ("CAP" in runner) {
  console.log("FAIL: toolRunner exports CAP:", runner.CAP);
  process.exit(1);
}

if (runner.CAP !== undefined) {
  console.log("FAIL: runner.CAP is not undefined:", runner.CAP);
  process.exit(1);
}

console.log("PASS: CAP is not exported (runner.CAP is undefined).");
console.log("=== STAGE 8 END ===\n");
