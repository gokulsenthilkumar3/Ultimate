import { BufferGeometry, Float32BufferAttribute, Group, Line, LineBasicMaterial, LineLoop, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three';

/** Optional schematic guides, locally rendered only with the adult reveal. */
export function createAnatomyGuides(mesh,evidence) {
  if(!mesh || !evidence) return null;
  const group=new Group(); group.name='PrivateMeasurementGuides'; group.userData.sensitive=true;
  const {segments,baseRing,midRing,shaftRings}=mesh.userData.layout;
  const point=new Vector3(),position=mesh.geometry.attributes.position;
  const lines=new LineBasicMaterial({color:'#67d9f2',transparent:true,opacity:.85,depthTest:false});
  for(const ring of [baseRing,midRing,Math.min(shaftRings-1,Math.round(shaftRings*.68))]) {
    const points=[];
    for(let k=0;k<segments;k++) { mesh.getVertexPosition(ring*segments+k,point); points.push(...point); }
    const geometry=new BufferGeometry(); geometry.setAttribute('position',new Float32BufferAttribute(points,3));
    const line=new LineLoop(geometry,lines); line.renderOrder=12; group.add(line);
  }
  const centreline=[];
  for(let ring=baseRing;ring<shaftRings;ring++) {
    const c=new Vector3(); for(let k=0;k<segments;k++) { mesh.getVertexPosition(ring*segments+k,point); c.addScaledVector(point,1/segments); } centreline.push(...c);
  }
  const geometry=new BufferGeometry(); geometry.setAttribute('position',new Float32BufferAttribute(centreline,3));
  group.add(new Line(geometry,lines));
  evidence.guides.forEach((guide,index)=> {
    const material=new MeshBasicMaterial({color:index?'#d7a6ef':'#73dfc0',wireframe:true,transparent:true,opacity:.6,depthTest:false});
    const sphere=new Mesh(new SphereGeometry(1,20,12),material);
    sphere.name=`Schematic_${guide.side}`; sphere.userData={sensitive:true,schematic:true};
    sphere.position.fromArray(guide.position);
    if(mesh.isSkinnedMesh) mesh.applyBoneTransform(Math.min(position.count-1,mesh.userData.layout.tipVertex+1),sphere.position);
    const [length,width,depth]=guide.dimensions;
    sphere.scale.set(width*evidence.unit/2,length*evidence.unit/2/evidence.heightScale,depth*evidence.unit/2);
    sphere.renderOrder=12; group.add(sphere);
  });
  group.position.copy(mesh.position); group.quaternion.copy(mesh.quaternion); group.scale.copy(mesh.scale);
  group.userData.dispose=()=>group.traverse(node=>{node.geometry?.dispose();node.material?.dispose();});
  return group;
}
