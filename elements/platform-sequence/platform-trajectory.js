import {BallBalanceSimulation} from '../platform/platform-physics.js';
export const PLATFORM_SEQUENCE_DURATION=12;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smootherstep=v=>{v=clamp(v,0,1);return v*v*v*(v*(v*6-15)+10)};
// Choreograph one finite impulse through the SAME sourced physical controller
// used by the interactive element. Only the sub-millimeter end tail is faded
// for an exact video-to-live handoff; the visible transient is simulated.
const simulation=new BallBalanceSimulation(),step=simulation.dt,samples=[];
simulation.impulse(.12,-.08);samples.push(simulation.snapshot());
for(let t=step;t<=6.3+step;t+=step){simulation.step();samples.push(simulation.snapshot())}
export function platformSequenceState(seconds){
 const t=clamp(Number(seconds)||0,0,PLATFORM_SEQUENCE_DURATION),state={tiltX:0,tiltZ:0,ballX:0,ballZ:0,explode:0};
 if(t<4.3){state.explode=1-smootherstep((t-.8)/3.5);return state}
 if(t>=10.6)return state;
 const elapsed=t-4.3,index=elapsed/step,lo=Math.floor(index),f=index-lo,a=samples[lo],b=samples[Math.min(lo+1,samples.length-1)],endFade=1-smootherstep((elapsed-5.7)/.6);
 for(const key of ['tiltX','tiltZ','ballX','ballZ'])state[key]=(a[key]+(b[key]-a[key])*f)*endFade;
 return state;
}
