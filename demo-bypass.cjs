"use strict";

/**
 * Stage 7: Bypass resistance demo.
 *
 * We attempt to bypass toolRunner by importing tools.cjs directly.
 * Since tools require the secret CAP (not exported), direct calls must fail.
 */

const { buildTools } = require("./tools.cjs");
const { runToolWithGate } = require("./toolRunner.cjs");

async function main() {
  console.log("\n=== STAGE 7: BYPASS RESISTANCE DEMO ===");

  // This simulates an attacker importing tools and trying to call them directly.
  // They cannot obtain CAP because toolRunner never exports it.
  const fakeCap = { __cap: "fake" };
  const direct = buildTools(fakeCap); // built with fake expectedCap

  // 1) Direct call should fail (wrong cap)
  console.log("\nTEST 1: direct tool call without real CAP (must fail)");
  try {
    await direct["filesystem.writeFile"](null, { path: "tmp/bypass_fail.txt", content: "nope\n" });
    console.log("UNEXPECTED: direct call succeeded");
  } catch (e) {
    console.log("EXPECTED FAIL:", String(e?.message || e));
  }

  // 2) Legit call through toolRunner should work
  console.log("\nTEST 2: toolRunner path (should work if allowed)");
  const call = {
    domain: "filesystem",
    tool: "filesystem.writeFile",
    action: "read", // allowed by your rules
    args: { path: "tmp/bypass_ok.txt", content: "ok\n" },
  };
  const res = await runToolWithGate(call);
  console.log("RESULT:", res);

  console.log("\n=== STAGE 7 END ===\n");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
