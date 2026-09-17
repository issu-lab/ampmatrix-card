import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1000,height:1100}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('http://127.0.0.1:5189/**',async route=>{const path=new URL(route.request().url()).pathname;try{await route.fulfill({body:await readFile('.'+(path==='/'?'/index.html':path)),contentType:path.endsWith('.js')?'text/javascript':'text/html'});}catch{await route.fulfill({status:404,body:''});}});
try{
await page.goto('http://127.0.0.1:5189');const card=page.locator('#light');await card.locator('#knob').waitFor();
const display=()=>card.locator('#lcd').getAttribute('aria-label');
assert.equal(await display(),'Airplay');
await card.locator('#source').click();assert.equal(await card.locator('#choice option:not([disabled])').count(),4);assert.ok(await card.locator('#choice option').filter({hasText:'Airplay'}).isDisabled());await card.locator('#choice').selectOption('Bluetooth');assert.equal(await page.evaluate(()=>demo.calls.at(-1).data.source),'Bluetooth');assert.equal(await display(),'Bluetooth');
await card.locator('#eq').click();await card.locator('#choice').selectOption('Rock');assert.equal(await page.evaluate(()=>demo.calls.at(-1).data.sound_mode),'Rock');
await card.locator('#plus').click();assert.equal(await page.evaluate(()=>demo.calls.at(-1).service),'volume_up');assert.equal(await display(),'VOL 19');await page.waitForTimeout(2100);assert.equal(await display(),'Bluetooth');
await page.evaluate(()=>{demo.player.attributes.volume_level=.34375;demo.update();});assert.equal(await display(),'VOL 34');await page.waitForTimeout(2100);assert.equal(await display(),'Bluetooth');
// Regression: incoming HA updates must not destroy a pressed control.
const before=await page.evaluate(()=>demo.calls.length),plus=await card.locator('#plus').boundingBox();await page.mouse.move(plus.x+plus.width/2,plus.y+plus.height/2);await page.mouse.down();await page.evaluate(()=>demo.update());await page.mouse.up();assert.equal(await page.evaluate(()=>demo.calls.length),before+1);assert.equal(await page.evaluate(()=>demo.calls.at(-1).service),'volume_up');
// Fallback only when native stepping is not available.
await page.evaluate(()=>{demo.player.attributes.supported_features=217021&~1024;demo.player.attributes.volume_level=.5;demo.update();});await card.locator('#minus').click();assert.equal(await page.evaluate(()=>demo.calls.at(-1).data.volume_level),.49);
await page.evaluate(()=>{demo.player.attributes.supported_features=200588;demo.update();});
const box=await card.locator('#knob').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y+box.height/2-40,{steps:5});await page.evaluate(()=>demo.update());await page.mouse.up();assert.equal(await page.evaluate(()=>demo.calls.at(-1).service),'volume_set');assert.equal(await page.evaluate(()=>demo.player.state),'on');
await card.locator('#knob').focus();await page.keyboard.press('ArrowUp');assert.equal(await page.evaluate(()=>demo.calls.at(-1).service),'volume_up');await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>demo.calls.at(-1).service),'turn_off');assert.equal(await display(),'OFF');assert.ok(await card.locator('#plus').isDisabled());assert.equal(await card.locator('.indicator.on').count(),0);
await card.locator('#knob').click();assert.equal(await page.evaluate(()=>demo.calls.at(-1).service),'turn_on');
await card.locator('#source').click();await page.keyboard.press('Escape');assert.ok(await card.locator('#popup').isHidden());
await page.evaluate(()=>{demo.player.state='unavailable';demo.update();});assert.ok(await card.locator('#knob').isDisabled());assert.equal(await display(),'--');
await page.evaluate(()=>{demo.player.state='on';demo.player.attributes.supported_features=0;demo.update();});assert.ok(await card.locator('#eq').isDisabled());assert.ok(await card.locator('#plus').isDisabled());
await page.evaluate(()=>{demo.player.attributes.supported_features=217021;demo.fail=true;demo.update();});await card.locator('#plus').click();assert.ok((await card.getByRole('alert').textContent()).length>0);assert.ok(await card.locator('#plus').isEnabled());
await page.evaluate(()=>{demo.fail=false;Object.assign(demo.player.attributes,{source:'<img src=x onerror=alert(1)>',source_list:['<img src=x onerror=alert(1)>']});demo.update();});await card.locator('#source').click();assert.equal(await card.locator('img').count(),0);assert.equal(await card.locator('#choice option').textContent(),'<img src=x onerror=alert(1)>');
await page.reload();await card.locator('#knob').waitFor();await mkdir('assets',{recursive:true});for(const theme of ['light','dark'])await page.locator('#'+theme).screenshot({path:`assets/${theme}.png`});
await page.setViewportSize({width:390,height:800});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);for(const el of await card.locator('button:visible').all()){const b=await el.boundingBox();assert.ok(b.height>=44);assert.ok(b.width>=44);}assert.ok((await card.locator('.indicator').boundingBox()).width>=12);
assert.deepEqual(errors,[]);console.log('PASS LCD source/volume timeout/external updates, native steps/fallback, update-during-click regression, dynamic selectors, power, drag, keyboard, unavailable, unsupported flags, errors, escaping, screenshots, mobile');
}finally{await browser.close();}
