# internal/

This folder contains internal-only modules.

Rule:
- Do NOT import anything in `internal/` from demos, apps, or external modules.
- Only `toolRunner.cjs` may import these modules.

Reason:
- These modules are not safe to call directly and may bypass enforcement layers if misused.
