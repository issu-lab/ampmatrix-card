import { PANEL } from './panel.js';
const F={volume:4,on:128,off:256,step:1024,source:2048,eq:65536};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const list=v=>Array.isArray(v)?[...new Set(v.filter(x=>typeof x==='string'))]:[];
const clamp=v=>Math.max(0,Math.min(1,v));
const styles=`
:host{display:block;--panel:#e9e9e2;--ink:#20282b;--line:#929fa3;--gold:#99824d;--led:#b6bdba;font-family:var(--primary-font-family,system-ui,sans-serif)}
:host([dark]){--panel:#232b31;--ink:#f1f0e9;--line:#657077;--gold:#d3c495;--led:#677176}
*{box-sizing:border-box}.panel{position:relative;aspect-ratio:2;container-type:inline-size;color:var(--ink)}.art{position:absolute;inset:0}.art svg{display:block;width:100%;height:100%}
button{font:inherit;cursor:pointer;color:var(--ink)}button:disabled{cursor:default;opacity:.5}button:focus-visible,select:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
.knob{position:absolute;left:7.375%;top:21%;width:24.5%;height:49%;border:0;border-radius:50%;background:transparent;touch-action:none}.indicator{position:absolute;width:8.2%;aspect-ratio:1;border-radius:50%;border:1px solid var(--line);background:var(--panel);transform:translate(-50%,-50%);pointer-events:none}.indicator:after,.led:after{content:'';position:absolute;inset:20%;border-radius:50%;background:var(--led)}.indicator.on:after{background:#e34c45}
.key{border:0;background:transparent;padding:6px 0;min-height:44px}.face{display:flex;align-items:center;justify-content:center;height:4cqw;min-height:20px;background:#e0e3df;border:2px solid #232b30;border-radius:3px;color:#172126;box-shadow:inset 0 1px 0 #ffffff70,0 1px 0 #0005;font-size:clamp(12px,2.3cqw,20px)}
.key[aria-pressed=true] .face{background:#b6c0c3;box-shadow:inset 0 2px 2px #0003}.steps{position:absolute;left:9.5%;top:77.5%;width:20.25%;display:flex;gap:2.25cqw}.steps .key{flex:1;min-width:0}
.sources{position:absolute;left:38%;top:41.5%;width:54.25%;display:grid;grid-template-columns:repeat(var(--count),minmax(0,1fr));gap:.75cqw}.source{min-width:0;position:relative;text-align:center}.led{position:relative;margin:auto auto 1.75cqw;width:2cqw;min-width:8px;aspect-ratio:1;border:1px solid var(--line);border-radius:50%;background:var(--panel)}.led.on:after{background:var(--source-color)}.source .key{width:100%;padding:0;display:flex;align-items:center}.source .face{width:100%}.symbol svg{width:2.5cqw;height:2.5cqw;min-width:14px;min-height:14px}.label{font-size:clamp(9px,1.5cqw,13px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block}.symbol{font-size:clamp(12px,2cqw,18px)}
.eq{position:absolute;left:79.25%;top:77.5%;width:13%}.eq .face{font-size:clamp(10px,1.6cqw,14px);font-weight:600}.popup{position:absolute;right:7.75%;bottom:23%;max-width:70%;padding:12px;background:var(--panel);border:1px solid var(--line);border-radius:8px;box-shadow:0 4px 12px #0003}.popup label{display:block;margin-bottom:8px}.popup select{min-height:44px;max-width:100%;font:inherit;color:var(--ink);background:var(--panel)}.error{color:var(--ink);background:var(--panel);padding:8px;font-size:13px}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
@container(max-width:360px){.sources{gap:1cqw}.label{font-size:9px}}
`;
export class AmpMatrixCard extends HTMLElement{
 constructor(){super();this.attachShadow({mode:'open'});this._pending=false;this._eq=false;this._error='';}
 static getStubConfig(hass){return {entity:Object.keys(hass?.states??{}).find(x=>x.startsWith('media_player.'))??''};}
 static getConfigElement(){return document.createElement('ampmatrix-card-editor');}
 setConfig(c){if(!c||!/^media_player\.[a-z0-9_]+$/.test(c.entity??''))throw Error('AmpMatrix: entity must be a media_player.');if(c.color_mode&&!['auto','light','dark'].includes(c.color_mode))throw Error('AmpMatrix: invalid color_mode');if(c.language&&!['auto','it','en'].includes(c.language))throw Error('AmpMatrix: invalid language');if(c.volume_step!==undefined&&(!(c.volume_step>0)||c.volume_step>0.1))throw Error('AmpMatrix: volume_step must be > 0 and <= 0.1');this.cancel();this._config={color_mode:'auto',language:'auto',volume_step:.01,...c};this._eq=false;this.render();}
 set hass(h){this._hass=h;if(this._gesture&&(!this.online||!this.on))this.cancel();this.render();}
 get player(){return this._hass?.states?.[this._config?.entity];}
 get online(){return !!this.player&&!['unknown','unavailable'].includes(this.player.state);}
 get on(){return this.online&&!['off','standby'].includes(this.player.state);}
 get volume(){const v=this.player?.attributes.volume_level;return typeof v==='number'&&Number.isFinite(v)?clamp(v):undefined;}
 has(f){return this.online&&((this.player.attributes.supported_features??0)&f)===f;}
 get it(){return (this._config.language==='auto'?this._hass?.language:this._config.language)?.startsWith('it');}
 t(it,en){return this.it?it:en;}
 getCardSize(){return 3;}
 getGridOptions(){return {columns:12,rows:3,min_columns:6,min_rows:2};}
 disconnectedCallback(){this.cancel();}
 cancel(){this._gesture=null;this._draft=undefined;}
 async command(service,data,feature,allowOff=false){if(this._pending||!this.has(feature)||(!allowOff&&!this.on))return;const id=this._config.entity;const restoreFocus=this.shadowRoot.activeElement?.id;this._pending=true;this._error='';this.render();try{await this._hass.callService('media_player',service,{...data,entity_id:id});}catch(e){if(this._config.entity===id)this._error=this.t('Comando non riuscito. Riprova.','Command failed. Try again.');}finally{this._pending=false;this.render();if(restoreFocus)this.shadowRoot.getElementById(restoreFocus)?.focus({preventScroll:true});}}
 toggle(){return this.command(this.on?'turn_off':'turn_on',{},this.on?F.off:F.on,true);}
 setVolume(v){return this.command('volume_set',{volume_level:clamp(v)},F.volume);}
 step(delta){if(this.has(F.volume)&&this.volume!==undefined)return this.setVolume(this.volume+delta*this._config.volume_step);return this.command(delta>0?'volume_up':'volume_down',{},F.step);}
 render(){if(!this._config)return;if(this._gesture)return;const p=this.player,a=p?.attributes??{},enabled=this.on&&!this._pending;
 const dark=this._config.color_mode==='dark'||(this._config.color_mode==='auto'&&!!this._hass?.themes?.darkMode);this.toggleAttribute('dark',dark);
 const sources=list(a.source_list),modes=list(a.sound_mode_list),vol=this.volume;const focus=this.shadowRoot.activeElement?.id;
 const color=s=>/bluetooth/i.test(s)?'#4798ed':/spotify/i.test(s)?'#58b77b':/^ir$/i.test(s)?'#de8065':'#d2b77c';
 const symbol=s=>{const d=/bluetooth/i.test(s)?'M12 2v20l7-6L5 7m0 10L19 7l-7-5':/spotify/i.test(s)?'M3 7q9-4 18 1 M5 12q7-3 14 1 M7 17q5-2 10 1':/^ir$/i.test(s)?'M2 7q10-9 20 0 M6 12q6-5 12 0 M10 17q2-2 4 0 M12 21h.01':'M8 7V2m8 5V2M5 7h14v6l-5 4v5h-4v-5l-5-4Z';return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;};
 const disabled=b=>b?'disabled':'';
 this.shadowRoot.innerHTML=`<style>${styles}</style><div class="panel"><div class="art" aria-hidden="true">${PANEL}</div><button id="knob" class="knob" aria-label="${esc(this.on?this.t('Spegni amplificatore','Turn amplifier off'):this.t('Accendi amplificatore','Turn amplifier on'))}" title="${esc(this.t('Premi: accensione. Trascina: volume. Frecce: volume.','Press: power. Drag: volume. Arrows: volume.'))}" ${disabled(this._pending||!this.has(this.on?F.off:F.on))}><span class="indicator ${this.on?'on':''}"></span></button><span class="sr" role="status">${esc(!this.online?this.t('Non disponibile','Unavailable'):this.on?this.t('Acceso','On'):this.t('Spento','Off'))}${vol===undefined?'':`, ${Math.round(vol*100)}%`}</span><div class="steps">${[-1,1].map(d=>`<button id="step${d}" class="key" aria-label="${esc(d<0?this.t('Riduci volume','Decrease volume'):this.t('Aumenta volume','Increase volume'))}" ${disabled(!enabled||!(this.has(F.step)||(this.has(F.volume)&&vol!==undefined)))}><span class="face">${d<0?'−':'+'}</span></button>`).join('')}</div><div class="sources" style="--count:${Math.max(1,sources.length)}">${sources.map((s,i)=>`<div class="source"><div aria-hidden="true" class="led ${this.on&&a.source===s?'on':''}" style="--source-color:${color(s)}"></div><button id="source${i}" class="key" aria-label="${esc(s)}" aria-pressed="${this.on&&a.source===s}" ${disabled(!enabled||!this.has(F.source))}><span class="face symbol" aria-hidden="true">${symbol(s)}</span></button><span class="label">${esc(s==='AUXIN'?'AUX':s)}</span></div>`).join('')}</div><button id="eq" class="eq key" aria-expanded="${this._eq}" ${disabled(!enabled||!this.has(F.eq)||!modes.length)}><span class="face">EQ</span></button>${this._eq&&enabled?`<div class="popup"><label for="preset">${this.t('Preset audio','Sound preset')}</label><select id="preset"><option value="" disabled ${modes.includes(a.sound_mode)?'':'selected'}>—</option>${modes.map((m,i)=>`<option value="${i}" ${m===a.sound_mode?'selected':''}>${esc(m)}</option>`).join('')}</select></div>`:''}</div>${this._error?`<div class="error" role="alert">${esc(this._error)}</div>`:''}`;
 const q=s=>this.shadowRoot.querySelector(s),knob=q('#knob');this.paintVolume(vol??0);
 knob.onclick=e=>{if(e.detail===0)this.toggle();};
 knob.onpointerdown=e=>{if(e.button!==0)return;const box=knob.getBoundingClientRect();this._gesture={id:this._config.entity,pointer:e.pointerId,x:e.clientX,y:e.clientY,volume:this.volume,drag:false,box};knob.setPointerCapture(e.pointerId);};
 knob.onpointermove=e=>{const g=this._gesture;if(!g||g.pointer!==e.pointerId)return;const moved=Math.hypot(e.clientX-g.x,e.clientY-g.y)>6;if(moved)g.drag=true;if(g.drag&&this.has(F.volume)&&this.on&&g.volume!==undefined){this._draft=clamp(g.volume+(g.y-e.clientY)/Math.max(150,g.box.height*1.5));this.paintVolume(this._draft);}};
 knob.onpointerup=e=>{const g=this._gesture;if(!g||g.pointer!==e.pointerId)return;const draft=this._draft;this.cancel();if(g.id!==this._config.entity)return;if(g.drag){if(draft!==undefined)this.setVolume(draft);else this.render();}else this.toggle();};
 knob.onpointercancel=()=>{this.cancel();this.render();};knob.onlostpointercapture=()=>{if(this._gesture){this.cancel();this.render();}};
 knob.onkeydown=e=>{if(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'].includes(e.key)){e.preventDefault();this.step(['ArrowUp','ArrowRight'].includes(e.key)?1:-1);}if(e.key==='Escape'){this.cancel();this.render();}};
 [-1,1].forEach(d=>q(`#step${d}`).onclick=()=>this.step(d));
 sources.forEach((s,i)=>q(`#source${i}`).onclick=()=>{if(list(this.player?.attributes.source_list).includes(s))this.command('select_source',{source:s},F.source);});
 q('#eq').onclick=()=>{this._eq=!this._eq;this.render();if(this._eq)this.shadowRoot.querySelector('#preset')?.focus();};
 if(q('#preset')){q('#preset').onchange=e=>{const mode=modes[Number(e.target.value)];this._eq=false;if(list(this.player?.attributes.sound_mode_list).includes(mode))this.command('select_sound_mode',{sound_mode:mode},F.eq);};q('#preset').onkeydown=e=>{if(e.key==='Escape'){this._eq=false;this.render();q('#eq').focus();}};}
 if(focus)q(`#${focus}`)?.focus({preventScroll:true});
 }
 paintVolume(v){const led=this.shadowRoot.querySelector('.indicator');if(!led)return;const a=(135+270*v)*Math.PI/180;led.style.left=`${50+38.78*Math.cos(a)}%`;led.style.top=`${50+38.78*Math.sin(a)}%`;}
}
class AmpMatrixEditor extends HTMLElement{
 setConfig(c){this.config=c;this.render();}set hass(h){this._hass=h;if(!this.childElementCount)this.render();}
 render(){if(!this.config)return;this.innerHTML='<label>Media player <select id="entity"></select></label><label> Color mode <select id="color"><option>auto</option><option>light</option><option>dark</option></select></label>';const select=this.querySelector('#entity');for(const id of [...new Set([this.config.entity,...Object.keys(this._hass?.states??{}).filter(x=>x.startsWith('media_player.'))])].filter(Boolean)){const o=document.createElement('option');o.value=id;o.textContent=id;select.append(o);}select.value=this.config.entity;this.querySelector('#color').value=this.config.color_mode??'auto';this.onchange=()=>this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:{...this.config,entity:select.value,color_mode:this.querySelector('#color').value}},bubbles:true,composed:true}));}
}
if(!customElements.get('ampmatrix-card'))customElements.define('ampmatrix-card',AmpMatrixCard);
if(!customElements.get('ampmatrix-card-editor'))customElements.define('ampmatrix-card-editor',AmpMatrixEditor);
window.customCards=window.customCards||[];window.customCards.push({type:'ampmatrix-card',name:'AmpMatrix Card',description:'A compact hi-fi amplifier card',preview:true});
