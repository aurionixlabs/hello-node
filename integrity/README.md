# Integrity workflow (Stage 9 / 9B)

This repo uses a startup integrity gate.

- Stage 9: `toolRunner.cjs` verifies core module hashes against `integrity/manifest.json`.
- Stage 9B (optional): it also verifies a signature over the manifest.

If integrity fails, the runner must fail closed (no tool execution).

## What counts as a “core” file?

Core files are exactly the ones listed in `integrity/gen-manifest.cjs` (`TARGETS`), typically:
- toolRunner.cjs
- internal/tools.cjs
- decide.js
- rules.js
- receipt.cjs
- confirm.cjs

If you change any of these, you MUST update integrity artifacts.

## Required update workflow (every time core files change)

1) Regenerate hashes:
   node integrity/gen-manifest.cjs

2) If using signed mode (Stage 9B), re-sign:
   minisign -S -m integrity/manifest.json -s integrity/keys/minisign.key -x integrity/manifest.sig

3) Verify integrity locally:
   # signed mode
   node integrity/verify-signed.cjs
   # unsigned mode
   node integrity/verify.cjs

4) Run demo suite:
   node demo-filesystem.cjs
   node demo-agent.cjs
   node demo-confirm.cjs
   node demo-bypass.cjs
   node demo-cap-leak.cjs
   node verify-receipts.cjs

5) Commit the updated artifacts:
   integrity/manifest.json
   integrity/manifest.sig (if signed mode)
   plus the changed core files
