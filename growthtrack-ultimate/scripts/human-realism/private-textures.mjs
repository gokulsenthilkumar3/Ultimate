import {png} from '../human75/micro.mjs';

/** Dedicated, seam-periodic tissue maps. No body-atlas pixels or lighting are
 * baked into these textures. The relief is authored in metres. */
export function privateTextures(size,heightAt){
  const height=new Float32Array(size*size),albedo=new Uint8Array(size*size*4),normal=new Uint8Array(albedo.length),orm=new Uint8Array(albedo.length);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++)height[y*size+x]=heightAt((x+.5)/size,(y+.5)/size);
  const at=(x,y)=>height[Math.max(0,Math.min(size-1,y))*size+(x+size)%size];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const v=(y+.5)/size,index=(y*size+x)*4,h=at(x,y),sac=v>=.5;
    // Tangent-space derivatives use physical UV span, not texture pixels.
    const du=(at(x+1,y)-at(x-1,y))*size*.0009/(2*(sac?.16:.0931));
    const dv=(at(x,y+1)-at(x,y-1))*size*.0009/(2*(sac?.14:.20));
    const n=Math.hypot(du,dv,1),grain=Math.min(1,Math.max(.94,.982+(h-.5)*.035));
    albedo.set([Math.round(grain*255),Math.round(grain*255),Math.round(grain*255),255],index);
    normal.set([Math.round((.5-du/n*.5)*255),Math.round((.5-dv/n*.5)*255),Math.round((.5+.5/n)*255),255],index);
    const roughness=sac?.71:v>.35?.48:.59;
    orm.set([255,Math.round(Math.max(.4,Math.min(.8,roughness+(h-.5)*.08))*255),0,255],index);
  }
  return {albedo:png(size,albedo),normal:png(size,normal),orm:png(size,orm)};
}

export function embedPrivateTextures(writer,size,heightAt,material){
  const json=writer.json,maps=privateTextures(size,heightAt);
  json.images ||= [];json.textures ||= [];json.samplers ||= [];
  const sampler=json.samplers.length;json.samplers.push({magFilter:9729,minFilter:9987,wrapS:10497,wrapT:33071});
  const ids={};
  for(const [name,bytes] of Object.entries(maps)){
    const source=json.images.length;json.images.push({name:'Private_'+name,bufferView:writer.view(bytes),mimeType:'image/png'});
    ids[name]=json.textures.length;json.textures.push({sampler,source});
  }
  material.pbrMetallicRoughness.baseColorTexture={index:ids.albedo};
  material.pbrMetallicRoughness.roughnessFactor=1;
  material.pbrMetallicRoughness.metallicRoughnessTexture={index:ids.orm};
  material.normalTexture={index:ids.normal,scale:1};
  material.extras={albedoReference:[1,1,1],nativeTissueMaps:{version:1,size,reliefMetres:.0009,neutralAlbedo:true}};
  return {size,maps:3,encodedBytes:Object.values(maps).reduce((sum,b)=>sum+b.length,0)};
}
