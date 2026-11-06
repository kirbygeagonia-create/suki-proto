# 2026-10-10 visual-redesign prompts — archived

This folder holds the three visual-redesign documents that sat at the repository root: the
Grab-inspired brief, the measured plan it produced, and the corrective brief that replaced both
of them. They were archived on 2026-11-05 because each one's own outcome is settled and settled
elsewhere: the corrective brief states in its opening block that it supersedes the older prompt
and plan "wherever they conflict on category-art assets, fonts, visualization libraries, or
whether implementation is required," and the corrective pass itself was later overtaken by the
owner's 2026-10-27 rulings (flat palette, Poppins-for-words/Atkinson-for-digits), recorded as
`CHANGES.md` §152–§160. Nothing live reads any of these files by path: grep across `tools/`,
both HTML files and `netlify.toml` after the move finds no reader of the old root paths; the only
remaining mentions are historical lines in `CHANGES.md`, which are allowed to stay. None of the
three is served by `tools/build-web-dist.cjs`, and `Old/` is structurally absent from that
allowlist, so none of them is published.

**Date range:** created 2026-10-10 (all three arrived in commit `108bdb4` — "docs: the
Grab-inspired brief replaces the two prompts it supersedes, with its plan beside it", which added
these and deleted `SUKINNECT_MASTER_IMPLEMENTATION_PROMPT.md` and `SUKINNECT_UIUX_REDESIGN_PROMPT.md`),
to last changed the same day. They were never amended after arrival.
Archival commit: `f4be3a2` ("chore: move the three 2026-10-10 visual-redesign prompts/plans into Old/").

**Do not edit these files. They are a record.** To work from one again, restore it to the root
with the commands below; the application code never needed the documents to compile.

## Per-file record

| File | sha256 (first 12) | Size | Status | Evidence for the status |
|---|---|---|---|---|
| `SUKINNECT_GRAB_INSPIRED_VISUAL_REDESIGN_PROMPT.md` | `bf116fc3015e` | 46,680 B | SUPERSEDED | the corrective brief's opening "supersedes" sentence; commit `108bdb4`'s subject line |
| `SUKINNECT_VISUAL_REDESIGN_PLAN.md` | `2fa1e552f328` | 33,048 B | PARTIAL (P0, P1, P3, P4 implemented and still verified today; P2 superseded; D3 unauthorised) | see the requirement checklist |
| `SUKINNECT_CORRECTIVE_VISUAL_REDESIGN_IMPLEMENTATION_PROMPT.md` | `ef548dd226a3` | 33,254 B | IMPLEMENTED in part; typography superseded by the owner | see the requirement checklist |

`Created` and `last changed` for all three: 2026-10-10 / 2026-10-10 (`git log --follow
--diff-filter=A --format=%as` / `git log -1 --format=%as`). The full sha256 values, unchanged by
the move (hashes before and after compared on 2026-11-05):

```
2fa1e552f328374fe9d02c7ee4e1c4854a6959449a6682ef767ad65fd90aa874  SUKINNECT_VISUAL_REDESIGN_PLAN.md
bf116fc3015e905b7dccb542bda5f7b3e85418fb65fa8e38ff00d359cb194261  SUKINNECT_GRAB_INSPIRED_VISUAL_REDESIGN_PROMPT.md
ef548dd226a3bd2ef978dc7a77f42fd10cf68a2f5a1c8697986f62c9b23346e0  SUKINNECT_CORRECTIVE_VISUAL_REDESIGN_IMPLEMENTATION_PROMPT.md
```
(all three lines printed full-length by `sha256sum`; the truncated forms in the table
are prefixes. Use `sha256sum <file>` rather than trusting these lines blindly.)

## Requirement checklists

### `SUKINNECT_GRAB_INSPIRED_VISUAL_REDESIGN_PROMPT.md`

| Requirement (the brief's own words, compressed) | Verdict | Evidence |
|---|---|---|
| Highest rule: category artwork must never move or animate; static soft-3D only | **IMPLEMENTED** (via the plan's P0) | `verify.cjs` rows pass today: "no category-tile rule animates or transforms", "the category keyframes stay deleted", "the motion-only marks were not restored"; `CHANGES.md` §24 records the pass |
| Redesign category art, icons, charts across every role, after owner approval | **SUPERSEDED in method** | the corrective brief explicitly rejects refine-in-place for the art and orders real image assets; fonts and palette later re-decided by the owner (§152) |
| Do not touch `Sukinnect.html` | **HOLDS to this day** | `git diff --quiet origin/main -- Sukinnect.html` → unchanged (run 2026-11-05) |
| The rebuild "should not need `reicon.js`" | already true when written — the plan called the premise stale, and `measure.cjs` still reports 43 glyphs drawn inline | `measure.cjs` output |
| Implementation gated on owner approval | **RESPECTED** | `CHANGES.md` §24 records the approved P0+P1 and what the falsifiers proved |

### `SUKINNECT_VISUAL_REDESIGN_PLAN.md`

| Phase | Verdict | Evidence |
|---|---|---|
| P0 — make category art static (delete 14 @keyframes, hover transforms, contradictory comment) | **IMPLEMENTED** | `verify.cjs`: no category-tile rule animates; keyframes stay deleted; motion marks not restored — all passing 2026-11-05 |
| P1 — chart honesty (fix providerReviews, derive barangay counts, delete invented claims "+18% / ₱4,200 peak / 58%") | **IMPLEMENTED** | the whole "honesty" suite in `verify.cjs` passes, including "the invented chart claims are gone" and "no chart is drawn from a literal data series" |
| P2 — refine the seven inline SVG scenes | **SUPERSEDED** | the corrective pass replaced the inline scenes with locally bundled image assets; `measure.cjs` reads "the flat SVG scene table is gone, not merely unused" and the art map names files on disk |
| P3 — icon normalisation (aria-hidden, size discipline, stroke/fill grammar) | **IMPLEMENTED** (in later passes) | `measure.cjs`: 43 glyphs drawn, every one of the 38 reachable names has artwork; `grep aria-hidden Sukinnect-next.html` finds the attribute carried |
| P4 — shared chart language (`chartBars/chartLine/chartShare` helpers) | **IMPLEMENTED** | `verify.cjs`: "the admin weekly chart renders through the shared kit", axis/thinning/zero-series rows pass |
| D3 — 28 px variant of the art | **NOT IMPLEMENTED (never authorised)** | no 28 px asset or rule exists; the plan itself marks D3 as an owner decision |

### `SUKINNECT_CORRECTIVE_VISUAL_REDESIGN_IMPLEMENTATION_PROMPT.md`

| Requirement | Verdict | Evidence |
|---|---|---|
| Replace the primary category illustrations with real, locally bundled, pre-rendered 3D-style image assets via a keyed map and local `<img>` | **IMPLEMENTED** | `assets/category-art/{appliance,cleaning,delivery,electrical,fruit,plumbing,tutoring}.png` on disk, referenced by `Sukinnect-next.html`; `measure.cjs`: art map keyed by every category the catalogue holds, every entry names a file on disk, tile states its size and stays out of the accessibility tree |
| Research from official sources, verify licences, record them | **IMPLEMENTED** | `assets/category-art/ASSET-LICENSES.md` exists beside the PNGs (its provenance table is a repo record, not this task's to re-verify) |
| Substantial visible improvement to data visualizations per role | **IMPLEMENTED** | shared chart kit verified by `verify.cjs`; the honesty suite eliminates literal-data and invented-figure charts |
| Make app-wide typography change | **IMPLEMENTED, then superseded** | the owner's 2026-10-27 ruling re-decided the faces: `--font-ui` = Poppins, digits in Atkinson via `--font-figures` (`AGENTS.md` §68, `CHANGES.md` §152); `verify.cjs` verifies the current arrangement, not this brief's |
| Keep the domain kernel, lifecycle, centavos model and harness intact | **HOLDS** | `verify.cjs` 740/740 on the day of archiving |
| Static artwork rule | **HOLDS** | same three motion gates as P0 |

## Restore commands

```bash
git mv Old/2026-10-10_visual-redesign-prompts/SUKINNECT_VISUAL_REDESIGN_PLAN.md SUKINNECT_VISUAL_REDESIGN_PLAN.md
git mv Old/2026-10-10_visual-redesign-prompts/SUKINNECT_GRAB_INSPIRED_VISUAL_REDESIGN_PROMPT.md SUKINNECT_GRAB_INSPIRED_VISUAL_REDESIGN_PROMPT.md
git mv Old/2026-10-10_visual-redesign-prompts/SUKINNECT_CORRECTIVE_VISUAL_REDESIGN_IMPLEMENTATION_PROMPT.md Sukinnect_CORRECTIVE_VISUAL_REDESIGN_IMPLEMENTATION_PROMPT.md
```

(Or check any historical revision with `git show <rev>:/SUKINNECT_GRAB_INSPIRED_VISUAL_REDESIGN_PROMPT.md`,
e.g. the tag `legacy-sukinnect-v1`'s tree, which predates this move.)
