# Luster: name and scope

Luster means the sheen of a surface. The name was chosen for a reusable graphics capability: short, evocative, and broad enough to cover foil, reflection and iridescence across rendering stacks. It replaces the working name FoilGlow. The English name remains Luster; “流彩” is an informal Chinese description.

**Art-directed spectral foil rendering in WebGL.**

The current implementation is native JavaScript and WebGL, with B14 as the default and B11 retained for comparison. The name describes the visual material; it does not claim a complete thin-film interference model or a physically calibrated BSDF.

The public API retains `FoilRenderer` for compatibility. Product naming does not require a breaking class rename. Import it from `src/index.js`.

The book, image samples and hover presentation are interchangeable demonstrations. The reusable core has no game rules, progression, inventory, account or persistence model. No original game project is required to run, test or integrate Luster.

Start with [architecture](architecture.md), [integration and equations](guide.md), [texture contract](textures.md), [asset boundaries](assets.md), and [verification](verification.md).
