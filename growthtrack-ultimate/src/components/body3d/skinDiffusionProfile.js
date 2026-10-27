// Burley 2015 normalized radial profile, expressed in millimetres. These are
// project calibration defaults, not measured coefficients for this person.
export const SKIN_DIFFUSION_DISTANCE_MM = Object.freeze([1.2, 0.55, 0.3]);
export const SKIN_DIFFUSION_MAX_CURVATURE_PER_MM = 0.25;
export const SKIN_THICKNESS_MAX_MM = 60;

const positive = (value, label) => {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be finite and positive.`);
};

/** Probability density of radial distance: 2*pi*r*R(r), without albedo. */
export function diffusionRadialPdf(radiusMm, distanceMm) {
  positive(distanceMm, 'Diffusion distance');
  if (!Number.isFinite(radiusMm) || radiusMm < 0) throw new Error('Radius must be finite and nonnegative.');
  return (Math.exp(-radiusMm / distanceMm) + Math.exp(-radiusMm / (3 * distanceMm))) / (4 * distanceMm);
}

export function diffusionRadialCdf(radiusMm, distanceMm) {
  positive(distanceMm, 'Diffusion distance');
  if (!Number.isFinite(radiusMm) || radiusMm < 0) throw new Error('Radius must be finite and nonnegative.');
  return 1 - 0.25 * Math.exp(-radiusMm / distanceMm) - 0.75 * Math.exp(-radiusMm / (3 * distanceMm));
}

/** A bounded profile-tail attenuation proxy, not a thin-slab transport solution. */
export function diffusionThicknessWeight(thicknessMm, distanceMm) {
  positive(distanceMm, 'Diffusion distance');
  if (!Number.isFinite(thicknessMm) || thicknessMm < 0) throw new Error('Thickness must be finite and nonnegative.');
  return 1 - diffusionRadialCdf(thicknessMm, distanceMm);
}

/**
 * Project local-curvature preintegration. A normalized Burley radial sample is
 * transported along a spherical normal field, then averages Lambert irradiance
 * over azimuth. Samples beyond pi curvature radius are truncated/renormalized.
 * This is a local irradiance proxy, not Disney's spatially sampled BSSRDF.
 */
export function preintegratedDiffusion(cosine, curvaturePerMm, distancesMm = SKIN_DIFFUSION_DISTANCE_MM, { radialSamples = 32, azimuthSamples = 16 } = {}) {
  if (!Number.isFinite(cosine) || cosine < -1 || cosine > 1 || !Number.isFinite(curvaturePerMm) || curvaturePerMm < 0) throw new Error('Invalid diffusion lookup coordinates.');
  if (!Array.isArray(distancesMm) || distancesMm.length !== 3) throw new Error('Diffusion requires three channel distances.');
  distancesMm.forEach(distance => positive(distance, 'Diffusion distance'));
  if (!Number.isInteger(radialSamples) || radialSamples < 4 || !Number.isInteger(azimuthSamples) || azimuthSamples < 4) throw new Error('Diffusion quadrature needs at least four samples per dimension.');
  if (curvaturePerMm < 1e-8) return distancesMm.map(() => Math.max(cosine, 0));
  const tangent = Math.sqrt(Math.max(0, 1 - cosine * cosine));
  const maximumRadius = Math.PI / curvaturePerMm;
  const azimuths = Array.from({ length: azimuthSamples }, (_, index) => Math.cos(2 * Math.PI * (index + 0.5) / azimuthSamples));
  return distancesMm.map(distance => {
    let response = 0;
    const masses = [0.25 * (1 - Math.exp(-maximumRadius / distance)), 0.75 * (1 - Math.exp(-maximumRadius / (3 * distance)))];
    const mass = masses[0] + masses[1];
    for (let lobe = 0; lobe < 2; lobe++) {
      const scale = distance * (lobe ? 3 : 1), cdf = 1 - Math.exp(-maximumRadius / scale);
      let integral = 0;
      for (let sample = 0; sample < radialSamples; sample++) {
        const radius = -scale * Math.log(1 - ((sample + 0.5) / radialSamples) * cdf);
        const angle = radius * curvaturePerMm, axial = cosine * Math.cos(angle), lateral = tangent * Math.sin(angle);
        for (const azimuth of azimuths) integral += Math.max(0, axial + lateral * azimuth);
      }
      response += integral / (radialSamples * azimuthSamples) * masses[lobe] / mass;
    }
    return Math.min(1, Math.max(0, response));
  });
}

/** CPU reference for the shader's convex combination; each term stays [0,1]. */
export function boundedSkinResponse(cosine, curvaturePerMm, thicknessMm, strength = 0.55, mask = 1, confidence = 1, distancesMm = SKIN_DIFFUSION_DISTANCE_MM) {
  const diffuse = preintegratedDiffusion(cosine, curvaturePerMm, distancesMm);
  const weight = Math.min(1, Math.max(0, strength)) * Math.min(1, Math.max(0, mask));
  return diffuse.map((value, channel) => {
    const thin = diffusionThicknessWeight(thicknessMm, distancesMm[channel]) * Math.min(1, Math.max(0, confidence));
    const local = value * (1 - thin) + Math.max(-cosine, 0) * thin;
    return Math.max(cosine, 0) * (1 - weight) + local * weight;
  });
}

export const SKIN_DIFFUSION_GLSL = `
uniform float uSkinScatteringStrength;
uniform sampler2D uParametricScatterMask;
uniform sampler2D uParametricThickness;
uniform sampler2D uParametricDiffusionLut;
uniform float uParametricThicknessMaxMm;
uniform vec3 uParametricDiffusionDistanceMm;
uniform float uParametricMaximumCurvaturePerMm;
uniform vec2 uParametricLutSize;
varying vec2 vParametricSkinUv;
varying vec3 vParametricTissueNormal;

void RE_Direct_GrowthTrackTissue(
  const in IncidentLight directLight,
  const in vec3 geometryPosition,
  const in vec3 geometryNormal,
  const in vec3 geometryViewDir,
  const in vec3 geometryClearcoatNormal,
  const in PhysicalMaterial material,
  inout ReflectedLight reflectedLight
) {
  // Preserve all standard physical specular, sheen and clearcoat behavior.
  RE_Direct_Physical(directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight);
  if (uSkinScatteringStrength > 0.0) {
    vec3 macroNormal = normalize(vParametricTissueNormal);
    vec3 dx = dFdx(geometryPosition), dy = dFdy(geometryPosition);
    vec3 nx = dFdx(macroNormal), ny = dFdy(macroNormal);
    // View-space lengths have the same metre scale as world-space lengths.
    // Ratio of derivative norms is a clamped local-curvature proxy; it is not
    // the filtered world-space Hessian estimator of a deferred SSS renderer.
    float curvaturePerMm = sqrt((dot(nx,nx) + dot(ny,ny)) / max(dot(dx,dx) + dot(dy,dy), 1e-12)) * 0.001;
    float macroCosine = clamp(dot(macroNormal, directLight.direction), -1.0, 1.0);
    vec2 lookup = vec2(macroCosine * 0.5 + 0.5, clamp(curvaturePerMm / uParametricMaximumCurvaturePerMm, 0.0, 1.0));
    lookup = (lookup * (uParametricLutSize - vec2(1.0)) + vec2(0.5)) / uParametricLutSize;
    vec3 integrated = texture2D(uParametricDiffusionLut, lookup).rgb;
    vec3 thicknessData = texture2D(uParametricThickness, vParametricSkinUv).rgb;
    float thicknessMm = ((thicknessData.r * 255.0 * 256.0 + thicknessData.g * 255.0) / 65535.0) * uParametricThicknessMaxMm;
    vec3 thinWeight = (0.25 * exp(-thicknessMm / uParametricDiffusionDistanceMm)
      + 0.75 * exp(-thicknessMm / (3.0 * uParametricDiffusionDistanceMm))) * thicknessData.b;
    // Convex energy budget: thickness may redistribute the local response to
    // the opposing hemisphere, never add emission or an extra unbounded lobe.
    vec3 scattered = mix(integrated, vec3(max(-macroCosine, 0.0)), thinWeight);
    float localWeight = clamp(uSkinScatteringStrength * texture2D(uParametricScatterMask, vParametricSkinUv).r, 0.0, 1.0);
    float lambert = max(dot(geometryNormal, directLight.direction), 0.0);
    float sheenCompensation = 1.0;
    #ifdef USE_SHEEN
      float skinSheenV = IBLSheenBRDF(geometryNormal, geometryViewDir, material.sheenRoughness);
      float skinSheenL = IBLSheenBRDF(geometryNormal, directLight.direction, material.sheenRoughness);
      sheenCompensation = 1.0 - max3(material.sheenColor) * max(skinSheenV, skinSheenL);
    #endif
    // directLight already carries the stock shadow attenuation. This cannot
    // transport illumination through a shadow boundary or gather a neighbour.
    reflectedLight.directDiffuse += directLight.color * BRDF_Lambert(material.diffuseContribution)
      * (scattered - vec3(lambert)) * localWeight * sheenCompensation;
  }
}
#undef RE_Direct
#define RE_Direct RE_Direct_GrowthTrackTissue
`;
