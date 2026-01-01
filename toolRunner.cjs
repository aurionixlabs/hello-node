"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Tool registry
 */
class ToolRegistry {
  constructor() {
    this.tools = new Map();
  }

  register(def) {
    if (!def || typeof def.name !== "string" || def.name.trim() === "") {
      throw new Error("ToolRegistry.register: name must be a non-empty string");
    }
    if (typeof def.fn !== "function") {
      throw new Error("ToolRegistry.register: fn must be a function");
    }
    if (this.tools.has(def.name)) {
      throw new Error("ToolRegistry.register: duplicate tool name: " + def.name);
    }
    this.tools.set(def.name, def.fn);
  }

  get(name) {
    return this.tools.get(name);
  }
}

const registry = new ToolRegistry();

/**
 * Example filesystem tool (safe demo)
 */
registry.register({
  name: "filesystem.writeFile",
  fn: ({ path: target, content }) => {
    const full = path.resolve(target);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, String(content ?? ""), "utf8");
    return {
      ok: true,
      wrote: full,
      bytes: Buffer.byteLength(String(content ?? ""), "utf8"),
    };
  },
});

/**
 * Hardened gate-enforced runner
 */
function runTool(call, decision) {
  if (!decision || typeof decision.action !== "string") {
    throw new Error("runTool: missing decision");
  }

  if (decision.action !== "allowed") {
    throw new Error(
      "Blocked by gate: " +
        decision.action +
        (decision.reason ? " (" + decision.reason + ")" : "")
    );
  }

  if (!call || typeof call.tool !== "string") {
    throw new Error("runTool: invalid tool call");
  }

  const fn = registry.get(call.tool);
  if (!fn) {
    throw new Error("runTool: unknown tool: " + call.tool);
  }

  return fn(call.args || {});
}

module.exports = {
  ToolRegistry,
  registry,
  runTool,
};
