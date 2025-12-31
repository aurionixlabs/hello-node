# Non-Bypassable Decision Gate with Verifiable Enforcement

This repository demonstrates a deterministic decision-gate system 
that **physically prevents side-effects unless explicitly 
authorized**, and produces **verifiable outcomes at execution time**.

This is not advisory policy.
This is enforced reality.

---

## Problem

Most AI and automation “safety layers” are advisory:

- Tools can still execute
- Logs can be altered
- Decisions cannot be proven after the fact

In these systems, refusal is a suggestion — not a guarantee.

---

## What This System Guarantees

If the decision gate does **not** allow an action, the side-effect 
**cannot happen**.

This guarantee is enforced at execution time, not via prompts, logs, 
or post-hoc analysis.

---

## 1. Decision Gate + Enforcement

Run the demo:

```bash
node decide.js

