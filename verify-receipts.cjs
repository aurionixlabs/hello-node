"use strict";

const { verifyReceiptChain } = require("./receipt.cjs");

const r = verifyReceiptChain();if (r.ok) {
  console.log(`OK: receipt chain valid. count=${r.count} lastHash=${r.lastHash}`);
  process.exit(0);
} else {
  console.error(`FAIL: receipt chain invalid at index=${r.index}. ${r.error}`);
  process.exit(1);
}
