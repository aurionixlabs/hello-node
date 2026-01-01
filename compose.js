"use strict";

/**
 * compose.js
 * Combines multiple rule results into a single decision.
 *
 * Priority: refused > degraded > allowed
 * Scopes accumulate, constraints accumulate.
 */

const PRIORITY = { allowed: 0, degraded: 1, refused: 2 };

function normalize(result) {
  const action = (result && result.action) || "refused";
  return {
    action,
    reason: (result && result.reason) || "no_reason",
    scope: Array.isArray(result && result.scope) ? result.scope : [],
    constraints: Array.isArray(result && result.constraints) ? result.constraints : [],
    meta: result && typeof result.meta === "object" ? result.meta : {},
  };
}

// AND composition: worst action wins, constraints merge
function composeAND(results) {
  const normalized = (results || []).map(normalize);
  if (normalized.length === 0) {
    return { action: "refused", reason: "no_rules", scope: [], constraints: [], meta: { composed: "AND" } };
  }

  let worst = normalized[0];
  for (const r of normalized) {
    if (PRIORITY[r.action] > PRIORITY[worst.action]) worst = r;
  }

  return {
    action: worst.action,
    reason: worst.reason,
    scope: Array.from(new Set(normalized.flatMap((r) => r.scope))),
    constraints: normalized.flatMap((r) => r.constraints),
    meta: { composed: "AND" },
  };
}

// OR composition: allow if ANY allowed; otherwise fall back to AND (worst)
function composeOR(results) {
  const normalized = (results || []).map(normalize);
  if (normalized.length === 0) {
    return { action: "refused", reason: "no_rules", scope: [], constraints: [], meta: { composed: "OR" } };
  }

  const anyAllowed = normalized.some((r) => r.action === "allowed");
  if (!anyAllowed) return composeAND(normalized);

  const firstAllowed = normalized.find((r) => r.action === "allowed");

  return {
    action: "allowed",
    reason: (firstAllowed && firstAllowed.reason) || "or_allowed",
    scope: Array.from(new Set(normalized.flatMap((r) => r.scope))),
    constraints: normalized.flatMap((r) => r.constraints),
    meta: { composed: "OR" },
  };
}

module.exports = { composeAND, composeOR };
