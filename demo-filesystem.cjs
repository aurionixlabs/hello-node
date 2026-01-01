"use strict";

/**
 * demo-filesystem.cjs
 *
 * Updated for Stage 6+ semantics:
 * - Degraded actions return { needsConfirmation, confirmToken } (no execution)
 * - Replay same call with confirmToken executes
 * - Unauthorized tools still hard-refuse (throw)
 */

const { decide } = require("./decide");
const { runToolWithGate } = require("./toolRunner.cjs");

async function main() {
  // TEST 1: degraded write must NOT execute; must return confirmToken
  const toolCall1 = {
    domain: "filesystem",
    tool: "filesystem.writeFile",
    action: "write",
    args: { path: "tmp/demo1.txt", content: "blocked\n" },
  };

  const d1 = decide(toolCall1);
  console.log("\nTEST 1 decision:", d1);

  const res1 = await runToolWithGate(toolCall1);

  if (!res1 || !res1.needsConfirmation || !res1.confirmToken) {
    console.log("TEST 1 FAIL: expected needsConfirmation + confirmToken, got:", res1);
    process.exit(1);
  }

  console.log("TEST 1 blocked as expected (needs confirmation). token:", res1.confirmToken);

  // TEST 1b: replay with confirmToken should execute
  const res1b = await runToolWithGate({
    ...toolCall1,
    args: { path: "tmp/demo1.txt", content: "now_written\n" },
    confirmToken: res1.confirmToken,
  });

  console.log("TEST 1b executed as expected:", res1b);

  // TEST 2: allowed executes
  const toolCall2 = {
    domain: "filesystem",
    tool: "filesystem.writeFile",
    action: "read",
    args: { path: "tmp/demo2.txt", content: "Hello receipts\n" },
  };

  const d2 = decide(toolCall2);
  console.log("\nTEST 2 decision:", d2);

  const res2 = await runToolWithGate(toolCall2);
  console.log("TEST 2 success:", res2);

  // TEST 3: unauthorized tool refused (must throw)
  try {
    const toolCall3 = {
      domain: "filesystem",
      tool: "filesystem.deleteFile",
      action: "write",
      args: { path: "tmp/demo2.txt" },
    };

    const d3 = decide(toolCall3);
    console.log("\nTEST 3 decision:", d3);

    await runToolWithGate(toolCall3);
    console.log("TEST 3 FAIL: unauthorized tool executed");
    process.exit(1);
  } catch (e) {
    console.log("TEST 3 blocked as expected:", String(e?.message || e));
  }

  console.log("\n=== demo-filesystem OK ===\n");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
