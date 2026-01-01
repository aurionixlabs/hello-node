"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ===============================
// Paths
// ===============================
const RECEIPT_DIR = path.join(process.cwd(), "receipts");
const CHAIN_LOG = path.join(RECEIPT_DIR, "receipts.jsonl");
const CHAIN_STATE = path.join(RECEIPT_DIR, "chain-state.json");

// ===============================
// Utilities
// ===============================
function ensureReceiptDirSync() {
  if (!fs.existsSync(RECEIPT_DIR)) {
    fs.mkdirSync(RECEIPT_DIR, { recursive: true });
  }
}

function sha256Hex(s) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

function stableStringify(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  const keys = Object.keys(v).sort();
  return (
    "{" +
    keys.map((k) => JSON.stringify(k) + ":" + stableStringify(v[k])).join(",") +
    "}"
  );
}

// ===============================
// Chain helpers (Stage 2)
// ===============================
function loadChainStateSync() {
  try {
    const raw = fs.readFileSync(CHAIN_STATE, "utf8");
    const s = JSON.parse(raw);
    return { lastHash: s.lastHash || "GENESIS" };
  } catch {
    return { lastHash: "GENESIS" };
  }
}

function saveChainStateSync(lastHash) {
  fs.writeFileSync(
    CHAIN_STATE,
    stableStringify({ lastHash }) + "\n",
    "utf8"
  );
}

function canonicalForChain(receiptObj, prevHash) {
  return {
    ts: receiptObj.ts || receiptObj.timestamp || new Date().toISOString(),
    policyVersion: receiptObj.policyVersion || "v1",
    decision: receiptObj.decision || null,
    domain: receiptObj.domain || null,
    action: receiptObj.action || null,
    tool: receiptObj.tool || null,
    args: receiptObj.args ?? receiptObj.toolArgs ?? null,
    reasons: Array.isArray(receiptObj.reasons)
      ? receiptObj.reasons
      : receiptObj.reason
      ? [receiptObj.reason]
      : [],
    outcome: receiptObj.outcome || receiptObj.status || null,
    prevHash,
  };
}

function appendReceiptToChain(receiptObj) {
  ensureReceiptDirSync();

  const state = loadChainStateSync();
  const prevHash = state.lastHash || "GENESIS";

  const base = canonicalForChain(receiptObj, prevHash);
  const hash = sha256Hex(stableStringify(base));
  const chained = { ...base, hash };

  fs.appendFileSync(CHAIN_LOG, stableStringify(chained) + "\n", "utf8");
  saveChainStateSync(hash);

  return chained;
}

function verifyReceiptChain() {
  ensureReceiptDirSync();

  if (!fs.existsSync(CHAIN_LOG)) {
    return { ok: true, count: 0, lastHash: "GENESIS" };
  }

  const raw = fs.readFileSync(CHAIN_LOG, "utf8");
  const lines = raw.split("\n").filter(Boolean);

  let prev = "GENESIS";
  for (let i = 0; i < lines.length; i++) {
    let r;
    try {
      r = JSON.parse(lines[i]);
    } catch {
      return { ok: false, index: i, error: "Invalid JSON line" };
    }

    if (r.prevHash !== prev) {
      return { ok: false, index: i, error: "Broken chain (prevHash mismatch)" };
    }

    const expected = sha256Hex(
      stableStringify(canonicalForChain(r, r.prevHash))
    );

    if (r.hash !== expected) {
      return { ok: false, index: i, error: "Hash mismatch (tampered?)" };
    }

    prev = r.hash;
  }

  return { ok: true, count: lines.length, lastHash: prev };
}

// ===============================
// Receipt writer (per-file + chain)
// ===============================
function writeReceipt(data) {
  ensureReceiptDirSync();

  const prefix =
    (data.tool || data.action || data.domain || "receipt")
      .toString()
      .replace(/[^a-z0-9_-]/gi, "_");

  const hash = data.hash || sha256Hex(stableStringify(data));
  const fileName = `${prefix}_${hash}.json`;
  const filePath = path.join(RECEIPT_DIR, fileName);

  const receipt = {
    ...data,
    hash,
    ts: data.ts || new Date().toISOString(),
  };

  fs.writeFileSync(filePath, JSON.stringify(receipt, null, 2), "utf8");

  // Stage-2 append (tamper-evident)
  appendReceiptToChain(receipt);

  // Update latest pointer
  fs.writeFileSync(
    path.join(RECEIPT_DIR, "latest.json"),
    JSON.stringify({ hash, file: fileName }, null, 2),
    "utf8"
  );

  return receipt;
}

// ===============================
// Exports
// ===============================
module.exports = {
  writeReceipt,
  appendReceiptToChain,
  verifyReceiptChain,
};

