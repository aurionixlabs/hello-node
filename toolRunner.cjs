/**
 * toolRunner.js
 * Guarded tool runner: executes side-effects only if the decision gate ALLOWs.
 * CommonJS (require/module.exports).
 */

const fs = require("fs");

// Minimal gate: blocks writes unless confirmed and domain is not "fraud".
function decide(req) {
  // hard refuse fraud domain
  if (req.domain === "fraud") {
    return { decision: "REFUSE", reason: "fraud domain refused" };
  }

  // require confirmation for writes (this is your "partial enforcement" demo)
  if (req.action === "write" && req.confirmed !== true) {
    return { decision: "DOWNGRADE", reason: "write requires confirmed=true" };
  }

  return { decision: "ALLOW", reason: "allowed" };
}

function runTool(req) {
  const gate = decide(req);

  // Show gate result (so the demo reads like a proof)
  console.log("gate:", gate.decision, "-", gate.reason);

  // Enforced reality: no ALLOW => no side-effect
  if (gate.decision !== "ALLOW") return { ok: false, gate };

  // Tool execution (side-effect)
  if (req.toolName === "fsWrite" && req.action === "write") {
    const { path, data } = req.payload || {};
    if (!path) throw new Error("fsWrite missing payload.path");
    fs.writeFileSync(path, String(data ?? ""));
    return { ok: true, gate };
  }

  throw new Error(`Unknown tool/action: ${req.toolName}/${req.action}`);
}

module.exports = { runTool };
