# hello-node — rule-gated execution proof

This repo proves a minimal enforcement pattern:

- `rules.js` = external policy
- `decide.js` = reads policy and returns a decision
- `index.js` = obeys the decision (runs or refuses)

## How to run
```bash
node index.js
## Proof

1) Set `allowed: false` in `rules.js` then run:
   `node index.js`

   Expected: `ACTION: refused`

2) Set `allowed: true` in `rules.js` then run:
   `node index.js`

   Expected: `ACTION: allowed`

Only `rules.js` changes. Behavior flips.  
This demonstrates external policy–gated execution.

