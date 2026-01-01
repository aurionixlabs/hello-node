"use strict";

/**
 * demo-filesystem.cjs
 *
 * Stage 5: demo routes execution through toolRunner syscall layer.
 * Receipts are emitted inside toolRunner.cjs for both blocked + executed.
 */

const { decide } = require("./decide");
const { runToolWithGate } = require("./toolRunner.cjs");

async function main() {
  // TEST 1: degraded blocks
  try {
    const toolCall = {
      domain: "filesystem",
      tool: "filesystem.writeFile",
      action: "write",
      args: { path: "tmp/demo1.txt", content: "blocked" },
    };

    const d = decide(toolCall);
    console.log("\nTEST 1 decision:", d);

    await runToolWithGate(toolCall);
    console.log("TEST 1 unexpected success");
  } catch (e) {
    console.log("TEST 1 blocked as expected:", String(e?.message || e));
  }

  // TEST 2: allowed executes
  try {
    const toolCall = {
      domain: "filesystem",
      tool: "filesystem.writeFile",
      action: "read",
      args: { path: "tmp/demo2.txt", content: "Hello receipts\n" },
    };

    const d = decide(toolCall);
    console.log("\nTEST 2 decision:", d);

    const res = await runToolWithGate(toolCall);
    console.log("TEST 2 success:", res);
  } catch (e) {
    console.log("TEST 2 unexpected error:", String(e?.message || e));
  }

  // TEST 3: unauthorized tool refused
  try {
    const toolCall = {
      domain: "filesystem",
      tool: "filesystem.deleteFile",
      action: "write",
      args: { path: "tmp/demo2.txt" },
    };

    const d = decide(toolCall);
    console.log("\nTEST 3 decision:", d);

    await runToolWithGate(toolCall);
    console.log("TEST 3 unexpected success");
  } catch (e) {
    console.log("TEST 3 blocked as expected:", String(e?.message || e));
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
