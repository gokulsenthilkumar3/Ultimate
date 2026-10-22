import { Vector4 } from 'three';
import { APPEARANCE_DETAIL, APPEARANCE_HASH_GLSL, resolveFreckles } from '../../lib/appearanceDetail';

export function freckleUniforms(metrics) {
  const freckles = resolveFreckles(metrics);
  return { uFreckles: { value: new Vector4(freckles.density, freckles.sizeMm, freckles.contrast, freckles.seed) } };
}

// Three rest-space projections blend by the rest normal: no UV seams, no
// swimming with morphs/poses, no per-frame allocations or texture downloads.
export const FRECKLES_GLSL = `
  uniform vec4 uFreckles;
  varying vec3 vFreckleNormal;
  ${APPEARANCE_HASH_GLSL}
  float frecklePlane(vec2 mm, uint seed) {
    vec2 cells=mm/${APPEARANCE_DETAIL.freckles.cellMm.toFixed(2)};
    float aa=max(length(fwidth(cells))*.5,.002);
    float resolved=1.0-smoothstep(.3,1.0,length(fwidth(cells)));
    if(resolved<=0.0)return 0.0;
    float spot=0.0;
    // Neighbour cells retain complete marks at cell edges. Fully jittered
    // centres, varying radii and elliptical shapes avoid a visible dot grid.
    for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++) {
      ivec2 cell=ivec2(floor(cells))+ivec2(x,y);
      uint h=appearanceHash(cell,seed);
      float selected=float(h&65535u)/65536.0;
      if(selected<uFreckles.x*${APPEARANCE_DETAIL.freckles.maxCellCoverage.toFixed(2)}) {
        vec2 centre=vec2(float((h>>12u)&1023u),float((h>>22u)&1023u))/1024.0;
        uint shape=appearanceHash(cell,seed+3u);
        float radius=uFreckles.y/${APPEARANCE_DETAIL.freckles.cellMm.toFixed(2)}*
          mix(${APPEARANCE_DETAIL.freckles.radiusVariation.map(value => value.toFixed(2)).join(',')},float(shape&65535u)/65536.0);
        float aspect=mix(${APPEARANCE_DETAIL.freckles.aspectVariation.map(value => value.toFixed(2)).join(',')},float(shape>>16u)/65536.0);
        vec2 delta=(cells-vec2(cell)-centre)*vec2(aspect,1.0/aspect);
        spot=max(spot,1.0-smoothstep(radius-aa,radius+aa,length(delta)));
      }
    }
    return spot*resolved;
  }
  float skinFreckles(vec3 restPosition, float exposure) {
    if(uFreckles.x<=0.0 || uFreckles.z<=0.0)return 0.0;
    vec3 mm=restPosition*1000.0;
    vec3 weights=pow(abs(normalize(vFreckleNormal)),vec3(6.0));
    weights/=max(dot(weights,vec3(1.0)),.0001);
    uint seed=uint(uFreckles.w);
    float marks=dot(weights,vec3(frecklePlane(mm.yz,seed),frecklePlane(mm.zx,seed+1u),frecklePlane(mm.xy,seed+2u)));
    return marks*uFreckles.z*mix(.25,1.0,clamp(exposure,0.0,1.0));
  }
`;
