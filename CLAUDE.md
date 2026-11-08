# SUKINNECT — Claude Code project memory

@SUKINNECT_CONTEXT.md

Read `SUKINNECT_CONTEXT.md` in this folder before doing anything else. It is the read-first file:
what Sukinnect is, which document decides what, the business rules that bind the code, and the
commands that prove a claim.

Rules that survive any compaction:

- The app is one file, `Sukinnect-next.html`. Do not touch `Sukinnect.html`, `Sukinnect-Android/`,
  `dist/`, `.git/` or the `.docx` sources.
- Verify with `node tools/verify.cjs`, `node tools/shot.cjs --measure`, `node tools/measure.cjs`.
  Run `node tools/falsify-all.cjs` only alone, on a clean `Sukinnect-next.html`, checked before and
  after.
- A check that cannot fail is not a check. Never weaken a gate to reach green.
- Do not push. Do not invent providers, counts, prices, partners or quotes.
