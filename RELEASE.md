# Release checklist (demo repo)

If you changed enforcement code (gate/tools/receipts/confirm/rules), you MUST update integrity artifacts or startup will fail closed.

1) Regenerate hashes:
   node integrity/gen-manifest.cjs

2) Re-sign manifest (if using signed mode):
   minisign -S -m integrity/manifest.json -s integrity/keys/minisign.key -x integrity/manifest.sig

3) Verify locally:
   node integrity/verify-signed.cjs
   # or unsigned mode:
   node integrity/verify.cjs

4) Run demos:
   node demo-filesystem.cjs
   node demo-agent.cjs
   node demo-confirm.cjs
   node demo-bypass.cjs
   node demo-cap-leak.cjs
   node verify-receipts.cjs

5) Commit updated integrity artifacts:
   integrity/manifest.json
   integrity/manifest.sig (signed mode)
   plus any changed core modules
