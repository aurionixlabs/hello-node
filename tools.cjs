"use strict";

/**
 * tools.cjs
 *
 * Stage 7: bypass resistance via capability handles.
 * - Tools require a secret CAP object.
 * - The CAP is created ONLY inside toolRunner.cjs and never exported.
 * - If someone tries to import tools.cjs and call a tool directly, it fails without CAP.
 */

const path = require("path");
const fsp = require("fs/promises");

// Tools are stored privately in this module.
// Export ONLY a getter that returns a tool function bound to a capability check.

function requireCap(cap, expectedCap) {
  if (cap !== expectedCap) {
    throw new Error("tools: missing or invalid capability");
  }
}

function buildTools(expectedCap) {
  return {
    "filesystem.writeFile": async (cap, { path: relPath, content }) => {
      requireCap(cap, expectedCap);

      const abs = path.resolve(process.cwd(), relPath);

      const tmpRoot = path.resolve(process.cwd(), "tmp") + path.sep;
      if (!abs.startsWith(tmpRoot)) {
        throw new Error("filesystem.writeFile: path must be under ./tmp");
      }

      await fsp.mkdir(path.dirname(abs), { recursive: true });
      await fsp.writeFile(abs, String(content ?? ""), "utf8");

      return {
        ok: true,
        wrote: abs,
        bytes: Buffer.byteLength(String(content ?? ""), "utf8"),
      };
    },

    // Deliberately dangerous; should be blocked by rules.allowedTools
    "filesystem.deleteFile": async (cap, { path: relPath }) => {
      requireCap(cap, expectedCap);

      const abs = path.resolve(process.cwd(), relPath);
      await fsp.unlink(abs);
      return { ok: true, deleted: abs };
    },
  };
}

module.exports = { buildTools };
