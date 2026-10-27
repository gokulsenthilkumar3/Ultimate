import {BufferAttribute,Vector2,Vector3} from 'three';
import {posedNormal} from './anatomyTissueGeometry';

function fairWeights(data,passes){
  const width=data.anchors.length,count=data.weights.length;
  let values=new Float64Array(count*width),next=new Float64Array(values.length);
  data.weights.forEach((row,i)=>{for(const [anchor,weight] of row)values[i*width+anchor]=weight;});
  for(let pass=0;pass<passes;pass++){
    next.set(values);
    for(let i=0;i<count;i++)if(!data.locked[i] && data.neighbors[i].length){
      const neighbors=data.neighbors[i],offset=i*width,divisor=neighbors.length;next.fill(0,offset,offset+width);
      for(const id of neighbors){const source=id*width;for(let k=0;k<width;k++)next[offset+k]+=values[source+k]/divisor;}
    }
    [values,next]=[next,values];
  }
  return data.weights.map((_,i)=>{const row=[];for(let k=0;k<width;k++)if(values[i*width+k]>1e-10)row.push([k,values[i*width+k]]);return row;});
}

/** Evaluate the baked pair-of-pants junction with its exact boundary graph.
 * Fixed body, shaft and sac boundary vertices cannot drift to a nearby face.
 * No topology is generated at runtime.
 */
export function createNativeJunction(mesh,body,cage,rendered){
  const data=mesh.userData.nativeJunction,g=mesh.geometry;
  if(!data || data.version!==1 || data.weights.length!==g.attributes.position.count)return null;
  const count=data.weights.length,positionWeights=fairWeights(data,16),normalWeights=fairWeights(data,24);
  let previousColor=null,previousAttributes=null;
  const renderedIds=new Map(),ids=rendered?.geometry.attributes._cagevertex;
  if(ids)for(let i=0;i<ids.count;i++)renderedIds.set(ids.getX(i),i);
  const positions=data.anchors.map(()=>new Vector3()),normals=data.anchors.map(()=>new Vector3()),pigments=data.anchors.map(()=>new Vector3());
  // Fairing changes the correspondence inside the web. Its atlas coordinates
  // and pigment must use the same weights as its evaluated positions.
  if(g.attributes.pelvicUv && g.attributes.pelvicBlend){
    const uv=new Vector2(),sourceUv=new Vector2();body.material.map?.updateMatrix();
    for(let i=0;i<count;i++){
      let bodyWeight=0;uv.set(0,0);
      for(const [anchor,w] of positionWeights[i])if(data.anchors[anchor].body){bodyWeight+=w;uv.addScaledVector(sourceUv.fromBufferAttribute(body.geometry.attributes.uv,data.anchors[anchor].id),w);}
      if(bodyWeight){uv.multiplyScalar(1/bodyWeight);body.material.map?.transformUv(uv);}
      g.attributes.pelvicUv.setXY(i,uv.x,uv.y);g.attributes.pelvicBlend.setX(i,bodyWeight);
      g.attributes.uv.setXY(i,0,.012+.02*(1-bodyWeight));
    }
    for(const key of ['pelvicUv','pelvicBlend','uv'])g.attributes[key].needsUpdate=true;
  }
  for(const [key,source] of Object.entries(body.geometry.attributes))if(key.startsWith('skin') && !['skinIndex','skinWeight'].includes(key) && !g.attributes[key])
    g.setAttribute(key,new BufferAttribute(new Float32Array(count*source.itemSize),source.itemSize));
  return {update(){
    const colorSignature=[body.geometry.attributes.color?.version,cage.geometry.attributes.color?.version,body.material?.vertexColors];
    const colorDirty=!previousColor || colorSignature.some((v,i)=>v!==previousColor[i]);previousColor=colorSignature;
    const attributes=Object.entries(g.attributes).filter(([key])=>key.startsWith('skin') && !['skinIndex','skinWeight'].includes(key));
    const attributeSignature=attributes.map(([key])=>body.geometry.attributes[key]?.version);
    const attributesDirty=!previousAttributes || attributeSignature.some((v,i)=>v!==previousAttributes[i]);previousAttributes=attributeSignature;
    data.anchors.forEach((record,i)=>{
      const source=record.body?body:cage;
      source.getVertexPosition(record.id,positions[i]);normals[i].copy(posedNormal(source,record.id));
      const renderedId=record.body?null:renderedIds.get(record.id);
      if(renderedId!=null){
        positions[i].fromBufferAttribute(rendered.geometry.attributes.position,renderedId);
        normals[i].fromBufferAttribute(rendered.geometry.attributes.normal,renderedId);
      }
      const color=renderedId!=null?rendered.geometry.attributes.color:source.geometry.attributes.color,id=renderedId ?? record.id;
      if(record.body && !body.material?.vertexColors)pigments[i].set(1,1,1);
      else pigments[i].set(color?.getX(id) ?? 1,color?.getY(id) ?? 1,color?.getZ(id) ?? 1);
    });
    let boundaryResidualMetres=0;
    for(let i=0;i<count;i++){
      const p=new Vector3(),normal=new Vector3(),color=new Vector3();
      for(const [anchor,w] of positionWeights[i])p.addScaledVector(positions[anchor],w);
      for(const [anchor,w] of normalWeights[i])normal.addScaledVector(normals[anchor],w);
      p.toArray(g.attributes.position.array,i*3);normal.normalize().toArray(g.attributes.normal.array,i*3);
      if(colorDirty){
        for(const [anchor,w] of positionWeights[i])color.addScaledVector(pigments[anchor],w);color.toArray(g.attributes.color.array,i*3);
        const bodyWeight=g.attributes.pelvicBlend?.getX(i);
        if(bodyWeight && g.attributes.pelvicPigment){
          color.set(0,0,0);for(const [anchor,w] of positionWeights[i])if(data.anchors[anchor].body)color.addScaledVector(pigments[anchor],w/bodyWeight);
          color.toArray(g.attributes.pelvicPigment.array,i*3);g.attributes.pelvicPigment.needsUpdate=true;
        }
      }
      if(attributesDirty)for(const [key,attribute] of attributes){
        const source=body.geometry.attributes[key],cageSource=cage.geometry.attributes[key];if(!source)continue;
        for(let k=0;k<attribute.itemSize;k++)attribute.setComponent(i,k,positionWeights[i].reduce((sum,[anchor,w])=>{
          const record=data.anchors[anchor];return sum+(record.body?source.getComponent(record.id,k)*w:(cageSource?.getComponent(record.id,k) || 0)*w);
        },0));
        attribute.needsUpdate=true;
      }
    }
    g.attributes.position.needsUpdate=true;g.attributes.normal.needsUpdate=true;
    const p=g.attributes.position;
    for(let i=0;i<count;i++)if(data.locked[i]){
      const expected=new Vector3();for(const [anchor,w] of data.weights[i])expected.addScaledVector(positions[anchor],w);
      boundaryResidualMetres=Math.max(boundaryResidualMetres,expected.distanceTo(new Vector3().fromBufferAttribute(p,i)));
    }
    g.attributes.color.needsUpdate=true;g.computeBoundingSphere();
    mesh.userData.junctionEvidence={method:'exact-posed-boundary-graph',boundaryResidualMetres};
    return mesh.userData.junctionEvidence;
  }};
}
