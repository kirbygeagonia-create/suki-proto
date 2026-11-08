# GitHub Copilot — repository custom instructions

Start by reading **`SUKINNECT_CONTEXT.md`** in this repository's root. That file is the read-first
context for every AI tool, and it is deliberately not copied here — one source, no drift.

Non-negotiables, for the avoidance of doubt:

- The current app is the single file `Sukinnect-next.html`. Do not edit `Sukinnect.html`,
  `Sukinnect-Android/`, `dist/`, `.git/`, `Python/`, or the `.docx` business sources.
- Preserve each file's existing line endings (the app is CRLF on Windows).
- Verify with `node tools/verify.cjs`, `node tools/shot.cjs --measure` and `node tools/measure.cjs`.
  `node tools/falsify-all.cjs` rewrites the app file: run it alone, only when
  `git status --porcelain -- Sukinnect-next.html` is empty, and check it again afterwards.
- A check that cannot fail is not a check. Update a gate to assert the new contract; never weaken it
  to reach green.
- Honest labelling is a requirement, not a style: simulated behaviour, demo versus live records, and
  targets-as-targets must stay visible. Do not invent providers, counts, prices, partners or quotes,
  and do not push.
