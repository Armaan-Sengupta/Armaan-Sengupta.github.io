// Ported from the user's Redstone-ray/3YDP StewartPlatform/Code/SPV4.py.
// Source units cm are converted to SI here. Original reference is retained below.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const scale=(a,s)=>a.map(v=>v*s);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>Math.hypot(...a);
const unit=a=>scale(a,1/norm(a));
export const ORIGINAL_GEOMETRY=Object.freeze({triangleSide:.259,baseRadius:.100,link1:.080,link2:.100,platformHeight:.106,baseAngles:[90,210,330],plateRadius:.150,ballRadius:.0254,ballMass:.531,maxTilt:14*Math.PI/180});
export function originalPlatformPoints(normal,center=[0,0,.106],geometry=ORIGINAL_GEOMETRY){
 const n=unit(normal),v=unit(cross(n,[1,0,0])),u=unit(cross(v,n));
 const a=geometry.triangleSide/(2*Math.cos(Math.PI/6));
 const x1=add(center,scale(v,a));
 const x2=add(add(center,scale(v,-a*Math.sin(Math.PI/6))),scale(u,a*Math.cos(Math.PI/6)));
 const x3=add(add(center,scale(v,-a*Math.sin(Math.PI/6))),scale(u,-a*Math.cos(Math.PI/6)));
 return {x1,x2,x3,u,v,n,a};
}
export function originalAnglesAtBase(target,baseDegrees,geometry=ORIGINAL_GEOMETRY){
 const l=geometry.link1,m=geometry.link2,b=geometry.baseRadius;
 const r=Math.hypot(target[0],target[1]),z=target[2];let t1;
 if(Math.abs(baseDegrees-90)<1){const A=m*m-(b-target[1])**2-l*l-z*z,B=2*(b-target[1])*l,C=2*z*l,D=Math.hypot(B,C);t1=Math.acos(clamp(A/D,-1,1))-Math.acos(clamp(B/D,-1,1));}
 else{const A=-(m*m-(b-r)**2-l*l-z*z),B=2*(b-r)*l,C=2*z*l,D=Math.hypot(B,C);t1=Math.asin(clamp(A/D,-1,1))+Math.asin(clamp(B/D,-1,1));}
 const t2=Math.asin(clamp((z-l*Math.sin(t1))/m,-1,1));return [t1,t2];
}
export function originalInverseKinematics(normal,center=[0,0,.106],geometry=ORIGINAL_GEOMETRY){const points=originalPlatformPoints(normal,center,geometry);return {...points,angles:[originalAnglesAtBase(points.x1,90,geometry),originalAnglesAtBase(points.x3,210,geometry),originalAnglesAtBase(points.x2,330,geometry)]};}
export function solvePlatformPose(tiltX=0,tiltZ=0,geometry=ORIGINAL_GEOMETRY){
 // Browser is Y-up; Python is Z-up. This normal corresponds to the browser's
 // requested X/Z tilts. Preserve the original cross-product basis convention.
 const normal=[-Math.sin(tiltZ),-Math.sin(tiltX)*Math.cos(tiltZ),Math.cos(tiltX)*Math.cos(tiltZ)];
 const original=originalPlatformPoints(normal,[0,0,geometry.platformHeight],geometry);
 const phis=geometry.baseAngles.map(a=>a*Math.PI/180),radials=phis.map(a=>[Math.cos(a),Math.sin(a),0]),tangents=phis.map(a=>[-Math.sin(a),Math.cos(a),0]);
 // Fixed parallel R axes constrain each chain to its radial plane. The original
 // visualizer ignores tiny parasitic XY/yaw motion under compound tilt. Solve
 // those three plane constraints, rather than stretching the upper link.
 let A=0,B=0;
 phis.forEach((p,i)=>{A+=dot(tangents[i],add(scale(original.u,Math.cos(p)),scale(original.v,Math.sin(p))));B+=dot(tangents[i],add(scale(original.v,Math.cos(p)),scale(original.u,-Math.sin(p))));});
 const yaw=Math.atan2(-A,B),c=Math.cos(yaw),s=Math.sin(yaw),u=add(scale(original.u,c),scale(original.v,s)),v=add(scale(original.v,c),scale(original.u,-s));
 const offsets=phis.map(p=>scale(add(scale(u,Math.cos(p)),scale(v,Math.sin(p))),original.a));
 const rhs=offsets.map((p,i)=>-dot(tangents[i],p)),det=tangents[0][0]*tangents[1][1]-tangents[0][1]*tangents[1][0];
 const center=[(rhs[0]*tangents[1][1]-tangents[0][1]*rhs[1])/det,(tangents[0][0]*rhs[1]-rhs[0]*tangents[1][0])/det,geometry.platformHeight];
 const points=offsets.map(p=>add(center,p));let reachable=true;
 const legs=points.map((target,i)=>{const radial=radials[i],base=scale(radial,geometry.baseRadius),d=target.map((x,k)=>x-base[k]),dr=dot(d,radial),h=d[2],D=Math.hypot(dr,h),l=geometry.link1,m=geometry.link2;
  if(D>l+m+1e-10||D<Math.abs(l-m)-1e-10)reachable=false;
  const theta1=Math.atan2(h,dr)-Math.acos(clamp((l*l+D*D-m*m)/(2*l*D),-1,1));
  const elbow=add(add(base,scale(radial,l*Math.cos(theta1))),[0,0,l*Math.sin(theta1)]);
  const upper=target.map((x,k)=>x-elbow[k]);
  return {base,elbow,target,radial,tangent:tangents[i],theta1,theta2:Math.atan2(upper[2],-dot(upper,radial)),link1Length:norm(elbow.map((x,k)=>x-base[k])),link2Length:norm(upper),planeError:Math.abs(dot(tangents[i],target)),closureError:Math.abs(norm(upper)-m)};
 });
 return {normal:original.n,u,v,center,points,legs,yaw,reachable};
}
export const toWorld=p=>[p[0],p[2],-p[1]];
