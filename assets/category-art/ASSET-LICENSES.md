# Category artwork — provenance and licence

## The open question, stated once, with the cost of each answer

These seven images are machine-generated. The licence position is therefore not "who do we owe
attribution to" (nobody) but "do we hold an enforceable exclusive right in them" — which is
unsettled in several jurisdictions, including the United States, where the Copyright Office has
declined protection for purely machine-generated output while granting it where there is
sufficient human authorship in selection and arrangement. The Philippines follows a
registration-and-originality framework of its own. **Nothing in this file is legal advice, and
the decision is the owner's.** Three positions, with what each costs:

1. **Accept it and ship.** Cost: nothing now. Risk: if the mark ever needs to be enforced against
   a copycat, the seven tiles may not be the thing you can point at. The logo is a separate
   matter — `Sukinnect_Logo.png` is a human-made asset and is not in question here.
2. **Commission the same seven objects from a human illustrator.** Cost: one illustration
   commission, and the spec already exists — the prompt block below is a complete art direction
   (subject, camera, materials, key light, shadow, tint, no text, 256 px on a rounded square),
   so the brief is written. This is the option the rest of this file was prepared for.
3. **Find a consistent openly-licensed set covering all seven.** Cost: the search, which was
   already done once and failed — see the 3Dicons record below. The blocker was coverage
   (no plumbing, no produce) and it would need repeating against a different library.

### If you choose option 2 or 3, the swap is three steps, verified rather than assumed

`category-art` is referenced from exactly one place in the code, so filenames can change freely:

1. Replace the seven PNGs in `assets/category-art/` (any names, as long as they are 256×256 RGBA
   and the tile still renders at 60 CSS px — 256 covers a 3× device).
2. Edit `SERVICE_ART` in `Sukinnect-next.html`. That map is the only code that names a file;
   nothing else in the page, the gate or the tools hard-codes a category filename.
3. Re-sync the Android bundle, which holds its own copy at
   `Sukinnect-Android/app/src/main/assets/assets/category-art/` — the WebView root mirrors the
   repo root, so the directory is doubled. This step is easy to miss because `git status` cannot
   see it: the Android tree is untracked.

Then `node tools/verify.cjs` fails if any category has no file on disk, and
`node tools/shot.cjs --measure` reports any image that asked for a file and got no pixels across
all screens, so a half-finished swap cannot pass quietly.

## What these are

Seven pre-rendered soft-3D images, one per service category, replacing the inline SVG
scene family that was previously the primary art on the Resident Home grid.

| File | Category (`SERVICES` id) | Dimensions | Weight | Colour type |
|---|---|---|---|---|
| `plumbing.png` | `plumbing` | 256 × 256 | 89.5 KB | RGBA (PNG, bit depth 8) |
| `electrical.png` | `electrical` | 256 × 256 | 106.2 KB | RGBA |
| `cleaning.png` | `cleaning` | 256 × 256 | 81.9 KB | RGBA |
| `tutoring.png` | `tutoring` | 256 × 256 | 87.1 KB | RGBA |
| `appliance.png` | `appliance` | 256 × 256 | 97.7 KB | RGBA |
| `delivery.png` | `delivery` | 256 × 256 | 85.3 KB | RGBA |
| `fruit.png` | `fruit` (Fruit Harvest & Buy) | 256 × 256 | 86.1 KB | RGBA |

**Total: 633.8 KB for the whole set**, bundled locally, referenced by relative path from
`SERVICE_ART` in `Sukinnect-next.html`. Nothing here is fetched at runtime; the app opens
with no network. The tile renders at 60 CSS px, so 256 px covers a 3× device with headroom
— the 1024 px source renders were downscaled with high-quality bicubic
(`tools`-external PowerShell/`System.Drawing`, script kept outside the repo) and are not
shipped.

## How these were made

Each image was **generated for this project** with the development environment's image
tool, from a prompt that held the art direction constant and varied only the object and
the tile's own `SERVICE_THEME` tint:

> Soft 3D clay-render style app icon of a single *<object>*, centered composition,
> three-quarter top-down camera angle, matte soft plastic and brushed metal materials,
> gentle key light from the upper left, soft diffuse contact shadow beneath the object,
> minimal clean design, no text, no logo, isolated on a plain *<tint>* rounded-square
> background, crisp edges, high quality 3D illustration for a mobile app category tile

The objects are the same subjects the previous SVG scenes drew — tap with a droplet, bulb
with a spark, spray bottle with bubbles, open book with pencil, front-loading washer,
parcel on a road marking, mango beside a harvest basket — so category recognition did not
have to be relearned by anyone.

**Licence: no third-party licence applies, because no third-party asset was used.** No
attribution is owed to any icon author. Be aware of what this does *not* establish: the
copyright status of machine-generated imagery is unsettled in several jurisdictions, so
"we made it" is not the same as "we hold an enforceable exclusive right in it". For a
prototype distributed to a pilot municipality that is a non-issue; before any commercial
release the owner should decide whether that provenance is acceptable, or commission the
same seven objects from a human illustrator to the spec above.

## The source that was researched and then not used

**3Dicons** — <https://3dicons.co/>, repository <https://github.com/realvjy/3Dicons>.

Verified at the time of writing, not assumed from a landing page:

- The repository's `LICENSE` is **CC0-1.0** (confirmed through the GitHub licence API,
  which returns `spdx_id: CC0-1.0`), so the licence would have been a clean fit.
- The icon files are **not in the repository**. It holds the Gatsby site plus
  `content/3dicons-meta/*.md`; each metadata file points at a DigitalOcean CDN, e.g.
  `https://3dicons.sgp1.cdn.digitaloceanspaces.com/v1/dynamic/clay/bulb-dynamic-clay.png`.
- A sample was downloaded and inspected: **400 × 400, 8-bit RGBA PNG, 48.7 KB**, valid.
- The free collection is **120 icons**. Every slug was enumerated and checked against the
  seven categories.

It was rejected for two reasons, and the second is the decisive one:

1. **No coverage.** Among the 120 there is no water, droplet, tap, faucet or pipe asset for
   `plumbing`, and **no fruit, apple, basket or leaf asset for `fruit`** at all. The closest
   matches (`can`, `cup`, `tea-cup`, `bucket`) do not read as plumbing, and substituting a
   flat generic icon for a category is exactly what the brief forbids.
2. **Consistency.** Mixing five 3Dicons renders with two generated objects would break the
   requirement that the set read as one curated collection with a common camera, light,
   material and shadow treatment. The single-source set holds that; a mixed set would not.

This is recorded so the decision can be reversed on evidence: if a human-illustrated
replacement is ever commissioned, or a consistent CC0 set covering water and produce is
found, the swap is one edit to `SERVICE_ART` plus the files, and the gate check that every
category has a file on disk keeps the swap honest.

## What is *not* here

The official brand mark `Sukinnect_Logo.png` is untouched, unmodified, and still the only
brand image on the sign-in and splash screens (AGENTS.md §10). These seven files are
category illustrations, not a logo, and they do not appear in any brand-identity position.
Functional interface glyphs remain the inline `ICONS` vector set — see AGENTS.md and
`SUKINNECT_VISUAL_REDESIGN_PLAN.md` §6 for why control icons stay flat.
