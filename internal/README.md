# internal/

This folder contains internal-only modules.

Rule:
- Production code must NOT import anything in `internal/` directly.
- Only `toolRunner.cjs` should import these modules for normal operation.
- Exception: the security demos (e.g. `demo-bypass.cjs`) may import `internal/` to simulate attacker behavior.

Reason:
- These modules are not safe to call directly and may bypass enforcement layers if misused.
