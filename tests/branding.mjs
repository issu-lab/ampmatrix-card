import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const md=await readFile('README.md','utf8');
assert.ok(md.includes('src="https://raw.githubusercontent.com/issu-lab/ampmatrix-card/main/assets/issu-open-homelab-badge.png"'));
assert.ok(md.includes('width="480"'));
assert.ok(!/<img[^>]*src="assets\//.test(md));
assert.equal(createHash('sha256').update(await readFile('assets/issu-open-homelab-badge.png')).digest('hex'),'fd361e51b10d05b4f26eea83ee1ebd2f6b1805ec804c08dab380589c64d139b2');
for(const [name,w,h] of [['ampmatrix-banner',5120,1280],['ampmatrix-social-preview',1280,640],['light',800,400],['dark',800,400]]){const b=await readFile(`assets/${name}.png`);assert.equal(b.readUInt32BE(16),w);assert.equal(b.readUInt32BE(20),h);}
console.log('PASS canonical branding, exact footer URL and uniform screenshots');
