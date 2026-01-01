"use strict";

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const ROOT = process.cwd();

const TARGETS = [
  "toolRunner.cjs",
  "decide.js",
  "rules.js",
  "receipt.cjs",
  "confirm.cjs",
  "internal/tools.cjs",
];

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function fileHash(rel) {
  const abs = path.join(ROOT, rel);
  const data = await fsp.readFile(abs);
  return sha256(data);
}

async function main() {
  const manifestPath = path.join(ROOT, "integrity/manifest.json");
  const raw = await fsp.readFile(manifestPath, "utf8");
  const manifest = JSON.parse(raw);

  const out = {};
  for (const rel of TARGETS) {
    if (!fs.existsSync(path.join(ROOT, rel))) {
      throw new Error("Missing file for integrity manifest: " + rel);
    }
    out[rel] = await fileHash(rel);
  }

  manifest.files = out;

  await fsp.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log("OK: wrote integrity/manifest.json with", Object.keys(out).length, "hashes");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
