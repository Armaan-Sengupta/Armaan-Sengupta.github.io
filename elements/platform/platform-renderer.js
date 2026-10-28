import * as THREE from '../shared/vendor/three.module.min.js';
import {ORIGINAL_GEOMETRY,solvePlatformPose,toWorld} from './platform-kinematics.js';
const assetBase=new URL('./assets/',import.meta.url);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const HIP_Y=.036,STACK=.030,BALL_R=ORIGINAL_GEOMETRY.ballRadius;
export const PLATFORM_SPEC=Object.freeze({...ORIGINAL_GEOMETRY,plateHeight:HIP_Y+ORIGINAL_GEOMETRY.platformHeight+STACK,attachRadius:ORIGINAL_GEOMETRY.triangleSide/Math.sqrt(3),linkLengths:[.080,.100],worldUnits:'meters',defaultZoom:1.5});
export function createPlatformRenderer(host,options={}){
 const canvas=host instanceof HTMLCanvasElement?host:document.createElement('canvas');if(canvas!==host)host.appendChild(canvas);
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true});renderer.setClearColor(0x000000,1);renderer.setPixelRatio(options.pixelRatio??Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x000000);
 const camera=new THREE.PerspectiveCamera(31,1,.01,10);camera.position.set(.47,.40,.56);camera.zoom=1.5;camera.lookAt(0,.125,0);
 scene.add(new THREE.HemisphereLight(0xffffff,0x333333,2.4));
 for(const [power,position] of [[4.6,[-.2,.65,.35]],[3.5,[.45,.3,-.4]],[1.3,[-.4,.1,-.1]]]){const l=new THREE.DirectionalLight(0xffffff,power);l.position.set(...position);scene.add(l)}
 const mats={black:new THREE.MeshStandardMaterial({color:0x171717,metalness:.35,roughness:.46}),dark:new THREE.MeshStandardMaterial({color:0x303030,metalness:.4,roughness:.43}),silver:new THREE.MeshStandardMaterial({color:0xc8c8ca,metalness:.8,roughness:.27}),plate:new THREE.MeshStandardMaterial({color:0x8b8d90,metalness:.15,roughness:.48}),rubber:new THREE.MeshStandardMaterial({color:0x080808,metalness:0,roughness:.85}),ball:new THREE.MeshStandardMaterial({color:0xd8dadc,metalness:.9,roughness:.20}),arm:new THREE.MeshStandardMaterial({color:new THREE.Color().setRGB(.5906188488,.6375968456,.8549926281,THREE.SRGBColorSpace),metalness:.12,roughness:.42})};
 const rig=new THREE.Group();scene.add(rig);const base=new THREE.Group(),plate=new THREE.Group();rig.add(base,plate);const sensorStack=new THREE.Group(),topDeck=new THREE.Group();plate.add(sensorStack,topDeck);const ball=new THREE.Mesh(new THREE.SphereGeometry(BALL_R,48,32),mats.ball);plate.add(ball);
 function mesh(geometry,material,parent=rig){const m=new THREE.Mesh(geometry,material);parent.add(m);return m}
 function cylinder(radius,height,material,parent=rig,segments=48){return mesh(new THREE.CylinderGeometry(radius,radius,height,segments),material,parent)}
 function bolt(parent,x,y,z,s=1){const b=cylinder(.0028*s,.0034*s,mats.silver,parent,6);b.position.set(x,y,z);const recess=cylinder(.0012*s,.00025,mats.rubber,parent,6);recess.position.set(x,y+.00182*s,z)}
 function deck(parent,radius,thickness,y,material,segments=96){const d=cylinder(radius,thickness,material,parent,segments);d.position.y=y;const edge=new THREE.LineSegments(new THREE.EdgesGeometry(d.geometry,25),new THREE.LineBasicMaterial({color:0x9a9a9a,transparent:true,opacity:.38}));d.add(edge);return d}
 deck(base,.142,.008,.008,mats.black,48);deck(base,.138,.002,.0135,mats.dark,48);
 for(let i=0;i<3;i++){const p=(90+i*120)*Math.PI/180,x=.123*Math.cos(p),z=-.123*Math.sin(p);const f=cylinder(.011,.012,mats.rubber,base,32);f.position.set(x,-.001,z);bolt(base,x,.017,z)}
 deck(plate,.150,.006,-STACK+.004,mats.dark);deck(sensorStack,.065,.005,-.014,mats.black);const sensor=cylinder(.028,.013,mats.silver,sensorStack,64);sensor.position.y=-.006;const center=cylinder(.016,.0135,mats.dark,sensorStack,48);center.position.y=-.006;
 // The real Forcen stack has four fasteners in a square, not three.
 for(const x of [-.034,.034])for(const z of [-.034,.034]){const standoff=cylinder(.004,.018,mats.silver,sensorStack,24);standoff.position.set(x,-.006,z);bolt(sensorStack,x,.005,z)}
 deck(topDeck,.150,.003,0,mats.plate);const rim=mesh(new THREE.TorusGeometry(.150,.001,8,128),mats.dark,topDeck);rim.rotation.x=Math.PI/2;rim.position.y=.004;const targetRing=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({length:80},(_,i)=>new THREE.Vector3(Math.cos(i*Math.PI/40)*.010,.0017,Math.sin(i*Math.PI/40)*.010))),new THREE.LineBasicMaterial({color:0x555555,transparent:true,opacity:.5}));topDeck.add(targetRing);
 for(const x of [-.071,.071])for(const z of [-.071,.071])bolt(topDeck,x,.0036,z,.9);
 const legs=[];
 for(let i=0;i<3;i++){
  const phi=ORIGINAL_GEOMETRY.baseAngles[i]*Math.PI/180,radial=new THREE.Vector3(Math.cos(phi),0,-Math.sin(phi));
  const servo=new THREE.Group();base.add(servo);servo.position.copy(radial).multiplyScalar(.100);servo.position.y=HIP_Y;const tangent=new THREE.Vector3(-radial.z,0,radial.x);servo.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(radial,new THREE.Vector3(0,1,0),tangent));
  const housing=mesh(new THREE.BoxGeometry(.042,.030,.024),mats.black,servo);housing.position.set(-.006,-.013,0);const lid=mesh(new THREE.BoxGeometry(.038,.007,.027),mats.dark,servo);lid.position.y=.003;const collar=cylinder(.0075,.011,mats.silver,servo);collar.rotation.x=Math.PI/2;collar.position.z=.013;
  for(const dx of [-.024,.016])for(const dz of [-.016,.016])bolt(servo,dx,-.017,dz,.7);
  const lowerLink=new THREE.Group(),upperLink=new THREE.Group();rig.add(lowerLink,upperLink);
  const lowerProxy=mesh(new THREE.BoxGeometry(.013,.080,.0045),mats.arm,lowerLink);lowerProxy.position.y=.040;
  const upperProxy=mesh(new THREE.BoxGeometry(.013,.060,.0045),mats.arm,upperLink);upperProxy.position.y=.030;
  // The short 60 mm CAD arm plus its connector/rod forms the 100 mm upper chain.
  const stem=cylinder(.0038,.040,mats.silver,upperLink,24);stem.position.y=.080;const sleeve=cylinder(.006,.014,mats.dark,upperLink,24);sleeve.position.y=.066;
  const joints=Array.from({length:3},()=>{const g=new THREE.Group();rig.add(g);const axle=cylinder(.0074,.013,mats.silver,g,24);axle.rotation.x=Math.PI/2;const cap=cylinder(.0037,.014,mats.dark,g,6);cap.rotation.x=Math.PI/2;return g});
  const connector=new THREE.Group();rig.add(connector);mesh(new THREE.SphereGeometry(.0078,24,16),mats.silver,connector);const socket=cylinder(.009,.008,mats.dark,connector,32);socket.position.y=.007;
  legs.push({radial,servo,lowerLink,upperLink,lowerProxy,upperProxy,joints,connector});
 }
 const floor=mesh(new THREE.CircleGeometry(.34,96),new THREE.MeshBasicMaterial({color:0x050505}),scene);floor.rotation.x=-Math.PI/2;floor.position.y=-.010;
 let state={tiltX:0,tiltZ:0,ballX:0,ballZ:0,explode:0},currentPose=solvePlatformPose(),width=options.width||1280,height=options.height||720;
 const up=new THREE.Vector3(0,1,0),matrix=new THREE.Matrix4();
 const world=p=>new THREE.Vector3(...toWorld(p)).addScaledVector(up,HIP_Y);
 function orient(group,a,b,tangent){const y=b.clone().sub(a).normalize(),z=tangent.clone().addScaledVector(y,-tangent.dot(y)).normalize(),x=new THREE.Vector3().crossVectors(y,z).normalize();group.position.copy(a);group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z))}
 function setState(next={}){
  state={...state,...next};const e=clamp(state.explode||0,0,1);currentPose=solvePlatformPose(clamp(state.tiltX||0,-ORIGINAL_GEOMETRY.maxTilt,ORIGINAL_GEOMETRY.maxTilt),clamp(state.tiltZ||0,-ORIGINAL_GEOMETRY.maxTilt,ORIGINAL_GEOMETRY.maxTilt));
  const U=new THREE.Vector3(...toWorld(currentPose.u)),N=new THREE.Vector3(...toWorld(currentPose.normal)),Z=new THREE.Vector3(...toWorld(currentPose.v)).negate();plate.position.copy(world(currentPose.center)).addScaledVector(N,STACK);plate.quaternion.setFromRotationMatrix(matrix.makeBasis(U,N,Z));
  sensorStack.position.y=e*.060;topDeck.position.y=e*.140;ball.position.set(state.ballX||0,.0015+BALL_R+e*.220,state.ballZ||0);ball.rotation.set((state.ballZ||0)/BALL_R,0,-(state.ballX||0)/BALL_R);
  // Assemble the two links from one IK solution. The shared elbow is the end
  // of link1 AND the start of link2; no independent rotations or stretching.
  currentPose.legs.forEach((chain,i)=>{const leg=legs[i],A=world(chain.base),B=world(chain.elbow),C=world(chain.target),T=new THREE.Vector3(...toWorld(chain.tangent));orient(leg.lowerLink,A,B,T);orient(leg.upperLink,B,C,T);[A,B,C].forEach((p,j)=>{leg.joints[j].position.copy(p);leg.joints[j].quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),T)});leg.connector.position.copy(C);leg.connector.quaternion.copy(plate.quaternion)});
  camera.zoom=1.5/(1+.55*e);camera.lookAt(0,.125+e*.060,0);camera.updateProjectionMatrix();return api;
 }
 function render(){renderer.render(scene,camera);return api}
 function resize(w,h){width=Math.max(1,w);height=Math.max(1,h);renderer.setSize(width,height,false);canvas.style.width='100%';canvas.style.height='100%';camera.aspect=width/height;camera.updateProjectionMatrix();render();return api}
 function geometryFromMesh(source){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(source.attributes.position.array.map(v=>v*.001),3));if(source.attributes.normal)g.setAttribute('normal',new THREE.Float32BufferAttribute(source.attributes.normal.array,3));g.setIndex(source.index.array);if(!source.attributes.normal)g.computeVertexNormals();return g}
 const ready=Promise.all(['arm-link-1.json','arm-link-2.json'].map(async(name)=>{const response=await fetch(new URL(name,assetBase));if(!response.ok)throw new Error('Missing original STEP mesh '+name);return response.json()})).then(data=>{for(const leg of legs){leg.lowerLink.remove(leg.lowerProxy);leg.lowerProxy.geometry.dispose();leg.upperLink.remove(leg.upperProxy);leg.upperProxy.geometry.dispose();data[0].meshes.forEach(source=>{const m=mesh(geometryFromMesh(source),mats.arm,leg.lowerLink);m.position.z=-.00225});data[1].meshes.forEach(source=>{const m=mesh(geometryFromMesh(source),mats.arm,leg.upperLink);m.rotation.z=Math.PI;m.position.set(0,.060,-.00225)})}setState(state);render();return api});
 function pickPlatePoint(clientX,clientY){const rect=canvas.getBoundingClientRect(),p=new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1),ray=new THREE.Raycaster();ray.setFromCamera(p,camera);const normal=up.clone().applyQuaternion(plate.quaternion),surface=new THREE.Plane().setFromNormalAndCoplanarPoint(normal,plate.position),hit=new THREE.Vector3();if(!ray.ray.intersectPlane(surface,hit))return null;plate.worldToLocal(hit);return {x:hit.x,z:hit.z}}
 const api={canvas,renderer,scene,camera,ready,setState,render,resize,pickPlatePoint,getState:()=>({...state}),getKinematics:()=>currentPose,dispose(){renderer.dispose();scene.traverse(obj=>obj.geometry?.dispose());Object.values(mats).forEach(m=>m.dispose())}};
 resize(width,height);setState(state);render();return api;
}
