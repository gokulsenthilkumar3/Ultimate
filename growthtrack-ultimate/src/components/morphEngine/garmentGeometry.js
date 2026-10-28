import { Box3,Float32BufferAttribute, Vector3 } from 'three';

export const GARMENT_REGIONS=Object.freeze({torso:0,leg:1,upperArm:2,forearm:3,head:4,hand:5,foot:6,pelvis:7});
function regionFor(bone) {
  const name=bone.name,group=bone.userData.digitBinding?.group;
  if(group?.endsWith('Hand') || /Hand|Finger|Thumb|(?:Left|Right)(?:Index|Middle|Ring|Pinky)/i.test(name)) return GARMENT_REGIONS.hand;
  if(/Foot|Toe/i.test(name)) return GARMENT_REGIONS.foot;
  if(/Head|Neck/i.test(name)) return GARMENT_REGIONS.head;
  if(/ForeArm/i.test(name)) return GARMENT_REGIONS.forearm;
  if(/UpperArm|Shoulder/i.test(name)) return GARMENT_REGIONS.upperArm;
  if(/Leg/i.test(name)) return GARMENT_REGIONS.leg;
  if(/Hips|Pelvis/i.test(name)) return GARMENT_REGIONS.pelvis;
  return GARMENT_REGIONS.torso;
}
/** An independently owned cloth shell with the body's rig and morph topology.
 * Per-bone region attributes prevent horizontal garment bands on the hands.
 * Ease is real geometry, while weave, seams and hem trim use the material. */
export function prepareGarmentAttributes(body,geometry=body?.geometry,{includeAnkles=false}={}) {
  if(!body?.geometry?.attributes.position) return null;
  const source=body.geometry,position=source.attributes.position;
  const bounds=new Box3().setFromBufferAttribute(position);
  const height=bounds.max.y-bounds.min.y;
  const indices=source.attributes.skinIndex,weights=source.attributes.skinWeight;
  const regions=new Float32Array(position.count);
  const coverage=new Float32Array(position.count*4);
  for(let i=0;i<position.count;i++) {
    let dominant=0;
    for(let k=1;k<(weights?.itemSize || 0);k++) if(weights.getComponent(i,k)>weights.getComponent(i,dominant)) dominant=k;
    const bone=body.skeleton?.bones[indices?.getComponent(i,dominant)];
    regions[i]=bone?regionFor(bone):0;
    const region=regions[i];
    // Interpolate coverage, never categorical IDs. Interpolating torso=0 and
    // pelvis=7 produced unsupported IDs inside triangles and cut holes in cloth.
    // Ankle vertices may be weighted to Foot rather than Leg. Height/cuff
    // boundaries decide where trousers stop, instead of exposing skin islands.
    coverage[i*4]=region===GARMENT_REGIONS.leg || region===GARMENT_REGIONS.pelvis || (includeAnkles && region===GARMENT_REGIONS.foot)?1:0;
    // Upper-thigh weights extend into the hips; height bands, rather than the
    // joint ownership, define an even shirt hem across the whole pelvis.
    coverage[i*4+1]=region===GARMENT_REGIONS.torso || region===GARMENT_REGIONS.pelvis || region===GARMENT_REGIONS.leg?1:0;
    coverage[i*4+2]=region===GARMENT_REGIONS.upperArm?1:0;
    coverage[i*4+3]=region===GARMENT_REGIONS.forearm?1:0;
  }
  geometry.setAttribute('garmentRegion',new Float32BufferAttribute(regions,1));
  geometry.setAttribute('garmentCoverage',new Float32BufferAttribute(coverage,4));
  const coordinates=new Float32Array(position.count*3),scale=1.92/height;
  for(let i=0;i<position.count;i++){coordinates[i*3]=position.getX(i)*scale;coordinates[i*3+1]=(position.getY(i)-bounds.min.y)*scale;coordinates[i*3+2]=position.getZ(i)*scale;}
  geometry.setAttribute('garmentCoordinates',new Float32BufferAttribute(coordinates,3));
  return {position,height,regions};
}

export function createGarmentGeometry(body,{fit='regular'} = {}) {
  if(!body?.geometry?.attributes.position) return null;
  const source=body.geometry,geometry=source.clone();
  const {position,height,regions}=prepareGarmentAttributes(body,geometry);
  const ease=height*({fitted:.0018,regular:.0038,relaxed:.009}[fit] || .0038);
  const normal=new Vector3(); let lastVersion=-1;
  const update=()=> {
    if(lastVersion===source.attributes.position.version) return;
    lastVersion=source.attributes.position.version;
    const values=geometry.attributes.position.array;
    for(let i=0;i<position.count;i++) {
      normal.fromBufferAttribute(source.attributes.normal,i);
      const region=regions[i],amount=ease*(region===GARMENT_REGIONS.torso||region===GARMENT_REGIONS.upperArm?1.3:1);
      values[i*3]=position.getX(i)+normal.x*amount;
      values[i*3+1]=position.getY(i)+normal.y*amount;
      values[i*3+2]=position.getZ(i)+normal.z*amount;
    }
    geometry.attributes.position.needsUpdate=true; geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  };
  update();
  return {geometry,update,dispose:()=>geometry.dispose()};
}
