// Uses the canonical iSSU banner geometry. Text is outlined from the real fonts.
// Dependency: sharp. Regenerate typography.json with outline-text.py when text changes.
const fs=require('node:fs');
const path=require('node:path');
const sharp=require('sharp');
const outlines=JSON.parse(fs.readFileSync(path.join(__dirname,'typography.json'),'utf8'));
const wordmark=fs.readFileSync(path.join(__dirname,'issu-wordmark.png')).toString('base64');
const purple='#D94DFF', graphite='#151923';
const logo=`<g fill="none" stroke="${purple}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"><rect x="910" y="410" width="570" height="460" rx="45"/><circle cx="1120" cy="640" r="130"/><path d="M1028 732l35-35 M1340 550h65 M1340 640h65 M1340 730h65"/></g>`;
const icons=`<g fill="none" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">
  <g stroke="#22AEEF"><circle cx="4200" cy="590" r="70"/><path d="M4183 554l46 36-46 36Z"/></g>
  <g stroke="#F28C28"><circle cx="4480" cy="590" r="70"/><path d="M4440 576h19l26-24v76l-26-24h-19Z M4504 570q19 20 0 40"/></g>
  <g stroke="#26B85A"><circle cx="4760" cy="590" r="70"/><path d="M4723 577h74m-18-18 18 18-18 18 M4797 607h-74m18-18-18 18 18 18"/></g>
</g>`;
function title(x,y,size,gap) {return `<text x="${x}" y="${y}" font-family="Exo2" font-size="${size}" font-weight="700"><tspan fill="${graphite}">AMP</tspan><tspan dx="${gap}" fill="${purple}">MATRIX</tspan></text>`;}
function subtitle(x,y,size) {return `<text x="${x}" y="${y}" font-family="Inter" font-size="${size}" font-weight="600" fill="${graphite}">AMPLIFIER CARD FOR HOME ASSISTANT</text>`;}
function svg(width,height,body){return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#FFFFFF"/>${body}</svg>\n`;}
const banner=svg(5120,1280,`
  <image x="0" y="400" width="850" height="520" href="data:image/png;base64,${wordmark}"/>
  ${logo}
  ${title(1650,685,250,50)}
  ${subtitle(1650,835,88)}
  ${icons}
  <g fill="none" stroke="${purple}" stroke-width="140" opacity="0.18">
    <path d="M 4740 1280 A 380 380 0 0 1 5120 900"/>
    <path d="M 4910 1280 A 210 210 0 0 1 5120 1070"/>
  </g>`);
const social=svg(1280,640,`
  <image x="38" y="28" width="205" height="125" href="data:image/png;base64,${wordmark}"/>
  <g transform="translate(-263 80) scale(.35)">${logo}</g>
  ${title(320,340,100,20)}
  ${subtitle(320,425,24)}
  <g transform="translate(-316 -112) scale(.323)">${icons}</g>
  <g fill="none" stroke="${purple}" stroke-width="40" opacity="0.18">
    <path d="M 1090 640 A 190 190 0 0 1 1280 450"/>
    <path d="M 1155 640 A 125 125 0 0 1 1280 515"/>
  </g>`);
(async()=>{
  for(const [name,content,width,height] of [['ampmatrix-banner',banner,5120,1280],['ampmatrix-social-preview',social,1280,640]]) {
    fs.writeFileSync(path.join(__dirname,`${name}.svg`),content);
    const banner=width===5120, [a,b,sub]=outlines.slice(banner?0:3,banner?3:6);
    const x=banner?1650:320, y=banner?685:340, gap=banner?50:20;
    const titlePaths=`<g transform="translate(${x} ${y})" fill="${graphite}">${a.paths}</g><g transform="translate(${x+a.width+gap} ${y})" fill="${purple}">${b.paths}</g>`;
    const subPaths=`<g transform="translate(${x} ${banner?835:425})" fill="${graphite}">${sub.paths}</g>`;
    if(banner && x+a.width+gap+b.width>=4100) throw new Error('Title overlaps functional icons.');
    const outlined=content.replace(/<text[\s\S]*?<\/text>/,titlePaths).replace(/<text[\s\S]*?<\/text>/,subPaths);
    await sharp(Buffer.from(outlined)).resize(width,height).png().toFile(path.join(__dirname,'../assets',`${name}.png`));
    console.log(`${name}: ${width} × ${height}, typography outlined from approved fonts`);
  }
})().catch(error=>{console.error(error);process.exitCode=1});
