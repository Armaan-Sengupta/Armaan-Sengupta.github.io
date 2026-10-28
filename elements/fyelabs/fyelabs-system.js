// FYELABS source-anchored sensing explainer. Enclosure images are original public
// project media. Sensor positions/returns are a reduced illustration, not CAD or telemetry.
const DURATION=15;
const CAD_URL='https://static.wixstatic.com/media/13b95a_3198825e7c0e466098f4ce7edf954102~mv2.png';
const PHOTO_URL='https://static.wixstatic.com/media/13b95a_7a03eb6f6c6d4584917a841db9c7f116~mv2.jpg';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x)};
const fract=x=>x-Math.floor(x);
const hash=x=>fract(Math.sin(x*127.1+311.7)*43758.5453);
const COLORS={background:'#000000',white:'#edf0f2',silver:'#9da5ad',muted:'#81868a',dust:'#b28c58',dustDim:'#69543a',obstacle:'#729ab6',blueDim:'#365064',line:'#262c31'};
function text(c,s,x,y,size=16,color=COLORS.muted,align='left',family='Arial'){c.font=size+'px '+family;c.textAlign=align;c.fillStyle=color;c.fillText(s,x,y)}
function line(c,a,b,col=COLORS.line,w=1){c.beginPath();c.moveTo(...a);c.lineTo(...b);c.strokeStyle=col;c.lineWidth=w;c.stroke()}
function circle(c,x,y,r,fill,stroke){c.beginPath();c.arc(x,y,r,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.stroke()}}
function rect(c,x,y,w,h,fill,stroke,r=0){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.stroke()}}
function poly(c,ps,fill,stroke){c.beginPath();ps.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.stroke()}}
function fitImage(c,image,x,y,w,h){const scale=Math.min(w/image.naturalWidth,h/image.naturalHeight),iw=image.naturalWidth*scale,ih=image.naturalHeight*scale;c.drawImage(image,x+(w-iw)/2,y+(h-ih)/2,iw,ih)}
function loadImage(url){if(!url||url==='none')return Promise.resolve(null);return new Promise(resolve=>{const img=new Image();img.crossOrigin='anonymous';let done=false;const finish=value=>{if(done)return;done=true;clearTimeout(timer);resolve(value)};const timer=setTimeout(()=>finish(null),8000);img.onload=()=>finish(img);img.onerror=()=>finish(null);img.src=url})}

export function fyelabsReturnAt(channel,time,dustLevel=.45){
  const angle=(-58+116*channel/9)*Math.PI/180;
  // A static obstacle spans a finite angular region; all sensors remain fixed.
  const zAtFace=480*Math.tan(angle),hit=Math.abs(zAtFace)<=195;
  const obstacleRange=hit?480/Math.cos(angle):null;
  // Deterministic short-lived near returns illustrate dust. They are not tuned filters.
  const pulse=fract(time*.82+hash(channel+12));
  const dustPresent=hash(channel+Math.floor(time*.82)*23)<dustLevel&&pulse<.62;
  const dustRange=115+hash(channel*7+Math.floor(time*.82))*160;
  return {angle,obstacleRange,dustPresent,dustRange,rawRange:dustPresent?dustRange:obstacleRange};
}

export class FyelabsRenderer{
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.time=0;this.dustLevel=.45;this.filtersEnabled=true;this.images={cad:null,photo:null};this.width=1200;this.height=760;this.resize(1200,760)}
  resize(w,h){this.width=Math.max(1,w);this.height=Math.max(1,h);this.dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=this.width*this.dpr;this.canvas.height=this.height*this.dpr;this.renderAt(this.time)}
  renderAt(time){this.time=clamp(Number(time)||0,0,DURATION);const c=this.ctx;if(!c)return;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#000';c.fillRect(0,0,this.width,this.height);const k=Math.min(this.width/1200,this.height/760);c.translate((this.width-1200*k)/2,(this.height-760*k)/2);c.scale(k,k);this.draw(c,this.time)}
  draw(c,t){
    c.lineCap='round';c.lineJoin='round';
    const reveal=ease((t-3.2)/1.4);
    text(c,'FYELABS / TRUCK BACKUP SAFETY',60,53,12,'#90979c','left','monospace');
    text(c,t<3.4?'Sensing, built for a harsh environment.':'Keep the obstacle. Reject the dust.',60,99,32,COLORS.white);
    if(reveal<1){c.save();c.globalAlpha=1-reveal;this.drawHero(c,t);c.restore()}
    if(reveal>0){c.save();c.globalAlpha=reveal;this.drawArray(c,t);c.restore()}
    // A quiet progress rule makes the one-cycle narrative readable when embedded.
    line(c,[60,725],[1140,725],'#24292d',1);line(c,[60,725],[60+1080*t/DURATION,725],'#8b959e',1.5);
    text(c,'ENCLOSURE',60,748,10,t<3.4?'#d2d8dc':'#5e666c','left','monospace');text(c,'FIXED SENSOR ARRAY',370,748,10,t>=3.4&&t<7?'#d2d8dc':'#5e666c','left','monospace');text(c,'PARALLEL FILTERS',730,748,10,t>=7&&t<11?'#d2d8dc':'#5e666c','left','monospace');text(c,'RETAINED OBSTACLE',1140,748,10,t>=11?'#d2d8dc':'#5e666c','right','monospace');
  }
  drawHero(c,t){
    const photoMix=ease((t-1.9)/.7),cad=this.images.cad,photo=this.images.photo;
    rect(c,60,139,765,484,'#080a0c','#24292e',2);
    c.save();c.beginPath();c.rect(62,141,761,480);c.clip();
    const zoom=1+ease(t/3.5)*.055;c.translate(442,380);c.scale(zoom,zoom);c.translate(-442,-380);
    if(cad){c.save();c.globalAlpha=photo?1-photoMix:1;fitImage(c,cad,83,160,720,440);c.restore()}
    if(photo){c.save();c.globalAlpha=cad?photoMix:1;fitImage(c,photo,83,160,720,440);c.restore()}
    if(!cad&&!photo)this.drawConceptCase(c,420,395,1.5);
    c.restore();
    const sourceLabel=!cad&&!photo?'ENCLOSURE CONCEPT / ORIGINAL IMAGE UNAVAILABLE':photo&&photoMix>.5?'ORIGINAL MANUFACTURED CASE PHOTO':'ORIGINAL ACTUATING-CASE CAD';
    text(c,sourceLabel,60,651,11,'#858e95','left','monospace');
    text(c,'10',880,236,62,COLORS.white);text(c,'fixed LiDAR sensors',880,268,18,'#aab1b7');
    text(c,'5',880,382,62,COLORS.white);text(c,'parallel dust filters',880,414,18,'#aab1b7');
    line(c,[880,470],[1140,470],'#333a40');text(c,'Distance + return flux',880,507,18,'#c2c8cd');
    text(c,'A protected sensor suite,',880,552,16,'#818a91');text(c,'with filtering informed by',880,579,16,'#818a91');text(c,'experimental dust data.',880,606,16,'#818a91');
  }
  drawConceptCase(c,x,y,s){c.save();c.translate(x,y);c.scale(s,s);poly(c,[[-140,-53],[-30,-104],[140,-65],[28,-9]],'#343b40','#9ca5ad');poly(c,[[-140,-53],[28,-9],[28,95],[-140,45]],'#171d22','#69747e');poly(c,[[28,-9],[140,-65],[140,40],[28,95]],'#282f35','#7e8992');for(let j=0;j<5;j++){const px=-113+j*27,py=-20+j*8;circle(c,px,py,8,'#07090b','#a9b2b9');circle(c,px,py,3,'#476176');}for(let j=0;j<5;j++)circle(c,56+j*15,7-j*8,6,'#080b0e','#747e87');line(c,[-130,30],[15,72],'#505a62');c.restore()}
  world(x,z){return [250+x,420+z*.49]}
  drawArray(c,t){
    const showFilters=ease((t-7)/1.2),showOutput=ease((t-10.4)/1.4),filterOn=this.filtersEnabled;
    const origin=this.world(0,0);
    // The array is fixed. The travelling light only illustrates return timing.
    for(let r=160;r<=640;r+=120){c.save();c.strokeStyle='#1b2228';c.lineWidth=1;c.beginPath();for(let j=0;j<=100;j++){const a=(-61+j*1.22)*Math.PI/180,p=this.world(Math.cos(a)*r,Math.sin(a)*r);j?c.lineTo(...p):c.moveTo(...p)}c.stroke();c.restore()}
    for(let i=0;i<10;i++){const a=(-58+116*i/9)*Math.PI/180;line(c,this.world(Math.cos(a)*80,Math.sin(a)*80),this.world(Math.cos(a)*640,Math.sin(a)*640),'#162028')}
    // Finite persistent target in the simplified ground plane.
    const near=this.world(480,-195),far=this.world(575,195),depth=32;
    c.save();c.globalAlpha=.7+showOutput*.3;poly(c,[[near[0],near[1]],[far[0],near[1]+depth],[far[0],far[1]],[near[0],far[1]-depth]],'#111c24','#46647b');poly(c,[[near[0],near[1]],[near[0]+20,near[1]-22],[far[0]+20,near[1]+depth-22],[far[0],near[1]+depth]],'#22333f','#5a788d');line(c,[near[0],near[1]],[near[0],far[1]-depth],'#7396ad',2);c.restore();
    const count=Math.round(this.dustLevel*75);
    for(let i=0;i<count;i++){
      const life=fract(t*.36+hash(i+70)),angle=(-55+110*hash(i*3+2))*Math.PI/180,r=120+220*hash(i*5+3)+(life-.5)*32;
      const p=this.world(Math.cos(angle)*r,Math.sin(angle)*r),opacity=(.12+.3*Math.sin(life*Math.PI))*(filterOn?1-.68*showFilters:1);
      c.save();c.globalAlpha=opacity;circle(c,...p,1.5+hash(i+6)*2,COLORS.dust);c.restore();
    }
    for(let i=0;i<10;i++){
      const ret=fyelabsReturnAt(i,t,this.dustLevel),a=ret.angle,emitter=this.world(Math.cos(a)*70,Math.sin(a)*70),farRange=(filterOn&&showFilters>.5?ret.obstacleRange:ret.rawRange)??640,end=this.world(Math.cos(a)*farRange,Math.sin(a)*farRange);
      c.save();c.translate(...emitter);c.rotate(a*.38);rect(c,-8,-5,16,10,'#515b64','#9ca6af',2);rect(c,3,-3,5,6,'#172b3b','#6f8c9e',1);c.restore();
      text(c,String(i+1).padStart(2,'0'),emitter[0]-21,emitter[1]+4,8,'#77818a','right','monospace');
      const wave=fract(t*.65+i*.07),pulseRange=70+(farRange-70)*wave,pulse=this.world(Math.cos(a)*pulseRange,Math.sin(a)*pulseRange);
      line(c,emitter,end,ret.obstacleRange?'#375263':'#202a31',ret.obstacleRange?1.4:1);circle(c,...pulse,1.8,'#a4bac8');
      if(ret.obstacleRange){c.save();c.globalAlpha=ret.dustPresent&&(!filterOn||showFilters<.5)?.22:1;const hit=this.world(Math.cos(a)*ret.obstacleRange,Math.sin(a)*ret.obstacleRange);circle(c,...hit,4.5,COLORS.obstacle);circle(c,...hit,8.5,null,'#4a6c83');c.restore();}
      if(ret.dustPresent){const p=this.world(Math.cos(a)*ret.dustRange,Math.sin(a)*ret.dustRange);c.save();c.globalAlpha=filterOn?1-showFilters*.77:1;circle(c,...p,5,COLORS.dust);circle(c,...p,9,null,COLORS.dustDim);c.restore();if(filterOn&&showFilters>.5){line(c,[p[0]-3,p[1]-3],[p[0]+3,p[1]+3],COLORS.dustDim);line(c,[p[0]+3,p[1]-3],[p[0]-3,p[1]+3],COLORS.dustDim)}}
    }
    // Reduced electronics enclosure anchors the array, not an exact hardware geometry.
    rect(c,110,355,122,130,'#141a20','#737f88',8);rect(c,119,365,104,111,'#20282f','#4d5c67',4);for(let i=0;i<3;i++)line(c,[132,392+i*23],[210,392+i*23],'#46535e',2);text(c,'LiDAR',171,446,16,'#aeb9c1','center');
    line(c,[232,420],[origin[0]+45,420],'#8797a4',2);
    text(c,'10 FIXED DIRECTIONS',65,211,15,'#c1cbd2','left','monospace');
    text(c,'Reduced sensor illustration / not to scale',65,238,12,'#727f89');
    text(c,'PERSISTENT',865,359,13,COLORS.obstacle,'left','monospace');text(c,'OBSTACLE',865,382,13,COLORS.obstacle,'left','monospace');
    text(c,'SHORT-LIVED',390,319,12,COLORS.dust,'left','monospace');text(c,'NEAR RETURNS',390,340,12,COLORS.dust,'left','monospace');
    // Parallel processing lanes communicate structure without inventing filter thresholds.
    if(showFilters>0){c.save();c.globalAlpha=showFilters;const left=375,right=1060,yy=590;
      text(c,'5 PARALLEL FILTERS',left,yy-58,14,'#c5cdd3','left','monospace');text(c,'DISTANCE + RETURN FLUX',right,yy-58,12,'#77868f','right','monospace');
      line(c,[left-30,yy-28],[left+4*145+54,yy-28],'#61727e',1.5);line(c,[left+54,yy+39],[left+4*145+84,yy+39],'#61727e',1.5);
      for(let j=0;j<5;j++){const bx=left+j*145;line(c,[bx+54,yy-28],[bx+54,yy-13],'#61727e');line(c,[bx+54,yy+23],[bx+54,yy+39],'#61727e');rect(c,bx,yy-13,108,36,'#0a1015',filterOn?'#5d7382':'#3f454a',3);text(c,'FILTER '+(j+1),bx+54,yy+10,11,filterOn?'#c5cdd3':'#737d85','center','monospace');const signal=fract(t*.8+j*.13);circle(c,bx+54,yy-28+signal*15,1.8,filterOn?COLORS.obstacle:COLORS.dust);
      }
      text(c,filterOn?'Transient returns suppressed. Persistent target retained.':'Filtering bypassed. Dust and obstacle returns remain visible.',left,yy+76,16,filterOn?'#b4c6d3':COLORS.dust);
      text(c,'Conceptual processing view; no measured thresholds or performance rates shown.',left,yy+101,11,'#687780');c.restore();
    }
    // Image proof thumbnail stays visible once the original hero transitions away.
    const anchor=this.images.photo??this.images.cad;
    if(anchor&&t>4.8){c.save();c.globalAlpha=.65;rect(c,65,554,220,128,'#0b0f12','#3b464f',2);fitImage(c,anchor,69,558,212,120);c.restore();text(c,'ORIGINAL PROJECT HARDWARE',65,704,9,'#7b8a95','left','monospace');}
  }
}

class ASFyelabsSystem extends HTMLElement{
  connectedCallback(){
    if(this._connected)return;this._connected=true;this.duration=DURATION;this.time=0;this._playing=this.hasAttribute('autoplay')&&!matchMedia('(prefers-reduced-motion: reduce)').matches;this._visible=true;
    this.attachShadow({mode:'open'});this.shadowRoot.innerHTML=`<style>:host{display:block;background:#000;color:#e8edf1;font-family:Arial,sans-serif}.stage{aspect-ratio:1200/760;width:100%;position:relative}canvas{width:100%;height:100%;display:block}.controls{display:flex;align-items:center;gap:16px;padding:14px 5% 24px;border-top:1px solid #282e33;flex-wrap:wrap;font-size:12px}.controls button{color:#cbd3d9;border:1px solid #57636c;background:#070b0e;font:11px monospace;padding:9px 14px;cursor:pointer}.controls .timeline{width:100%;accent-color:#9daebc;height:2px;order:5}.controls label{display:flex;align-items:center;gap:9px;color:#909ea9}.controls input[type=checkbox]{accent-color:#9daebc}.controls input[type=range]:not(.timeline){width:100px;height:2px;accent-color:#b28c58}.clock{margin-left:auto;color:#7f8d97;font:10px monospace}.source-state{font-size:10px;color:#5d6d79;padding:0 5% 16px;line-height:1.6}:host([controls='false']) .controls,:host([clean]) .controls,:host([clean]) .source-state{display:none}button:focus-visible,input:focus-visible{outline:2px solid #d8e4ed;outline-offset:4px}@media(max-width:500px){.controls{gap:10px;font-size:11px}.controls input[type=range]:not(.timeline){width:70px}.clock{font-size:8px}.controls button{font-size:10px;padding:8px 10px}}</style><div class='stage'><canvas aria-label='FYELABS truck backup safety: original enclosure media, ten fixed LiDAR directions, transient dust returns, and persistent obstacle filtering.'></canvas></div><div class='controls'><button class='play'>PLAY</button><label><input class='filter' type='checkbox' checked>Filtering</label><label>Dust<input class='dust' type='range' min='0' max='100' step='1' value='45' aria-label='Illustrative dust level'></label><span class='clock'>00 / 15 SEC</span><input class='timeline' type='range' min='0' max='15' step='.01' value='0' aria-label='FYELABS animation timeline'></div><div class='source-state'>Original project images are loading. Sensor geometry and returns are illustrative.</div>`;
    this.canvas=this.shadowRoot.querySelector('canvas');this.view=new FyelabsRenderer(this.canvas);this.assetStatus={cad:'loading',photo:'loading'};
    this._play=this.shadowRoot.querySelector('.play');this._timeline=this.shadowRoot.querySelector('.timeline');this._filter=this.shadowRoot.querySelector('.filter');this._dust=this.shadowRoot.querySelector('.dust');
    this._play.addEventListener('click',()=>this._playing?this.pause():this.play());this._timeline.addEventListener('input',()=>{this.pause();this.seek(Number(this._timeline.value))});
    this._filter.addEventListener('change',()=>{this.view.filtersEnabled=this._filter.checked;if(this.time<4.8)this.seek(9);else this.seek(this.time)});
    this._dust.addEventListener('input',()=>{this.view.dustLevel=Number(this._dust.value)/100;if(this.time<4.8)this.seek(9);else this.seek(this.time)});
    this._ro=new ResizeObserver(es=>{const r=es[0].contentRect;this.view.resize(r.width,r.height)});this._ro.observe(this.shadowRoot.querySelector('.stage'));
    this._io=new IntersectionObserver(es=>this._visible=es[0].isIntersecting);this._io.observe(this);
    this.readyPromise=Promise.all([loadImage(this.hasAttribute('image-src')?this.getAttribute('image-src'):CAD_URL),loadImage(this.hasAttribute('photo-src')?this.getAttribute('photo-src'):PHOTO_URL)]).then(([cad,photo])=>{this.view.images={cad,photo};this.assetStatus={cad:cad?'loaded':'unavailable',photo:photo?'loaded':'unavailable'};this.shadowRoot.querySelector('.source-state').textContent=(cad||photo?'Original project imagery loaded. ':'Original images unavailable: the enclosure view uses a labeled conceptual fallback. ')+'Sensor positions, timing and returns are illustrative; no detection threshold or performance claim is shown.';this.seek(this.time);this.dispatchEvent(new CustomEvent('ready',{bubbles:true,detail:this.assetStatus}));return this.assetStatus});
    this.seek(0);const tick=now=>{if(!this._connected)return;const dt=this._last?Math.min(.05,(now-this._last)/1000):0;this._last=now;if(this._playing&&this._visible&&!document.hidden){this.time+=dt;if(this.time>this.duration)this.time=this.hasAttribute('loop')?0:this.duration;this.seek(this.time);if(this.time===this.duration&&!this.hasAttribute('loop'))this.pause()}this._raf=requestAnimationFrame(tick)};this._raf=requestAnimationFrame(tick);
  }
  seek(time){this.time=clamp(Number(time)||0,0,this.duration);this.view?.renderAt(this.time);if(this._timeline)this._timeline.value=String(this.time);if(this.shadowRoot)this.shadowRoot.querySelector('.clock').textContent=String(Math.floor(this.time)).padStart(2,'0')+' / 15 SEC';return this.time;}
  renderAt(time){return this.seek(time)}
  setDustLevel(value){this.view.dustLevel=clamp(value);this._dust.value=String(this.view.dustLevel*100);this.seek(this.time)}
  setFiltering(enabled){this.view.filtersEnabled=Boolean(enabled);this._filter.checked=this.view.filtersEnabled;this.seek(this.time)}
  play(){if(this.time>=this.duration)this.time=0;this._playing=true;if(this._play)this._play.textContent='PAUSE'}
  pause(){this._playing=false;if(this._play)this._play.textContent='PLAY'}
  disconnectedCallback(){this._connected=false;cancelAnimationFrame(this._raf);this._ro?.disconnect();this._io?.disconnect()}
}
if(!customElements.get('as-fyelabs-system'))customElements.define('as-fyelabs-system',ASFyelabsSystem);
export {DURATION as FYELABS_DURATION};
