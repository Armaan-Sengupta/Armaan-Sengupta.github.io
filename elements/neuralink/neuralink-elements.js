/* Standalone monochrome portfolio elements. Conceptual illustrations, no clinical dosing. */
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
class ASNeuralJourney extends ASNeuralBase{
 static get observedAttributes(){return ['portrait-src','head-src','implant-src']}
 constructor(){super();this._portrait=null;this._head=null;this._implant=null;this._points=this.makePoints();this._faceCanvas=document.createElement('canvas');this._faceCanvas.width=360;this._faceCanvas.height=420;this._faceCtx=this._faceCanvas.getContext('2d',{willReadFrequently:true});this.makeFace();}
 connectedCallback(){super.connectedCallback();this.readyPromise=this.loadAssets();this.ready=this.readyPromise;this._canvas.setAttribute('aria-label','Cinematic conceptual animation moving from a human head into an implant and threads, showing biphasic stimulation propagation, then a low-resolution phosphene portrait with denser central sampling.');}
 attributeChangedCallback(){if(this.isConnected){this.readyPromise=this.loadAssets();this.ready=this.readyPromise}}
 get duration(){return 20}
 async loadAssets(){const base=new URL('./assets/',import.meta.url);await Promise.all([['portrait-src','_portrait','woman-reference.jpg'],['head-src','_head',null],['implant-src','_implant',null]].map(([attr,key,fallback])=>new Promise(resolve=>{const url=this.getAttribute(attr)||(fallback?new URL(fallback,base).href:null);if(!url){resolve();return}const img=new Image();img.crossOrigin="anonymous";img.onload=()=>{this[key]=img;if(key==='_portrait')this.makeFace();this.render();resolve()};img.onerror=()=>resolve();img.src=url})));return this;}
 makeFace(){const c=this._faceCtx,w=360,h=420;c.fillStyle='#030303';c.fillRect(0,0,w,h);if(this._portrait){const im=this._portrait,ratio=Math.max(w/im.width,h/im.height),dw=im.width*ratio,dh=im.height*ratio;c.filter='grayscale(1) contrast(1.2)';c.drawImage(im,(w-dw)/2,(h-dh)/2,dw,dh);c.filter='none';}else{
   // Smooth luminance portrait, sampled only as a conceptual low-resolution mask.
   let g=c.createRadialGradient(170,195,15,180,210,195);g.addColorStop(0,'#888');g.addColorStop(.7,'#151515');g.addColorStop(1,'#000');c.fillStyle=g;c.fillRect(0,0,w,h);
   c.fillStyle='#0a0a0a';c.beginPath();c.ellipse(180,185,121,166,0,0,Math.PI*2);c.fill();
   g=c.createRadialGradient(154,165,12,184,200,130);g.addColorStop(0,'#ededed');g.addColorStop(.56,'#a5a5a5');g.addColorStop(1,'#353535');c.fillStyle=g;c.beginPath();c.moveTo(112,109);c.bezierCurveTo(113,62,238,63,254,126);c.bezierCurveTo(270,201,252,267,208,302);c.bezierCurveTo(180,321,140,298,116,260);c.bezierCurveTo(93,215,98,154,112,109);c.fill();
   c.save();c.filter='blur(4px)';c.fillStyle='#333';c.beginPath();c.ellipse(143,174,25,8,-.08,0,Math.PI*2);c.ellipse(219,174,26,8,.05,0,Math.PI*2);c.fill();c.fillStyle='#111';c.beginPath();c.ellipse(146,174,9,5,0,0,Math.PI*2);c.ellipse(216,174,9,5,0,0,Math.PI*2);c.fill();c.fillStyle='#fff';c.beginPath();c.ellipse(177,205,8,25,-.08,0,Math.PI*2);c.fill();c.fillStyle='#555';c.beginPath();c.ellipse(193,215,8,18,-.2,0,Math.PI*2);c.fill();c.fillStyle='#222';c.beginPath();c.ellipse(183,256,34,6,0,0,Math.PI*2);c.fill();c.fillStyle='#c7c7c7';c.beginPath();c.ellipse(183,266,24,4,0,0,Math.PI*2);c.fill();c.restore();
   c.fillStyle='#0b0b0b';c.beginPath();c.moveTo(109,129);c.bezierCurveTo(100,70,144,32,200,50);c.bezierCurveTo(257,42,279,111,257,161);c.bezierCurveTo(245,117,226,109,203,104);c.bezierCurveTo(160,127,140,125,109,129);c.fill();c.fillStyle='#444';c.beginPath();c.moveTo(157,298);c.lineTo(145,345);c.lineTo(106,365);c.lineTo(268,365);c.lineTo(220,344);c.lineTo(209,299);c.fill();
  }this._faceData=c.getImageData(0,0,w,h).data;}
 makePoints(){let p=[];const golden=2.399963229728653;for(let i=0;i<2250;i++){const u=(i+.5)/2250,r=Math.pow(u,.69),angle=i*golden,jitter=.003+.008*r;p.push({x:Math.cos(angle)*r+Math.sin(i*127.1)*jitter,y:Math.sin(angle)*r+Math.cos(i*311.7)*jitter,r,phase:(Math.sin(i*74.31)+1)*.5})}return p;}
 head(c,t,alpha=1){
  c.save();c.globalAlpha*=alpha;const reveal=asNSeg(t,1.7,4.5),contextOut=1-asNSeg(t,5.4,8);
  c.save();c.globalAlpha*=(1-reveal*.87)*contextOut;
  if(this._head){c.filter='grayscale(1) contrast(1.15)';const im=this._head,scale=Math.min(500/im.width,490/im.height);c.drawImage(im,575-im.width*scale/2,335-im.height*scale/2,im.width*scale,im.height*scale);c.filter='none';}
  else{let g=c.createLinearGradient(410,200,720,400);g.addColorStop(0,'#070707');g.addColorStop(.45,'#333');g.addColorStop(.7,'#151515');g.addColorStop(1,'#030303');c.fillStyle=g;c.strokeStyle='#aaa';c.lineWidth=1.2;c.beginPath();c.moveTo(508,559);c.lineTo(519,488);c.bezierCurveTo(467,465,442,418,450,367);c.lineTo(424,348);c.lineTo(447,311);c.bezierCurveTo(447,265,454,230,475,204);c.bezierCurveTo(510,153,604,138,675,175);c.bezierCurveTo(740,211,764,281,747,354);c.bezierCurveTo(738,410,699,457,667,483);c.lineTo(678,559);c.closePath();c.fill();c.stroke();asNCurve(c,[459,313,471,296,481,300,488,306],'#727272',1);asNCurve(c,[447,369,459,376,464,373,468,375],'#777',1);asNCurve(c,[454,390,465,393,472,389,482,389],'#777',1);c.beginPath();c.ellipse(651,341,18,29,-.15,0,Math.PI*2);c.strokeStyle='#666';c.stroke();asNCurve(c,[652,325,631,326,635,355,651,353],'#555',1);asNCurve(c,[679,481,630,471,614,481,589,501],'#444',1);for(let i=0;i<13;i++)asNCurve(c,[499+i*10,190+i*1.5,457+i*14,251,498+i*11,346,533+i*9,407],'#ffffff08',1)}
  c.restore();
  c.save();c.globalAlpha*=asNLerp(.09,.9,reveal)*contextOut;let g=c.createRadialGradient(585,274,10,585,283,154);g.addColorStop(0,'#292929');g.addColorStop(1,'#030303');c.fillStyle=g;c.beginPath();c.ellipse(590,277,132,102,-.11,0,Math.PI*2);c.fill();c.strokeStyle='#666';c.stroke();c.save();c.beginPath();c.ellipse(590,277,132,102,-.11,0,Math.PI*2);c.clip();for(let row=0;row<9;row++)for(let col=0;col<8;col++){let x=474+col*32+(row%2)*12,y=187+row*23;asNCurve(c,[x,y,x+40,y-28,x-14,y+42,x+32,y+24],'#888',1.3);asNCurve(c,[x+3,y+3,x+43,y-25,x-11,y+45,x+35,y+27],'#151515',2.5)}c.restore();c.restore();
  c.restore();
 }
 cameraScene(c,t,alpha=1){
  const camera=neuralCameraAt(t);c.save();c.globalAlpha*=alpha;c.translate(600,315);c.scale(camera.zoom,camera.zoom);c.translate(-camera.x,-camera.y);
  this.head(c,t);
  // The implant and every thread are one fixed model, visible from the first frame.
  // Camera motion, rather than a dissolve or model swap, enlarges the package and follows the threads.
  c.save();c.translate(634,205);c.scale(28/159,28/159);c.translate(-600,-190);this.implant(c,t);c.restore();
  c.restore();
 }
 implant(c,t,alpha=1){c.save();c.globalAlpha*=alpha;
   // Circular package in perspective, followed by individually curved thin threads.
   const cx=600,cy=190,rx=159,ry=56;c.save();c.translate(cx,cy);let g=c.createLinearGradient(-rx,-ry,rx,ry);g.addColorStop(0,'#f0f0f0');g.addColorStop(.35,'#888');g.addColorStop(.62,'#ddd');g.addColorStop(1,'#555');c.fillStyle='#303030';c.beginPath();c.ellipse(0,20,rx,ry,0,0,Math.PI);c.lineTo(-rx,0);c.ellipse(0,0,rx,ry,0,Math.PI,Math.PI*2);c.closePath();c.fill();c.strokeStyle='#bbb';c.stroke();c.fillStyle=g;c.beginPath();c.ellipse(0,0,rx,ry,0,0,Math.PI*2);c.fill();c.strokeStyle='#fff';c.stroke();c.beginPath();c.ellipse(0,-1,rx-13,ry-7,0,0,Math.PI*2);c.strokeStyle='#555';c.stroke();for(let k=0;k<40;k++){const a=k/40*Math.PI*2;asNLine(c,[[Math.cos(a)*(rx-20),Math.sin(a)*(ry-10)],[Math.cos(a)*(rx-8),Math.sin(a)*(ry-4)]],'#555',1)}c.fillStyle='#333';c.fillRect(-35,-12,70,25);c.strokeStyle='#ccc';c.strokeRect(-35,-12,70,25);for(let i=0;i<7;i++){asNLine(c,[[-30+i*10,-11],[-30+i*10,13]],'#888',.7)}c.restore();
   const threadCount=10;for(let i=0;i<threadCount;i++){const a=(i-(threadCount-1)/2)/((threadCount-1)/2),sx=cx+a*125,ex=cx+a*260,yEnd=520+(1-Math.abs(a))*20,p=[sx,cy+35,sx-a*25,300,ex-a*10,400,ex,yEnd];const width=1.2+(1-Math.abs(a))*.5;asNCurve(c,p,'#333',width+5);asNCurve(c,p,'#bbb',width);for(let j=0;j<10;j++){const q=asNCubic(p,.65+j*.032);asNCircle(c,q[0],q[1],1.6,'#888')}const count=2;for(let j=0;j<count;j++){const u=((t*1.05-i*.093+j*.5)%1+1)%1;const q=asNCubic(p,u);c.save();c.shadowBlur=15;c.shadowColor='#fff';asNCircle(c,q[0],q[1],2.9,'#fff');const q0=asNCubic(p,Math.max(0,u-.06));asNLine(c,[q0,q],'#fff',2);c.restore();}}
   c.restore();
 }
 pulse(c,t,alpha){c.save();c.globalAlpha*=alpha;const left=840,right=1110,top=230;for(let k=0;k<4;k++){const yy=top+k*48,points=[];for(let x=left;x<=right;x+=.7){const q=((x-left)/(right-left)*1.6+t*.8+k*.29)%1;let a=0;if(q<.075)a=-1;else if(q>.095&&q<.17)a=1;points.push([x,yy+a*14])}asNLine(c,[[left,yy],[right,yy]],'#292929',.8);asNLine(c,points,k===1?'#fff':'#999',1.2)}c.restore();}
 vision(c,t,alpha){
  c.save();c.globalAlpha*=alpha;const x=600,y=325,s=280,form=asNSeg(t,13.5,16.8),fade=asNSeg(t,12.8,15.3),data=this._faceData;
  for(const p of this._points){const nx=p.x,ny=p.y,driftX=Math.sin(t*.61)*.38,driftY=Math.cos(t*.47)*.28,px=asNClamp((nx*.5+.5)*359+driftX,0,358.999),py=asNClamp((ny*.5+.5)*419+driftY,0,418.999),ix=Math.floor(px),iy=Math.floor(py),fx=px-ix,fy=py-iy;
   const luminance=(xx,yy)=>{const i=(yy*360+xx)*4;return (data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722)/255};
   let lum=asNLerp(asNLerp(luminance(ix,iy),luminance(ix+1,iy),fx),asNLerp(luminance(ix,iy+1),luminance(ix+1,iy+1),fx),fy);lum=Math.pow(lum,.9);
   const edge=1-asNSmooth((p.r-.78)/.22),temporalGain=.945+.031*Math.sin(t*1.43+p.phase*6.283)+.017*Math.sin(t*2.17+p.phase*19.7),radius=asNLerp(1.5,2.7,p.r)*(.45+lum*.75),brightness=asNClamp((lum*form+(1-form)*(.15+p.phase*.25))*edge*fade*temporalGain);
   if(brightness<.035)continue;c.fillStyle='rgba(255,255,255,'+brightness.toFixed(4)+')';c.beginPath();c.ellipse(x+nx*s*.78,y+ny*s,radius,radius,0,0,Math.PI*2);c.fill();
  }c.restore();
 }
 draw(c,t){
  const worldAlpha=1-asNSeg(t,13.2,15.8),pulseAlpha=asNSeg(t,9.6,10.7)*(1-asNSeg(t,13.3,14.6)),visionAlpha=asNSeg(t,12.9,15.2);
  if(worldAlpha>.001)this.cameraScene(c,t,worldAlpha);
  if(pulseAlpha>.001)this.pulse(c,t,pulseAlpha);
  if(visionAlpha>.001)this.vision(c,t,visionAlpha);
 }
}
if(!customElements.get('as-stimulation-channels'))customElements.define('as-stimulation-channels',ASStimulationChannels);
if(!customElements.get('as-neural-journey'))customElements.define('as-neural-journey',ASNeuralJourney);
export { ASStimulationChannels, ASNeuralJourney, neuralCameraAt };
