import {BufferAttribute,BufferGeometry,Matrix4,Vector3} from 'three';
import {MeshBVH} from 'three-mesh-bvh';

function evaluated(mesh,select=()=>true){
  const source=mesh.geometry,geometry=new BufferGeometry(),p=new Float32Array(source.attributes.position.count*3),point=new Vector3(),ids=[];
  for(let i=0;i<p.length/3;i++)mesh.getVertexPosition(i,point).toArray(p,i*3);
  for(let i=0;i<source.index.count;i+=3){const tri=[0,1,2].map(k=>source.index.getX(i+k));if(select(tri))ids.push(...tri);}
  geometry.setAttribute('position',new BufferAttribute(p,3));geometry.setIndex(ids);return geometry;
}
function intersections(a,b){
  if(!a.index.count || !b.index.count)return 0;
  let count=0;
  const first=new MeshBVH(a,{indirect:true}),second=new MeshBVH(b,{indirect:true});
  first.bvhcast(second,new Matrix4(),{intersectsTriangles(t1,t2){if(t1.intersectsTriangle(t2))count++;return false;}});
  return count;
}
/** Actual posed triangle intersections. Only the authored proximal attachment
 * collar is excluded; the report retains the excluded triangle count. */
export function analyzeNativeContacts(body,mesh){
  const uv=mesh.geometry.attributes.uv;
  const free=tri=>tri.every(id=>uv.getY(id)<.5?(uv.getY(id)-.02)/.46>.12:uv.getY(id)>.64);
  const anatomy=evaluated(mesh,free),skin=evaluated(body);
  const shaft=evaluated(mesh,tri=>free(tri)&&tri.every(id=>uv.getY(id)<.5));
  const sac=evaluated(mesh,tri=>free(tri)&&tri.every(id=>uv.getY(id)>=.5));
  const report={method:'posed-triangle-BVH',bodyIntersections:intersections(anatomy,skin),shaftSacIntersections:intersections(shaft,sac),attachmentTrianglesExcluded:(mesh.geometry.index.count-anatomy.index.count)/3};
  const primary=evaluated(mesh),primaryBVH=new MeshBVH(primary,{indirect:true}),point=new Vector3();
  report.layers=[];
  for(const part of mesh.children.filter(part=>part.isMesh && part.visible && !part.userData.controlCage && !part.userData.pelvicTransition)){
    const surface=evaluated(part);let maximumSurfaceDistanceMetres=0;
    if(/Foreskin/.test(part.name))for(let i=0;i<surface.attributes.position.count;i++){
      point.fromBufferAttribute(surface.attributes.position,i);maximumSurfaceDistanceMetres=Math.max(maximumSurfaceDistanceMetres,primaryBVH.closestPointToPoint(point).distance);
    }
    report.layers.push({name:part.name,finite:surface.attributes.position.array.every(Number.isFinite),bodyIntersections:intersections(surface,skin),...(/Foreskin/.test(part.name)?{maximumSurfaceDistanceMetres}:{})});
    surface.dispose();
  }
  primary.dispose();
  for(const g of [anatomy,skin,shaft,sac])g.dispose();return report;
}
