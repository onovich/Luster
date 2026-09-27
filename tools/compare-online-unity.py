import json
import sys
from pathlib import Path
from PIL import Image, ImageChops

if len(sys.argv) != 2:
    raise SystemExit('Usage: python tools/compare-online-unity.py .test-output/unity-case-<template>')

root = Path(sys.argv[1]).resolve()
rows = {}
for layer in ('original', 'substrate', 'combined'):
    web = Image.open(root / f'web-{layer}.png').convert('RGB')
    unity = Image.open(root / f'unity-{layer}.png').convert('RGB')
    if web.size != unity.size:
        raise ValueError(f'Size mismatch: {layer}')
    channels = sorted(value for pixel in ImageChops.difference(web, unity).get_flattened_data() for value in pixel)
    rows[layer] = {'size': web.size, 'meanAbsolute': round(sum(channels) / len(channels), 4), 'p95': channels[int(len(channels) * .95)], 'max': channels[-1]}
    if channels[-1] > 1:
        raise AssertionError(f'{layer} exceeds one 8-bit channel: {channels[-1]}')

(root / 'comparison.json').write_text(json.dumps(rows, indent=2), encoding='utf-8')
print(json.dumps(rows, indent=2))
