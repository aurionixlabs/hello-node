"use strict";

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const ROOT = process.cwd();

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function hashFile(rel) {
  const abs = path.join(ROOT, rel);
  const data = await fsp.readFile(abs);
  return sha256(data);
}

async function verifyIntegrity({ allowMissingManifest = false } = {}) {
  const manifestPath = path.join(ROOT, "integrity/manifest.json");

  if (!fs.existsSync(manifestPath)) {
    if (allowMissingManifest) return { ok: true, skipped: true };
    throw new Error("Integrity manifest missing: integrity/manifest.json");
  }

  const manifest = JSON.parse(await fsp.readFile(manifestPath, "utf8"));
  const files = manifest.files || {};
  const rels = Object.keys(files);

  if (rels.length === 0) throw new Error("Integrity manifest has no files");

  const bad = [];
  for (const rel of rels) {
    const expected = files[rel];
    if (!fs.existsSync(path.join(ROOT, rel))) {
      bad.push({ rel, expected, got: null, reason: "missing_file" });
      continue;
    }
    const got = await hashFile(rel);
    if (got !== expected) bad.push({ rel, expected, got, reason: "hash_mismatch" });
  }

  if (bad.length) {
    const msg =
      "Integrity check FAILED:\n" +
      bad.map((b) => `- ${b.rel}: ${b.reason}`).join("\n");
    const err = new Error(msg);
    err.details = bad;
    throw err;
  }

  return { ok: true, version: manifest.version, count: rels.length };
}

async function main() {
  const res = await verifyIntegrity();
  console.log("OK: integrity verified.", res);
}

module.exports = { verifyIntegrity };

if (require.main === module) {
  main().catch((e) => {
    console.error("FATAL:", e.message || e);
    if (e.details) console.error(JSON.stringify(e.details, null, 2));
    process.exit(1);
  });
}
