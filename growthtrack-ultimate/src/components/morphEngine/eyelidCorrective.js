import { Box3, Float32BufferAttribute, Matrix4, Vector3 } from 'three';

const smooth = (a,b,x) => { const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t); };

/** Correct the bundled asset's whole-face "blink" using its eye apertures.
 * Applied only to the bundled family, on clone-owned geometry. Custom assets
 * keep their authored expressions. Coordinates below are fitted to that
 * family's 1.7304 m rest mesh, not asserted as universal human proportions. */
export function prepareEyelidCorrective(body, features) {
  const geometry=body?.geometry,index=body?.morphTargetDictionary?.blink;
  const eyes=features?.find(item=>item.feature==='eyes')?.mesh;
  if(index==null || !geometry?.morphTargetsRelative || !eyes)return null;
  body.updateWorldMatrix(true,false);eyes.updateWorldMatrix(true,false);
  const inverse=new Matrix4().copy(body.matrixWorld).invert();
  const eyeToBody=new Matrix4().multiplyMatrices(inverse,eyes.matrixWorld);
  const boxes=[new Box3(),new Box3()],point=new Vector3();
  const eyePosition=eyes.geometry.attributes.position;
  for(let i=0;i<eyePosition.count;i++) {
    point.fromBufferAttribute(eyePosition,i).applyMatrix4(eyeToBody);
    boxes[point.x<0?0:1].expandByPoint(point);
  }
  const stature=new Box3().setFromBufferAttribute(geometry.attributes.position).getSize(new Vector3()).y;
  const scale=stature/1.7304;
  const position=geometry.attributes.position;
  const landmarks=boxes.map(box=>{
    const center=box.getCenter(new Vector3());
    // Find the gap between the upper and lower lid in a narrow front slice.
    const levels=[];
    for(let i=0;i<position.count;i++) {
      const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
      if(Math.abs(x-center.x)<.004*scale && Math.abs(y-center.y)<.012*scale && z>box.max.z-.004*scale)levels.push(y);
    }
    levels.sort((a,b)=>a-b);
    let gap=0,lower=null,upper=null;
    for(let i=1;i<levels.length;i++) {
      const distance=levels[i]-levels[i-1];
      if(distance>gap){gap=distance;lower=levels[i-1];upper=levels[i];}
    }
    if(gap<.002*scale || gap>.012*scale)return null;
    return {x:center.x,lower,upper,closure:lower+gap*.2,front:box.max.z+.0005*scale,width:.016*scale};
  });
  if(landmarks.some(item=>!item))return null;

  const displacement=(p)=> {
    const eye=landmarks[p.x<0?0:1];
    const x=Math.abs(p.x-eye.x);
    const horizontal=1-smooth(eye.width,eye.width+.006*scale,x);
    const upper=p.y>(eye.lower+eye.upper)*.5;
    const margin=upper?eye.upper:eye.lower;
    const vertical=upper?1-smooth(eye.upper,eye.upper+.012*scale,p.y):smooth(eye.lower-.010*scale,eye.lower,p.y);
    const front=smooth(eye.front-.024*scale,eye.front-.014*scale,p.z);
    const weight=horizontal*vertical*front;
    // Preserve each corner's slight slope while both lid margins meet.
    const line=eye.closure + .001*scale*(x/eye.width)**2;
    // Translate each lid margin, fading toward its fixed crease. Projecting
    // every vertex onto the closure line flattened several rows into the same
    // plane and produced overlapping triangles during a full blink.
    // A shared mathematical line leaves a hairline opening where the real
    // upper/lower rims have slightly different curvature. Give them 0.35 mm
    // of contact on either side, with the upper lid just in front of the lower
    // one. This closes the seam without collapsing rows onto one plane.
    const contact = (upper ? -0.00035 : 0.00035) * scale;
    const lidFront = eye.front + (upper ? 0.0002 : -0.0002) * scale;
    return new Vector3(0,(line-margin+contact)*weight,Math.max(0,lidFront-p.z)*weight);
  };

  const update=(mesh, feature)=> {
    const slot=mesh.morphTargetDictionary?.blink;
    if(slot==null)return 0;
    const g=mesh.geometry,source=g.attributes.position;
    const deltas=new Float32Array(source.count*3);
    const toBody=new Matrix4().multiplyMatrices(inverse,mesh.matrixWorld);
    const fromBody=toBody.clone().invert();
    let moved=0;
    for(let i=0;i<source.count;i++) {
      if(feature!=='body' && feature!=='eyelashes')continue;
      const local=point.fromBufferAttribute(source,i).clone();
      const p=local.clone().applyMatrix4(toBody),delta=displacement(p);
      if(delta.lengthSq()<1e-14)continue;
      const transformed=p.add(delta).applyMatrix4(fromBody).sub(local);
      deltas.set(transformed.toArray(),i*3);moved++;
    }
    g.morphAttributes.position[slot]=new Float32BufferAttribute(deltas,3);
    // The old normal delta belongs to the discarded whole-face expression.
    // Derive a new one from the corrected closed surface instead.
    if(g.morphAttributes.normal?.length) {
      const closed=g.clone();closed.morphAttributes={};
      const positions=new Float32Array(source.array);
      positions.forEach((_,i)=>{positions[i]+=deltas[i];});
      closed.setAttribute('position',new Float32BufferAttribute(positions,3));closed.computeVertexNormals();
      const normals=new Float32Array(positions.length),base=g.attributes.normal;
      for(let i=0;i<source.count;i++) {
        const normal=new Vector3().fromBufferAttribute(closed.attributes.normal,i);
        if(deltas[i*3] || deltas[i*3+1] || deltas[i*3+2]) {
          if(normal.lengthSq()>.5)normal.sub(new Vector3().fromBufferAttribute(base,i));else normal.set(0,0,0);
          normals.set(normal.toArray(),i*3);
        }
      }
      g.morphAttributes.normal[slot]=new Float32BufferAttribute(normals,3);closed.dispose();
    }
    return moved;
  };
  const moved=update(body,'body');
  features.forEach(({mesh,feature})=>{mesh.updateWorldMatrix(true,false);update(mesh,feature);});
  return {method:'bundled-eye-aperture-closure-v2',moved,landmarks};
}
