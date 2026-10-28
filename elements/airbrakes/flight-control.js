// Source: 2024 Launch Canada Podium Presentation, slides 39-44.
// Signals and timings below are illustrative, not measured flight telemetry.
const FLOW_DURATION = 14;
const clamp = (v,a=0,b=1) => Math.max(a,Math.min(b,v));
const ease = v => {v=clamp(v);return v*v*(3-2*v)};
const STAGES = [
  {name:'SENSE',title:'Read the flight state',lines:['VN-300 raw IMU / serial','Altimeter / CAN']},
  {name:'ESTIMATE',title:'Estimate orientation',lines:['Madgwick orientation filter','Resolve force direction']},
  {name:'PREDICT',title:'Predict the apogee',lines:['Fourth-order Runge-Kutta','Drag polynomial from CFD']},
  {name:'CONTROL',title:'PI extension control',lines:['Error = target - predicted apogee','Proportional + integral extension command']},
  {name:'ACTUATE',title:'Drive the shared mechanism',lines:['Extension command / CAN','One servo / three radial panels']},
  {name:'FEEDBACK',title:'Update the next prediction',lines:['Panel extension changes drag','The next control cycle begins']}
];
function line(c,x1,y1,x2,y2,color='#666',width=1){c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.stroke()}
function text(c,s,x,y,size=12,color='#aaa',align='left',family='monospace'){c.font=size+'px '+family;c.textAlign=align;c.fillStyle=color;c.fillText(s,x,y)}
function circle(c,x,y,r,fill,stroke){c.beginPath();c.arc(x,y,r,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.stroke()}}
function shape(c,pts,stroke='#777',fill){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.stroke()}}

export class FlightControlRenderer {
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.width=1280;this.height=760;this.time=0;this.resize(1280,760)}
  resize(width,height){this.width=Math.max(1,width);this.height=Math.max(1,height);this.dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=this.width*this.dpr;this.canvas.height=this.height*this.dpr;this.renderAt(this.time)}
  renderAt(time){this.time=clamp(time,0,FLOW_DURATION);const c=this.ctx;if(!c)return;const W=this.width,H=this.height;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#000';c.fillRect(0,0,W,H);const scale=Math.min(W/1280,H/760);c.translate((W-1280*scale)/2,(H-760*scale)/2);c.scale(scale,scale);c.lineCap='round';c.lineJoin='round';this.draw(c,this.time)}
  draw(c,t){
    const phase=Math.min(5,Math.floor(Math.max(0,t-1)/2));const progress=clamp((t-1)/12);const nodeX=[100,316,532,748,964,1180],y=207;
    text(c,'BOREALIS / ACTIVE ALTITUDE CONTROL',65,62,12,'#999');
    text(c,'Airbrake control loop',65,111,35,'#fff','left','Arial');
    text(c,'ONE ILLUSTRATIVE CONTROL CYCLE',1215,64,10,'#777','right');
    // Signal path with one travelling point. Each block remains legible at rest.
    nodeX.forEach((x,i)=>{
      if(i<5){line(c,x+25,y,nodeX[i+1]-25,y,'#333',1);if(progress*5>i)line(c,x+25,y,nodeX[i+1]-25,y,'#aaa',1);}
      const active=i===phase;circle(c,x,y,19,active?'#fff':'#050505',active?'#fff':'#555');text(c,String(i+1).padStart(2,'0'),x,y+4,10,active?'#000':'#aaa','center');
      text(c,STAGES[i].name,x,y-41,11,active?'#fff':'#858585','center');
      if(active)circle(c,x,y,26,null,'#444');
    });
    let travel=progress*5,seg=Math.min(4,Math.floor(travel)),u=travel-seg;if(progress<1&&t>1){const x=nodeX[seg]+25+(nodeX[seg+1]-nodeX[seg]-50)*u;circle(c,x,y,3,'#fff')}
    // Return path from altered drag to newly observed state.
    c.strokeStyle='#333';c.lineWidth=1;c.beginPath();c.moveTo(nodeX[5],y+28);c.lineTo(nodeX[5],y+67);c.lineTo(nodeX[0],y+67);c.lineTo(nodeX[0],y+28);c.stroke();
    shape(c,[[nodeX[0]-4,y+34],[nodeX[0],y+28],[nodeX[0]+4,y+34]],'#777');
    text(c,'PHYSICAL FEEDBACK',640,y+71,8,'#777','center');
    // Trajectory plot with distinct target, original prediction, and updated prediction.
    const L=85,R=790,top=344,bottom=646;
    line(c,L,bottom,R,bottom,'#444');line(c,L,bottom,L,top,'#444');
    text(c,'ALTITUDE',L,top-17,9,'#777');text(c,'TIME TO APOGEE',R,bottom+25,9,'#777','right');
    for(let j=1;j<5;j++)line(c,L,bottom-(bottom-top)*j/5,R,bottom-(bottom-top)*j/5,'#151515');
    const targetY=410;
    c.setLineDash([5,7]);line(c,L,targetY,R,targetY,'#737373');c.setLineDash([]);text(c,'TARGET APOGEE',R,targetY-13,10,'#aaa','right');
    const curve=(apexY,col,width,alpha=1)=>{c.save();c.globalAlpha=alpha;c.beginPath();for(let j=0;j<=150;j++){const u=j/150;const x=L+35+(R-L-70)*u;const yy=apexY+(bottom-35-apexY)*(1-u)*(1-u);j?c.lineTo(x,yy):c.moveTo(x,yy)}c.strokeStyle=col;c.lineWidth=width;c.stroke();c.restore()};
    curve(356,'#555',1.2);
    const correction=ease((t-10.3)/2.7),peak=356+54*correction;
    if(t>=5){const visibility=ease((t-5)/1.2);curve(peak,'#fff',2.2,visibility);circle(c,R-35,peak,4,'#fff');}
    const sensedX=L+35,sensedY=bottom-35;circle(c,sensedX,sensedY,5,'#fff');text(c,'SENSED STATE',sensedX+14,sensedY+6,9,'#aaa');
    if(t>=7&&t<12){const x=R-7;line(c,x,356,x,targetY,'#fff');line(c,x-4,356,x+4,356,'#fff');line(c,x-4,targetY,x+4,targetY,'#fff');text(c,'APOGEE ERROR',R-70,382,8,'#fff','right');}
    // Small top view shows how the controller's output changes drag area.
    const cx=1050,cy=480,ex=ease((t-8.8)/1.4)*.7;
    c.save();c.translate(cx,cy);circle(c,0,0,88,null,'#333');circle(c,0,0,77,null,'#222');
    for(let i=0;i<3;i++){c.save();c.rotate(i*Math.PI*2/3);c.translate(ex*19.812,0);c.beginPath();c.moveTo(23,-8);c.lineTo(54,-8);c.lineTo(61,-29);c.arc(0,0,80,-.36,.36);c.lineTo(54,8);c.lineTo(23,8);c.closePath();c.fillStyle='#b7c1ce';c.fill();c.strokeStyle='#d6dce3';c.stroke();c.restore();}
    c.save();c.rotate(ex*Math.PI/2);c.beginPath();for(let j=0;j<=180;j++){const a=j*Math.PI*2/180,r=58+5*Math.cos(3*a);j?c.lineTo(Math.cos(a)*r,Math.sin(a)*r):c.moveTo(Math.cos(a)*r,Math.sin(a)*r)}c.closePath();c.fillStyle='#56606e';c.fill();c.strokeStyle='#9daabd';c.stroke();
    for(let i=0;i<3;i++){c.save();c.rotate(i*Math.PI*2/3);c.beginPath();for(let j=0;j<=40;j++){const a=-j*Math.PI/80,r=25.4+j*(19.812/40);j?c.lineTo(Math.cos(a)*r,Math.sin(a)*r):c.moveTo(Math.cos(a)*r,Math.sin(a)*r)}c.strokeStyle='#000';c.lineWidth=5;c.stroke();c.restore();}c.restore();
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3;circle(c,Math.cos(a)*(25.4+ex*19.812),Math.sin(a)*(25.4+ex*19.812),4,'#a28a49','#e0d8c4');}circle(c,0,0,6,'#111','#aaa');c.restore();
    text(c,'SHARED SERVO / RADIAL PANELS',cx,614,9,'#aaa','center');
    text(c,'INCREASE EXTENSION',cx,638,9,phase>=4?'#fff':'#555','center');
    // Expanded active-stage caption.
    const stage=STAGES[phase];text(c,stage.title,85,713,21,'#fff','left','Arial');text(c,stage.lines.join('  /  '),1215,711,10,'#999','right');
    // Phase constraints are given explicitly in the source presentation.
    text(c,'ACTUATION PERMITTED DURING COAST / LOCKED OUT DURING BOOST AND RECOVERY',65,747,8,'#606060');
  }
}
export { FLOW_DURATION };
class ASFlightControl extends HTMLElement {
  connectedCallback(){if(this._connected)return;this._connected=true;this.duration=FLOW_DURATION;this.time=0;this._playing=this.hasAttribute('autoplay')&&!matchMedia('(prefers-reduced-motion: reduce)').matches;this._visible=true;this.attachShadow({mode:'open'});this.shadowRoot.innerHTML=`<style>:host{display:block;background:#000;color:#fff;font:11px monospace}.stage{position:relative;aspect-ratio:1280/760}canvas{display:block;width:100%;height:100%}.controls{display:flex;align-items:center;gap:15px;padding:5px 5% 20px}.controls button{background:#000;color:#ddd;border:1px solid #555;padding:9px 15px;font:10px monospace;cursor:pointer}.controls input{width:100%;height:2px;accent-color:#fff}.controls span{white-space:nowrap;color:#777;font-size:9px}:host([controls='false']) .controls,:host([clean]) .controls{display:none}button:focus-visible,input:focus-visible{outline:2px solid #fff;outline-offset:4px}.details{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:30px;padding:25px 5% 34px;border-top:1px solid #292929;font-family:Arial,sans-serif}.detail{min-width:0}.detail small{font:9px/1.7 monospace;letter-spacing:1px;color:#777}.detail h3{font:500 20px/1.3 Arial,sans-serif;letter-spacing:-.4px;margin:9px 0 14px;color:#ddd}.detail p{font:13px/1.8 Arial,sans-serif;color:#a8a8a8;margin:0 0 13px}.detail code{font:11px/1.8 monospace;color:#d7d7d7;white-space:normal}.detail .equation{font:11px/1.7 monospace;color:#dedede;border-top:1px solid #252525;padding-top:10px}.detail.active h3{color:#fff}.detail.active small{color:#cfcfcf}:host([clean]) .details{display:none}@media(max-width:700px){.details{grid-template-columns:1fr;gap:24px;padding-top:20px}.detail h3{font-size:19px;margin-bottom:10px}.detail p{font-size:13px}.detail+.detail{border-top:1px solid #252525;padding-top:20px}}</style><div class='stage'><canvas aria-label='One illustrative airbrake control cycle: sensors, Madgwick orientation, Runge-Kutta apogee prediction, PI control, servo actuation, and drag feedback.'></canvas></div><div class='controls'><button>PLAY</button><input aria-label='Control cycle timeline' type='range' min='0' max='14' step='.01' value='0'><span>00 / 14 SEC</span></div><div class='details' aria-label='Control algorithm details'><section class='detail' data-phase='1'><small>STATE ESTIMATION</small><h3>Madgwick filter</h3><p>The raw IMU provides angular-rate and acceleration measurements. The filter tracks the rocket's orientation as a quaternion, combining gyroscope propagation with a gravity-direction correction.</p><p>That orientation resolves the modeled force direction for the trajectory calculation. The presentation uses raw VN-300 IMU inputs rather than its built-in orientation estimate.</p><div class='equation'>Raw IMU &rarr; orientation estimate</div></section><section class='detail' data-phase='2'><small>TRAJECTORY PREDICTION</small><h3>Fourth-order Runge-Kutta</h3><p>Starting from the current flight state, RK4 advances the equations of motion toward apogee. Four slope evaluations per integration step account for how the state changes within that step.</p><p>Gravity and CFD-derived drag determine the acceleration. The source model assumes zero angle of attack; the estimated orientation gives the force components. The predicted apex is where upward velocity reaches zero.</p><div class='equation'>Current state + drag model &rarr; predicted apogee</div></section><section class='detail' data-phase='3'><small>CONTROL</small><h3>PI control loop</h3><p>The controller compares the target apogee with the predicted apogee. The proportional term responds to the current error; the integral term accumulates persistent error over successive updates.</p><p>An overshoot prediction calls for more panel extension and therefore more drag. The shared servo turns the cam, all three panels move radially, and the next state measurement closes the loop. Boost and recovery lockouts restrict when actuation is permitted.</p><div class='equation'>e = target apogee - predicted apogee<br>u = Kp e + Ki &int;e dt</div></section></div>`;this.canvas=this.shadowRoot.querySelector('canvas');this.view=new FlightControlRenderer(this.canvas);this._button=this.shadowRoot.querySelector('button');this._slider=this.shadowRoot.querySelector('input');this._button.addEventListener('click',()=>this._playing?this.pause():this.play());this._slider.addEventListener('input',()=>{this.pause();this.seek(Number(this._slider.value))});this._ro=new ResizeObserver(es=>{const r=es[0].contentRect;this.view.resize(r.width,r.height)});this._ro.observe(this.shadowRoot.querySelector('.stage'));this._io=new IntersectionObserver(es=>this._visible=es[0].isIntersecting);this._io.observe(this);this.seek(0);const tick=now=>{if(!this._connected)return;const dt=this._last?Math.min(.05,(now-this._last)/1000):0;this._last=now;if(this._playing&&this._visible&&!document.hidden){this.time+=dt;if(this.time>this.duration)this.time=this.hasAttribute('loop')?0:this.duration;this.seek(this.time);if(this.time===this.duration&&!this.hasAttribute('loop'))this.pause()}this._raf=requestAnimationFrame(tick)};this._raf=requestAnimationFrame(tick);this.dispatchEvent(new CustomEvent('ready',{bubbles:true}));}
  seek(time){this.time=clamp(Number(time)||0,0,this.duration);this.view?.renderAt(this.time);if(this._slider)this._slider.value=String(this.time);if(this.shadowRoot){this.shadowRoot.querySelector('.controls span').textContent=String(Math.floor(this.time)).padStart(2,'0')+' / 14 SEC';const phase=Math.min(5,Math.floor(Math.max(0,this.time-1)/2));this.shadowRoot.querySelectorAll('.detail').forEach(el=>{const detailPhase=Number(el.dataset.phase);el.classList.toggle('active',detailPhase===Math.min(3,Math.max(1,phase)));});}return this.time;}
  renderAt(time){return this.seek(time);}
  play(){if(this.time>=this.duration)this.time=0;this._playing=true;if(this._button)this._button.textContent='PAUSE';}
  pause(){this._playing=false;if(this._button)this._button.textContent='PLAY';}
  disconnectedCallback(){this._connected=false;cancelAnimationFrame(this._raf);this._ro?.disconnect();this._io?.disconnect();}
}
if(!customElements.get('as-flight-control'))customElements.define('as-flight-control',ASFlightControl);
