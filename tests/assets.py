"""Frozen evidence, atlas orientation and removal of baked notification pixels."""
from pathlib import Path
import hashlib,json
from PIL import Image
root=Path(__file__).resolve().parents[1]
ref=root/'tests/fixtures/approved'; manifest=json.loads((ref/'manifest.json').read_text())
missing=[]
for name,digest in manifest.items():
 p=ref/name
 if not p.exists(): missing.append(name);continue
 assert hashlib.sha256(p.read_bytes()).hexdigest()==digest,name
assert missing==[],missing
atlas=Image.open(ref/'NormalXY16.png').convert('RGBA')
for i in range(8):
 tile=atlas.crop(((i%4)*512,(i//4)*512,(i%4+1)*512,(i//4+1)*512))
 assert tile.transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes()==(root/f'demo/assets/normals/normal-{i}.rgba').read_bytes(),i
for i in range(3):
 patch=Image.open(root/f'demo/assets/images/base-{i}.png').convert('RGB').crop((210,5,234,34))
 assert not any(r>g*1.3 and r>b*1.3 for r,g,b in zip(*[iter(patch.tobytes())]*3)),f'red dot remains in {i}'
print('PASS: 9 reference hashes, 8 atlas tiles/orientations, 3 red-dot patches.')
