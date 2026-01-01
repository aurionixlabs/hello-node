// rules.js
// Static rule pack for the demo. Keep it simple and explicit.

module.exports = {
  version: "v2",

allowedTools: new Set(["filesystem.writeFile"]),

  // Hard-refuse any "fraud" domain outright.
  refuseDomains: new Set(["fraud"]),

  // Treat these actions as "high impact" for the demo.
  confirmRequiredActions: new Set(["write"]),

  // Downgrade behavior: if confirmation required but missing,
  // force a read-only tool allowlist.
  downgrade: {
    readOnlyAllowedTools: ["filesystem.readFile"],
  },

  // Default behavior if no rule matches:
  default: "ALLOW",
};
