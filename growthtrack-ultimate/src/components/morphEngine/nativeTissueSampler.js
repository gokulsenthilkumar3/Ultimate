import {Vector3} from 'three';
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};

/** Deform retained authored tissue vertices by their original loft coordinate.
 * No vertices, indices or topology are created by this driver. Large coverage
 * excursions follow the centerline instead of stretching a local triangle. */
export function createNativeTissueSampler(cage,read,{unit}){
  const {segments,baseRing,shaftRings}=cage.userData.layout,last=shaftRings-1;
  const ts=Array.from({length:shaftRings},(_,r)=>Math.max(0,(cage.geometry.attributes.uv.getY(r*segments)-.02)/.46));
  let centers,settings,tangent;
  const vertex=(r,k)=>read(cage,r*segments+k,new Vector3());
  const center=r=>{
    if(!centers.has(r)){const c=new Vector3();for(let k=0;k<segments;k++)c.addScaledVector(vertex(r,k),1/segments);centers.set(r,c);}return centers.get(r);
  };
  const section=t=>{
    let upper=ts.findIndex((v,i)=>i>=baseRing&&v>=t);if(upper<0)upper=last;
    const lower=Math.max(baseRing,upper-1),w=Math.max(0,Math.min(1,(t-ts[lower])/Math.max(1e-8,ts[upper]-ts[lower])));return {upper,lower,w};
  };
  return {begin(next){centers=new Map();settings=next;tangent=center(last).clone().sub(center(last-1)).normalize();},sample(kind,id,target){
    const row=Math.floor(id/segments),k=id%segments;
    if(kind==='meatus'){
      const inward=row/4,tip=center(last),offset=vertex(last,k).sub(tip).multiplyScalar(mix(1,.72,inward));
      return target.copy(tip).add(offset).addScaledVector(tangent,-unit*.45*inward);
    }
    const {coverage,retraction,coronaT}=settings,effective=coverage*(1-retraction),angle=k/segments*Math.PI*2;
    const outer=row<=20,roll=row>20&&row<28,phase=outer?row/20:roll?1:(48-row)/20;
    const start=mix(coronaT-.16,coronaT-.10,retraction),end=mix(coronaT-.065,1,effective);
    const edge=end+retraction*(.025*Math.sin(angle)+.01*Math.cos(angle*3)),attachment=start+retraction*.012*Math.sin(angle),t=mix(attachment,edge,phase);
    const {upper,lower,w}=section(t),c=center(lower).clone().lerp(center(upper),w),p=vertex(lower,k).lerp(vertex(upper,k),w),radial=p.clone().sub(c),radius=radial.length();radial.normalize();
    const rollAngle=roll?(row-20)/8*Math.PI:outer?0:Math.PI,glansCover=smooth(coronaT-.1,coronaT+.03,t)*effective;
    const barrel=unit*.08*glansCover*smooth(.87,.995,t),thickness=unit*mix(.045,.016,retraction)*(1-Math.cos(rollAngle));
    const fold=unit*.025*retraction*Math.sin(Math.PI*phase)**2*(.7+.2*Math.sin(angle*3)+.1*Math.cos(angle*5));
    const ventral=Math.max(0,-Math.sin(angle))**4;
    const lift=(unit*mix(.09,.05,retraction)+barrel+fold-thickness)*smooth(0,.35,phase)*(1-.65*retraction*ventral),rimRadius=unit*mix(.055,.014,retraction);
    target.copy(c).addScaledVector(radial,radius+lift+rimRadius*Math.sin(rollAngle)).addScaledVector(tangent,unit*.1*glansCover*smooth(.97,1,t));
    if(roll)target.addScaledVector(tangent,rimRadius*Math.sin(rollAngle));return target;
  }};
}
