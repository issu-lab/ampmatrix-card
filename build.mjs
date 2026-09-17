import {readFile,writeFile,mkdir} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
const panel=await readFile('src/panel.js','utf8');
const code=await readFile('src/ampmatrix-card.js','utf8');
await writeFile('dist/ampmatrix-card.js',panel.replace('export const','const')+code.replace("import { PANEL } from './panel.js';",''));
