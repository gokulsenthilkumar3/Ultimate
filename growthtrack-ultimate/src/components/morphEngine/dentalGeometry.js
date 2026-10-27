import {BufferGeometry, Float32BufferAttribute} from 'three';

/** An authored procedural fallback, not measured dentition. These distinct
 * crown outlines are a rendering fixture; no person's tooth count is inferred. */
export const FALLBACK_DENTAL_ARCH = Object.freeze([
  {kind:'central-incisor', width:.0078, height:.008, depth:.0050, angle:.13},
  {kind:'lateral-incisor', width:.0062, height:.0073, depth:.0048, angle:.37},
  {kind:'canine', width:.0064, height:.0083, depth:.0060, angle:.61},
  {kind:'first-premolar', width:.0064, height:.0068, depth:.0070, angle:.85},
  {kind:'second-premolar', width:.0065, height:.0064, depth:.0072, angle:1.09},
  {kind:'first-molar', width:.0088, height:.0060, depth:.0085, angle:1.38},
  {kind:'second-molar', width:.0082, height:.0055, depth:.0080, angle:1.69},
].map(tooth=>Object.freeze(tooth)));

/** Closed crown mesh. Incisors have a broad cutting edge, a canine has one
 * point, premolars two cusps and molars four. Gum and crown remain separate. */
export function createFallbackCrown({kind,width,height,depth}) {
  const positions=[],indices=[],sides=20;
  const anterior=kind.includes('incisor'),canine=kind==='canine';
  const cusps=anterior?[]:canine?[[0,0,1]]:kind.includes('premolar')?
    [[0,-.55,.85],[0,.55,1]]:[[-.47,-.47,.85],[.47,-.47,.95],[-.47,.47,1],[.47,.47,.9]];
  const top=(x,z)=>{
    if(anterior)return height*(.91+.09*(1-x*x)-.09*z*z);
    let cusp=0;
    for(const [cx,cz,strength] of cusps)cusp=Math.max(cusp,strength*Math.exp(-((x-cx)**2+(z-cz)**2)*3.8));
    return height*(.72+.28*cusp);
  };
  const ring=(radius,y,topSurface=false)=>{
    for(let j=0;j<sides;j++) {
      const a=j/sides*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
      const exponent=anterior ? .48 : .65;
      const x=Math.sign(c)*Math.abs(c)**exponent*radius;
      const z=Math.sign(s)*Math.abs(s)**exponent*radius;
      positions.push(x*width/2,topSurface?top(x,z):y,z*depth/2*(anterior && topSurface ? .38 : 1));
    }
  };
  // Cervical taper and fuller crown body are distinct from the biting surface.
  ring(.70,0);ring(.94,height*.28);ring(1,height*.63);
  ring(1,0,true);ring(.63,0,true);ring(.28,0,true);
  const rings=positions.length/3/sides;
  for(let i=0;i<rings-1;i++)for(let j=0;j<sides;j++) {
    const a=i*sides+j,b=i*sides+(j+1)%sides,c=a+sides,d=b+sides;
    indices.push(a,c,b,b,c,d);
  }
  const bottom=positions.length/3;positions.push(0,0,0);
  const cap=positions.length/3;positions.push(0,top(0,0),0);
  for(let j=0;j<sides;j++) {
    indices.push(bottom,j,(j+1)%sides);
    indices.push(cap,(rings-1)*sides+(j+1)%sides,(rings-1)*sides+j);
  }
  const geometry=new BufferGeometry();
  geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  geometry.userData={kind,provenance:'growthtrack-procedural-dental-fallback-v1'};
  return geometry;
}
