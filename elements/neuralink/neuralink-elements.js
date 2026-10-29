/* Neuralink portfolio elements: monochrome, artistic renderings only (not official material).

 <as-neural-journey>   one continuous camera move: head → into the implant → threads → pulses → phosphene face
   progress   number 0..1 (property or attribute). Scrubs the whole journey deterministically (camera, stage
              mix). While set, autoplay stops; ambient micro-motion (pulses, face flicker) keeps running.
              Remove the attribute / set null to return to autoplay.
              Stations: implant ≈ .21 (inside ≈ .33), threads ≈ .5, signals ≈ .64, perception ≈ .87–1.
   view       optional "implant" | "threads" | "signals" | "perception": eases (1.4 s) to that station when
              progress is not set.
   (neither)  autoplay: 16 s journey, 6 s hold on the face, fade, loop.
   portrait-src  optional override of assets/woman-reference.jpg.
   renderAt(p, ambientSeconds)  deterministic draw for capture; seek(s) sets the autoplay clock.
   Only text drawn: the disclaimer. prefers-reduced-motion → still frame. Pauses offscreen / hidden tab.

 <as-stimulation-channels loop>  eight-channel biphasic pulse trains (unchanged legacy element).
*/
const AS_NEURAL_DISCLAIMER = "Artistic rendering, not official Neuralink material, does not indicate product fidelity";
const AS_NEURAL_STYLE = `:host{display:block;position:relative;width:100%;height:100%;min-height:360px;background:#000;color:#fff;contain:content;font-family:Arial,sans-serif}*{box-sizing:border-box}canvas{display:block;width:100%;height:100%;min-height:360px;touch-action:pan-y}.controls{position:absolute;left:24px;bottom:48px;right:24px;display:flex;justify-content:flex-end;gap:14px;align-items:center;font:10px/1.4 Consolas,monospace;color:#a3a3a3}.controls button{color:#fff;background:#000a;border:1px solid #555;border-radius:2px;padding:8px 12px;cursor:pointer;font:10px Consolas,monospace}.controls button:focus-visible{outline:2px solid white;outline-offset:3px}.title{position:absolute;left:26px;top:22px;color:#ddd;font:10px Consolas,monospace;letter-spacing:1.5px}.note{font-size:9px;color:#888}.controls input{width:85px;accent-color:white}.control-group{display:flex;align-items:center;gap:10px}@media(max-width:500px){.controls{left:15px;right:15px;bottom:46px;font-size:8px}.title{top:17px;left:17px;font-size:8px}.note{font-size:7px}.controls button{font-size:8px;padding:7px 9px}}`;
const asNClamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const asNLerp=(a,b,t)=>a+(b-a)*t;
const asNSmooth=t=>{t=asNClamp(t);return t*t*(3-2*t)};
const asNSeg=(t,a,b)=>asNSmooth((t-a)/(b-a));
// Shared world-space camera: fixed implant at (634,205), thread tips around y=263.
// Smooth focus and logarithmic zoom are continuous at each segment boundary.
function neuralCameraAt(t){
 const keys=[{t:0,x:575,y:340,zoom:.95},{t:2.2,x:620,y:255,zoom:1.7},{t:6.5,x:634,y:214,zoom:6.6},{t:11.6,x:640,y:247,zoom:15},{t:13.2,x:641,y:255,zoom:22}];
 const time=asNClamp(t,0,13.2);let a=keys[0],b=keys[1];for(let i=0;i<keys.length-1;i++)if(time>=keys[i].t){a=keys[i];b=keys[i+1]}
 const u=asNSmooth((time-a.t)/(b.t-a.t));return {x:asNLerp(a.x,b.x,u),y:asNLerp(a.y,b.y,u),zoom:Math.exp(asNLerp(Math.log(a.zoom),Math.log(b.zoom),u))};
}
function asNLine(c,pts,color='#fff',width=1){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.strokeStyle=color;c.lineWidth=width;c.stroke()}
function asNText(c,s,x,y,size=12,color='#999',align='left'){c.fillStyle=color;c.font=size+'px Consolas,monospace';c.textAlign=align;c.fillText(s,x,y)}
function asNCircle(c,x,y,r,color='#fff'){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=color;c.fill()}
function asNCurve(c,p,color='#fff',width=1){c.beginPath();c.moveTo(p[0],p[1]);c.bezierCurveTo(...p.slice(2));c.strokeStyle=color;c.lineWidth=width;c.stroke()}
function asNCubic(p,t){const a=1-t;return [a*a*a*p[0]+3*a*a*t*p[2]+3*a*t*t*p[4]+t*t*t*p[6],a*a*a*p[1]+3*a*a*t*p[3]+3*a*t*t*p[5]+t*t*t*p[7]]}
function asNPanel(c,x,y,w,h){const g=c.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,'#171717');g.addColorStop(1,'#030303');c.fillStyle=g;c.fillRect(x,y,w,h);c.strokeStyle='#555';c.lineWidth=1;c.strokeRect(x,y,w,h)}
class ASNeuralBase extends HTMLElement{
 constructor(){super();this.attachShadow({mode:'open'});this.shadowRoot.innerHTML='<style>'+AS_NEURAL_STYLE+'</style><canvas aria-label="Conceptual neural stimulation illustration"></canvas><div class="controls"><div class="control-group"><button type="button" class="replay">Replay</button><button type="button" class="pause">Pause</button></div></div>';this._canvas=this.shadowRoot.querySelector('canvas');this._ctx=this._canvas.getContext('2d',{alpha:false});this._time=0;this._last=0;this._playing=true;this._visible=true;this.readyPromise=Promise.resolve(this);this.ready=this.readyPromise;this._reduced=matchMedia('(prefers-reduced-motion: reduce)');this._frame=this._frame.bind(this);this._ro=new ResizeObserver(()=>this.resize());this._io=new IntersectionObserver(es=>{this._visible=es[0].isIntersecting});this.shadowRoot.querySelector('.replay').onclick=()=>{this.seek(0);this.play()};this.shadowRoot.querySelector('.pause').onclick=()=>this._playing?this.pause():this.play();}
 connectedCallback(){this._ro.observe(this);this._io.observe(this);this.resize();if(this._reduced.matches)this.pause();this._raf=requestAnimationFrame(this._frame)}
 disconnectedCallback(){this._ro.disconnect();this._io.disconnect();cancelAnimationFrame(this._raf)}
 get canvas(){return this._canvas}get duration(){return 20}get currentTime(){return this._time}
 resize(){const b=this.getBoundingClientRect();this._w=Math.max(1,b.width);this._h=Math.max(1,b.height||560);this._dpr=Math.min(2,devicePixelRatio||1);this._canvas.width=Math.round(this._w*this._dpr);this._canvas.height=Math.round(this._h*this._dpr);this.render()}
 seek(t){this._time=asNClamp(Number(t)||0,0,this.duration);this.render();this.dispatchEvent(new CustomEvent('timeupdate',{detail:{currentTime:this._time,duration:this.duration}}))}
 pause(){this._playing=false;this.shadowRoot.querySelector('.pause').textContent='Play'}
 play(){this._playing=true;this.shadowRoot.querySelector('.pause').textContent='Pause';this._last=0}
 _frame(now){this._raf=requestAnimationFrame(this._frame);const dt=this._last?Math.min(.05,(now-this._last)/1000):0;this._last=now;if(this._playing&&this._visible&&!document.hidden){this._time+=dt;if(this._time>this.duration){if(this.hasAttribute('loop'))this._time=0;else{this._time=this.duration;this.pause();this.dispatchEvent(new Event('ended'))}}this.render()}}
 render(){if(!this._ctx||!this._w)return;const c=this._ctx;c.setTransform(this._dpr,0,0,this._dpr,0,0);c.fillStyle='#000';c.fillRect(0,0,this._w,this._h);const scale=Math.min(this._w/1200,this._h/680);c.save();c.translate((this._w-1200*scale)/2,(this._h-680*scale)/2);c.scale(scale,scale);this.draw(c,this._time);c.restore();this.drawDisclaimer(c)}
 drawDisclaimer(c){const size=10,limit=this._w-36,words=AS_NEURAL_DISCLAIMER.split(' '),lines=[];c.font=size+'px Arial,sans-serif';let line='';for(const word of words){const trial=line?line+' '+word:word;if(line&&c.measureText(trial).width>limit){lines.push(line);line=word}else line=trial}if(line)lines.push(line);c.textAlign='center';c.fillStyle='#a1a1a1';const y=this._h-16-(lines.length-1)*(size+4);lines.forEach((text,i)=>c.fillText(text,this._w/2,y+i*(size+4)))}
}
class ASStimulationChannels extends ASNeuralBase{
 constructor(){super();this._gain=1;this._speed=1;this.shadowRoot.querySelector('.replay').textContent='Restart';}
 get duration(){return 12}
 connectedCallback(){if(!this.hasAttribute('loop'))this.setAttribute('loop','');super.connectedCallback();this._canvas.setAttribute('aria-label','Eight asynchronously timed biphasic stimulation channels, with matched opposite-polarity pulse areas and an interphase gap.');}
 draw(c,t){
  const left=160,right=1080,top=125,gap=56,n=8,scan=left+((t/this.duration)%1)*(right-left);
  c.fillStyle='#060606';c.fillRect(left,top-42,right-left,gap*(n-1)+85);
  for(let x=left;x<=right;x+=92){asNLine(c,[[x,top-42],[x,top+gap*(n-1)+42]],'#202020',.7)}
  const period=2.2,pw=.105,inter=.035;
  for(let row=0;row<n;row++){
   const y=top+row*gap,phase=[0,.38,.85,1.29,.63,1.72,.19,1.04][row];asNLine(c,[[left,y],[right,y]],'#2c2c2c',1);
   const pts=[];for(let x=left;x<=right;x+=1.5){const time=(x-left)/(right-left)*5.8+t*.55+phase;const q=((time%period)+period)%period;let v=0;if(q<pw)v=-1;else if(q<pw+inter)v=0;else if(q<2*pw+inter)v=1;pts.push([x,y+v*19]);}
   c.save();c.beginPath();c.rect(left,top-45,scan-left,600);c.clip();asNLine(c,pts,'#fff',1.7);c.restore();c.save();c.beginPath();c.rect(scan,top-45,right-scan,600);c.clip();asNLine(c,pts,'#777',1.1);c.restore();
   let scanTime=(scan-left)/(right-left)*5.8+t*.55+phase,q=((scanTime%period)+period)%period;let v=q<pw?-1:q<pw+inter?0:q<2*pw+inter?1:0;if(v){c.save();c.shadowColor='#fff';c.shadowBlur=12;asNCircle(c,scan,y+v*19,3,'#fff');c.restore()}
  }
  const sg=c.createLinearGradient(scan-30,0,scan+4,0);sg.addColorStop(0,'#ffffff00');sg.addColorStop(1,'#ffffff20');c.fillStyle=sg;c.fillRect(scan-30,top-42,34,gap*(n-1)+84);asNLine(c,[[scan,top-42],[scan,top+gap*(n-1)+42]],'#aaa',1);
 }
}

/* ───────────────────────── <as-neural-journey> ─────────────────────────
 One continuous camera move through a single world (no cuts, no model swaps):
 head in profile → dive INTO the implant (cut-away package, die, coil) → down the threads →
 electrical pulses travel to the electrode contacts → the contacts' activity spreads into a
 phosphene dot portrait (assets/woman-reference.jpg) whose dots flicker like a live feed. */
const NJ_TAU=Math.PI*2;
const njEase=t=>{t=asNClamp(t);return t*t*(3-2*t)};
const njMix=s=>.42*s+.58*njEase(s); // keeps some velocity through every key: one move, no stop-and-go
function njBez(p0,p1,p2,p3,t){const a=1-t;return [a*a*a*p0[0]+3*a*a*t*p1[0]+3*a*t*t*p2[0]+t*t*t*p3[0],a*a*a*p0[1]+3*a*a*t*p1[1]+3*a*t*t*p2[1]+t*t*t*p3[1]]}
function njHash(i){const s=Math.sin(i*127.1+311.7)*43758.5453;return s-Math.floor(s)}
// Head profile (facing left), world units. Cubic segments: [start, c1, c2, end].
const NJ_HEAD=[[-70,210],[-72,170],[-80,140],[-92,125],[-110,118],[-128,112],[-132,96],[-136,86],[-134,78],[-138,72],[-136,67],[-141,63],[-143,57],[-147,50],[-142,43],[-147,35],
 [-151,29],[-160,22],[-168,13],[-171,3],[-160,-20],[-151,-40],[-148,-55],[-151,-72],[-146,-96],[-140,-150],[-95,-205],[-10,-210],[70,-214],[140,-170],[160,-100],[172,-45],[160,10],[130,60],[110,92],[95,120],[92,150],[90,175],[95,195],[98,210]];
const NJ_SEG=i=>[NJ_HEAD[i*3],NJ_HEAD[i*3+1],NJ_HEAD[i*3+2],NJ_HEAD[i*3+3]];
const NJ_NSEG=(NJ_HEAD.length-1)/3;
// Implant sits on the upper-rear skull (segment 9, top → back).
const NJ_IMPLANT=(()=>{const s=NJ_SEG(9),t=.3,p=njBez(...s,t),q=njBez(...s,t+.001),a=Math.atan2(q[1]-p[1],q[0]-p[0]),T=[Math.cos(a),Math.sin(a)],N=[-T[1],T[0]];return {x:p[0]+N[0]*.6,y:p[1]+N[1]*.6,a,T,N}})();
const njL2W=(x,y)=>[NJ_IMPLANT.x+x*NJ_IMPLANT.T[0]+y*NJ_IMPLANT.N[0],NJ_IMPLANT.y+x*NJ_IMPLANT.T[1]+y*NJ_IMPLANT.N[1]];
// Face lattice region (implant-local units).
const NJ_FACE={cx:0,cy:34,w:32,h:44,step:.5};
// Camera keys: p, centre (world), fit box (world w,h), rotation. Zoom is computed per viewport so every aspect frames the subject.
const NJ_KEYS=[
 {p:0,   c:[2,-2],          box:[430,500], rot:0},
 {p:.05, c:[8,-14],         box:[392,456], rot:0},
 {p:.21, c:njL2W(0,-.6),    box:[40,30],   rot:-NJ_IMPLANT.a},
 {p:.33, c:njL2W(0,-.4),    box:[11.5,8.2], rot:-NJ_IMPLANT.a},
 {p:.39, c:njL2W(0,5.2),    box:[15,10.5], rot:-NJ_IMPLANT.a},
 {p:.5,  c:njL2W(0,15.5),   box:[38,35],   rot:-NJ_IMPLANT.a},
 {p:.64, c:njL2W(0,24),     box:[33,29],   rot:-NJ_IMPLANT.a},
 {p:.87, c:njL2W(0,35.4),   box:[35.5,51], rot:-NJ_IMPLANT.a},
 {p:1,   c:njL2W(0,35.2),   box:[34.2,49.4], rot:-NJ_IMPLANT.a}];
const NJ_VIEWS={implant:.21,threads:.5,signals:.64,perception:.93};
function njCamera(p,W,H){
 p=asNClamp(p);let i=0;while(i<NJ_KEYS.length-2&&p>NJ_KEYS[i+1].p)i++;
 const A=NJ_KEYS[i],B=NJ_KEYS[i+1],s=njMix((p-A.p)/(B.p-A.p)),fit=k=>Math.min(W/k.box[0],H/k.box[1]),za=fit(A),zb=fit(B),z=Math.exp(asNLerp(Math.log(za),Math.log(zb),s));
 // Anchor on the closer framing so its subject glides to centre at a steady screen rate while zoom changes.
 let c;if(zb>=za){const k=(za/z)*(1-s);c=[B.c[0]-(B.c[0]-A.c[0])*k,B.c[1]-(B.c[1]-A.c[1])*k]}else{const k=(zb/z)*s;c=[A.c[0]+(B.c[0]-A.c[0])*k,A.c[1]+(B.c[1]-A.c[1])*k]}
 return {x:c[0],y:c[1],z,rot:asNLerp(A.rot,B.rot,s)};
}
// Sampled cranial outline (forehead → top → back) and inward offsets for skull and folded cortex.
const NJ_CRANIUM=(()=>{const pts=[];for(let s=7;s<=10;s++)for(let k=0;k<40;k++)pts.push(njBez(...NJ_SEG(s),k/40));pts.push(NJ_HEAD[33]);
 const nrm=pts.map((p,i)=>{const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;return [-dy/l,dx/l]});
 let len=0;const arc=pts.map((p,i)=>i?(len+=Math.hypot(p[0]-pts[i-1][0],p[1]-pts[i-1][1])):0);
 const off=(d,amp=0,wave=1,ph=0)=>pts.map((p,i)=>{const dd=d+amp*Math.sin(arc[i]/wave+ph)+amp*.45*Math.sin(arc[i]/(wave*.43)+ph*2.1);return [p[0]+nrm[i][0]*dd,p[1]+nrm[i][1]*dd]});
 const trim=(line,a,b)=>line.slice(Math.floor(line.length*a),Math.ceil(line.length*b));
 return {skull:off(5.2),cortex:off(8.4,1.1,2.6),folds:[trim(off(18,3.2,7,1),.06,.96),trim(off(32,4.5,9,2.2),.12,.92),trim(off(50,6,12,.7),.2,.86),trim(off(72,7,15,3.1),.3,.8)]};
})();
// Threads leave a ring under the package and fan into cortex; contacts sit near each tip.
const NJ_THREADS=(()=>{const n=32,out=[];for(let i=0;i<n;i++){const a=(i+.5)/n*Math.PI,ox=-Math.cos(a)*8.6,oy=3.9+Math.sin(a)*1.5,j=njHash(i)-.5,tx=ox*1.78+j*2.4,ty=27.5+njHash(i+40)*4.4,
  p=[[ox,oy],[ox+j*.6,oy+6+njHash(i+9)*3],[tx*.86+(njHash(i+3)-.5)*3,ty-11],[tx,ty]],pts=[];for(let k=0;k<=36;k++)pts.push(njBez(...p,k/36));
  out.push({p,pts,phase:njHash(i+77),speed:.26+njHash(i+21)*.1,tip:[tx,ty]})}return out})();
function njThreadAt(th,u){const f=asNClamp(u)*36,k=Math.min(35,Math.floor(f)),r=f-k,a=th.pts[k],b=th.pts[k+1];return [a[0]+(b[0]-a[0])*r,a[1]+(b[1]-a[1])*r]}
function njPolyline(c,pts){c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1])}
const NJ_STYLE=`:host{display:block;position:relative;width:100%;height:100%;min-height:240px;background:#08080a;contain:content}canvas{display:block;width:100%;height:100%}`;
class ASNeuralJourney extends HTMLElement{
 static get observedAttributes(){return ['progress','view','portrait-src']}
 constructor(){super();this.attachShadow({mode:'open'});this.shadowRoot.innerHTML='<style>'+NJ_STYLE+'</style><canvas role="img" aria-label="Artistic rendering: a continuous camera move from a head in profile into a brain implant, down its threads as electrical pulses travel to the electrodes, resolving into a flickering dot portrait of a face"></canvas>';
  this._canvas=this.shadowRoot.querySelector('canvas');this._ctx=this._canvas.getContext('2d');this._clock=0;this._ambient=0;this._last=0;this._visible=true;this._p=0;this._target=null;this._from=0;this._tween=1;this._progress=null;
  this._reduced=matchMedia('(prefers-reduced-motion: reduce)');this._frame=this._frame.bind(this);this._ro=new ResizeObserver(()=>this.resize());this._io=new IntersectionObserver(es=>{this._visible=es[0].isIntersecting;this._last=0});this._dots=null;this.ready=Promise.resolve(this);}
 /** Journey length in autoplay (s) before the hold + loop. */
 get duration(){return 16}
 get canvas(){return this._canvas}
 get progress(){return this._progress}
 set progress(v){this._freeze=false;const n=v===null||v===undefined||v===''?null:asNClamp(Number(v));this._progress=Number.isFinite(n)?n:null;this._target=null;this.render()}
 get view(){return this.getAttribute('view')}
 set view(v){v==null?this.removeAttribute('view'):this.setAttribute('view',v)}
 attributeChangedCallback(name,old,v){if(name==='progress')this.progress=v;else if(name==='view'){if(v in NJ_VIEWS){this._from=this._shownP();this._target=NJ_VIEWS[v];this._tween=0;if(old==null&&this._progress==null&&!this.isConnected)this._tween=1}}else if(name==='portrait-src'&&this.isConnected)this.ready=this._load()}
 connectedCallback(){this._ro.observe(this);this._io.observe(this);this.ready=this._load();this.resize();this._raf=requestAnimationFrame(this._frame)}
 disconnectedCallback(){this._ro.disconnect();this._io.disconnect();cancelAnimationFrame(this._raf)}
 resize(){const b=this.getBoundingClientRect();this._w=Math.max(1,b.width);this._h=Math.max(1,b.height);this._dpr=Math.min(2,devicePixelRatio||1);this._canvas.width=Math.round(this._w*this._dpr);this._canvas.height=Math.round(this._h*this._dpr);this.render()}
 /** Autoplay clock seek (seconds). */
 seek(t){this._clock=Math.max(0,Number(t)||0);this.render();return this}
 /** Deterministic draw: journey progress p (0..1) and ambient time (s) for pulses/flicker. */
 renderAt(p,ambient=this._ambient){this.progress=p;this._ambient=Number(ambient)||0;this._freeze=true;this.render();return this}
 _load(){const url=this.getAttribute('portrait-src')||new URL('./assets/woman-reference.jpg',import.meta.url).href;return new Promise(res=>{const im=new Image();im.decoding='async';im.onload=()=>{this._buildDots(im);this.render();res(this)};im.onerror=()=>{this._buildDots(null);this.render();res(this)};im.src=url})}
 _buildDots(im){
  const F=NJ_FACE,sx=F.step,sy=F.step*.866,cols=Math.round(F.w/sx),rows=Math.round(F.h/sy),cw=cols*2,ch=rows*2,cv=document.createElement('canvas');cv.width=cw;cv.height=ch;const g=cv.getContext('2d',{willReadFrequently:true});g.fillStyle='#000';g.fillRect(0,0,cw,ch);
  if(im){const ar=F.w/F.h,iw=im.naturalWidth,ih=im.naturalHeight;let h=ih*.85,w=h*ar;const x0=iw*.5-w/2,y0=ih*.065;g.filter='grayscale(1)';g.drawImage(im,x0,y0,w,h,0,0,cw,ch);g.filter='none'}
  const d=g.getImageData(0,0,cw,ch).data,n=cols*rows,X=new Float32Array(n),Y=new Float32Array(n),L=new Float32Array(n),D=new Float32Array(n),W=new Float32Array(n),P=new Float32Array(n),M=new Float32Array(n);let k=0,dmax=0;
  for(let r=0;r<rows;r++)for(let q=0;q<cols;q++,k++){
   const x=-F.w/2+(q+.5+(r&1?.5:0)-.25)*sx+(njHash(k*3+1)-.5)*sx*.22,y=F.cy-F.h/2+(r+.5)*sy+(njHash(k*3+2)-.5)*sy*.22;X[k]=x;Y[k]=y;
   const ix=Math.min(cw-1,Math.max(0,Math.round((x+F.w/2)/F.w*cw-.5))),iy=Math.min(ch-1,Math.max(0,Math.round((y-F.cy+F.h/2)/F.h*ch-.5)));let s=0;for(const [ax,ay] of [[0,0],[1,0],[0,1],[1,1]]){const j=(Math.min(ch-1,iy+ay)*cw+Math.min(cw-1,ix+ax))*4;s+=d[j]}
   const lum=s/4/255;L[k]=Math.pow(asNClamp((lum-.05)/.82),1.05);
   let best=1e9;for(const th of NJ_THREADS){const dx=th.tip[0]-x,dy=th.tip[1]-y,dd=dx*dx+dy*dy;if(dd<best)best=dd}D[k]=Math.sqrt(best);dmax=Math.max(dmax,D[k]);
   W[k]=1.2+njHash(k*7+5)*2.6;P[k]=njHash(k*5+3)*NJ_TAU;const ex=x/(F.w/2),ey=(y-F.cy)/(F.h/2);M[k]=asNClamp(1.25-1.1*Math.hypot(ex*.92,ey));L[k]*=1-asNSmooth((ey-.72)/.28)}
  for(let i=0;i<n;i++)D[i]/=dmax;this._dots={n,X,Y,L,D,W,P,M};
 }
 _shownP(){if(this._progress!=null)return this._progress;if(this._target!=null)return asNLerp(this._from,this._target,njEase(this._tween));return this._autoP()}
 _autoP(){const t=this._clock%(this.duration+7);return asNClamp(t/this.duration)}
 _autoFade(){if(this._progress!=null||this._target!=null)return 1;const t=this._clock%(this.duration+7),end=this.duration+7;return asNClamp(t/.6)*asNClamp((end-t)/1)}
 _frame(now){this._raf=requestAnimationFrame(this._frame);const dt=this._last?Math.min(.05,(now-this._last)/1000):0;this._last=now;if(!this._visible||document.hidden)return;
  const still=this._reduced.matches||this._freeze;if(!still){this._ambient+=dt;if(this._target!=null&&this._tween<1)this._tween=Math.min(1,this._tween+dt/1.4);else if(this._progress==null&&this._target==null)this._clock+=dt}
  else if(this._progress==null&&this._target==null)this._clock=this.duration;
  if(!still||dt===0)this.render()}
 render(){if(!this._ctx||!this._w)return;this._draw(this._shownP(),this._ambient,this._autoFade())}
 _draw(p,t,fade){
  const c=this._ctx,W=this._w,H=this._h,cam=njCamera(p,W,H),z=cam.z;c.setTransform(this._dpr,0,0,this._dpr,0,0);c.fillStyle='#08080a';c.fillRect(0,0,W,H);
  c.save();c.globalAlpha=fade;c.translate(W/2,H/2);c.rotate(cam.rot);c.scale(z,z);c.translate(-cam.x,-cam.y);
  this._head(c,z,p);
  c.save();c.translate(NJ_IMPLANT.x,NJ_IMPLANT.y);c.rotate(NJ_IMPLANT.a);
  this._lattice(c,z,p,t,cam,W,H);this._threads(c,z,p,t);this._implant(c,z,p,t);
  c.restore();c.restore();
  this._disclaimer(c,W,H);
 }
 _head(c,z,p){
  const px=1/z,far=(1-asNSmooth((z-60)/60))*(1-.8*asNSmooth((p-.7)/.2));if(far<=0)return;c.lineJoin='round';c.lineCap='round';
  // brain folds and cortex: faint, they become the tissue the camera passes through
  c.strokeStyle='rgba(255,255,255,'+(.11*far)+')';c.lineWidth=px;for(const f of NJ_CRANIUM.folds){njPolyline(c,f);c.stroke()}
  c.strokeStyle='rgba(255,255,255,'+(.26*far)+')';njPolyline(c,NJ_CRANIUM.cortex);c.stroke();
  c.strokeStyle='rgba(255,255,255,'+(.2*far)+')';njPolyline(c,NJ_CRANIUM.skull);c.stroke();
  // outer profile
  c.beginPath();c.moveTo(...NJ_HEAD[0]);for(let i=0;i<NJ_NSEG;i++){const s=NJ_SEG(i);c.bezierCurveTo(...s[1],...s[2],...s[3])}
  c.strokeStyle='rgba(242,239,233,'+(.82*far)+')';c.lineWidth=1.3*px;c.stroke();
  // ear, eye, brow, nostril, lips
  c.lineWidth=px;c.strokeStyle='rgba(255,255,255,'+(.42*far)+')';
  c.beginPath();c.ellipse(52,-6,15,25,.12,-1.9,2.2);c.stroke();c.beginPath();c.moveTo(56,-18);c.bezierCurveTo(46,-16,46,4,56,8);c.stroke();
  c.beginPath();c.moveTo(-139,-33);c.quadraticCurveTo(-128,-38,-118,-33);c.stroke();c.beginPath();c.moveTo(-143,-50);c.quadraticCurveTo(-128,-58,-112,-52);c.stroke();
  c.beginPath();c.moveTo(-158,19);c.quadraticCurveTo(-150,22,-146,19);c.stroke();c.beginPath();c.moveTo(-140,64);c.lineTo(-128,63);c.stroke();
 }
 _implant(c,z,p,t){
  const px=1/z,R=13,ry=3.6,top=-1.6,bot=2;c.lineCap='round';c.lineJoin='round';
  // body (opaque: it occludes the skull line it is seated in)
  c.beginPath();c.ellipse(0,top,R,ry,0,Math.PI,NJ_TAU);c.lineTo(R,bot);c.ellipse(0,bot,R,ry,0,0,Math.PI);c.closePath();c.fillStyle='#060607';c.fill();
  const g=c.createLinearGradient(-R,0,R,0);g.addColorStop(0,'rgba(255,255,255,.05)');g.addColorStop(.42,'rgba(255,255,255,.16)');g.addColorStop(.6,'rgba(255,255,255,.06)');g.addColorStop(1,'rgba(255,255,255,.02)');
  c.beginPath();c.moveTo(-R,top);c.lineTo(-R,bot);c.ellipse(0,bot,R,ry,0,Math.PI,0,true);c.lineTo(R,top);c.ellipse(0,top,R,ry,0,0,Math.PI);c.fillStyle=g;c.fill();
  // side wall + rims
  c.strokeStyle='rgba(242,239,233,.9)';c.lineWidth=Math.max(.7,Math.min(1.6,.09*z))*px;
  c.beginPath();c.ellipse(0,top,R,ry,0,0,NJ_TAU);c.stroke();c.beginPath();c.moveTo(-R,top);c.lineTo(-R,bot);c.ellipse(0,bot,R,ry,0,Math.PI,0,true);c.lineTo(R,top);c.stroke();
  // cut-away interior, always present: it simply becomes legible as the camera closes in
  const detail=asNSmooth((z-6)/14);if(detail<=0)return;const proj=(u,v)=>[u,top+v*ry/R];
  c.save();c.globalAlpha*=detail;c.lineWidth=px;
  c.strokeStyle='rgba(255,255,255,.28)';c.beginPath();c.ellipse(0,top,R-1.3,ry-.36,0,0,NJ_TAU);c.stroke();
  c.setLineDash([.5,.32]);c.strokeStyle='rgba(255,255,255,.34)';for(const r of [9.6,9.1,8.6]){c.beginPath();c.ellipse(0,top,r,r*ry/R,0,0,NJ_TAU);c.stroke()}c.setLineDash([]);
  // traces: die → thread pads around the rim
  c.strokeStyle='rgba(255,255,255,.22)';for(let i=0;i<32;i++){const a=(i+.5)/32*Math.PI,ue=-Math.cos(a)*8.6,ve=Math.sin(a)*8.6,us=-Math.cos(a)*2.6,vs=Math.sin(a)*1.6+.2;const A=proj(us,vs),B=proj(ue*.7,ve*.7),C=proj(ue,ve);c.beginPath();c.moveTo(...A);c.lineTo(...B);c.lineTo(...C);c.stroke()}
  // die with channel grid
  const d0=proj(-3.2,-2.2),d1=proj(3.2,2.2);c.fillStyle='rgba(16,16,18,1)';c.fillRect(d0[0],d0[1],d1[0]-d0[0],d1[1]-d0[1]);c.strokeStyle='rgba(255,255,255,.75)';c.strokeRect(d0[0],d0[1],d1[0]-d0[0],d1[1]-d0[1]);
  c.strokeStyle='rgba(255,255,255,.2)';for(let i=1;i<16;i++){const x=asNLerp(d0[0],d1[0],i/16);c.beginPath();c.moveTo(x,d0[1]);c.lineTo(x,d1[1]);c.stroke()}for(let j=1;j<6;j++){const y=asNLerp(d0[1],d1[1],j/6);c.beginPath();c.moveTo(d0[0],y);c.lineTo(d1[0],y);c.stroke()}
  // a few active channels on the die, synchronised with the pulses leaving the package
  const act=asNSmooth((p-.38)/.14);if(act>0){c.fillStyle='rgba(255,255,255,'+(.85*act)+')';for(let i=0;i<10;i++){const q=Math.floor(t*6+i*7.3)%96,cx=asNLerp(d0[0],d1[0],(q%16+.5)/16),cy=asNLerp(d0[1],d1[1],(Math.floor(q/16)+.5)/6);c.fillRect(cx-.08,cy-.04,.16,.08)}}
  // pads on the underside ring
  c.fillStyle='rgba(255,255,255,.6)';for(const th of NJ_THREADS){c.fillRect(th.p[0][0]-.13,th.p[0][1]-.1,.26,.2)}
  c.restore();
 }
 _threads(c,z,p,t){
  const px=1/z,vis=asNSmooth((z-3)/9);if(vis<=0)return;const dim=1-.86*asNSmooth((p-.72)/.2),sig=asNSmooth((p-.5)/.1)*(1-.55*asNSmooth((p-.78)/.16));
  c.lineCap='round';const w=Math.max(.55,Math.min(2,.085*z))*px;
  c.strokeStyle='rgba(225,225,225,'+(.62*vis*dim)+')';c.lineWidth=w;for(const th of NJ_THREADS){njPolyline(c,th.pts);c.stroke()}
  // electrode contacts near each tip, they flash as a pulse arrives
  for(const th of NJ_THREADS){const u=((t*th.speed+th.phase)%1+1)%1;for(let k=0;k<6;k++){const uu=.8+k*.035,q=njThreadAt(th,uu),hit=sig*Math.max(0,1-Math.abs(u-uu)*14);const a=(.42+.58*hit)*vis*Math.max(dim,hit);c.fillStyle='rgba(255,255,255,'+a+')';const s=.17+hit*.12;c.fillRect(q[0]-s,q[1]-s*.7,2*s,1.4*s)}}
  if(sig<=0)return;
  // pulses: a bright head with a short decaying tail, running from the package to the contacts
  c.save();c.globalCompositeOperation='lighter';
  for(const th of NJ_THREADS){const u=((t*th.speed+th.phase)%1+1)%1,tail=.09;for(let k=0;k<8;k++){const a=u-tail*k/8;if(a<0)break;const q=njThreadAt(th,a),f=(1-k/8);c.fillStyle='rgba(255,255,255,'+(sig*.5*f*f)+')';const r=Math.max(.9,Math.min(2.6,.12*z))*px*(1.25-k*.07);c.beginPath();c.arc(q[0],q[1],r,0,NJ_TAU);c.fill()}
   const q=njThreadAt(th,u),r=Math.max(2.2,Math.min(9,.4*z))*px;const gr=c.createRadialGradient(q[0],q[1],0,q[0],q[1],r);gr.addColorStop(0,'rgba(255,255,255,'+(.95*sig)+')');gr.addColorStop(.35,'rgba(255,255,255,'+(.35*sig)+')');gr.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=gr;c.beginPath();c.arc(q[0],q[1],r,0,NJ_TAU);c.fill()}
  c.restore();
 }
 _lattice(c,z,p,t,cam,W,H){
  const D=this._dots;if(!D)return;const F=NJ_FACE,spacing=F.step*z;const lod=asNSmooth((spacing-1.2)/2.2);if(lod<=0)return;
  // visible local-space bounds (camera rotation cancels the implant rotation at these zooms; pad generously)
  const ctr=[cam.x-NJ_IMPLANT.x,cam.y-NJ_IMPLANT.y],cl=[ctr[0]*NJ_IMPLANT.T[0]+ctr[1]*NJ_IMPLANT.T[1],ctr[0]*NJ_IMPLANT.N[0]+ctr[1]*NJ_IMPLANT.N[1]],hw=Math.hypot(W,H)/2/z+1;
  const face=asNSmooth((p-.66)/.24),wave=face*1.75,live=asNSmooth((p-.8)/.12),scan=((t*.11)%1)*1.3-.15;
  const buckets=new Array(18);for(let i=0;i<18;i++)buckets[i]=[];
  for(let i=0;i<D.n;i++){const x=D.X[i],y=D.Y[i];if(Math.abs(x-cl[0])>hw||Math.abs(y-cl[1])>hw)continue;
   const m=asNSmooth((wave-.75*D.D[i])/.55),front=face>0&&face<1?Math.max(0,1-Math.abs(wave-.75*D.D[i]-.18)*5)*.55:0;
   const lum=D.L[i],tissue=.16*D.M[i];
   // live-feed flicker: per-dot temporal noise plus a slow scan band; small enough that the face stays legible
   const fl=1+(.11*Math.sin(t*D.W[i]+D.P[i])+.06*Math.sin(t*D.W[i]*2.37+D.P[i]*1.7))*(.35+.65*live)+(.13*Math.exp(-Math.pow(((y-F.cy+F.h/2)/F.h-scan)*7,2)))*live;
   let b=asNLerp(tissue,lum,m)*fl+front*D.M[i];b*=lod;if(b<.025)continue;
   const r=spacing*asNLerp(.13,.12+.4*Math.sqrt(lum),m)*(1+front*.6);
   const bi=Math.min(17,Math.floor(asNClamp(b)*17.99));buckets[bi].push(x,y,Math.max(r,.45)/z)}
  for(let bi=0;bi<18;bi++){const arr=buckets[bi];if(!arr.length)continue;c.fillStyle='rgba(242,239,233,'+((bi+.5)/18).toFixed(3)+')';c.beginPath();for(let k=0;k<arr.length;k+=3){c.moveTo(arr[k]+arr[k+2],arr[k+1]);c.arc(arr[k],arr[k+1],arr[k+2],0,NJ_TAU)}c.fill()}
 }
 _disclaimer(c,W,H){const size=W<520?9:10,limit=W-32,words=AS_NEURAL_DISCLAIMER.split(' '),lines=[];c.setTransform(this._dpr,0,0,this._dpr,0,0);c.font=size+'px Inter,Arial,sans-serif';let line='';for(const w of words){const tr=line?line+' '+w:w;if(line&&c.measureText(tr).width>limit){lines.push(line);line=w}else line=tr}if(line)lines.push(line);c.textAlign='center';c.textBaseline='alphabetic';c.fillStyle='rgba(242,239,233,.42)';const y=H-14-(lines.length-1)*(size+4);lines.forEach((s,i)=>c.fillText(s,W/2,y+i*(size+4)))}
}
if(!customElements.get('as-stimulation-channels'))customElements.define('as-stimulation-channels',ASStimulationChannels);
if(!customElements.get('as-neural-journey'))customElements.define('as-neural-journey',ASNeuralJourney);
export { ASStimulationChannels, ASNeuralJourney, njCamera as neuralCameraAt };
