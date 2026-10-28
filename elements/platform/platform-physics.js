import {ORIGINAL_GEOMETRY,solvePlatformPose} from './platform-kinematics.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const DEG=Math.PI/180;
// The source controller uses mm, seconds, and degree output, at 100 Hz.
// Gain defaults are the final main-script values from controller.py.
export class OriginalPIDController{
 constructor({kp=.06,ki=.020,kd=.03,pf=.002,outputLimit=14,derivativeFilter=.1,maxPTilt=5.5}={}){Object.assign(this,{kp,ki,kd,pf,outputLimit,derivativeFilter,maxPTilt});this.reset()}
 reset(){this.integral=0;this.lastError=0;this.filteredDerivative=0;this.initialized=false;}
 update(error,velocity,dt){if(!this.initialized){this.lastError=error;this.initialized=true;return 0}const p=clamp(this.kp*error,-this.maxPTilt,this.maxPTilt);if(Math.abs(this.integral*this.ki)<this.outputLimit*.8)this.integral+=error*dt;const raw=(error-this.lastError)/dt;this.filteredDerivative=this.derivativeFilter*raw+(1-this.derivativeFilter)*this.filteredDerivative;this.lastError=error;return clamp(p+this.ki*this.integral+this.kd*this.filteredDerivative-this.pf*velocity,-this.outputLimit,this.outputLimit)}
}
export class BallBalanceSimulation{
 constructor(options={}){this.dt=1/240;this.controlPeriod=.01;this.gravity=9.80665;this.mass=ORIGINAL_GEOMETRY.ballMass;this.radius=ORIGINAL_GEOMETRY.ballRadius;this.plateRadius=ORIGINAL_GEOMETRY.plateRadius;this.maxTilt=ORIGINAL_GEOMETRY.maxTilt;this.maxTiltRate=.85;this.servoTimeConstant=.095;this.drag=.025;this.restitution=.18;Object.assign(this,options);this.momentOfInertia=2/5*this.mass*this.radius**2;this.effectiveMass=this.mass+this.momentOfInertia/this.radius**2;this.inertiaFactor=this.mass/this.effectiveMass;this.pidX=new OriginalPIDController(options.pid);this.pidY=new OriginalPIDController(options.pid);this.reset()}
 reset(){this.x=0;this.z=0;this.vx=0;this.vz=0;this.tiltX=0;this.tiltZ=0;this.targetX=0;this.targetZ=0;this.elapsed=0;this.controlAccumulator=0;this.impulseCount=0;this.pidX?.reset();this.pidY?.reset();return this}
 impulse(vx,vz){this.vx=clamp(this.vx+vx,-.55,.55);this.vz=clamp(this.vz+vz,-.55,.55);this.impulseCount++;return this}
 applyImpulse(jx,jz){return this.impulse(jx/this.effectiveMass,jz/this.effectiveMass)}
 step(dt=this.dt){
  this.controlAccumulator+=dt;
  while(this.controlAccumulator>=this.controlPeriod){this.controlAccumulator-=this.controlPeriod;const roll=this.pidX.update(-1000*this.x,1000*this.vx,this.controlPeriod)*DEG;const pitch=this.pidY.update(1000*this.z,-1000*this.vz,this.controlPeriod)*DEG;this.targetZ=-roll;this.targetX=-pitch;}
  this.tiltX+=clamp((this.targetX-this.tiltX)/this.servoTimeConstant,-this.maxTiltRate,this.maxTiltRate)*dt;
  this.tiltZ+=clamp((this.targetZ-this.tiltZ)/this.servoTimeConstant,-this.maxTiltRate,this.maxTiltRate)*dt;
  const pose=solvePlatformPose(this.tiltX,this.tiltZ),g=this.gravity*this.inertiaFactor;
  // Contact-constrained rolling limit of the source Simscape rigid solid and
  // ballplateforces.c friction/torque model: I=(2/5)mr^2 and no-slip contact.
  this.vx+=(-g*pose.u[2]-this.drag*this.vx)*dt;this.vz+=(g*pose.v[2]-this.drag*this.vz)*dt;this.x+=this.vx*dt;this.z+=this.vz*dt;
  const limit=this.plateRadius-this.radius-.001,r=Math.hypot(this.x,this.z);if(r>limit){const nx=this.x/r,nz=this.z/r;this.x=nx*limit;this.z=nz*limit;const vn=this.vx*nx+this.vz*nz;if(vn>0){this.vx-=(1+this.restitution)*vn*nx;this.vz-=(1+this.restitution)*vn*nz}}
  if(Math.hypot(this.x,this.z)<2e-6&&Math.hypot(this.vx,this.vz)<2e-6&&Math.abs(this.tiltX)+Math.abs(this.tiltZ)<1e-5&&Math.abs(this.pidX.integral)+Math.abs(this.pidY.integral)<.01){this.x=this.z=this.vx=this.vz=this.tiltX=this.tiltZ=0;this.pidX.reset();this.pidY.reset()}
  this.elapsed+=dt;return this;
 }
 snapshot(){return {ballX:this.x,ballZ:this.z,tiltX:this.tiltX,tiltZ:this.tiltZ,explode:0}}
}
