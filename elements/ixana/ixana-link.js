/* <as-ixana-link>: Ixana wearable video link (ES module, shadow DOM, canvas 2D).

 A camera on smart glasses streams video through the body (Wi-R, body-coupled) to a watch display.
 The scene (public Ixana wearer photograph) is greyscale; the only colour is the video stream itself:
 the live camera view at the glasses and the frame-quantised picture on the watch.

 Attributes / properties
   view       "capture" | "link" | "display"  (default "link"). Eases the camera (1.3 s) between stages:
              capture = glasses camera + what it sees, link = whole wearer with packets travelling the body,
              display = close on the watch face playing the received stream.
   progress   number 0..1, optional scroll scrub: 0 capture → .5 link → 1 display. Overrides view while set.
   mode       "improved" (13 fps, default) | "baseline" (4 fps). Sets packet bursts and watch frame cadence.
   controls   "hidden" hides the small 4 / 13 fps toggle (bottom right).
   paused     boolean; pauses motion (also pauses the stream video).
   stream-src override for the colour stream video (default ../../media/ixana/ixana-watch-aisle.mp4).
   person-src override for the wearer photograph (default ./assets/person.webp).
 Methods: play(), pause(), renderAt(seconds) (deterministic redraw at a time; video frame is whatever is decoded).
 Events: modechange {mode,fps} (bubbles, composed).
 Text drawn: small mono HUD readouts only. prefers-reduced-motion → still frame. Pauses offscreen / hidden tab.
 The link path is illustrative, not a measured field map.
*/
const TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>{t=clamp(t);return t*t*(3-2*t)};
const ease3=t=>{t=clamp(t);return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2};
// World = person.webp pixel space (2880 x 1800).
const LENS=[2028,406],PATCH=[2420,1042],WATCH={x:2359.5,y:1617,rx:29,ry:32,rot:-.12};
const FRAME={x:1505,y:300,w:212,h:260}; // floating "what the camera sees" plane, in front of her face
const ROUTE=[LENS,[2105,402],[2178,452],[2212,590],[2268,700],[2352,800],[2402,925],PATCH,[2442,1170],[2440,1300],[2420,1440],[2392,1540],[WATCH.x,WATCH.y-28]];
const KEYS=[{p:0,c:[1790,452],box:[700,440]},{p:.5,c:[2050,960],box:[1060,1640]},{p:1,c:[2384,1612],box:[230,175]}];
const VIEWS={capture:0,link:.5,display:1};
function camAt(p,W,H){p=clamp(p);const i=p<=KEYS[1].p?0:1,A=KEYS[i],B=KEYS[i+1],s=ease3((p-A.p)/(B.p-A.p)),fit=k=>Math.min(W/k.box[0],H/k.box[1]),za=fit(A),zb=fit(B),z=Math.exp(lerp(Math.log(za),Math.log(zb),s));
 let c;if(zb>=za){const k=(za/z)*(1-s);c=[B.c[0]-(B.c[0]-A.c[0])*k,B.c[1]-(B.c[1]-A.c[1])*k]}else{const k=(zb/z)*s;c=[A.c[0]+(B.c[0]-A.c[0])*k,A.c[1]+(B.c[1]-A.c[1])*k]}return {x:c[0],y:c[1],z}}
// Catmull-Rom route sampled by arc length.
const PATH=(()=>{const P=ROUTE,pts=[];for(let i=0;i<P.length-1;i++){const p0=P[Math.max(0,i-1)],p1=P[i],p2=P[i+1],p3=P[Math.min(P.length-1,i+2)];for(let k=0;k<16;k++){const t=k/16,t2=t*t,t3=t2*t;pts.push([0,1].map(j=>.5*(2*p1[j]+(-p0[j]+p2[j])*t+(2*p0[j]-5*p1[j]+4*p2[j]-p3[j])*t2+(-p0[j]+3*p1[j]-3*p2[j]+p3[j])*t3)))}}pts.push(P[P.length-1]);
 const L=[0];for(let i=1;i<pts.length;i++)L.push(L[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));return {pts,L,len:L[L.length-1]}})();
function along(u){const d=clamp(u)*PATH.len,L=PATH.L;let lo=0,hi=L.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(L[m]<d)lo=m;else hi=m}const r=(d-L[lo])/((L[hi]-L[lo])||1),a=PATH.pts[lo],b=PATH.pts[hi];return [a[0]+(b[0]-a[0])*r,a[1]+(b[1]-a[1])*r]}
const PATCH_U=(()=>{let best=0,bd=1e9;for(let i=0;i<=200;i++){const q=along(i/200),d=Math.hypot(q[0]-PATCH[0],q[1]-PATCH[1]);if(d<bd){bd=d;best=i/200}}return best})();
const LATENCY=1.15; // seconds for a frame burst to travel glasses → watch (illustrative)
const CSS=`:host{display:block;position:relative;width:100%;height:100%;min-height:240px;background:#08080a;contain:content;color:#f2efe9}
canvas{display:block;width:100%;height:100%}video{position:absolute;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none}
.ctl{position:absolute;right:14px;bottom:14px;display:flex;gap:6px;font:10px/1 "JetBrains Mono",ui-monospace,Consolas,monospace;letter-spacing:.06em}
.ctl button{font:inherit;letter-spacing:inherit;color:rgba(242,239,233,.62);background:rgba(8,8,10,.6);border:1px solid rgba(255,255,255,.16);border-radius:3px;padding:6px 9px;cursor:pointer}
.ctl button[aria-pressed=true]{color:#08080a;background:#f2efe9;border-color:#f2efe9}.ctl button:focus-visible{outline:1px solid #f2efe9;outline-offset:3px}
:host([controls=hidden]) .ctl,:host([controls=false]) .ctl{display:none}`;
class IxanaLink extends HTMLElement{
 static get observedAttributes(){return ['view','progress','mode','paused','stream-src','person-src']}
 constructor(){super();this.attachShadow({mode:'open'});
  this.shadowRoot.innerHTML=`<style>${CSS}</style><canvas role="img" aria-label="Illustration: video from a camera on smart glasses travels through the wearer's body over a Wi-R link to a watch, which displays the colour stream"></canvas><video muted playsinline loop preload="auto" aria-hidden="true"></video><div class="ctl" role="group" aria-label="Frame rate"><button data-mode="baseline" aria-pressed="false">4 FPS</button><button data-mode="improved" aria-pressed="true">13 FPS</button></div>`;
  this._canvas=this.shadowRoot.querySelector('canvas');this._ctx=this._canvas.getContext('2d');this._video=this.shadowRoot.querySelector('video');
  this._t=0;this._last=0;this._visible=true;this._p=VIEWS.link;this._from=this._p;this._to=this._p;this._tween=1;this._progress=null;this._mode='improved';this._paused=false;
  this._rx=document.createElement('canvas');this._rx.width=237;this._rx.height=291;this._rxFrame=-1;this._hasRx=false;
  this._reduced=matchMedia('(prefers-reduced-motion: reduce)');this._tick=this._tick.bind(this);
  this._ro=new ResizeObserver(()=>this._resize());this._io=new IntersectionObserver(e=>{this._visible=e[0].isIntersecting;this._last=0;this._syncVideo()});
  this._onVis=()=>this._syncVideo();
  this.shadowRoot.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{this.mode=b.dataset.mode;this.dispatchEvent(new CustomEvent('modechange',{detail:{mode:this._mode,fps:this.fps},bubbles:true,composed:true}))}));
  this._video.addEventListener('loadeddata',()=>{if(this._reduced.matches){try{this._video.currentTime=2.4}catch(e){}}this._render()});
  this._video.addEventListener('seeked',()=>this._render());
 }
 get canvas(){return this._canvas}
 get fps(){return this._mode==='baseline'?4:13}
 get mode(){return this._mode}
 set mode(v){this._mode=v==='baseline'?'baseline':'improved';this.shadowRoot.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===this._mode)));this._render()}
 get view(){return this.getAttribute('view')||'link'}
 set view(v){this.setAttribute('view',v)}
 get progress(){return this._progress}
 set progress(v){const n=v===null||v===undefined||v===''?null:Number(v);this._progress=Number.isFinite(n)?clamp(n):null;if(this._progress==null){this._p=this._from=this._to=VIEWS[this.view]??VIEWS.link;this._tween=1}this._render()}
 get paused(){return this._paused}
 attributeChangedCallback(n,o,v){if(o===v)return;
  if(n==='view'){const target=VIEWS[v]??VIEWS.link;if(!this._connected||this._reduced.matches){this._p=this._from=this._to=target;this._tween=1}else{this._from=this._shown();this._to=target;this._tween=0}this._render()}
  else if(n==='progress')this.progress=v;else if(n==='mode')this.mode=v;
  else if(n==='paused'){v===null?this.play():this.pause()}
  else if(n==='stream-src'&&this._connected)this._loadVideo();else if(n==='person-src'&&this._connected)this._loadPerson()}
 connectedCallback(){if(this._connected)return;this._connected=true;this._paused=this.hasAttribute('paused');this.mode=this.getAttribute('mode');
  if(!this.hasAttribute('view')&&this._progress==null){this._p=this._from=this._to=VIEWS.link}
  this._ro.observe(this);this._io.observe(this);document.addEventListener('visibilitychange',this._onVis);this._loadPerson();this._loadVideo();this._resize();this._raf=requestAnimationFrame(this._tick)}
 disconnectedCallback(){this._connected=false;cancelAnimationFrame(this._raf);this._ro.disconnect();this._io.disconnect();document.removeEventListener('visibilitychange',this._onVis);this._video.pause()}
 play(){this._paused=false;this._last=0;this._syncVideo();return this}
 pause(){this._paused=true;this._syncVideo();return this}
 renderAt(seconds){this._t=Math.max(0,Number(seconds)||0);this._rxFrame=-1;this._render();return this}
 _loadVideo(){const src=this.getAttribute('stream-src')||new URL('../../media/ixana/ixana-watch-aisle.mp4',import.meta.url).href;this._video.src=src;this._hasRx=false;this._rxFrame=-1;this._syncVideo()}
 _loadPerson(){const img=new Image();img.decoding='async';img.onload=()=>{const W=img.naturalWidth,H=img.naturalHeight,cv=document.createElement('canvas');cv.width=W;cv.height=H;const g=cv.getContext('2d');g.filter='grayscale(1) contrast(1.06)';g.drawImage(img,0,0);g.filter='none';
   // lift the studio black to the page black so the photo has no visible edge
   g.globalCompositeOperation='lighten';g.fillStyle='#08080a';g.fillRect(0,0,W,H);g.globalCompositeOperation='source-over';
   const fade=(x0,y0,x1,y1)=>{const gr=g.createLinearGradient(x0,y0,x1,y1);gr.addColorStop(0,'#08080a');gr.addColorStop(1,'rgba(8,8,10,0)');g.fillStyle=gr;g.fillRect(Math.min(x0,x1),Math.min(y0,y1),Math.abs(x1-x0)||W,Math.abs(y1-y0)||H)};
   fade(0,H,0,H-140);this._person=cv;this._sx=W/2880;this._render()};img.onerror=()=>this._render();img.src=this.getAttribute('person-src')||new URL('./assets/person.webp',import.meta.url).href}
 _syncVideo(){const v=this._video;if(!v.src)return;const run=!this._paused&&this._visible&&!document.hidden&&!this._reduced.matches;if(run){const pr=v.play();if(pr&&pr.catch)pr.catch(()=>{})}else v.pause()}
 _resize(){const b=this.getBoundingClientRect();this._w=Math.max(1,b.width);this._h=Math.max(1,b.height);this._dpr=Math.min(2,devicePixelRatio||1);this._canvas.width=Math.round(this._w*this._dpr);this._canvas.height=Math.round(this._h*this._dpr);this._render()}
 _shown(){if(this._progress!=null)return this._progress;return lerp(this._from,this._to,ease(this._tween))}
 _tick(now){this._raf=requestAnimationFrame(this._tick);const dt=this._last?Math.min(.05,(now-this._last)/1000):0;this._last=now;if(!this._visible||document.hidden)return;
  const still=this._reduced.matches;if(this._tween<1)this._tween=still?1:Math.min(1,this._tween+dt/1.3);if(!this._paused&&!still)this._t+=dt;
  if(!this._paused&&!still||this._tween<1||!this._drawnOnce||this._video.readyState>=2&&!this._hasRx)this._render()}
 _render(){const c=this._ctx;if(!c||!this._w)return;this._drawnOnce=true;this._draw(c,this._shown(),this._t)}
 _videoReady(){return this._video.readyState>=2&&this._video.videoWidth>0}
 _updateRx(t){const fps=this.fps,f=Math.floor(Math.max(0,t-LATENCY)*fps);if(f!==this._rxFrame&&this._videoReady()){this._rxFrame=f;const g=this._rx.getContext('2d');g.drawImage(this._video,0,0,this._rx.width,this._rx.height);this._hasRx=true}}
 _draw(c,p,t){
  const W=this._w,H=this._h,cam=camAt(p,W,H),z=cam.z,fps=this.fps;this._updateRx(t);
  c.setTransform(this._dpr,0,0,this._dpr,0,0);c.fillStyle='#08080a';c.fillRect(0,0,W,H);
  const S=(x,y)=>[W/2+(x-cam.x)*z,H/2+(y-cam.y)*z];
  c.save();c.translate(W/2,H/2);c.scale(z,z);c.translate(-cam.x,-cam.y);
  if(this._person){c.imageSmoothingQuality='high';c.drawImage(this._person,0,0,this._person.width,this._person.height,0,0,2880,1800)}
  // focus darkening as the camera closes on the watch: the received picture becomes the subject
  const near=ease((p-.62)/.38);if(near>0){const r=Math.max(W,H)/z,g=c.createRadialGradient(WATCH.x,WATCH.y,WATCH.ry*1.2,WATCH.x,WATCH.y,r*.75);g.addColorStop(0,'rgba(8,8,10,0)');g.addColorStop(1,'rgba(8,8,10,'+(.55*near)+')');c.fillStyle=g;c.fillRect(cam.x-r,cam.y-r,2*r,2*r)}
  // received stream on the watch face (colour), frame-held at the selected rate
  c.save();c.translate(WATCH.x,WATCH.y);c.rotate(WATCH.rot);c.beginPath();c.ellipse(0,0,WATCH.rx,WATCH.ry,0,0,TAU);c.clip();c.fillStyle='#050506';c.fillRect(-WATCH.rx,-WATCH.ry,2*WATCH.rx,2*WATCH.ry);
  if(this._hasRx){const s=Math.max(2*WATCH.rx/this._rx.width,2*WATCH.ry/this._rx.height)*1.02;c.globalAlpha=.97;c.drawImage(this._rx,-this._rx.width*s/2,-this._rx.height*s/2,this._rx.width*s,this._rx.height*s);c.globalAlpha=1}
  const gl=c.createLinearGradient(-WATCH.rx,-WATCH.ry,WATCH.rx,WATCH.ry);gl.addColorStop(0,'rgba(255,255,255,.14)');gl.addColorStop(.38,'rgba(255,255,255,0)');gl.addColorStop(1,'rgba(0,0,0,.25)');c.fillStyle=gl;c.fillRect(-WATCH.rx,-WATCH.ry,2*WATCH.rx,2*WATCH.ry);
  c.restore();
  c.save();c.translate(WATCH.x,WATCH.y);c.rotate(WATCH.rot);c.beginPath();c.ellipse(0,0,WATCH.rx+.6,WATCH.ry+.6,0,0,TAU);c.strokeStyle='rgba(255,255,255,.22)';c.lineWidth=Math.max(.6,1/z);c.stroke();c.restore();
  c.restore();
  // camera view at the glasses: live colour, fades as the camera pulls back to the whole link
  const cap=1-ease((p-.18)/.42);
  if(cap>0.002){const a=S(FRAME.x,FRAME.y),b=S(FRAME.x+FRAME.w,FRAME.y+FRAME.h),l=S(...LENS),fw=b[0]-a[0],fh=b[1]-a[1];
   c.save();c.globalAlpha=cap;c.strokeStyle='rgba(242,239,233,.22)';c.lineWidth=1;c.setLineDash([2,4]);c.beginPath();c.moveTo(...l);c.lineTo(b[0],a[1]);c.moveTo(...l);c.lineTo(b[0],b[1]);c.stroke();c.setLineDash([]);
   c.beginPath();c.roundRect(a[0],a[1],fw,fh,Math.max(2,fw*.03));c.save();c.clip();c.fillStyle='#050506';c.fillRect(a[0],a[1],fw,fh);
   if(this._videoReady()){const vw=this._video.videoWidth,vh=this._video.videoHeight,s=Math.max(fw/vw,fh/vh);c.drawImage(this._video,a[0]+(fw-vw*s)/2,a[1]+(fh-vh*s)/2,vw*s,vh*s)}
   c.restore();c.strokeStyle='rgba(242,239,233,.5)';c.stroke();
   // viewfinder corners + HUD
   const k=Math.min(14,fw*.08);c.strokeStyle='rgba(242,239,233,.85)';c.lineWidth=1.2;c.beginPath();for(const [x,y,dx,dy] of [[a[0],a[1],1,1],[b[0],a[1],-1,1],[a[0],b[1],1,-1],[b[0],b[1],-1,-1]]){c.moveTo(x+dx*k,y+dy*4);c.lineTo(x+dx*4,y+dy*4);c.lineTo(x+dx*4,y+dy*k)}c.stroke();
   if(fw>90){this._hud(c,'CAM · 30 FPS',a[0],a[1]-8,'left',.75);const rec=(Math.floor(t*2)%2)?.9:.35;c.fillStyle='rgba(242,239,233,'+rec+')';c.beginPath();c.arc(b[0]-10,a[1]-11,2.5,0,TAU);c.fill()}
   c.restore()}
  // the link: frame bursts leave the lens at the selected rate and travel the body to the watch
  const linkA=.35+.65*ease(1-Math.abs(p-.5)*1.6);
  c.save();c.globalAlpha=linkA*.5;c.strokeStyle='rgba(242,239,233,.55)';c.lineWidth=1;c.setLineDash([1.5,5]);c.beginPath();PATH.pts.forEach((q,i)=>{const s=S(...q);i?c.lineTo(...s):c.moveTo(...s)});c.stroke();c.setLineDash([]);c.restore();
  const dotR=clamp(z*1.6,1.3,3.2);c.save();c.globalCompositeOperation='lighter';
  const f0=Math.floor((t-LATENCY)*fps)-1,f1=Math.floor(t*fps);
  for(let f=f0;f<=f1;f++){const age=t-f/fps;if(age<0||age>LATENCY)continue;const u=age/LATENCY;
   for(let k=0;k<5;k++){const uu=u-k*.011;if(uu<0)continue;const q=S(...along(uu)),a=(1-k/5)*linkA*(.55+.45*Math.sin(Math.PI*clamp(uu)));c.fillStyle='rgba(242,239,233,'+a.toFixed(3)+')';c.beginPath();c.arc(q[0],q[1],dotR*(1-k*.12),0,TAU);c.fill()}}
  c.restore();
  // nodes: lens, Wi-R patch, watch
  const nodes=[[LENS,'CAM'],[PATCH,'Wi-R'],[[WATCH.x,WATCH.y],'RX']];
  nodes.forEach(([q,label],i)=>{if(i===2&&p>.85)return;const s=S(...q),ph=((t*.8+i*.33)%1);c.save();if(i===2)c.globalAlpha=1-ease((p-.6)/.25);const base=i===2?Math.max(WATCH.rx,WATCH.ry)*z+6:clamp(z*14,7,16);
   c.strokeStyle='rgba(242,239,233,'+(.75*linkA)+')';c.lineWidth=1;c.beginPath();c.arc(s[0],s[1],base,0,TAU);c.stroke();
   c.strokeStyle='rgba(242,239,233,'+((1-ph)*.35*linkA)+')';c.beginPath();c.arc(s[0],s[1],base+ph*16,0,TAU);c.stroke();
   if(i<2&&p>.2&&p<.85)this._hud(c,label,s[0]+base+8,s[1]+3,'left',.7*ease(1-Math.abs(p-.5)*3.2+.6));c.restore()});
  // receive HUD beside the watch
  const rxA=ease((p-.55)/.35);if(rxA>0){const s=S(WATCH.x,WATCH.y),rr=Math.max(WATCH.rx,WATCH.ry)*z,side=s[0]+rr+28+170<W-8;let x=side?s[0]+rr+28:Math.max(14,s[0]-80),y=side?s[1]-rr*.55:s[1]+rr+34;c.save();c.globalAlpha=rxA;
   c.strokeStyle='rgba(242,239,233,.35)';c.lineWidth=1;c.beginPath();if(side){c.moveTo(s[0]+rr+8,s[1]-rr*.2);c.lineTo(x-6,y+10)}else{c.moveTo(s[0],s[1]+rr+8);c.lineTo(x+4,y-14)}c.stroke();
   this._hud(c,'RX · '+fps+' FPS',x,y,'left',.9,12);
   const cells=13,cw=Math.min(9,Math.max(5,rr*.06)),gap=3,fi=Math.floor(Math.max(0,t-LATENCY)*fps);for(let i=0;i<cells;i++){const on=i<fps;c.fillStyle=on?(i===fi%fps?'rgba(242,239,233,.95)':'rgba(242,239,233,.35)'):'rgba(242,239,233,.08)';c.fillRect(x+i*(cw+gap),y+10,cw,14)}
   this._hud(c,this._mode==='baseline'?'BEFORE':'AFTER · −8% POWER',x,y+42,'left',.55,10);c.restore()}
 }
 _hud(c,s,x,y,align='left',a=.7,size=10){c.font=size+'px "JetBrains Mono",ui-monospace,Consolas,monospace';c.textAlign=align;c.fillStyle='rgba(242,239,233,'+a.toFixed(3)+')';c.fillText(s,x,y)}
}
if(!customElements.get('as-ixana-link'))customElements.define('as-ixana-link',IxanaLink);
export { IxanaLink };
