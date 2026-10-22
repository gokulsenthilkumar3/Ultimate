import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Bone, BufferAttribute, BufferGeometry, Mesh, Skeleton, SkinnedMesh } from 'three';

export function glbMeshFixture(file='humanoid-base-lite.glb',includeFeatures=false) {
  const bytes=readFileSync(resolve('public/assets/models',file)),jsonLength=bytes.readUInt32LE(12);
  const gltf=JSON.parse(bytes.subarray(20,20+jsonLength)),bin=bytes.subarray(28+jsonLength);
  const types={5126:Float32Array,5125:Uint32Array,5123:Uint16Array,5121:Uint8Array};
  const sizes={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
  const values=(viewIndex,offset,count,Type)=> {
    const view=gltf.bufferViews[viewIndex],start=(view.byteOffset||0)+(offset||0);
    return new Type(Uint8Array.from(bin.subarray(start,start+count*Type.BYTES_PER_ELEMENT)).buffer);
  };
  const accessor=index=> {
    const a=gltf.accessors[index],size=sizes[a.type],Type=types[a.componentType],out=new Type(a.count*size);
    if(a.bufferView!=null) out.set(values(a.bufferView,a.byteOffset,out.length,Type));
    if(a.sparse) {
      const s=a.sparse,ids=values(s.indices.bufferView,s.indices.byteOffset,s.count,types[s.indices.componentType]);
      const entries=values(s.values.bufferView,s.values.byteOffset,s.count*size,Type);
      ids.forEach((id,i)=>out.set(entries.subarray(i*size,(i+1)*size),id*size));
    }
    return new BufferAttribute(out,size);
  };
  const build=name=> {
    const data=gltf.meshes.find(m=>m.name===name),p=data.primitives[0],geometry=new BufferGeometry();
    const keys={POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv',COLOR_0:'color',JOINTS_0:'skinIndex',WEIGHTS_0:'skinWeight'};
    for(const [key,id] of Object.entries(p.attributes)) if(keys[key]) geometry.setAttribute(keys[key],accessor(id));
    geometry.setIndex(accessor(p.indices)); geometry.morphTargetsRelative=true;
    geometry.morphAttributes.position=p.targets.map(target=>accessor(target.POSITION));
    const node=gltf.nodes.find(n=>n.mesh===gltf.meshes.indexOf(data));
    const mesh=node.skin==null?new Mesh(geometry):new SkinnedMesh(geometry); mesh.name=name;
    mesh.morphTargetDictionary=Object.fromEntries(data.extras.targetNames.map((name,i)=>[name,i]));
    mesh.morphTargetInfluences=data.extras.targetNames.map(()=>0);
    mesh.userData={...data.extras};
    if(node?.extras) Object.assign(mesh.userData,node.extras);
    if(node.skin!=null){
      const bones=gltf.skins[node.skin].joints.map(i=>{const bone=new Bone();bone.name=gltf.nodes[i].name;return bone;});
      bones.forEach(bone=>mesh.add(bone));mesh.bind(new Skeleton(bones));
    }
    mesh.updateMatrixWorld(true);
    return mesh;
  };
  return {body:build('GrowthTrackBody'),anatomy:build('GrowthTrackPrivateAnatomy'),
    ...(includeFeatures?{features:['Eyes','Hair','Eyebrows','Eyelashes'].map(name=>({mesh:build(`GrowthTrack${name}`),feature:name.toLowerCase()}))}:{})};
}
