# Integrity workflow (Stage 9 / 9B)

This repo uses a startup integrity gate:
- `toolRunner.cjs` verifies core module hashes against `integrity/manifest.json`
- If Stage 9B is enabled, it also verifies a signature over the manifest

## When you change ANY core enforcement file

Core files include (see `integrity/gen-manifest.cjs` TARGETS):
- toolRunner.cjs
- internal/tools.cjs
- decide.js
- rules.js
- receipt.cjs
- confirm.cjs
(and anything else added to TARGETS)

You MUST regenerate and re-sign the manifest, or the system will fail closed.

## Update steps (required)

1) Regenerate hashes:
```bash
node integrity/gen-manifest.cjs

minisign -S -m integrity/manifest.json -s integrity/keys/minisign.key -x integrity/manifest.sig

node integrity/verify-signed.cjs
# or if unsigned mode:
node integrity/verify.cjs

node demo-filesystem.cjs
node demo-agent.cjs
node demo-confirm.cjs
node demo-bypass.cjs
node demo-cap-leak.cjs
node verify-receipts.cjs


## 2) Add a root `RELEASE.md` (short + impossible to miss)

```bash
cat > RELEASE.md <<'EOF'
# Release checklist (demo repo)

## If you changed enforcement code (gate/tools/receipts/confirm/rules)
You MUST update integrity artifacts or startup will fail closed.

Run:
1) node integrity/gen-manifest.cjs
2) minisign -S -m integrity/manifest.json -s integrity/keys/minisign.key -x integrity/manifest.sig
3) node integrity/verify-signed.cjs
4) node demo-filesystem.cjs && node demo-agent.cjs && node demo-confirm.cjs && node demo-bypass.cjs && node demo-cap-leak.cjs
5) node verify-receipts.cjs
