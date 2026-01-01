// receipt.cjs
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const RECEIPTS_DIR = path.join(__dirname, "receipts");
fs.mkdirSync(RECEIPTS_DIR, { recursive: true });

function writeReceipt(data) {
  const id = crypto.randomBytes(16).toString("hex");
  const file = path.join(RECEIPTS_DIR, `${id}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return id;
}

module.exports = { writeReceipt };

