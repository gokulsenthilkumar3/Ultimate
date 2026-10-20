import {Box3,BufferAttribute,Vector3} from 'three';

/** Owned, independently fitted garment topology. Only the binding samples are
 * shared with the body; no body triangles are repainted as clothing. Skinning
 * handles pose, while these surface bindings follow all active body morphs. */
export function createAuthoredGarment(body,source,options={}) {
  const bindings=source?.geometry?.getAttribute('_body_indices');
  const sourceGeometry=source?.geometry,bodyGeometry=body?.geometry;
  if(!bindings || source.userData.bodyVertexCount!==bodyGeometry?.attributes.position.count) return null;
  const geometry=sourceGeometry.clone(),rest=sourceGeometry.attributes.position;
  const bary=geometry.getAttribute('_body_bary'),anchors=geometry.getAttribute('_body_anchor');
  geometry.setAttribute('garmentCoverage',geometry.getAttribute('_garment_coverage'));
  const bounds=new Box3().setFromBufferAttribute(bodyGeometry.attributes.position),height=bounds.max.y-bounds.min.y,scale=1.92/height;
  const coordinates=new Float32Array(rest.count*3);
  for(let i=0;i<rest.count;i++) {coordinates[i*3]=rest.getX(i)*scale;coordinates[i*3+1]=(rest.getY(i)-bounds.min.y)*scale;coordinates[i*3+2]=rest.getZ(i)*scale;}
  geometry.setAttribute('garmentCoordinates',new BufferAttribute(coordinates,3));
  const weld=geometry.getAttribute('_garment_weld'),groups=new Map();
  if(weld)for(let i=0;i<weld.count;i++){const id=weld.getX(i);if(!groups.has(id))groups.set(id,[]);groups.get(id).push(i);}
  const seams=[...groups.values()].filter(group=>group.length>1);
  const evaluated=new Map(),point=new Vector3(),delta=new Vector3(),normal=new Vector3();
  const ease=(Number(options.easeCm) || 0)*height/175;
  const nativeFit={fitted:.65,regular:1,relaxed:1.6}[options.fit] || 1;
  const length=(Number(options.hemLength)||100)/100;
  let previous='';
  const update=()=> {
    const influences=body.morphTargetInfluences || [];
    const signature=bodyGeometry.attributes.position.version+':'+influences.join(',');
    if(signature===previous) return;previous=signature;evaluated.clear();
    const active=Array.from(influences).flatMap((weight,i)=>weight && bodyGeometry.morphAttributes.position?.[i] ? [[weight,bodyGeometry.morphAttributes.position[i]]] : []);
    const vertex=id=> {
      if(!evaluated.has(id)) {
        const p=new Vector3().fromBufferAttribute(bodyGeometry.attributes.position,id);
        for(const [weight,morph] of active) {point.fromBufferAttribute(morph,id);if(!bodyGeometry.morphTargetsRelative)point.sub(new Vector3().fromBufferAttribute(bodyGeometry.attributes.position,id));p.addScaledVector(point,weight);}
        evaluated.set(id,p);
      }
      return evaluated.get(id);
    };
    const position=geometry.attributes.position;
    for(let i=0;i<rest.count;i++) {
      delta.set(0,0,0);
      for(let k=0;k<3;k++) delta.addScaledVector(vertex(bindings.getComponent(i,k)),bary.getComponent(i,k));
      delta.sub(new Vector3().fromBufferAttribute(anchors,i));
      point.fromBufferAttribute(rest,i).add(delta);
      // Fit scales the authored pattern's native clearance. Added ease remains
      // an independent centimetre offset rather than changing with the fit menu.
      delta.fromBufferAttribute(rest,i).sub(new Vector3().fromBufferAttribute(anchors,i));
      point.addScaledVector(delta,nativeFit-1);
      normal.fromBufferAttribute(sourceGeometry.attributes.normal,i);
      point.addScaledVector(normal,ease);
      // Extend lower hems in garment space. Authored folds and cuff construction
      // remain attached; this is an ease/length adjustment, not cloth physics.
      if(geometry.attributes.garmentCoverage.getX(i)>.5) {
        const y=coordinates[i*3+1],blend=Math.max(0,Math.min(1,(.95-y)/.8));
        point.y-=(length-1)*height*.14*blend;
        point.y+=(Number(options.waistRiseCm)||0)*height/175*Math.max(0,Math.min(1,(y-.72)/.25));
      }
      point.toArray(position.array,i*3);
    }
    position.needsUpdate=true;geometry.computeVertexNormals();
    for(const group of seams) {
      normal.set(0,0,0);for(const i of group)normal.add(point.fromBufferAttribute(geometry.attributes.normal,i));normal.normalize();
      for(const i of group)geometry.attributes.normal.setXYZ(i,normal.x,normal.y,normal.z);
    }
    geometry.computeBoundingSphere();
  };
  update();
  return {geometry,update,authored:true,dispose:()=>geometry.dispose()};
}

export function publishGarmentEvidence(canvas,preset,shell,variant) {
  canvas.dataset.wardrobeSource=shell?.authored?'authored-garment':shell?'body-shell':'none';
  canvas.dataset.wardrobePreset=preset;
  canvas.dataset.wardrobeStyle=variant || '';
  canvas.dataset.wardrobeVertices=String(shell?.geometry.attributes.position.count || 0);
}
