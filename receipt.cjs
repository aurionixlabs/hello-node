const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const RECEIPTS_DIR = path.join(__dirname, "receipts");

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

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

function payloadHash(payload) {
  // Don’t store raw payload in receipts; store a stable hash.
  return sha256Hex(stableStringify(payload ?? null));
}

function makeReceipt(req, gate, prev_hash = null) {
  const body = {
    version: "r1",
    ts: new Date().toISOString(),
    prev_hash: prev_hash || null,

    request: {
      toolName: req.toolName,
      action: req.action,
      domain: req.domain,
      confirmed: !!req.confirmed,
      payload_hash: payloadHash(req.payload),
    },

    gate: {
      decision: gate.decision,
      reason: gate.reason,
      policy_version: gate.policyVersion || "rules-v1",
    },
  };

  const receipt_hash = sha256Hex(stableStringify(body));
  return { ...body, receipt_hash };
}

function latestPointerPath() {
  return path.join(RECEIPTS_DIR, "latest.json");
}

function readLatestHash() {
  try {
    const p = latestPointerPath();
    if (!fs.existsSync(p)) return null;
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    return j && j.receipt_hash ? j.receipt_hash : null;
  } catch {
    return null;
  }
}

function writeLatestPointer(receipt_hash, file) {
  fs.writeFileSync(
    latestPointerPath(),
    JSON.stringify({ receipt_hash, file }, null, 2),
    "utf8"
  );
}

function receiptFileName(tsISO, receipt_hash) {
  // Make a filesystem-safe timestamp
  const safeTs = tsISO.replace(/[:.]/g, "-");
  return `${safeTs}__${receipt_hash}.json`;
}

function issueReceipt(req, gate) {
  ensureDir(RECEIPTS_DIR);

  const prev = readLatestHash();
  const receipt = makeReceipt(req, gate, prev);

  const file = path.join(RECEIPTS_DIR, receiptFileName(receipt.ts, 
receipt.receipt_hash));
  fs.writeFileSync(file, JSON.stringify(receipt, null, 2), "utf8");

  writeLatestPointer(receipt.receipt_hash, path.basename(file));

  return receipt;
}

function verifyReceiptObject(receipt) {
  const { receipt_hash, ...body } = receipt;
  const computed = sha256Hex(stableStringify(body));
  return { ok: computed === receipt_hash, computed, receipt_hash };
}

function latestReceiptPath() {
  const p = latestPointerPath();
  if (!fs.existsSync(p)) return null;
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  if (!j || !j.file) return null;
  return path.join(RECEIPTS_DIR, j.file);
}

function loadReceiptFromFile(filePath) {
  const txt = fs.readFileSync(filePath, "utf8");
  return JSON.parse(txt);
}

module.exports = {
  issueReceipt,
  verifyReceiptObject,
  latestReceiptPath,
  loadReceiptFromFile,
  RECEIPTS_DIR,
};

