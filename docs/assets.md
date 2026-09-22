# Assets and publication boundaries

The project owner permits reuse here of the example images, interactions and book presentation. That permission does not publish the originating application's business model or grant downstream users a general artwork license.

- `demo/assets/images/book-*.png`: separate cover, pages, shadow and four binding rings. The demo omits decorative paperclip layers.
- `base-0.png` through `base-2.png`: illustrative card samples; baked notification dots were removed before publication. Visible illustration labels are sample artwork, not public application entities or a game data schema.
- `base-3.png` through `base-7.png`: neutral sleeve examples without application action icons.
- `demo/assets/normals/normal-*.rgba`: eight fixed packed normal fields. Five are image-based estimates, with three flipped variants; these are not measured scans.
- `tests/fixtures/approved/`: material-only references. No original full application HTML or embedded application screenshot is distributed.
- `docs/screenshots/` and the cover show the public Luster demo or its material rendering only.

The runtime, tests and capture tools use repository-relative inputs. Browser tooling accepts `PLAYWRIGHT_PATH` and `CHROME_PATH` overrides; no user profile, machine path, original project directory, account data or business configuration is required.

Private evidence, credentials and generated diagnostics stay out of Git. Publish only the reviewed public branch: earlier local history is intentionally not part of the initial public history. Do not push local archive branches or use `git push --all` for publication.

No open-source license is currently included. Code, artwork and normal fields must not be assumed to share a license. Replace sample art with assets you have permission to use when integrating or redistributing.

## Lossless delivery copies

The demo loads lossless WebP copies of seven book layers and four card/sleeve images. Slots 3–7 share the same sleeve image. Run `npm run assets:images` (Python with Pillow) to regenerate them; `python tests/assets.py` verifies exact decoded RGBA equality against all eleven PNG originals.

Card hover lifts only the printed card by 55/228 of the pocket height, with a 160 ms cubic-out entrance and linear return. The pocket and its normal field stay fixed. Reduced-motion preferences disable hover movement.
