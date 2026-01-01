"use strict";

const { decide } = require("./decide");
const { runTool } = require("./toolRunner.cjs");

async function testUnconfirmedWrite() {
  const toolCall = {
    tool: "filesystem.writeFile",
    action: "write",
    domain: "general",
    args: { path: "tmp/demo.txt", content: "hello" },
    confirmed: false,
  };

  const decision = decide(toolCall);
  console.log("\nTEST 1 decision:", decision);

  return runTool({ tool: toolCall.tool, args: toolCall.args }, decision);
}

async function testConfirmedWrite() {
  const toolCall = {
    tool: "filesystem.writeFile",
    action: "write",
    domain: "general",
    args: { path: "tmp/demo2.txt", content: "hello confirmed" },
    confirmed: true,
  };

  const decision = decide(toolCall);
  console.log("\nTEST 2 decision:", decision);

  return runTool({ tool: toolCall.tool, args: toolCall.args }, decision);
}

(async () => {
  try {
    await testUnconfirmedWrite();
    console.log("TEST 1: unexpected success (should have been blocked)");
  } catch (e) {
    console.log("TEST 1 blocked as expected:", String(e));
  }

  try {
    const res = await testConfirmedWrite();
    console.log("TEST 2 success:", res);
  } catch (e) {
    console.log("TEST 2 unexpected block:", String(e));
  }
// ==========================
// TEST 3 — unauthorized tool should be blocked
// ==========================
try {
  const toolCall3 = {
    tool: "shell", // <-- unauthorized on purpose
    args: { cmd: "echo HACKED" },
  };

  // Policy: only filesystem is allowed
  const policy3 = {
    allowed: true,
    constraints: [
      { type: "allowed_tools", tools: ["filesystem"] },
    ],
  };

  const decision3 = decide(toolCall3, policy3);
  console.log("\nTEST 3 decision:", decision3);

  // If your gate/tool runner is wired correctly, it should throw or block here
  const result3 = await runToolWithGate(toolCall3, policy3); // adjust name if your runner function differs
  console.log("TEST 3 UNEXPECTED SUCCESS:", result3);
  process.exit(1);
} catch (e) {
  console.log("TEST 3 blocked as expected:", String(e));
}
})();
