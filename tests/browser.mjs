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

// Configuration, preset actions and reported power state.
await page.reload();await card.locator('#knob').waitFor();
assert.equal(await card.locator('#brand').textContent(),'Demo amplifier');
assert.equal(await card.locator('.ring.on').count(),1);
const callCount=await page.evaluate(()=>demo.calls.length);
await card.locator('#preset').click();assert.equal(await page.evaluate(()=>demo.calls.length),callCount);
assert.equal(await card.locator('#preset-items button').count(),2);
await page.keyboard.press('Escape');assert.ok(await card.locator('#popup').isHidden());
await card.locator('#preset').click();await card.locator('#preset-items button').first().click();
assert.deepEqual(await page.evaluate(()=>demo.calls.at(-1)),{domain:'script',service:'turn_on',data:{entity_id:'script.demo_music'}});
await card.locator('#preset').click();assert.equal(await card.locator('#preset-items [aria-pressed=true]').count(),0);
// Script availability is independent from amplifier power.
await page.evaluate(()=>{demo.player.state='off';demo.hass.states['script.demo_music'].state='on';demo.hass.states['script.demo_cinema'].state='unavailable';demo.update();});
assert.equal(await card.locator('.ring.on').count(),0);assert.ok(await card.locator('#preset').isEnabled());
assert.ok(await card.locator('#preset-items button').first().isDisabled());assert.ok(await card.locator('#preset-items button').last().isDisabled());
await page.evaluate(()=>{demo.hass.states['script.demo_music'].state='off';demo.update();});
await card.locator('#preset-items button').first().click();assert.equal(await page.evaluate(()=>demo.calls.at(-1).domain),'script');assert.equal(await page.evaluate(()=>demo.player.state),'off');
// Dynamic updates cannot swallow a preset press either.
await card.locator('#preset').click();const action=card.locator('#preset-items button').first();const actionBox=await action.boundingBox();const calls=await page.evaluate(()=>demo.calls.length);
await page.mouse.move(actionBox.x+actionBox.width/2,actionBox.y+actionBox.height/2);await page.mouse.down();await page.evaluate(()=>{demo.hass.states['script.demo_music'].attributes.friendly_name='Updated music';demo.update();});await page.mouse.up();assert.equal(await page.evaluate(()=>demo.calls.length),calls+1);
// Failure reports a command error, not preset activation.
await page.evaluate(()=>{demo.fail=true;});await card.locator('#preset').click();await card.locator('#preset-items button').first().click();assert.ok((await card.locator('.error').textContent()).length>0);assert.equal(await card.locator('#notice').textContent(),'');await page.evaluate(()=>{demo.fail=false;});
// Invalid targets are rejected; incoming text remains inert.
assert.ok(await page.evaluate(()=>{try{demo.cards[0].setConfig({entity:'media_player.demo',presets:[{entity:'light.demo'}]});return false;}catch{return true;}}));
await page.evaluate(()=>demo.cards[0].setConfig({entity:'media_player.demo',name:'<img src=x onerror=alert(1)>',presets:[{entity:'script.missing',name:'<img src=x>'}]}));
assert.equal(await card.locator('#brand').textContent(),'<img src=x onerror=alert(1)>');assert.equal(await card.locator('img').count(),0);await card.locator('#preset').click();assert.ok(await card.locator('#preset-items button').isDisabled());
await page.evaluate(()=>demo.cards[0].setConfig({entity:'media_player.demo'}));assert.ok(await card.locator('#preset').isHidden());
const sourceWidth=(await card.locator('#source').boundingBox()).width;const eqWidth=(await card.locator('#eq').boundingBox()).width;assert.ok(Math.abs(sourceWidth-eqWidth)<1);
// Editor can add and remove scripts without invoking them.
await page.evaluate(()=>{const e=document.createElement('ampmatrix-card-editor');e.hass=demo.hass;e.setConfig({entity:'media_player.demo',volume_step:.02});e.addEventListener('config-changed',ev=>window.edited=ev.detail.config);document.body.append(e);});
const editor=page.locator('ampmatrix-card-editor');await editor.getByRole('button',{name:'Aggiungi preset'}).click();assert.equal(await page.evaluate(()=>edited.presets[0].entity),'script.demo_music');assert.equal(await page.evaluate(()=>edited.volume_step),.02);await editor.getByRole('button',{name:'Rimuovi'}).click();assert.equal(await page.evaluate(()=>edited.presets.length),0);
await page.reload();await card.locator('#knob').waitFor();await mkdir('assets',{recursive:true});for(const theme of ['light','dark'])await page.locator('#'+theme).screenshot({path:`assets/${theme}.png`});
await page.setViewportSize({width:390,height:800});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);for(const el of await card.locator('button:visible').all()){const b=await el.boundingBox();assert.ok(b.height>=44);assert.ok(b.width>=44);}assert.ok((await card.locator('.indicator').boundingBox()).width>=12);
const knobBox=await card.locator('#knob').boundingBox(),stepBox=await card.locator('.steps').boundingBox();assert.ok(Math.abs(knobBox.x+knobBox.width/2-stepBox.x-stepBox.width/2)<1);
assert.equal(await card.locator('#lcd svg').getAttribute('viewBox'),'0 25 800 170');
const lcdBox=await card.locator('#lcd').boundingBox();assert.ok(Math.abs(lcdBox.height/lcdBox.width-170/800)<.01);
assert.deepEqual(errors,[]);console.log('PASS LCD source/volume timeout/external updates, native steps/fallback, update-during-click regression, dynamic selectors, power, drag, keyboard, unavailable, unsupported flags, errors, escaping, screenshots, mobile, ring, centered steps, cropped LCD, script presets, visual editor');
}finally{await browser.close();}
