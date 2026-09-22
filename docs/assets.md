# Assets and publication boundaries

The project owner permits reuse here of the example images, interactions and book presentation. That permission does not publish the originating application's business model or grant downstream users a general artwork license.

- `demo/assets/images/book.png`: clean book artwork, without application navigation or business controls.
- `base-0.png` through `base-2.png`: illustrative card samples; baked notification dots were removed before publication. Visible illustration labels are sample artwork, not public application entities or a game data schema.
- `base-3.png` through `base-7.png`: neutral sleeve examples without application action icons.
- `demo/assets/normals/normal-*.rgba`: eight fixed packed normal fields. Five are image-based estimates, with three flipped variants; these are not measured scans.
- `tests/fixtures/approved/`: material-only references. No original full application HTML or embedded application screenshot is distributed.
- `docs/screenshots/` and the cover show the public Luster demo or its material rendering only.

The runtime, tests and capture tools use repository-relative inputs. Browser tooling accepts `PLAYWRIGHT_PATH` and `CHROME_PATH` overrides; no user profile, machine path, original project directory, account data or business configuration is required.

Private evidence, credentials and generated diagnostics stay out of Git. Publish only the reviewed public branch: earlier local history is intentionally not part of the initial public history. Do not push local archive branches or use `git push --all` for publication.

No open-source license is currently included. Code, artwork and normal fields must not be assumed to share a license. Replace sample art with assets you have permission to use when integrating or redistributing.

## Lossless delivery copies

The demo loads `book.webp` and `base-0.webp` through `base-3.webp`. These are lossless encodings of the preserved PNG originals, including exact transparent RGBA values. Slots 3–7 share the same sleeve image. Run `npm run assets:images` (Python with Pillow) to regenerate them; `python tests/assets.py` verifies decoded byte equality. The five active images total 1,531,698 bytes instead of 2,276,263 bytes (32.7% less).

The original PNGs remain available for provenance and full-composite regression tests. No dimensions, colors, alpha values or rendering parameters were changed.
