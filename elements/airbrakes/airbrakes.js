import * as THREE from '../shared/vendor/three.module.min.js';

// Reconstructed from the supplied V12 CAD parameters and presentation renders.
// The spiral-slot constraint is solved analytically, rather than visually faked.
const TAU = Math.PI * 2;
const EXTENSION = 0.78 * 25.4;
const R0 = 25.4;
const TURN = Math.PI / 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };

export function airbrakeKinematics(extension) {
  const fraction = clamp(Number(extension) || 0);
  return { fraction, rotationY: fraction * TURN, travelMm: fraction * EXTENSION, radiusMm: R0 + fraction * EXTENSION };
}
export function airbrakeSlotPoint(extension, worldAzimuth = 0) {
  const k = airbrakeKinematics(extension), phi = -worldAzimuth - k.rotationY;
  return { x: k.radiusMm * Math.cos(phi), y: k.radiusMm * Math.sin(phi) };
}

function roundedSlot(alpha, width = 4.8) {
  const pts = [], left = [], right = [];
  const n = 100;
  for (let j = 0; j <= n; j++) {
    const theta = TURN * j / n;
    const r = R0 + EXTENSION * theta / TURN;
    const phi = alpha - theta;
    const dr = EXTENSION / TURN;
    const slot = airbrakeSlotPoint(theta / TURN, -alpha);
    const x = slot.x, y = slot.y;
    const dx = dr * Math.cos(phi) + r * Math.sin(phi);
    const dy = dr * Math.sin(phi) - r * Math.cos(phi);
    const len = Math.hypot(dx, dy);
    const nx = -dy / len, ny = dx / len;
    left.push(new THREE.Vector2(x + nx * width / 2, y + ny * width / 2));
    right.push(new THREE.Vector2(x - nx * width / 2, y - ny * width / 2));
    pts.push({ x, y, nx, ny });
  }
  const contour = [...left];
  const end = pts.at(-1);
  const endAngle = Math.atan2(end.ny, end.nx);
  for (let j = 1; j <= 18; j++) {
    const a = endAngle - Math.PI * j / 18;
    contour.push(new THREE.Vector2(end.x + Math.cos(a) * width / 2, end.y + Math.sin(a) * width / 2));
  }
  contour.push(...right.reverse());
  const start = pts[0], startAngle = Math.atan2(-start.ny, -start.nx);
  for (let j = 1; j <= 18; j++) {
    const a = startAngle - Math.PI * j / 18;
    contour.push(new THREE.Vector2(start.x + Math.cos(a) * width / 2, start.y + Math.sin(a) * width / 2));
  }
  return new THREE.Path(contour);
}

function solidShape(shape, depth, material) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: .25, bevelThickness: .18, bevelSegments: 2, curveSegments: 64, steps: 1 });
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function ringShape(radius, holeRadius) {
  const s = new THREE.Shape();
  s.absarc(0, 0, radius, 0, TAU, false);
  if (holeRadius) { const h = new THREE.Path(); h.absarc(0, 0, holeRadius, 0, TAU, true); s.holes.push(h); }
  return s;
}

export class AirbrakeRenderer {
  constructor(canvas, { transparent = false } = {}) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = transparent ? null : new THREE.Color(0x000000);
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: transparent, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.5;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.camera = new THREE.PerspectiveCamera(33, 1, .1, 2000);
    this.camera.position.set(175, 160, 210);
    this.camera.lookAt(0, -6, 0);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x181818, 2.9));
    const key = new THREE.DirectionalLight(0xffffff, 4.8); key.position.set(-80, 190, 130); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -130; key.shadow.camera.right = 130; key.shadow.camera.top = 130; key.shadow.camera.bottom = -130; key.shadow.normalBias = .6; this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 4); rim.position.set(150, 20, -180); this.scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffffff, 1.4); fill.position.set(50, -50, 100); this.scene.add(fill);
    const mat = (color, metalness = .65, roughness = .27) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
    // Restrained material coding follows the presentation's final-design renders:
    // cool aluminum plates, red/green rail carriages, brass washers, black/purple servo.
    this.metal = mat(0xb7c1ce, .73, .28);
    this.bright = mat(0xd6dce3, .64, .24);
    this.camMat = mat(0x9daabd, .7, .28);
    this.dark = mat(0x17191c, .4, .35);
    this.railMat = mat(0x6c747e, .8, .25);
    this.carriageRed = mat(0x842d2d, .25, .41);
    this.carriageGreen = mat(0x245440, .25, .4);
    this.bearingBrass = mat(0xa28a49, .75, .3);
    this.servoPurple = mat(0x65466f, .15, .47);
    this.black = mat(0x050505, .1, .5);
    this.assembly = new THREE.Group(); this.scene.add(this.assembly);
    this._build();
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.ShadowMaterial({ color: 0x333333, opacity: .19 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -63; floor.receiveShadow = true; this.scene.add(floor);
    this.resize(1000, 650); this.setExtension(0);
  }
  box(w, h, d, material, x = 0, y = 0, z = 0, parent = this.assembly) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
  cylinder(radius, height, material, x, y, z, parent = this.assembly, segments = 40) { const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
  bolt(x, y, z, parent = this.assembly, scale = 1) {
    this.cylinder(2.5 * scale, 1.5 * scale, this.dark, x, y, z, parent, 6);
    this.cylinder(3.7 * scale, .8 * scale, this.bright, x, y - .7 * scale, z, parent);
    this.cylinder(1.7 * scale, 5 * scale, this.railMat, x, y - 2.5 * scale, z, parent);
    this.cylinder(1.2 * scale, .12, this.black, x, y + .79 * scale, z, parent, 6);
  }
  _build() {
    // Skeleton support ring, open bays, and thin radial spokes.
    const ring = solidShape(ringShape(69.85, 61.5), 3.2, this.metal); ring.position.y = -15; this.assembly.add(ring);
    const hub = solidShape(ringShape(15, 8), 3.2, this.metal); hub.position.y = -15; this.assembly.add(hub);
    for (let i = 0; i < 3; i++) {
      const a = i * TAU / 3;
      const arm = this.box(55, 3.2, 8, this.metal, Math.cos(a) * 35, -13.4, Math.sin(a) * 35); arm.rotation.y = -a;
      const rail = new THREE.Group(); rail.rotation.y = -a; this.assembly.add(rail);
      this.box(60, 5, 9, this.railMat, 31, -6, 0, rail);
      this.box(58, 1, 4, this.bright, 31, -2.8, 0, rail);
      [-1, 1].forEach(s => this.box(58, 1.2, 1.4, this.dark, 31, -2, s * 3.6, rail));
      [8, 57].forEach(x => this.bolt(x, -2, 0, rail, .65));
    }
    // The servo and its narrow mounting plate are below the panel plane.
    this.box(41, 4, 35, this.metal, 0, -29, 0);
    this.box(38, 34, 20, this.dark, 0, -47, 0);
    const labelCanvas = document.createElement('canvas'); labelCanvas.width = 512; labelCanvas.height = 320;
    const lc = labelCanvas.getContext('2d'); lc.fillStyle='#65466f';lc.fillRect(0,0,512,320);
    lc.strokeStyle='#b8a4bd';lc.lineWidth=4;lc.strokeRect(12,12,488,296);
    lc.fillStyle='#e4dce8';lc.font='500 44px Arial';lc.fillText('BRUSHLESS',30,77);
    lc.font='600 72px Arial';lc.fillText('HV SERVO',30,166);
    lc.font='28px monospace';lc.fillText('180 DEG / SHARED DRIVE',30,265);
    this.servoLabelTexture = new THREE.CanvasTexture(labelCanvas); this.servoLabelTexture.colorSpace = THREE.SRGBColorSpace;
    const labelMaterial = new THREE.MeshStandardMaterial({map:this.servoLabelTexture,metalness:.12,roughness:.54});
    this.box(35,22,.08,labelMaterial,0,-47,10.06);
    this.box(48, 3, 20, this.railMat, 0, -31, 0);
    for (const x of [-17, 17]) for (const z of [-10, 10]) this.cylinder(3.5, 15, this.metal, x, -21, z);
    this.cylinder(7, 16, this.railMat, 0, -10, 0);
    this.cylinder(9, 3, this.bright, 0, -1, 0);
    [-20, 20].forEach(x => this.bolt(x, -27, 0, this.assembly, .8));
    // Three sector-shaped brake panels reconstructed from the final-design render.
    this.sliders = [];
    for (let i = 0; i < 3; i++) {
      const alpha = i * TAU / 3;
      const g = new THREE.Group(); g.rotation.y = -alpha; this.assembly.add(g);
      const slider = new THREE.Group(); g.add(slider); this.sliders.push(slider);
      const panel = new THREE.Shape();
      panel.moveTo(24, -7); panel.lineTo(49, -7); panel.lineTo(53, -28);
      for (let j = 0; j <= 40; j++) { const a = -.41 + .82 * j / 40; panel.lineTo(Math.cos(a) * 69.5, Math.sin(a) * 69.5); }
      panel.lineTo(49, 7); panel.lineTo(24, 7); panel.closePath();
      const blade = solidShape(panel, 3.2, this.bright); blade.position.y = 1.5; slider.add(blade);
      this.box(18, 6.5, 13, this.carriageGreen, 34.5, -2, 0, slider);
      this.box(3, 6.8, 13.5, this.carriageRed, 25.6, -2, 0, slider);
      this.box(3, 6.8, 13.5, this.carriageRed, 43.4, -2, 0, slider);
      this.box(18, 1.5, 13.5, this.railMat, 34.5, -.2, 0, slider);
      // Roller bearing follower sits in the slot in the upper cam plate.
      this.cylinder(2, 14, this.railMat, R0, 9, 0, slider);
      this.cylinder(3.5, 3.4, this.metal, R0, 11.9, 0, slider);
      this.cylinder(4.2, 1, this.bearingBrass, R0, 14.1, 0, slider);
      this.cylinder(3, 2.1, this.dark, R0, 15.65, 0, slider, 6);
      this.cylinder(1.4, .15, this.black, R0, 16.78, 0, slider, 6);
    }
    // Offset spiral slots follow stationary radial pins as the cam rotates.
    const shape = new THREE.Shape();
    for (let i = 0; i <= 360; i++) { const a = i * TAU / 360; const r = 51.5 + 4.5 * Math.cos(3 * a + .5) + 1.1 * Math.sin(6 * a); const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? shape.lineTo(x, y) : shape.moveTo(x, y); }
    shape.closePath();
    // THREE maps positive shape y to world -z. Reverse alpha sign for holes.
    for (let i = 0; i < 3; i++) shape.holes.push(roundedSlot(-i * TAU / 3));
    const hex = new THREE.Path(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + Math.PI / 6; const x = Math.cos(a) * 5, y = Math.sin(a) * 5; i ? hex.lineTo(x, y) : hex.moveTo(x, y); } hex.closePath(); shape.holes.push(hex);
    this.cam = solidShape(shape, 3.6, this.camMat); this.cam.position.y = 6.2; this.assembly.add(this.cam);
    this.hex = this.cylinder(5, 9.5, this.railMat, 0, 13, 0, this.assembly, 6);
    this.cylinder(2.5, .25, this.black, 0, 17.85, 0, this.assembly, 6);
    // Fine concentric envelope outline makes the radial motion legible.
    const pts=[]; for(let i=0;i<=128;i++){const a=i*TAU/128;pts.push(new THREE.Vector3(Math.cos(a)*69.85,-16.5,Math.sin(a)*69.85));}
    const envelope = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x444444,transparent:true,opacity:.65}));this.assembly.add(envelope);
  }
  setExtension(fraction) {
    const k = airbrakeKinematics(fraction); this.extension = k.fraction; const theta = k.rotationY;
    // Local shape uses phi = alpha - theta and transforms with y = -z.
    this.cam.rotation.y = theta;
    this.hex.rotation.y = theta;
    this.sliders.forEach(slider => { slider.position.x = k.travelMm; });
    this.renderer.render(this.scene, this.camera);
  }
  resize(width, height) { this.renderer.setSize(Math.max(1,width), Math.max(1,height), false); this.camera.aspect = width / height; this.camera.updateProjectionMatrix(); this.renderer.render(this.scene,this.camera); }
  render() { this.renderer.render(this.scene, this.camera); }
  dispose() { this.scene.traverse(o=>{o.geometry?.dispose();if(o.material)Array.isArray(o.material)?o.material.forEach(m=>m.dispose()):o.material.dispose()}); this.servoLabelTexture?.dispose(); this.renderer.dispose(); }
}

export const AIRBRAKE_DURATION = 10;
export function airbrakeStateAt(time) {
  const t=clamp(time,0,AIRBRAKE_DURATION);
  // Rest hold -> full extension -> hold -> retract -> rest hold.
  const extension=t<1?0:t<4?smooth((t-1)/3):t<5.3?1:t<8.3?1-smooth((t-5.3)/3):0;
  return {extension,servoAngle:extension*90,travelMm:extension*EXTENSION};
}

class ASAirbrakes extends HTMLElement {
  static get observedAttributes(){return ['extension','paused'];}
  connectedCallback(){
    if(this._connected)return; this._connected=true;this.duration=AIRBRAKE_DURATION;this.time=0;this._playing=this.hasAttribute('autoplay')&&!matchMedia('(prefers-reduced-motion: reduce)').matches;this._visible=true;
    this.attachShadow({mode:'open'});this.shadowRoot.innerHTML=`<style>:host{display:block;color:#fff;background:#000;min-height:260px;font-family:Arial,sans-serif}.stage{position:relative;width:100%;aspect-ratio:16/10;overflow:hidden;background:#000}canvas{display:block;width:100%;height:100%;outline:0}.title{position:absolute;left:5%;top:6%;pointer-events:none;font:10px/1.5 monospace;letter-spacing:1.5px;color:#aaa}.title strong{display:block;font:500 22px/1.3 Arial,sans-serif;letter-spacing:-.5px;color:#fff;margin-top:10px}.readout{position:absolute;right:5%;top:6%;text-align:right;font:10px/1.8 monospace;color:#888}.readout b{font-weight:400;color:#fff;font-size:14px}.note{position:absolute;bottom:15%;left:5%;font:9px/1.6 monospace;color:#777;letter-spacing:.7px;pointer-events:none}.controls{position:absolute;left:5%;right:5%;bottom:5%;display:flex;gap:16px;align-items:center;font:10px monospace}.controls button{font:10px monospace;color:#eee;background:#080808;border:1px solid #555;padding:9px 12px;cursor:pointer}.controls input{accent-color:#fff;min-width:20px;width:100%;height:2px}.controls span{white-space:nowrap;color:#999}:host([controls='false']) .controls{display:none}:host([clean]) .title,:host([clean]) .readout,:host([clean]) .note,:host([clean]) .controls{display:none}button:focus-visible,input:focus-visible,canvas:focus-visible{outline:2px solid #fff;outline-offset:4px}@media(max-width:500px){.title{font-size:8px}.title strong{font-size:17px}.readout{font-size:8px}.readout b{font-size:11px}.note{font-size:7px;bottom:20%}.controls{gap:10px;bottom:5%}.controls span{font-size:8px}}</style><div class='stage'><canvas tabindex='0' aria-label='Airbrake cam mechanism. Left and right arrows change extension. Space pauses or plays.'></canvas><div class='title'>BOREALIS / ACTIVE AIRBRAKES<strong>One servo. Three panels.</strong></div><div class='readout'>CAM ROTATION<br><b class='angle'>0.0 deg</b><br>RADIAL TRAVEL<br><b class='travel'>0.0 mm</b></div><div class='note'>CUSTOM SPIRAL CAM SLOTS<br>LINEAR EXTENSION / LINEAR ROTATION</div><div class='controls'><button class='play' aria-label='Play or pause mechanism'>PLAY</button><input type='range' min='0' max='100' step='.1' value='0' aria-label='Airbrake extension'><span class='fraction'>0%</span><button class='reset'>RESET</button></div></div>`;
    this.canvas=this.shadowRoot.querySelector('canvas');
    try{this.view=new AirbrakeRenderer(this.canvas,{transparent:this.hasAttribute('transparent')});}catch(e){this.shadowRoot.innerHTML='<div style="padding:30px;color:white;background:black">This 3D mechanism requires WebGL. Open the demo in a current browser.</div>';this.dispatchEvent(new CustomEvent('asseterror',{detail:e.message,bubbles:true}));return;}
    this._slider=this.shadowRoot.querySelector('input');this._playButton=this.shadowRoot.querySelector('.play');
    this._slider.addEventListener('input',()=>{this.pause();this.setExtension(Number(this._slider.value)/100)});
    this._playButton.addEventListener('click',()=>this._playing?this.pause():this.play());this.shadowRoot.querySelector('.reset').addEventListener('click',()=>{this.pause();this.seek(0)});
    this.canvas.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();this.pause();this.setExtension(this.view.extension+(e.key==='ArrowRight'?.025:-.025));}else if(e.key===' '){e.preventDefault();this._playing?this.pause():this.play();}else if(e.key==='Home'){e.preventDefault();this.pause();this.seek(0)}});
    this._ro=new ResizeObserver(es=>{const r=es[0].contentRect;this.view.resize(r.width,r.height)});this._ro.observe(this.shadowRoot.querySelector('.stage'));
    this._io=new IntersectionObserver(es=>{this._visible=es[0].isIntersecting});this._io.observe(this);
    this.setExtension(Number(this.getAttribute('extension')||0));
    const tick=now=>{if(!this._connected)return;const dt=this._last?Math.min(.05,(now-this._last)/1000):0;this._last=now;if(this._playing&&this._visible&&!document.hidden){this.time+=dt;if(this.time>this.duration)this.time=this.hasAttribute('loop')?0:this.duration;this.seek(this.time);if(this.time===this.duration&&!this.hasAttribute('loop'))this.pause()}this._raf=requestAnimationFrame(tick)};this._raf=requestAnimationFrame(tick);
    this.dispatchEvent(new CustomEvent('ready',{bubbles:true}));
  }
  attributeChangedCallback(name,old,v){if(!this.view)return;if(name==='extension')this.setExtension(Number(v));if(name==='paused')v===null?this.play():this.pause();}
  setExtension(v){this.view?.setExtension(v);if(!this.view)return;const e=this.view.extension;this._slider.value=String(e*100);this.shadowRoot.querySelector('.fraction').textContent=Math.round(e*100)+'%';this.shadowRoot.querySelector('.angle').textContent=(e*90).toFixed(1)+' deg';this.shadowRoot.querySelector('.travel').textContent=(e*EXTENSION).toFixed(1)+' mm';}
  seek(time){this.time=clamp(Number(time)||0,0,this.duration);this.setExtension(airbrakeStateAt(this.time).extension);return this.time;}
  renderAt(time){return this.seek(time);}
  play(){if(this.time>=this.duration)this.time=0;this._playing=true;if(this._playButton)this._playButton.textContent='PAUSE';}
  pause(){this._playing=false;if(this._playButton)this._playButton.textContent='PLAY';}
  disconnectedCallback(){this._connected=false;cancelAnimationFrame(this._raf);this._ro?.disconnect();this._io?.disconnect();this.view?.dispose();}
}
if(!customElements.get('as-airbrakes'))customElements.define('as-airbrakes',ASAirbrakes);

