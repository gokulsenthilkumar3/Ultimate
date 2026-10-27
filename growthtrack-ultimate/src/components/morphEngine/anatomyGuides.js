import { BufferGeometry, Float32BufferAttribute, Group, Line, LineBasicMaterial, LineLoop, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three';
import {transformSacPoint} from './nativeSacFit';
import {compileMaterialSection,evaluateSection} from './nativeSurfaceMeasurement';

/** Optional schematic guides, locally rendered only with the adult reveal. */
export function createAnatomyGuides(mesh,evidence) {
  const rendered=mesh;
  mesh=mesh?.nativeGuideSource || mesh;
  if(!mesh || !evidence) return null;
  const group=new Group(); group.name='PrivateMeasurementGuides'; group.userData.sensitive=true;
  const {segments,baseRing,midRing,shaftRings}=mesh.userData.layout;
  const point=new Vector3(),position=mesh.geometry.attributes.position;
  const updates=[];
  const lines=new LineBasicMaterial({color:'#67d9f2',transparent:true,opacity:.85,depthTest:false});
  for(const ring of [baseRing,midRing,Math.min(shaftRings-1,Math.round(shaftRings*.68))]) {
    const nativeSection=rendered?.userData.nativeBinding?compileMaterialSection(rendered.geometry,(mesh.geometry.attributes.uv.getY(ring*segments)-.02)/.46):null;
    if(nativeSection){
      const read=()=>evaluateSection(nativeSection,rendered.geometry.attributes.position,1)?.points || [];
      const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(read().flatMap(point=>point.toArray()),3));
      const line=new LineLoop(geometry,lines);line.renderOrder=12;group.add(line);
      updates.push(()=>{read().forEach((point,i)=>point.toArray(geometry.attributes.position.array,i*3));geometry.attributes.position.needsUpdate=true;geometry.computeBoundingSphere();});
      continue;
    }
    const points=[];
    for(let k=0;k<segments;k++) { mesh.getVertexPosition(ring*segments+k,point); points.push(...point); }
    const geometry=new BufferGeometry(); geometry.setAttribute('position',new Float32BufferAttribute(points,3));
    const line=new LineLoop(geometry,lines); line.renderOrder=12; group.add(line);
    updates.push(()=>{
      for(let k=0;k<segments;k++){mesh.getVertexPosition(ring*segments+k,point);point.toArray(geometry.attributes.position.array,k*3);}
      geometry.attributes.position.needsUpdate=true;geometry.computeBoundingSphere();
    });
  }
  const centreline=[];
  const nativeCenters=()=>rendered.userData.surfaceMeasurements?.stations?.map(station=>{
    const point=new Vector3().fromArray(station.center);point.y/=evidence.heightScale || 1;return point;
  });
  const nativeInitial=rendered?.userData.nativeBinding?nativeCenters():null;
  if(nativeInitial)centreline.push(...nativeInitial.flatMap(point=>point.toArray()));
  else for(let ring=baseRing;ring<shaftRings;ring++) {
    const c=new Vector3(); for(let k=0;k<segments;k++) { mesh.getVertexPosition(ring*segments+k,point); c.addScaledVector(point,1/segments); } centreline.push(...c);
  }
  const geometry=new BufferGeometry(); geometry.setAttribute('position',new Float32BufferAttribute(centreline,3));
  group.add(new Line(geometry,lines));
  updates.push(()=>{
    if(nativeInitial){
      nativeCenters()?.forEach((point,i)=>point.toArray(geometry.attributes.position.array,i*3));geometry.attributes.position.needsUpdate=true;geometry.computeBoundingSphere();return;
    }
    for(let ring=baseRing;ring<shaftRings;ring++){
      const center=new Vector3();for(let k=0;k<segments;k++){mesh.getVertexPosition(ring*segments+k,point);center.addScaledVector(point,1/segments);}
      center.toArray(geometry.attributes.position.array,(ring-baseRing)*3);
    }
    geometry.attributes.position.needsUpdate=true;geometry.computeBoundingSphere();
  });
  evidence.guides.forEach((guide,index)=> {
    const material=new MeshBasicMaterial({color:index?'#d7a6ef':'#73dfc0',wireframe:true,transparent:true,opacity:.6,depthTest:false});
    const sphere=new Mesh(new SphereGeometry(1,20,12),material);
    sphere.name=`Schematic_${guide.side}`; sphere.userData={sensitive:true,schematic:true};
    const [length,width,depth]=guide.dimensions;
    sphere.geometry.scale(width*evidence.unit/2,length*evidence.unit/2,depth*evidence.unit/2);
    sphere.geometry.rotateZ((guide.rotationDeg || 0)*Math.PI/180);
    sphere.geometry.scale(1,1/evidence.heightScale,1);
    sphere.geometry.translate(...guide.position);
    const rest=sphere.geometry.attributes.position.array.slice(),anchor=Math.min(position.count-1,mesh.userData.layout.tipVertex+1);
    updates.push(()=>{
      const delta=new Vector3();
      // The source anchor carries body-follow morph offsets as well as pose.
      Mesh.prototype.getVertexPosition.call(mesh,anchor,delta);
      delta.sub(new Vector3().fromBufferAttribute(position,anchor));
      for(let i=0;i<rest.length/3;i++){
        point.fromArray(rest,i*3).add(delta);
        if(mesh.isSkinnedMesh)mesh.applyBoneTransform(anchor,point);
        if(rendered?.userData.nativeBinding){
          transformSacPoint(point,rendered.userData.sacSurfaceTransform);
          point.add(new Vector3().fromArray(rendered.userData.contactEvidence?.sacDisplacement || [0,0,0]));
        }
        point.toArray(sphere.geometry.attributes.position.array,i*3);
      }
      sphere.geometry.attributes.position.needsUpdate=true;sphere.geometry.computeBoundingSphere();
    });
    sphere.renderOrder=12; group.add(sphere);
  });
  group.position.copy(mesh.position); group.quaternion.copy(mesh.quaternion); group.scale.copy(mesh.scale);
  group.userData.update=()=>{
    mesh.updateWorldMatrix(true,false);mesh.updateMatrixWorld(true);
    for(const bone of mesh.skeleton?.bones || [])if(!bone.parent?.isBone)bone.updateWorldMatrix(true,true);
    mesh.skeleton?.update();updates.forEach(update=>update());
  };
  group.userData.update();
  group.userData.dispose=()=>{
    const materials=new Set();group.traverse(node=>{node.geometry?.dispose();if(node.material)materials.add(node.material);});
    materials.forEach(material=>material.dispose());
  };
  return group;
}
