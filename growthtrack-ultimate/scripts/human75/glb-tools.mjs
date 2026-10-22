import { BufferAttribute, BufferGeometry, Bone, Group, Mesh, MeshBasicMaterial, Skeleton, SkinnedMesh, Matrix4 } from 'three';
import { readAccessor } from '../plan-preview/glb.mjs';

export function sceneFromGlb(glb) {
  const {json}=glb,skin=json.skins[0],jointSet=new Set(skin.joints);
  const keys={POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv',COLOR_0:'color',JOINTS_0:'skinIndex',WEIGHTS_0:'skinWeight',TANGENT:'tangent'};
  const meshes=json.meshes.map(data=>{
    const p=data.primitives[0],geometry=new BufferGeometry();
    for(const [key,id] of Object.entries(p.attributes))if(keys[key]){const a=readAccessor(glb,id);geometry.setAttribute(keys[key],new BufferAttribute(a.data,a.width));}
    if(p.indices!=null)geometry.setIndex(new BufferAttribute(readAccessor(glb,p.indices).data,1));
    geometry.morphTargetsRelative=true;geometry.morphAttributes.position=(p.targets || []).map(t=>new BufferAttribute(readAccessor(glb,t.POSITION).data,3));
    const isSkin=json.nodes.some(n=>n.mesh===json.meshes.indexOf(data) && n.skin!=null);
    const mesh=isSkin?new SkinnedMesh(geometry,new MeshBasicMaterial()):new Mesh(geometry,new MeshBasicMaterial());
    mesh.name=data.name;mesh.userData=structuredClone(data.extras || {});
    mesh.morphTargetDictionary=Object.fromEntries((data.extras?.targetNames || []).map((name,i)=>[name,i]));
    mesh.morphTargetInfluences=(data.extras?.targetNames || []).map(()=>0);return mesh;
  });
  const nodes=json.nodes.map((n,i)=>{
    const o=jointSet.has(i)?new Bone():n.mesh!=null?meshes[n.mesh]:new Group();o.name=n.name || o.name;
    if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);if(n.matrix)o.applyMatrix4(new Matrix4().fromArray(n.matrix));
    Object.assign(o.userData,structuredClone(n.extras || {}));return o;
  });
  json.nodes.forEach((n,i)=>n.children?.forEach(id=>nodes[i].add(nodes[id])));
  const root=new Group();nodes.filter(n=>!n.parent).forEach(n=>root.add(n));root.updateMatrixWorld(true);
  const inverses=readAccessor(glb,skin.inverseBindMatrices).data,skeleton=new Skeleton(skin.joints.map(id=>nodes[id]),skin.joints.map((_,i)=>new Matrix4().fromArray(inverses,i*16)));
  json.nodes.forEach((n,i)=>{if(n.skin!=null)nodes[i].bind(skeleton,new Matrix4());});
  return {root,nodes,meshes,skeleton,body:meshes[json.meshes.findIndex(m=>m.name==='GrowthTrackBody')],features:meshes.filter(m=>/GrowthTrack(Eyes|Hair|Eyebrows|Eyelashes)$/.test(m.name)).map(mesh=>({mesh,feature:mesh.name.replace('GrowthTrack','').toLowerCase()}))};
}

export function appender(glb) {
  const json=structuredClone(glb.json),chunks=[glb.bin];let length=glb.bin.length;
  function view(values){const bytes=Buffer.isBuffer(values)?values:Buffer.from(values.buffer,values.byteOffset,values.byteLength),padding=(4-length%4)%4;
    if(padding){chunks.push(Buffer.alloc(padding));length+=padding;}const id=json.bufferViews.length;
    json.bufferViews.push({buffer:0,byteOffset:length,byteLength:bytes.length});chunks.push(bytes);length+=bytes.length;return id;}
  function accessor(data,width,{sparse=false}={}) {
    const a={componentType:data instanceof Uint8Array?5121:data instanceof Uint16Array?5123:data instanceof Uint32Array?5125:5126,count:data.length/width,type:{1:'SCALAR',2:'VEC2',3:'VEC3',4:'VEC4',16:'MAT4'}[width]};
    if(!Array.from(data).every(Number.isFinite))throw new Error('Non-finite generated attribute');
    if(sparse){const ids=[],values=[];for(let i=0;i<a.count;i++)if(data.subarray(i*width,(i+1)*width).some(v=>v!==0)){ids.push(i);values.push(...data.subarray(i*width,(i+1)*width));}
      if(ids.length)a.sparse={count:ids.length,indices:{bufferView:view(Uint32Array.from(ids)),componentType:5125},values:{bufferView:view(Float32Array.from(values))}};
    }else a.bufferView=view(data);
    if(width===3){a.min=[Infinity,Infinity,Infinity];a.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<data.length;i++){a.min[i%3]=Math.min(a.min[i%3],data[i]);a.max[i%3]=Math.max(a.max[i%3],data[i]);}}
    json.accessors.push(a);return json.accessors.length-1;
  }
  function pack(){
    const used=new Set(),remapPrimitive=(p,fn)=>{for(const key of Object.keys(p.attributes))p.attributes[key]=fn(p.attributes[key]);if(p.indices!=null)p.indices=fn(p.indices);for(const target of p.targets || [])for(const key of Object.keys(target))target[key]=fn(target[key]);};
    for(const mesh of json.meshes)for(const p of mesh.primitives)remapPrimitive(p,id=>{used.add(id);return id;});
    for(const skin of json.skins)used.add(skin.inverseBindMatrices);
    const accessorMap=new Map([...used].map((id,i)=>[id,i]));
    for(const mesh of json.meshes)for(const p of mesh.primitives)remapPrimitive(p,id=>accessorMap.get(id));
    for(const skin of json.skins)skin.inverseBindMatrices=accessorMap.get(skin.inverseBindMatrices);
    json.accessors=[...used].map(id=>json.accessors[id]);const views=new Set();
    for(const a of json.accessors){if(a.bufferView!=null)views.add(a.bufferView);if(a.sparse){views.add(a.sparse.indices.bufferView);views.add(a.sparse.values.bufferView);}}
    json.images.forEach(image=>{if(image.bufferView!=null)views.add(image.bufferView);});
    const combined=Buffer.concat(chunks),nextChunks=[],nextViews=[],viewMap=new Map();length=0;
    for(const id of views){const original=json.bufferViews[id],pad=(4-length%4)%4;if(pad){nextChunks.push(Buffer.alloc(pad));length+=pad;}
      viewMap.set(id,nextViews.length);nextViews.push({...original,buffer:0,byteOffset:length});nextChunks.push(combined.subarray(original.byteOffset || 0,(original.byteOffset || 0)+original.byteLength));length+=original.byteLength;}
    for(const a of json.accessors){if(a.bufferView!=null)a.bufferView=viewMap.get(a.bufferView);if(a.sparse){a.sparse.indices.bufferView=viewMap.get(a.sparse.indices.bufferView);a.sparse.values.bufferView=viewMap.get(a.sparse.values.bufferView);}}
    json.images.forEach(image=>{if(image.bufferView!=null)image.bufferView=viewMap.get(image.bufferView);});json.bufferViews=nextViews;
    json.buffers=[{byteLength:length}];const text=Buffer.from(JSON.stringify(json)),jb=Buffer.concat([text,Buffer.alloc((4-text.length%4)%4,32)]),bin=Buffer.concat([...nextChunks,Buffer.alloc((4-length%4)%4)]);
    const header=Buffer.alloc(20);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(28+jb.length+bin.length,8);header.writeUInt32LE(jb.length,12);header.writeUInt32LE(0x4e4f534a,16);
    const bh=Buffer.alloc(8);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);return Buffer.concat([header,jb,bh,bin]);}
  return {json,view,accessor,pack};
}
