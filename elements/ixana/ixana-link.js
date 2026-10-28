/* Ixana wearable link. Original animation; company assets credited in sources.json. */
(()=>{
'use strict';
const scriptUrl=document.currentScript?.src||location.href;
const asset=(name)=>new URL('./assets/'+name,scriptUrl).href;
const W=1440,H=900,TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>t*t*(3-2*t);
function rounded(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);}
function label(c,s,x,y,size=13,color='#a0a0a0',align='left'){c.fillStyle=color;c.textAlign=align;c.font=size+'px ui-monospace,SFMono-Regular,Consolas,monospace';c.fillText(s,x,y);}
function line(c,pts,color='#777',width=1){c.beginPath();c.moveTo(pts[0][0],pts[0][1]);pts.slice(1).forEach(p=>c.lineTo(...p));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function dot(c,x,y,r=3,color='#fff'){c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=color;c.fill();}
function ring(c,x,y,r,color,width=1){c.beginPath();c.arc(x,y,r,0,TAU);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function bezier(p,t){let u=1-t;return [u*u*u*p[0][0]+3*u*u*t*p[1][0]+3*u*t*t*p[2][0]+t*t*t*p[3][0],u*u*u*p[0][1]+3*u*u*t*p[1][1]+3*u*t*t*p[2][1]+t*t*t*p[3][1]]}
class IxanaLink extends HTMLElement{
 static get observedAttributes(){return ['paused','mode','background','controls','stream-src','stream-cols','stream-rows','stream-frames','stream-fps'];}
 constructor(){super();this.attachShadow({mode:'open'});this._time=0;this._paused=false;this._mode='improved';this._frame=0;this._last=0;this._visible=true;this._pointer=[0,0];this._images={};this._stream=null;this._streamReady=Promise.resolve(false);this._streamError=false;this._reduced=matchMedia('(prefers-reduced-motion: reduce)');this.duration=12;this.shadowRoot.innerHTML='<style>:host{display:block;position:relative;background:#000;color:#fff;font-family:Arial,Helvetica,sans-serif;contain:content;width:100%;--as-border:#3c3c3c}*{box-sizing:border-box}.stage{width:100%;aspect-ratio:16/10;position:relative;background:#000;overflow:hidden}canvas{display:block;width:100%;height:100%;touch-action:pan-y}.controls{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:16px 20px 18px;border-top:1px solid #262626;font:11px ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.02em}.left{display:flex;gap:7px;align-items:center}button{font:inherit;letter-spacing:inherit;border:1px solid #444;color:#b8b8b8;background:#000;padding:8px 11px;cursor:pointer}button[aria-pressed=true]{background:#fff;border-color:#fff;color:#000}button:focus-visible{outline:2px solid #fff;outline-offset:4px}.status{color:#888;font-size:9px}.pause{min-width:75px}.sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}:host([controls=hidden]) .controls{display:none}@media(max-width:600px){.controls{padding:12px 10px;gap:8px}.status{display:none}button{font-size:10px;padding:8px}.left{gap:5px}}</style><div class="stage"><canvas role="img" aria-label="Animated illustration of video captured at smart glasses, transmitted through a body-coupled Wi-R link, and displayed on a smart watch"></canvas><p class="sr">A conceptual animated communication path follows the wearer from glasses to watch. Compare the documented prototype improvement from 4 to 13 frames per second. This is an illustration, not a measured electric field map.</p></div><div class="controls"><div class="left" role="group" aria-label="Compare prototype frame rates"><button data-mode="baseline" aria-pressed="false">4 fps / before</button><button data-mode="improved" aria-pressed="true">13 fps / after</button></div><span class="status" aria-live="polite">Prototype throughput illustration</span><button class="pause" aria-pressed="false" aria-label="Pause animation">Pause</button></div>';this._canvas=this.shadowRoot.querySelector('canvas');this._ctx=this._canvas.getContext('2d',{alpha:false});this._boundTick=this._tick.bind(this);this._onPreference=()=>{this._paused=this._reduced.matches;this._syncControls();this.renderAt(this._time)};}
 get canvas(){return this._canvas;}
 get currentTime(){return this._time;}
 get paused(){return this._paused;}
 get mode(){return this._mode;}
 set mode(v){this._mode=v==='baseline'?'baseline':'improved';this._syncControls();this.renderAt(this._time);}
 connectedCallback(){if(this._connected)return;this._connected=true;this._paused=this.hasAttribute('paused')||this._reduced.matches;this._mode=this.getAttribute('mode')==='baseline'?'baseline':'improved';if(!this._eventsBound){this._eventsBound=true;this.shadowRoot.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{this.mode=b.dataset.mode;this.dispatchEvent(new CustomEvent('modechange',{detail:{mode:this._mode,fps:this._mode==='baseline'?4:13},bubbles:true,composed:true}))}));this.shadowRoot.querySelector('.pause').addEventListener('click',()=>this._paused?this.play():this.pause());this._canvas.addEventListener('pointermove',e=>{const b=this._canvas.getBoundingClientRect();this._pointer=[(e.clientX-b.left)/b.width-.5,(e.clientY-b.top)/b.height-.5];if(this._paused)this.renderAt(this._time)},{passive:true});this._canvas.addEventListener('pointerleave',()=>{this._pointer=[0,0]},{passive:true});}this._resizeObserver=new ResizeObserver(()=>this._resize());this._resizeObserver.observe(this._canvas);this._intersectionObserver=new IntersectionObserver(e=>this._visible=e[0].isIntersecting);this._intersectionObserver.observe(this);this._reduced.addEventListener('change',this._onPreference);this._loadImage('person',this.getAttribute('person-src')||asset('person.webp'));this._loadImage('chip',this.getAttribute('chip-src')||asset('chip.webp'));if(this.getAttribute('stream-src'))this._loadStream(this.getAttribute('stream-src'));this._syncControls();this._resize();this._raf=requestAnimationFrame(this._boundTick);}
 disconnectedCallback(){this._connected=false;cancelAnimationFrame(this._raf);this._resizeObserver?.disconnect();this._intersectionObserver?.disconnect();this._reduced.removeEventListener('change',this._onPreference);}
 attributeChangedCallback(name,old,v){if(old===v)return;if(name==='paused'&&this._connected){v===null?this.play():this.pause()}if(name==='mode'){this.mode=v;}if(name==='stream-src'&&this._connected&&v)this._loadStream(v);if(name.startsWith('stream-')&&this._connected)this.renderAt(this._time);}
 _loadImage(name,src){const img=new Image();img.onload=()=>{this._images[name]=img;this.renderAt(this._time);this.dispatchEvent(new CustomEvent('assetready',{detail:{name},bubbles:true,composed:true}))};img.onerror=()=>{this.dispatchEvent(new CustomEvent('asseterror',{detail:{name,src},bubbles:true,composed:true}));this.renderAt(this._time)};img.src=src;}
 get streamReady(){return Boolean(this._stream);}
 get streamFrameSource(){return this._stream?.src||null;}
 setStreamSource(src,options={}){
 for(const [name,value] of Object.entries({cols:options.cols,rows:options.rows,frames:options.frames,fps:options.fps})){if(value!==undefined)this.setAttribute('stream-'+name,String(value));}
 this.setAttribute('stream-src',src);
 if(!this._connected)this._loadStream(src);
 return this._streamReady;
 }
 _loadStream(src){this._streamError=false;this._streamReady=new Promise(resolve=>{const img=new Image();if(/^https?:/.test(src)&&new URL(src,location.href).origin!==location.origin)img.crossOrigin='anonymous';img.onload=()=>{this._stream=img;this.renderAt(this._time);this.dispatchEvent(new CustomEvent('streamready',{detail:{src},bubbles:true,composed:true}));resolve(true)};img.onerror=()=>{this._stream=null;this._streamError=true;this.dispatchEvent(new CustomEvent('streamerror',{detail:{src},bubbles:true,composed:true}));resolve(false)};img.src=src;});return this._streamReady;}
 _streamFrame(c,qt){if(!this._stream)return false;const cols=Math.max(1,Number(this.getAttribute('stream-cols'))||12),rows=Math.max(1,Number(this.getAttribute('stream-rows'))||8),count=Math.min(cols*rows,Math.max(1,Number(this.getAttribute('stream-frames'))||cols*rows)),rate=Math.max(.1,Number(this.getAttribute('stream-fps'))||13),frame=Math.floor(qt*rate)%count,img=this._stream,fw=img.naturalWidth/cols,fh=img.naturalHeight/rows;
 const ratio=158/194,srcRatio=fw/fh;let sx=(frame%cols)*fw,sy=Math.floor(frame/cols)*fh,sw=fw,sh=fh;if(srcRatio>ratio){sw=fh*ratio;sx+=(fw-sw)/2}else{sh=fw/ratio;sy+=(fh-sh)/2}c.drawImage(img,sx,sy,sw,sh,-79,-97,158,194);return true;}
 _resize(){const b=this._canvas.getBoundingClientRect();const d=Math.min(devicePixelRatio||1,2);this._canvas.width=Math.max(1,Math.round(b.width*d));this._canvas.height=Math.max(1,Math.round(b.height*d));this.renderAt(this._time);}
 _syncControls(){if(!this.shadowRoot)return;this.shadowRoot.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===this._mode)));const b=this.shadowRoot.querySelector('.pause');b.textContent=this._paused?'Play':'Pause';b.setAttribute('aria-label',this._paused?'Play animation':'Pause animation');b.setAttribute('aria-pressed',String(this._paused));}
 pause(){this._paused=true;this._syncControls();return this;}
 play(){this._paused=false;this._last=0;this._syncControls();return this;}
 seek(seconds){this._time=Math.max(0,Number(seconds)||0);this._last=0;this.renderAt(this._time);return this;}
 _tick(now){this._raf=requestAnimationFrame(this._boundTick);const dt=this._last?Math.min(.05,(now-this._last)/1000):0;this._last=now;if(this._paused||!this._visible||document.hidden)return;this._time+=dt;this.renderAt(this._time);}
 async ready(){const pending=()=>!this._images.person||!this._images.chip;const start=performance.now();while(pending()&&performance.now()-start<10000)await new Promise(r=>setTimeout(r,50));if(this.getAttribute('stream-src'))await this._streamReady;return this;}
 renderAt(seconds){const c=this._ctx;if(!c)return this;this._time=Math.max(0,Number(seconds)||0);const cw=this._canvas.width,ch=this._canvas.height,k=Math.min(cw/W,ch/H);c.setTransform(1,0,0,1,0,0);c.fillStyle=this.getAttribute('background')||'#000';c.fillRect(0,0,cw,ch);c.translate((cw-W*k)/2,(ch-H*k)/2);c.scale(k,k);this._draw(c,this._time);return this;}
 _draw(c,t){
 const fps=this._mode==='baseline'?4:13;
 c.fillStyle='#000';c.fillRect(0,0,W,H);
 const img=this._images.person,chip=this._images.chip;
 const breathe=Math.sin(t*.45)*1.5;
 // Photograph is a public Ixana asset, converted to grayscale at render time.
 if(img){c.save();c.filter='grayscale(1) contrast(1.12)';c.drawImage(img,img.naturalWidth*.56,0,img.naturalWidth*.39,img.naturalHeight,470+this._pointer[0]*4,24+breathe,560,875);c.restore();const g=c.createLinearGradient(460,0,1030,0);g.addColorStop(0,'#000');g.addColorStop(.12,'#0000');g.addColorStop(.82,'#0000');g.addColorStop(1,'#000');c.fillStyle=g;c.fillRect(460,0,590,H);const bottom=c.createLinearGradient(0,780,0,900);bottom.addColorStop(0,'#0000');bottom.addColorStop(1,'#000');c.fillStyle=bottom;c.fillRect(430,780,650,120);}
 label(c,'IXANA / WEARABLE VIDEO',52,48,13,'#b6b6b6');
 label(c,'A BODY-COUPLED DATA PATH',1388,48,11,'#777','right');
 c.font='500 56px Arial,Helvetica,sans-serif';c.fillStyle='#fff';c.textAlign='left';c.fillText('A wireless',52,143);c.fillText('wire.',52,202);
 label(c,'CAMERA TO DISPLAY',54,243,11,'#888');
 // Camera closeup uses the same real company photograph.
 if(img){c.save();c.beginPath();c.roundRect(55,294,283,156,18);c.clip();c.filter='grayscale(1) contrast(1.22)';c.drawImage(img,img.naturalWidth*.647,img.naturalHeight*.192,img.naturalWidth*.168,img.naturalHeight*.147,55,294,283,156);c.restore();const g=c.createLinearGradient(55,294,55,450);g.addColorStop(0,'#0000');g.addColorStop(1,'#000b');c.fillStyle=g;c.fillRect(55,294,283,156);}
 label(c,'01',55,480,11,'#707070');label(c,'CAPTURE',86,480,13,'#fff');label(c,'Glasses / camera + encoding',55,508,12,'#aaa');
 // Header-to-wrist route follows the physical wearer rather than radiating in space.
 const pathA=[[694,208],[730,255],[777,273],[805,348]];
 const pathB=[[805,348],[840,447],[856,560],[849,686]];
 const pathC=[[849,686],[921,714],[978,618],[1080,557]];
 const paths=[pathA,pathB,pathC];
 c.save();c.setLineDash([2,8]);paths.forEach(p=>{c.beginPath();c.moveTo(...p[0]);c.bezierCurveTo(...p[1],...p[2],...p[3]);c.strokeStyle='#777';c.lineWidth=1.2;c.stroke()});c.restore();
 for(let i=0;i<24;i++){const q=((t*.25+i/24)%1),pi=Math.min(2,Math.floor(q*3)),s=(q*3)%1;const p=bezier(paths[pi],s);const a=.35+.65*Math.pow(Math.sin(q*Math.PI),2);c.save();c.globalAlpha=a;c.shadowColor='#fff';c.shadowBlur=7;dot(c,p[0],p[1],i%4===0?2.5:1.45);c.restore();}
 [[694,208],[849,686],[1080,557]].forEach((p,i)=>{const pulse=(t*.5+i*.34)%1;ring(c,...p,8,'#fff',1.2);ring(c,...p,12+pulse*18,'rgba(255,255,255,'+((1-pulse)*.35)+')');dot(c,...p,2)});
 line(c,[[338,365],[418,365],[555,235],[684,208]],'#757575',.9);
 line(c,[[860,370],[961,267],[1054,267]],'#777',.9);
 label(c,'02',1068,254,11,'#707070');label(c,'TRANSMIT',1098,254,13,'#fff');
 label(c,'Localized electric field',1068,285,12,'#aaa');
 label(c,'Camera > FPGA > MCU',1068,311,11,'#777');
 label(c,'Wi-R > MCU > FPGA > AMOLED',1068,335,11,'#777');
 // Detailed AMOLED receiving watch, a stylized render, not claimed product CAD.
 this._watch(c,t,fps,1175,605);
 label(c,'03',1053,790,11,'#707070');label(c,'DISPLAY',1084,790,13,'#fff');
 label(c,'Watch / display-driver firmware',1053,818,12,'#aaa');
 // A live throughput strip makes the effect of 4 vs 13 fps visible.
 line(c,[[55,578],[348,578]],'#4b4b4b',1);
 label(c,'PROTOTYPE IMPROVEMENT',55,611,10,'#777');
 c.font='400 59px Arial,Helvetica,sans-serif';c.fillStyle='#fff';c.textAlign='left';c.fillText(String(fps),52,685);
 label(c,'frames / second',135,681,12,'#aaa');
 for(let i=0;i<13;i++){const active=i<fps;const p=(Math.floor(t*fps)+i)%13;const a=active?(p===0?1:.35):.08;c.fillStyle='rgba(255,255,255,'+a+')';c.fillRect(55+i*21.3,716,14,34);}
 label(c,this._mode==='baseline'?'BEFORE / 4 FPS':'AFTER / 13 FPS',55,777,12,'#fff');
 label(c,this._mode==='baseline'?'Power baseline':'8% lower power',55,807,14,'#aaa');
 label(c,'Documented prototype results',55,835,10,'#555');
 label(c,'ORIGINAL COMPANY IMAGERY / ANIMATED CONCEPTUAL LINK',52,876,9,'#555');
 label(c,'NOT A MEASURED FIELD MAP',1388,876,9,'#555','right');
 }
 _watch(c,t,fps,x,y){
 c.save();c.translate(x,y);c.rotate(-.12+Math.sin(t*.4)*.015);
 // Strap, fastener slots, and polished layered watch bezel.
 let strap=c.createLinearGradient(-48,0,48,0);strap.addColorStop(0,'#111');strap.addColorStop(.45,'#383838');strap.addColorStop(1,'#0d0d0d');c.fillStyle=strap;rounded(c,-45,-202,90,405,25);c.fill();c.strokeStyle='#555';c.lineWidth=.8;c.stroke();for(let i=0;i<5;i++){rounded(c,-13,115+i*15,26,6,3);c.fillStyle='#090909';c.fill();}
 c.shadowBlur=34;c.shadowColor='#000';c.fillStyle='#333';rounded(c,-102,-120,204,240,52);c.fill();c.shadowBlur=0;
 let metal=c.createLinearGradient(-105,-115,100,105);metal.addColorStop(0,'#aaa');metal.addColorStop(.22,'#222');metal.addColorStop(.5,'#777');metal.addColorStop(.74,'#151515');metal.addColorStop(1,'#ccc');c.fillStyle=metal;rounded(c,-100,-118,200,236,50);c.fill();c.fillStyle='#070707';rounded(c,-92,-110,184,220,44);c.fill();c.strokeStyle='#777';c.lineWidth=.7;c.stroke();
 c.fillStyle='#888';rounded(c,100,-30,9,37,4);c.fill();c.strokeStyle='#ddd';c.lineWidth=1;c.beginPath();c.moveTo(104,-23);c.lineTo(104,0);c.stroke();
 c.save();rounded(c,-79,-97,158,194,34);c.clip();c.fillStyle='#0a0a0a';c.fillRect(-79,-97,158,194);
 const qt=Math.floor(t*fps)/fps,scroll=qt*30;
 // Original colour footage is supplied as a deterministic frame atlas.
 const realFootage=this._streamFrame(c,qt);
 if(!realFootage){
  // Colour is confined to the AMOLED display. Fallback is explicitly illustrative.
  let sky=c.createLinearGradient(0,-97,0,75);sky.addColorStop(0,'#63a9ce');sky.addColorStop(.5,'#d5bc8c');sky.addColorStop(1,'#26454c');c.fillStyle=sky;c.fillRect(-79,-97,158,194);
  c.fillStyle='#263f46';c.beginPath();c.moveTo(-79,2);c.lineTo(-55,-45);c.lineTo(-31,0);c.lineTo(-10,-62);c.lineTo(24,-1);c.lineTo(42,-34);c.lineTo(79,12);c.lineTo(79,97);c.lineTo(-79,97);c.fill();
  c.fillStyle='#3c634e';c.beginPath();c.moveTo(-79,30);c.lineTo(-47,0);c.lineTo(-18,23);c.lineTo(17,-3);c.lineTo(79,31);c.lineTo(79,97);c.lineTo(-79,97);c.fill();
  c.strokeStyle='#98bec2';c.lineWidth=.6;for(let i=0;i<6;i++){let yy=(i*25+scroll)%150-20;c.beginPath();c.moveTo(-79,yy+20);c.lineTo(79,yy+7);c.stroke();}
  c.fillStyle='#e9b68c';c.globalAlpha=.9;c.beginPath();c.arc(-40+Math.sin(qt*.85)*34,18,6,0,TAU);c.fill();c.fillStyle='#d8945c';c.fillRect(-45+Math.sin(qt*.85)*34,24,10,24);c.globalAlpha=1;
 }
 c.fillStyle='#000a';c.fillRect(-79,-97,158,25);label(c,(realFootage?'DEMO':'ILLUSTRATIVE')+' / '+fps+' FPS',0,-78,7.5,'#fff','center');
 c.fillStyle='#ffffff30';const scan=-97+((t*.25)%1)*194;c.fillRect(-79,scan,158,1);
 c.restore();c.strokeStyle='#ffffff55';c.lineWidth=.8;rounded(c,-79,-97,158,194,34);c.stroke();c.restore();
 }
}
if(!customElements.get('as-ixana-link'))customElements.define('as-ixana-link',IxanaLink);
})();
