"""Encode the demo's active artwork as lossless WebP; preserve every RGBA byte."""
from pathlib import Path
from PIL import Image

folder = Path(__file__).resolve().parents[1] / 'demo/assets/images'
before = after = 0
for name in ['book-exhibit','exhibit-background','art-ribbon','art-fold','art-wave','art-orbit','art-silk','art-facet','art-grain','art-diagonal','card-circle', 'card-semicircle', 'card-diagonal', 'book-cobalt', 'book-cover', 'book-pages', 'book-shadow', *[f'book-ring-{i}' for i in range(4)], 'base-0', 'base-1', 'base-2', 'base-3']:
    source = folder / f'{name}.png'
    target = folder / f'{name}.webp'
    original = Image.open(source).convert('RGBA')
    original.save(target, format='WEBP', lossless=True, exact=True, method=6)
    decoded = Image.open(target).convert('RGBA')
    assert original.size == decoded.size and original.tobytes() == decoded.tobytes(), name
    assert target.stat().st_size < source.stat().st_size, name
    before += source.stat().st_size
    after += target.stat().st_size
print(f'Exact RGBA match: {before:,} -> {after:,} bytes ({1-after/before:.1%} saved)')
