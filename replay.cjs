const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function sortKeysDeep(x) {
  if (Array.isArray(x)) return x.map(sortKeysDeep);
  if (x && typeof x === "object") {
    const out = {};
    for (const k of Object.keys(x).sort()) out[k] = 
sortKeysDeep(x[k]);
    return out;
  }
  return x;
}

function stableStringify(obj) {
  return JSON.stringify(sortKeysDeep(obj));
}

function sha256Hex(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return null;
  return process.argv[i + 1] || null;
}

const fileArg = argValue("--file");
const latest = process.argv.includes("--latest");

let filePath = null;

if (fileArg) {
  filePath = fileArg;
} else if (latest) {
  const latestPath = path.join(__dirname, "receipts", "latest.json");
  if (!fs.existsSync(latestPath)) {
    console.error("No receipts/latest.json found.");
    process.exit(2);
  }
  const latestObj = JSON.parse(fs.readFileSync(latestPath, "utf8"));
  if (!latestObj.file) {
    console.error("latest.json missing 'file'.");
    process.exit(2);
  }
  filePath = path.join(__dirname, "receipts", latestObj.file);
} else {
  console.log("Usage:");
  console.log("  node replay.cjs --latest");
  console.log("  node replay.cjs --file receipts/<receipt>.json");
  process.exit(2);
}

if (!fs.existsSync(filePath)) {
  console.error("Receipt file not found:", filePath);
  process.exit(2);
}

const receipt = JSON.parse(fs.readFileSync(filePath, "utf8"));
const { receipt_hash, ...body } = receipt;

const computed = sha256Hex(stableStringify(body));

if (computed !== receipt_hash) {
  console.log("FAIL: receipt hash mismatch");
  console.log("expected:", receipt_hash);
  console.log("computed:", computed);
  process.exit(1);
}

console.log("PASS: receipt verified");
console.log("file:", filePath);
console.log("receipt_hash:", receipt_hash);
console.log("decision:", receipt.gate?.decision);
console.log("reason:", receipt.gate?.reason);
console.log("prev_hash:", receipt.prev_hash);

