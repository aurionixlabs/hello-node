# hello-node — rule-gated execution proof

This repo proves a minimal enforcement pattern:

- `rules.js` = external policy
- `decide.js` = reads policy and returns a decision
- `index.js` = obeys the decision (runs or refuses)

## How to run
```bash
node index.js

