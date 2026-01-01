"use strict";

const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const { verifyIntegrity } = require("./verify.cjs");

const ROOT = process.cwd();

function requireFile(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) throw new Error("Missing required file: " + rel);
  return abs;
}

function verifySignature() {
  const pub = requireFile("integrity/public.key");
  const sig = requireFile("integrity/manifest.sig");
  const msg = requireFile("integrity/manifest.json");

  // minisign -V -p <pub> -m <msg> -x <sig>
  const res = spawnSync("minisign", ["-V", "-p", pub, "-m", msg, "-x", sig], {
    stdio: "pipe",
    encoding: "utf8",
  });

  if (res.status !== 0) {
    const out = (res.stdout || "") + (res.stderr || "");
    throw new Error("Manifest signature verification FAILED:\n" + out.trim());
  }
  return true;
}

async function verifySignedIntegrity() {
  verifySignature();
  return verifyIntegrity();
}

async function main() {
  const res = await verifySignedIntegrity();
  console.log("OK: signed integrity verified.", res);
}

module.exports = { verifySignedIntegrity };

if (require.main === module) {
  main().catch((e) => {
    console.error("FATAL:", e.message || e);
    process.exit(1);
  });
}
