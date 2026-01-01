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
})();
