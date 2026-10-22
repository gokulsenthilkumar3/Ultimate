import {BufferAttribute,BufferGeometry,Vector3} from 'three';
import {readAccessor} from './plan-preview/glb.mjs';
import {appender} from './human75/glb-tools.mjs';

/** Normalize the assessed assets without changing their existing surface,
 * morph, UV, normal or image payloads. No issue codes are waived. */
export function normalizeGlbFormat(glb){
  const writer=appender(glb),json=writer.json;
  const changes={positionBounds:0,tangents:0,alignedAttributes:0,emptyChildren:0,legacyMeshProperties:0,unusedJointSlots:0};
  const validMeshProperties=new Set(['primitives','weights','name','extensions','extras']);
  const attribute=(id)=>{const a=readAccessor(glb,id);return new BufferAttribute(a.data,a.width);};
  const bounds=id=>{
    const accessor=json.accessors[id];if(accessor.min && accessor.max)return;
    const {data,width}=readAccessor(glb,id),min=Array(width).fill(Infinity),max=Array(width).fill(-Infinity);
    for(let i=0;i<data.length;i++){min[i%width]=Math.min(min[i%width],data[i]);max[i%width]=Math.max(max[i%width],data[i]);}
    accessor.min=min;accessor.max=max;changes.positionBounds++;
  };
  const target=(id,value)=>{const accessor=json.accessors[id];if(accessor?.bufferView!=null)json.bufferViews[accessor.bufferView].target=value;};
  for(const node of json.nodes)if(node.children?.length===0){delete node.children;changes.emptyChildren++;}
  for(const mesh of json.meshes){
    for(const key of Object.keys(mesh))if(!validMeshProperties.has(key)){
      mesh.extras ||= {};mesh.extras.legacySourceProperties ||= {};mesh.extras.legacySourceProperties[key]=mesh[key];delete mesh[key];changes.legacyMeshProperties++;
    }
    for(const primitive of mesh.primitives){
      bounds(primitive.attributes.POSITION);
      for(const morph of primitive.targets || [])if(morph.POSITION!=null)bounds(morph.POSITION);
      // One-byte scalar attributes need a four-byte vertex stride in glTF.
      // Float scalars retain the exact region/tile values with portable layout.
      for(const key of Object.keys(primitive.attributes))if(key.startsWith('_')){
        const id=primitive.attributes[key],a=readAccessor(glb,id),size=a.data.BYTES_PER_ELEMENT*a.width;
        if(size%4){primitive.attributes[key]=writer.accessor(Float32Array.from(a.data),a.width);changes.alignedAttributes++;}
      }
      const indices=primitive.attributes.JOINTS_0,weights=primitive.attributes.WEIGHTS_0;
      if(indices!=null && weights!=null){
        const ids=readAccessor(glb,indices).data,w=readAccessor(glb,weights).data;let changed=false;
        for(let i=0;i<ids.length;i++)if(w[i]===0 && ids[i]!==0){ids[i]=0;changed=true;changes.unusedJointSlots++;}
        if(changed)primitive.attributes.JOINTS_0=writer.accessor(ids,4);
      }
      const material=json.materials[primitive.material];
      if(material?.normalTexture && primitive.attributes.TANGENT==null){
        const g=new BufferGeometry();
        for(const [key,name] of [['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv']]){
          if(primitive.attributes[key]==null)throw new Error(`Missing ${key} for tangent generation: ${mesh.name}`);
          g.setAttribute(name,attribute(primitive.attributes[key]));
        }
        g.setIndex(attribute(primitive.indices));g.computeTangents();
        const tangent=g.attributes.tangent,normal=g.attributes.normal,t=new Vector3(),n=new Vector3();
        for(let i=0;i<tangent.count;i++){
          t.fromBufferAttribute(tangent,i);n.fromBufferAttribute(normal,i).normalize();
          if(!t.toArray().every(Number.isFinite) || t.lengthSq()<1e-12){
            const axis=Math.abs(n.x)<.9?new Vector3(1,0,0):new Vector3(0,1,0);t.crossVectors(n,axis).normalize();
          }
          tangent.setXYZW(i,t.x,t.y,t.z,tangent.getW(i)<0?-1:1);
        }
        primitive.attributes.TANGENT=writer.accessor(tangent.array,4);changes.tangents++;g.dispose();
      }
      Object.values(primitive.attributes).forEach(id=>target(id,34962));
      if(primitive.indices!=null)target(primitive.indices,34963);
      // Sparse values/indices must remain free of vertex/index buffer targets.
      for(const morph of primitive.targets || [])for(const id of Object.values(morph))target(id,34962);
    }
  }
  const bytes=writer.pack();
  return {bytes,changes};
}

export function glbFromBytes(bytes){
  const length=bytes.readUInt32LE(12);
  return {json:JSON.parse(bytes.subarray(20,20+length)),bin:bytes.subarray(28+length)};
}
