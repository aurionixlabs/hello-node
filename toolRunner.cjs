const fs = require("fs");
const path = require("path");

const { decide } = require("./decide.cjs");
const { issueReceipt } = require("./receipt.cjs");

// --- tool implementation ---
function fsWrite({ path: targetPath, data }) {
  fs.writeFileSync(targetPath, data, "utf8");
  return { ok: true };
}

// --- guarded tool runner ---
function runTool(req) {
  // 1) Decision gate runs FIRST
  const gate = decide(req);

  // 2) Issue receipt for every attempt (ALLOW / REFUSE / DOWNGRADE)
  const receipt = issueReceipt(req, gate);

  console.log("gate:", gate.decision, "-", gate.reason);
  console.log("receipt:", receipt.receipt_hash);

  // 3) Enforce decision
  if (gate.decision === "REFUSE") {
    return { ok: false, gate };
  }

  if (gate.decision === "DOWNGRADE") {
    return { ok: false, gate };
  }

  if (gate.decision !== "ALLOW") {
    return { ok: false, gate };
  }

  // 4) Side-effects ONLY happen here
  if (req.toolName === "fsWrite" && req.action === "write") {
    return fsWrite(req.payload);
  }

  throw new Error(`Unknown tool: ${req.toolName}`);
}

module.exports = { runTool };

