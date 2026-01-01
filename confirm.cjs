"use strict";

const fs = require("fs");
const path = require("path");

const CONFIRM_FILE = path.resolve(process.cwd(), "receipts", "confirmations.json");

/**
 * Confirmation store:
 * - issue(scopeKey) => token
 * - consume(token, scopeKey) => true/false
 *
 * This is deliberately simple for a demo.
 * In real systems, confirmations would be signed, time-bounded,
 * and bound to a human identity / session.
 */

function ensureDir() {
  const dir = path.dirname(CONFIRM_FILE);
  fs.mkdirSync(dir, { recursive: true });
}

function load() {
  ensureDir();
  if (!fs.existsSync(CONFIRM_FILE)) return { tokens: {} };
  try {
    return JSON.parse(fs.readFileSync(CONFIRM_FILE, "utf8"));
  } catch {
    // fail-closed: if corrupted, treat as empty
    return { tokens: {} };
  }
}

function save(db) {
  ensureDir();
  fs.writeFileSync(CONFIRM_FILE, JSON.stringify(db, null, 2) + "\n", "utf8");
}

function randomToken() {
  // not crypto-grade; fine for a demo
  return (
    "c_" +
    Math.random().toString(16).slice(2) +
    Math.random().toString(16).slice(2)
  );
}

function issueConfirmation(scopeKey) {
  if (!scopeKey || typeof scopeKey !== "string") {
    throw new Error("issueConfirmation: scopeKey must be a string");
  }
  const db = load();
  const token = randomToken();
  db.tokens[token] = { scopeKey, createdAt: new Date().toISOString() };
  save(db);
  return token;
}

function consumeConfirmation(token, scopeKey) {
  if (!token || typeof token !== "string") return false;
  if (!scopeKey || typeof scopeKey !== "string") return false;

  const db = load();
  const row = db.tokens[token];
  if (!row) return false;
  if (row.scopeKey !== scopeKey) return false;

  // one-time use
  delete db.tokens[token];
  save(db);
  return true;
}

module.exports = { issueConfirmation, consumeConfirmation, CONFIRM_FILE };
