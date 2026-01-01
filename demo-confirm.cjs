"use strict";

const { runToolWithGate } = require("./toolRunner.cjs");

async function main() {
  console.log("\n=== STAGE 6: CONFIRMATION HANDSHAKE DEMO ===");

  // 1) Attempt a degraded write: should return needsConfirmation + token (no execution)
  const call1 = {
    domain: "filesystem",
    tool: "filesystem.writeFile",
    action: "write", // triggers degraded by your rules
    args: { path: "tmp/confirm_write.txt", content: "should_only_write_after_confirm\n" },
  };

  console.log("\nSTEP 1: degraded call (should not execute)");
  const res1 = await runToolWithGate(call1);
  console.log("RESULT 1:", res1);

  if (!res1 || !res1.confirmToken) {
    throw new Error("Expected a confirmToken for degraded call");
  }

  // 2) Replay same call with confirmToken: must execute now
  const call2 = {
    ...call1,
    confirmToken: res1.confirmToken,
  };

  console.log("\nSTEP 2: same call + confirmToken (should execute)");
  const res2 = await runToolWithGate(call2);
  console.log("RESULT 2:", res2);

  // 3) Token reuse must fail (one-time token)
  console.log("\nSTEP 3: reuse token (must fail)");
  try {
    await runToolWithGate(call2);
    console.log("UNEXPECTED: token reuse succeeded");
  } catch (e) {
    console.log("EXPECTED FAIL:", String(e?.message || e));
  }

  console.log("\n=== STAGE 6 END ===\n");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
