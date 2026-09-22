# Assets and publication boundaries

The project owner permits reuse here of the example images, interactions and book presentation. That permission does not publish the originating application's business model or grant downstream users a general artwork license.

- `book-exhibit.png` and `exhibit-background.png`: generated from the original cobalt concept, retaining the binder silhouette, slight page perspective, metal rings and studio composition. The binder has transparent outer pixels; the studio backdrop remains stationary.
- `art-orbit`, `art-silk`, `art-facet`, `art-grain`, `art-diagonal`: generated decorative prints distributed across eight pockets. Their printed spectral colors are static artwork; the independent live film adds angle-dependent reflections. Reflection-only inspection isolates the live effect.
- Earlier `demo/assets/images/book-cobalt.png`: generated cobalt cover, blank ivory pages and four chrome rings on a transparent background. These static surfaces move together; cards and real-time film remain independent. No iridescence is baked into the binder. Earlier `book-cover`, `book-pages`, `book-shadow` and ring layers remain as source artwork, but are not loaded by the current demo.
- Earlier `card-circle.png`, `card-semicircle.png`, `card-diagonal.png`: generated matte geometric prints; no baked foil, labels or game symbols. `sleeve.svg` supplies neutral ivory backing for empty pockets.
- Legacy `base-0.png` through `base-2.png`: illustrative card samples; baked notification dots were removed before publication. Visible illustration labels are sample artwork, not public application entities or a game data schema.
- `base-3.png` through `base-7.png`: neutral sleeve examples without application action icons.
- `demo/assets/normals/normal-*.rgba`: eight fixed packed normal fields. Five are image-based estimates, with three flipped variants; these are not measured scans.
- `tests/fixtures/approved/`: material-only references. No original full application HTML or embedded application screenshot is distributed.
- `docs/screenshots/` and the cover show the public Luster demo or its material rendering only.

The runtime, tests and capture tools use repository-relative inputs. Browser tooling accepts `PLAYWRIGHT_PATH` and `CHROME_PATH` overrides; no user profile, machine path, original project directory, account data or business configuration is required.

Private evidence, credentials and generated diagnostics stay out of Git. Publish only the reviewed public branch: earlier local history is intentionally not part of the initial public history. Do not push local archive branches or use `git push --all` for publication.

No open-source license is currently included. Code, artwork and normal fields must not be assumed to share a license. Replace sample art with assets you have permission to use when integrating or redistributing.

## Lossless delivery copies

The demo loads lossless WebP copies of the exhibit binder, studio background and five prints. Repeated designs share URLs. Run `npm run assets:images` (Python with Pillow) to regenerate them; `python tests/assets.py` verifies exact decoded RGBA equality against all twenty-two preserved PNG originals, including earlier iterations.

The exhibit starts at a frontal optical angle with reflection strength 0.14 and one card lifted, unless reduced motion is requested. These are presentation defaults; Reset restores the unmodified B14 preset. The shader algorithms and normal fields remain unchanged.

Card hover lifts only the printed card by 55/228 of the pocket height, with a 160 ms cubic-out entrance and linear return. The pocket and its normal field stay fixed. Reduced-motion preferences disable hover movement.
