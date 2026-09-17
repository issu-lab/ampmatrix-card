import { PANEL } from './panel.js';
import { displaySvg } from './segments.js';
const F={volume:4,on:128,off:256,step:1024,source:2048,eq:65536};
const list=v=>Array.isArray(v)?[...new Set(v.filter(x=>typeof x==='string'))]:[];
const clamp=v=>Math.max(0,Math.min(1,v));
const styles=`
:host{display:block;--panel:#e9e9e2;--ink:#20282b;--line:#929fa3;--gold:#99824d;--led:#b6bdba;font-family:var(--primary-font-family,system-ui,sans-serif)}
:host([dark]){--panel:#232b31;--ink:#f1f0e9;--line:#657077;--gold:#d3c495;--led:#677176}
*{box-sizing:border-box}.panel{position:relative;aspect-ratio:2;container-type:inline-size;color:var(--ink)}.art{position:absolute;inset:0}.art svg{display:block;width:100%;height:100%}
button{font:inherit;cursor:pointer;color:var(--ink)}button:disabled{cursor:default;opacity:.5}button:focus-visible,select:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
.knob{position:absolute;left:7.375%;top:21%;width:24.5%;height:49%;border:0;border-radius:50%;background:transparent;touch-action:none}.indicator{position:absolute;width:10.2%;min-width:12px;aspect-ratio:1;border-radius:50%;border:1px solid var(--line);background:var(--panel);transform:translate(-50%,-50%);pointer-events:none}.indicator:after,.led:after{content:'';position:absolute;inset:15%;border-radius:50%;background:var(--led)}.indicator.on:after{background:#ff2424}
.key{border:0;background:transparent;padding:6px 0;min-height:44px}.face{display:flex;align-items:center;justify-content:center;height:4cqw;min-height:20px;background:#e0e3df;border:2px solid #232b30;border-radius:3px;color:#172126;box-shadow:inset 0 1px 0 #ffffff70,0 1px 0 #0005;font-size:clamp(12px,2.3cqw,20px)}
.key[aria-pressed=true] .face{background:#b6c0c3;box-shadow:inset 0 2px 2px #0003}.steps{position:absolute;left:9.5%;top:77.5%;width:20.25%;min-width:96px;display:flex;gap:2.25cqw}.steps .key{flex:1;min-width:44px}
.sources{position:absolute;left:38%;top:41.5%;width:54.25%;display:grid;grid-template-columns:repeat(var(--count),minmax(0,1fr));gap:.75cqw}.source{min-width:0;position:relative;text-align:center}.led{position:relative;margin:auto auto 1.75cqw;width:2cqw;min-width:8px;aspect-ratio:1;border:1px solid var(--line);border-radius:50%;background:var(--panel)}.led.on:after{background:var(--source-color)}.source .key{width:100%;padding:0;display:flex;align-items:center}.source .face{width:100%}.symbol svg{width:2.5cqw;height:2.5cqw;min-width:14px;min-height:14px}.label{font-size:clamp(9px,1.5cqw,13px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block}.symbol{font-size:clamp(12px,2cqw,18px)}
.eq{position:absolute;left:79.25%;top:77.5%;width:13%}.eq .face{font-size:clamp(10px,1.6cqw,14px);font-weight:600}.popup{position:absolute;right:7.75%;bottom:23%;max-width:70%;padding:12px;background:var(--panel);border:1px solid var(--line);border-radius:8px;box-shadow:0 4px 12px #0003}.popup label{display:block;margin-bottom:8px}.popup select{min-height:44px;max-width:100%;font:inherit;color:var(--ink);background:var(--panel)}.error{color:var(--ink);background:var(--panel);padding:8px;font-size:13px}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
@container(max-width:360px){.sources{gap:1cqw}.label{font-size:9px}}
.lcd{position:absolute;left:38%;top:30%;width:54.25%;line-height:0}.lcd svg{width:100%;height:auto}.lcd.off{filter:saturate(.25);opacity:.65}.selectors{position:absolute;left:38%;top:60%;width:54.25%;display:flex;gap:1.75cqw}.selectors .key{flex:1;min-width:0}.selectors .face{font-size:clamp(10px,1.6cqw,14px);font-weight:600}.popup{z-index:2;bottom:auto;top:74%;max-width:85%}.popup button{min-width:44px;min-height:44px;background:transparent;border:0;color:var(--ink)}.error:empty{display:none}
`;
export class AmpMatrixCard extends HTMLElement {
 constructor(){super();this.attachShadow({mode:'open'});this._pending=false;this._error='';this._mode=null;this._volumeUntil=0;}
 static getStubConfig(hass){return {entity:Object.keys(hass?.states??{}).find(x=>x.startsWith('media_player.'))??''};}
 static getConfigElement(){return document.createElement('ampmatrix-card-editor');}
 setConfig(c){if(!c||!/^media_player\.[a-z0-9_]+$/.test(c.entity??''))throw Error('AmpMatrix: entity must be a media_player.');if(c.color_mode&&!['auto','light','dark'].includes(c.color_mode))throw Error('AmpMatrix: invalid color_mode');if(c.language&&!['auto','it','en'].includes(c.language))throw Error('AmpMatrix: invalid language');if(c.volume_step!==undefined&&(typeof c.volume_step!=='number'||!Number.isFinite(c.volume_step)||c.volume_step<=0||c.volume_step>.1))throw Error('AmpMatrix: invalid volume_step');this.cancel();this._config={color_mode:'auto',language:'auto',volume_step:.01,...c};this._lastVolume=this.volume;this._volumeUntil=0;this._mode=null;this.render();}
 set hass(h){const previous=this._lastVolume;this._hass=h;const v=this.volume;if(this.on&&v!==undefined&&previous!==undefined&&v!==previous)this.showVolume();this._lastVolume=v;if(!this.on){this.cancel();this._volumeUntil=0;this._mode=null;}this.render();}
 get player(){return this._hass?.states?.[this._config?.entity];}
 get online(){return !!this.player&&!['unknown','unavailable'].includes(this.player.state);}
 get on(){return this.online&&!['off','standby'].includes(this.player.state);}
 get volume(){const v=this.player?.attributes.volume_level;return typeof v==='number'&&Number.isFinite(v)?clamp(v):undefined;}
 has(f){return this.online&&((this.player.attributes.supported_features??0)&f)===f;}
 get it(){return (this._config?.language==='auto'?this._hass?.language:this._config?.language)?.startsWith('it');}
 t(it,en){return this.it?it:en;}
 getCardSize(){return 3;}
 getGridOptions(){return {columns:12,rows:3,min_columns:6,min_rows:2};}
 disconnectedCallback(){this.cancel();clearTimeout(this._timer);}
 connectedCallback(){if(this._config)this.render();}
 cancel(){this._gesture=null;this._draft=undefined;}
 showVolume(){this._volumeUntil=Date.now()+2000;clearTimeout(this._timer);this._timer=setTimeout(()=>this.render(),2010);}
 async command(service,data,feature,allowOff=false){if(this._pending||!this.has(feature)||(!allowOff&&!this.on))return;const id=this._config.entity;const focus=this.shadowRoot.activeElement;this._pending=true;this._error='';this.render();try{await this._hass.callService('media_player',service,{...data,entity_id:id});}catch{if(this._config.entity===id)this._error=this.t('Comando non riuscito. Riprova.','Command failed. Try again.');}finally{this._pending=false;this.render();if(focus?.isConnected)focus.focus({preventScroll:true});}}
 toggle(){return this.command(this.on?'turn_off':'turn_on',{},this.on?F.off:F.on,true);}
 setVolume(v){return this.command('volume_set',{volume_level:clamp(v)},F.volume);}
 step(d){if(this.has(F.step))return this.command(d>0?'volume_up':'volume_down',{},F.step);if(this.volume!==undefined)return this.setVolume(this.volume+d*this._config.volume_step);}
 q(s){return this.shadowRoot.querySelector(s);}
 mount(){this.shadowRoot.innerHTML=`<style>${styles}</style><div class="panel"><div class="art" aria-hidden="true">${PANEL}</div><button id="knob" class="knob"><span class="indicator"></span></button><span class="sr" role="status" id="status"></span><div class="steps"><button id="minus" class="key"><span class="face">−</span></button><button id="plus" class="key"><span class="face">+</span></button></div><div id="lcd" class="lcd" role="img"></div><div class="selectors"><button id="source" class="key" aria-expanded="false"><span class="face">SOURCE</span></button><button id="eq" class="key" aria-expanded="false"><span class="face">EQ</span></button></div><div id="popup" class="popup" hidden><label for="choice"></label><select id="choice"></select><button id="close">×</button></div></div><div class="error" role="alert"></div>`;
 const knob=this.q('#knob');knob.onclick=e=>{if(e.detail===0)this.toggle();};
 knob.onpointerdown=e=>{if(e.button!==0)return;this._gesture={id:this._config.entity,pointer:e.pointerId,x:e.clientX,y:e.clientY,volume:this.volume,drag:false,box:knob.getBoundingClientRect()};knob.setPointerCapture(e.pointerId);};
 knob.onpointermove=e=>{const g=this._gesture;if(!g||g.pointer!==e.pointerId)return;if(Math.hypot(e.clientX-g.x,e.clientY-g.y)>6)g.drag=true;if(g.drag&&this.has(F.volume)&&this.on&&g.volume!==undefined){this._draft=clamp(g.volume+(g.y-e.clientY)/Math.max(150,g.box.height*1.5));this.showVolume();this.render();}};
 knob.onpointerup=e=>{const g=this._gesture;if(!g||g.pointer!==e.pointerId)return;const draft=this._draft;this.cancel();if(g.id!==this._config.entity)return;if(g.drag){if(draft!==undefined)this.setVolume(draft);else this.render();}else this.toggle();};
 knob.onpointercancel=()=>{this.cancel();this.render();};knob.onlostpointercapture=()=>{if(this._gesture){this.cancel();this.render();}};
 knob.onkeydown=e=>{if(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'].includes(e.key)){e.preventDefault();this.step(['ArrowUp','ArrowRight'].includes(e.key)?1:-1);}if(e.key==='Escape'){this.cancel();this.render();}};
 this.q('#minus').onclick=()=>this.step(-1);this.q('#plus').onclick=()=>this.step(1);
 for(const mode of ['source','eq'])this.q('#'+mode).onclick=()=>{this._mode=this._mode===mode?null:mode;this.render();if(this._mode)this.q('#choice').focus();};
 const close=()=>{const mode=this._mode;this._mode=null;this.render();this.q('#'+mode)?.focus();};this.q('#close').onclick=close;this.q('#popup').onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();close();}};
 this.q('#choice').onchange=e=>{const mode=this._mode,value=e.target.value;const values=list(this.player?.attributes[mode==='source'?'source_list':'sound_mode_list']);if(!values.includes(value))return;this._mode=null;this.command(mode==='source'?'select_source':'select_sound_mode',{[mode==='source'?'source':'sound_mode']:value},mode==='source'?F.source:F.eq);};
 }
 render(){if(!this._config)return;if(!this.q('.panel'))this.mount();const a=this.player?.attributes??{},enabled=this.on&&!this._pending;
 this.toggleAttribute('dark',this._config.color_mode==='dark'||(this._config.color_mode==='auto'&&!!this._hass?.themes?.darkMode));
 const knob=this.q('#knob');knob.disabled=this._pending||!this.has(this.on?F.off:F.on);knob.setAttribute('aria-label',this.on?this.t('Spegni amplificatore','Turn amplifier off'):this.t('Accendi amplificatore','Turn amplifier on'));knob.title=this.t('Premi: accensione. Trascina: volume. Frecce: volume.','Press: power. Drag: volume. Arrows: volume.');
 this.q('.indicator').classList.toggle('on',this.on);const vol=this._draft??this.volume;const angle=(135+270*(vol??0))*Math.PI/180;this.q('.indicator').style.left=`${50+38.78*Math.cos(angle)}%`;this.q('.indicator').style.top=`${50+38.78*Math.sin(angle)}%`;
 this.q('#minus').disabled=this.q('#plus').disabled=!enabled||!(this.has(F.step)||(this.has(F.volume)&&this.volume!==undefined));this.q('#minus').setAttribute('aria-label',this.t('Riduci volume','Decrease volume'));this.q('#plus').setAttribute('aria-label',this.t('Aumenta volume','Increase volume'));
 for(const mode of ['source','eq']){const values=list(a[mode==='source'?'source_list':'sound_mode_list']);const button=this.q('#'+mode);button.disabled=!enabled||!this.has(mode==='source'?F.source:F.eq)||!values.length;if(button.disabled&&this._mode===mode)this._mode=null;button.setAttribute('aria-expanded',String(this._mode===mode));}
 const display=!this.online?'--':!this.on?'OFF':Date.now()<this._volumeUntil&&vol!==undefined?`VOL ${Math.round(vol*100)}`:typeof a.source==='string'?a.source:'--';const lcd=this.q('#lcd');lcd.classList.toggle('off',!this.on);lcd.setAttribute('aria-label',display);if(this._display!==display){lcd.innerHTML=displaySvg(display);this._display=display;}
 this.q('#status').textContent=!this.online?this.t('Non disponibile','Unavailable'):!this.on?'OFF':display;this.q('.error').textContent=this._error;
 const popup=this.q('#popup');popup.hidden=!this._mode;this.q('#close').setAttribute('aria-label',this.t('Chiudi','Close'));
 if(this._mode){const mode=this._mode,values=list(a[mode==='source'?'source_list':'sound_mode_list']),current=a[mode==='source'?'source':'sound_mode'],signature=JSON.stringify([mode,values,current]);this.q('#popup label').textContent=mode==='source'?this.t('Sorgente','Source'):this.t('Preset audio','Sound preset');if(this._options!==signature){const select=this.q('#choice');select.replaceChildren();if(!values.includes(current)){const o=document.createElement('option');o.textContent=typeof current==='string'?current:'—';o.value='';o.disabled=true;o.selected=true;select.append(o);}for(const value of values){const o=document.createElement('option');o.value=value;o.textContent=value;o.selected=value===current;select.append(o);}this._options=signature;}}
 }
}
class AmpMatrixEditor extends HTMLElement{
 setConfig(c){this.config=c;this.render();}set hass(h){this._hass=h;if(!this.childElementCount)this.render();}
 render(){if(!this.config)return;this.innerHTML='<label>Media player <select id="entity"></select></label><label> Color mode <select id="color"><option>auto</option><option>light</option><option>dark</option></select></label>';const select=this.querySelector('#entity');for(const id of [...new Set([this.config.entity,...Object.keys(this._hass?.states??{}).filter(x=>x.startsWith('media_player.'))])].filter(Boolean)){const o=document.createElement('option');o.value=id;o.textContent=id;select.append(o);}select.value=this.config.entity;this.querySelector('#color').value=this.config.color_mode??'auto';this.onchange=()=>this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:{...this.config,entity:select.value,color_mode:this.querySelector('#color').value}},bubbles:true,composed:true}));}
}
if(!customElements.get('ampmatrix-card'))customElements.define('ampmatrix-card',AmpMatrixCard);
if(!customElements.get('ampmatrix-card-editor'))customElements.define('ampmatrix-card-editor',AmpMatrixEditor);
window.customCards=window.customCards||[];window.customCards.push({type:'ampmatrix-card',name:'AmpMatrix Card',description:'A compact hi-fi amplifier card',preview:true});
