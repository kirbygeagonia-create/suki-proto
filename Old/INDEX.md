# Old/ — archived work, newest first

Every file here was moved, never edited: it is a record of what it was, not what it should become.
Restores are `git mv`-free; use the commands in the last column. The master rule for archiving was
three-way: the work's own status is settled (implemented, superseded or rejected, never merely
unknown), `grep` across `tools/`, both HTML files and `netlify.toml` finds no reader of its old
path, and every gate still passes after the move. Files that failed any of the three stayed at the
root — the second table lists them and says why.

## Archived

| Folder | File | Kind | Created | Last changed | What it was for | Status | Evidence | Superseded by | How to restore |
|---|---|---|---|---|---|---|---|---|---|
| `2026-10-10_visual-redesign-prompts/` | `SUKINNECT_CORRECTIVE_VISUAL_REDESIGN_IMPLEMENTATION_PROMPT.md` | implementation prompt | 2026-10-10 | 2026-10-10 | The corrective second visual pass: real locally-bundled 3D-style category image assets, app-wide typography, honest role-based charts, licence records | **Implemented, in part — then superseded on fonts** | `assets/category-art/*.png` + `ASSET-LICENSES.md` on disk; `measure.cjs`: art map keyed by every category, every entry names a file on disk, "the flat SVG scene table is gone"; `verify.cjs` honesty/chart rows pass | typography was re-decided by the owner on 2026-10-27 — `--font-ui` = Poppins, digits in Atkinson (`AGENTS.md` §68, `CHANGES.md` §152) | `git mv Old/2026-10-10_visual-redesign-prompts/SUKINNECT_CORRECTIVE_VISUAL_REDESIGN_IMPLEMENTATION_PROMPT.md Sukinnect_CORRECTIVE_VISUAL_REDESIGN_IMPLEMENTATION_PROMPT.md` |
| `2026-10-10_visual-redesign-prompts/` | `SUKINNECT_GRAB_INSPIRED_VISUAL_REDESIGN_PROMPT.md` | implementation prompt | 2026-10-10 | 2026-10-10 | The "Grab-inspired" master brief: static category art as the highest rule, cohesive icon/charts redesign across roles | **Superseded** | its own opening line in the corrective brief: "This brief supersedes older visual-redesign prompt/plan instructions wherever they conflict on category-art assets, fonts, visualization libraries, or whether implementation is required" | `SUKINNECT_CORRECTIVE_VISUAL_REDESIGN_IMPLEMENTATION_PROMPT.md` (this folder) | same `git mv` back |
| `2026-10-10_visual-redesign-prompts/` | `SUKINNECT_VISUAL_REDESIGN_PLAN.md` | plan/proposal | 2026-10-10 | 2026-10-10 | The measured proposal against the Grab brief, with phases P0–P4 and the acceptance checklist | **PARTIAL — P0, P1, P3, P4 implemented and verified today; P2 superseded; D3 unauthorised** | P0: `verify.cjs` "no category-tile rule animates or transforms / keyframes stay deleted / motion-only marks not restored"; P1: the full "honesty" suite (invented figures and claims gone); P4: "the admin weekly chart renders through the shared kit"; P3: "every glyph the app can reach has a drawing"; see the folder README | P2's refine-in-place was replaced by the corrective's asset replacement; D3 (28 px art) was never approved | same `git mv` back |

Per-file dates are `git log --follow --diff-filter=A --format=%as` (created) and `git log -1 --format=%as`
(last changed). All three files arrived together in commit `108bdb4` (2026-10-10): the work ended there
for the two prompts and the plan was last touched the same day.

## Still live, deliberately not archived

| File / folder | Why it stays | Who reads it |
|---|---|---|
| `Sukinnect.html` | the shipped prototype, retired by decision but byte-untouched (`git diff --quiet origin/main -- Sukinnect.html` → unchanged) and kept because removal is the owner's promotion call, not an archive move | `tools/build-web-dist.cjs` SERVE allowlist (line 30) — the build refuses when a listed path is missing, so archiving it needs that allowlist amended first; owner chose to keep at root, 2026-11-05 |
| `reicon.js` | the shipped prototype's icon library, same contract as its page | `tools/build-web-dist.cjs` SERVE allowlist; `<script defer src="reicon.js">` in `Sukinnect.html:20` |
| `SUKINNECT_UX_RELIABILITY_MVP_PLAN.md` | a live instrument input: every requirement row of the plan is tracked and the audit re-derives its state | `tools/audit-citations.cjs`, `audit-matrix-coverage.cjs`, `audit-report-coverage.cjs`, `audit-row-instruments.cjs`, `falsify-citations.cjs`, `falsify-report-coverage.cjs`, `falsify-row-instruments.cjs` (7 readers by path) |
| `AGENTS.md`, `README.md`, `CHANGES.md`, `DEVICE-PASS.md` | current governing documents | `tools/audit-open-items.cjs` and most `falsify-*` probes quote them; `README.md` is the reviewer's map |
| `Sukinnect-next.html`, `Sukinnect_Logo.png`, `netlify.toml` | the current app and its deploy contract | 13 tools by path |
| `fonts/`, `leaflet/`, `avatars/` (17 of 22), `assets/category-art/` (7 PNG + `ASSET-LICENSES.md`), `schema/` | loaded or cited by the current app / deploy | app references; `build-web-dist.cjs` SERVE |

## Deleted from the working tree, restorable from history (do not restore without asking)

| File | What it was | Last commit holding it | Restore |
|---|---|---|---|
| `SUKINNECT_MASTER_IMPLEMENTATION_PROMPT.md` | the ~1,900-line domain-kernel implementation brief | `108bdb4` deleted it ("the Grab-inspired brief replaces the two prompts it supersedes") | `git show 108bdb4~1:SUKINNECT_MASTER_IMPLEMENTATION_PROMPT.md > SUKINNECT_MASTER_IMPLEMENTATION_PROMPT.md` |
| `SUKINNECT_UIUX_REDESIGN_PROMPT.md` | the earlier mobile-UI brief, first marked superseded (`0fcd2f7`), then deleted | `108bdb4` | `git show 108bdb4~1:SUKINNECT_UIUX_REDESIGN_PROMPT.md > Sukinnect_UIUX_REDESIGN_PROMPT.md` |
| `lottie/` (+ `lottie/LICENSE.md`) | the Lottie pipeline that animated nothing | `fab842b` "chore: remove the Lottie pipeline that animated nothing" | `git show fab842b~1:lottie/LICENSE.md` per file |

## Candidates for deletion, awaiting approval — nothing here is deleted

| File | Size | sha256 (first 12) | Note |
|---|---|---|---|
| `avatars/avatar-13.png` | 7,135 B | `40d92d0be7a9` | added 2026-09-29 with the avatar set; referenced by neither `Sukinnect-next.html` nor `Sukinnect.html` |
| `avatars/avatar-14.png` | 5,861 B | `02651cfce6db` | same |
| `avatars/avatar-16.png` | 7,039 B | `3aa9cff8acbc` | same |
| `avatars/avatar-17.png` | 8,321 B | `8e532a9ec1fb` | same |

`reicon.js` (8,344,694 B, Git LFS) is deliberately **not** a deletion candidate while
`build-web-dist.cjs` keeps serving the shipped prototype beside the rebuild. The four avatar sizes
above are `wc -c` today; their bytes are excluded from no page, so deleting them only loses dead
weight. Sizes shown for the owner's decision; hashes in the folder README cover moved files only.

## Outside the repo, list only (unchanged, no decisions taken)

Path roots scanned shallowly: the repo's parent (`C:\Users\ADMIN\OneDrive\Desktop\Sukinnect`),
`Downloads`, `Desktop`, `Documents`.

| Path | What it looks like | Matches anything in the repo? |
|---|---|---|
| `Downloads/SUKINNECT_CORRECTIVE_VISUAL_REDESIGN_IMPLEMENTATION_PROMPT (1).md` | a "(1)" download duplicate of the corrective brief | **yes — sha256 `ef548dd226a3…` identical to the repo copy now at `Old/2026-10-10_visual-redesign-prompts/`** |
| `Downloads/SUKINNECT_ARCHIVE_AND_IMPLEMENTATION_STATUS_PROMPT.md` | the task brief that produced this archive itself | not a repo file |
| `Downloads/SUKINNECT_UX_RELIABILITY_MVP_PROMPT.md` | a *PROMPT* sibling of the live *PLAN* doc; different sha (`b76d4b6b…`), unexamined | no |
| `Downloads/Sukinnect_Master_Plan_Revised_27Oct2026.docx`, `Sukinnect_Master_Plan_Revised_November_2026.docx` | business master plans, dates match the newest CHANGES entries | unique to Downloads |
| `Downloads/SUKINNECT_Pitch_Deck_v2.pdf` (+ `(1)` duplicate) | a newer pitch deck than the repo's v1 (`SEAIT SUKINNECT - PITCHDECK.pdf`, LFS) | unique bytes |
| `Downloads/Sukinnect_Product_Defense_and_Implementation_Proposal*.docx`, `Sukinnect_Current_Features_Architecture_and_Financial_Expense_Report(*).docx`, `Sukinnect_Market_Research_and_Business_Development_Plan.docx`, `Sukinnect_app_icon.png`, `Suki_Enrol.png`, `Suki.docx` | product/business documents, multiple versions | unique to Downloads |
| `Downloads/Sukinnect-Release/` (contains `Sukinnect.zip`) | a release bundle | contents unexamined (owner decides) |
| `Downloads/` concept notes (`Konekta_Sukinnect_Concept-Note*.docx`, v2–v4refined) | the Konekta→Sukinnect concept-note lineage | unique to Downloads |
| `Desktop/OneDrive/Desktop/Konekta_Sukinnect_Concept-Note_PSCXI_v2.docx` | a concept-note copy on the Desktop tree | likely a relative of the Downloads copies |
| parent folder `OneDrive/Desktop/Sukinnect`: `.shots-build3.log`, `.cloud-attachments/`, `.freebuff/` | tool logs and the Cloud-CLI attachment cache — not repo material | no |

No document outside the repo was hashed for matches beyond the one confirmed duplicate; nothing
outside the repo was moved, renamed or deleted, per the task's ground rule.
