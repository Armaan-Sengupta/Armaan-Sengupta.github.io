import {createPlatformRenderer} from '../platform/platform-renderer.js';
import {PLATFORM_SEQUENCE_DURATION,platformSequenceState} from './platform-trajectory.js';
export {PLATFORM_SEQUENCE_DURATION,platformSequenceState};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

class PlatformSequence extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode:'open'});
    this.shadowRoot.innerHTML = `<style>
      :host{display:block;background:#000;color:#fff;font:12px Arial,sans-serif;min-width:0;contain:content}
      *{box-sizing:border-box}.stage{width:100%;aspect-ratio:16/9;background:#000;position:relative;overflow:hidden}
      canvas{width:100%;height:100%;display:block;object-fit:contain}
      .controls{display:flex;gap:12px;align-items:center;min-height:52px;padding:10px 12px;border-top:1px solid #333;color:#ddd}
      button{font:11px Arial,sans-serif;cursor:pointer;color:#fff;background:#111;border:1px solid #555;padding:8px 12px;min-width:58px}
      button:hover{background:#222;border-color:#fff}button:focus-visible,input:focus-visible{outline:2px solid #fff;outline-offset:3px}
      input{min-width:40px;flex:1;accent-color:#fff}output{font:10px monospace;white-space:nowrap;color:#aaa;width:58px;text-align:right}
      .message{position:absolute;inset:auto 12px 12px;color:#aaa;font:11px monospace}.message:empty{display:none}
      :host([controls='false']) .controls{display:none}
      @media(max-width:450px){.controls{gap:7px;padding:9px 7px}button{font-size:10px;padding:8px;min-width:48px}output{font-size:9px;width:50px}}
    </style><div class="stage"><canvas width="1920" height="1080" aria-label="Exploded 3RRS platform assembly collapsing, balancing a rolling ball, and ending at rest"></canvas><div class="message" role="status"></div></div><div class="controls"><button class="toggle" type="button">Play</button><button class="restart" type="button">Replay</button><input type="range" min="0" max="12" step="0.01" value="0" aria-label="Animation time in seconds"><output>0.0 / 12s</output></div>`;
    this._time=0;this._playing=false;this._frame=0;this._last=0;this._view=null;this._disposed=false;
    this._canvas=this.shadowRoot.querySelector('canvas');
    this._slider=this.shadowRoot.querySelector('input');
    this._output=this.shadowRoot.querySelector('output');
    this._toggle=this.shadowRoot.querySelector('.toggle');
    this._toggle.addEventListener('click',()=>this._playing?this.pause():this.play());
    this.shadowRoot.querySelector('.restart').addEventListener('click',()=>{this.seek(0);this.play();});
    this._slider.addEventListener('input',()=>{this.pause();this.seek(Number(this._slider.value));});
    this.addEventListener('keydown',e=>{
      if(e.target!==this || /INPUT|BUTTON/.test(e.composedPath()[0]?.tagName||''))return;
      if(e.code==='Space'){e.preventDefault();this._playing?this.pause():this.play();}
      if(e.code==='Home'){e.preventDefault();this.pause();this.seek(0);}
    });
    this._tick = now => {
      if(!this._playing)return;
      if(!this._last)this._last=now;
      const delta=Math.min((now-this._last)/1000,.1);this._last=now;
      this.seek(this._time+delta);
      if(this._time>=this.duration){this.pause();this.dispatchEvent(new CustomEvent('sequence-complete',{bubbles:true,composed:true,detail:{time:this.duration,state:this.restState}}));return;}
      this._frame=requestAnimationFrame(this._tick);
    };
  }
  connectedCallback() {
    this._disposed=false;
    if(!this.hasAttribute('tabindex'))this.tabIndex=0;
    if(!this.hasAttribute('role'))this.setAttribute('role','group');
    this.setAttribute('aria-label','Platform assembly and balancing animation');
    this.ready=this._initialize();
  }
  async _initialize() {
    try {
      if(!this._view)this._view=await createPlatformRenderer(this._canvas,{width:1920,height:1080,pixelRatio:1});
      if(this._view.ready)await this._view.ready;
      if(this._disposed)return this;
      this.seek(Number(this.getAttribute('time'))||0);
      const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      const auto=this.getAttribute('autoplay');
      if(auto!=='false'&&!reduced)this.play();
      this.dispatchEvent(new CustomEvent('ready',{bubbles:true,composed:true}));
      return this;
    }catch(error){
      this.shadowRoot.querySelector('.message').textContent='The 3D renderer could not be loaded.';
      this.dispatchEvent(new CustomEvent('render-error',{detail:{message:error.message}}));
      throw error;
    }
  }
  disconnectedCallback(){this._disposed=true;this.pause();this._view?.dispose?.();this._view=null;}
  get canvas(){return this._view?.canvas||this._canvas;}
  get duration(){return PLATFORM_SEQUENCE_DURATION;}
  get currentTime(){return this._time;}
  get paused(){return !this._playing;}
  get restState(){return {tiltX:0,tiltZ:0,ballX:0,ballZ:0,explode:0};}
  seek(seconds){
    this._time=clamp(Number(seconds)||0,0,this.duration);
    const state=platformSequenceState(this._time);
    if(this._view){this._view.setState(state);this._view.render();}
    this._slider.value=String(this._time);
    this._output.value=this._time.toFixed(1)+' / 12s';
    this.dispatchEvent(new CustomEvent('timeupdate',{detail:{time:this._time,state}}));
    return state;
  }
  renderAt(seconds){return this.seek(seconds);}
  play(){
    if(this._playing)return;
    if(this._time>=this.duration)this.seek(0);
    this._playing=true;this._last=0;this._toggle.textContent='Pause';
    this._toggle.setAttribute('aria-label','Pause animation');
    this._frame=requestAnimationFrame(this._tick);
  }
  pause(){this._playing=false;cancelAnimationFrame(this._frame);this._last=0;this._toggle.textContent='Play';this._toggle.setAttribute('aria-label','Play animation');}
}
if(!customElements.get('as-platform-sequence'))customElements.define('as-platform-sequence',PlatformSequence);
export { PlatformSequence };

