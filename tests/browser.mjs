import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1000,height:1100}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('http://127.0.0.1:5189/**',async route=>{const path=new URL(route.request().url()).pathname;try{await route.fulfill({body:await readFile('.'+(path==='/'?'/index.html':path)),contentType:path.endsWith('.js')?'text/javascript':'text/html'});}catch{await route.fulfill({status:404,body:''});}});
try{
await page.goto('http://127.0.0.1:5189');const card=page.locator('#light');await card.locator('#knob').waitFor();
assert.equal(await card.locator('.led.on').count(),0);
await card.locator('#knob').click();assert.equal(await page.evaluate(()=>demo.calls.at(-1).service),'turn_off');assert.equal(await card.locator('.indicator.on').count(),0);assert.ok(await card.locator('#step1').isDisabled());
await card.locator('#knob').click();assert.equal(await page.evaluate(()=>demo.calls.at(-1).service),'turn_on');
await card.locator('#step1').click();assert.equal(await page.evaluate(()=>demo.calls.at(-1).data.volume_level),.16625);
await card.getByRole('button',{name:'Bluetooth',exact:true}).click();assert.equal(await card.locator('.led.on').count(),1);assert.equal(await page.evaluate(()=>demo.calls.at(-1).data.source),'Bluetooth');
await card.locator('#eq').click();await card.locator('#preset').selectOption('4');assert.equal(await page.evaluate(()=>demo.calls.at(-1).data.sound_mode),'Rock');
const box=await card.locator('#knob').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y+box.height/2-40,{steps:5});await page.mouse.up();assert.equal(await page.evaluate(()=>demo.calls.at(-1).service),'volume_set');assert.equal(await page.evaluate(()=>demo.player.state),'on');
await card.locator('#knob').focus();await page.keyboard.press('ArrowUp');assert.equal(await page.evaluate(()=>demo.calls.at(-1).service),'volume_set');await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>demo.calls.at(-1).service),'turn_off');
await page.evaluate(()=>{demo.player.state='unavailable';demo.update();});assert.ok(await card.locator('#knob').isDisabled());
await page.evaluate(()=>{demo.player.state='on';demo.player.attributes.supported_features=0;demo.update();});assert.ok(await card.locator('#eq').isDisabled());assert.ok(await card.locator('#step1').isDisabled());
await page.evaluate(()=>{demo.player.attributes.supported_features=217021;demo.fail=true;demo.update();});await card.locator('#step1').click();await card.getByRole('alert').waitFor();assert.equal(await card.locator('.key:disabled').count(),0);
await page.evaluate(()=>{demo.fail=false;demo.player.attributes.source_list=['<img src=x onerror=alert(1)>'];demo.update();});assert.equal(await card.locator('img').count(),0);
await page.reload();await card.locator('#knob').waitFor();await mkdir('assets',{recursive:true});for(const theme of ['light','dark'])await page.locator('#'+theme).screenshot({path:`assets/${theme}.png`});
await page.setViewportSize({width:390,height:800});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);for(const el of await card.locator('button').all()){const b=await el.boundingBox();assert.ok(b.height>=44);}
assert.deepEqual(errors,[]);console.log('PASS power, off-state guards, volume precision, source, EQ, drag/click separation, keyboard, unavailable, unsupported flags, service errors, escaping, two screenshots, mobile height/overflow');
}finally{await browser.close();}
