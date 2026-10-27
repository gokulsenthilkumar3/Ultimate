import { MeshStandardMaterial, Vector2, Vector3 } from 'three';
import { createPhysicalSkinMaterial } from './physicalSkinMaterial';
import defaultTissueManifest from '../../config/parametricTissue.json';
import { SKIN_DIFFUSION_GLSL } from './skinDiffusionProfile';

/** Authored albedo with explicitly estimated auxiliary maps on the HM08 atlas. */
export function createParametricSkinMaterial(textures, manifest, skinColor = '#bd8b6a', { tissueManifest = defaultTissueManifest } = {}) {
  for (const name of ['albedo', 'roughness', 'normal', 'scatterMask', 'thickness', 'diffusionLut']) {
    if (!textures?.[name]?.isTexture) throw new Error(`The parametric skin ${name} map is missing.`);
  }
  if (tissueManifest?.model !== 'burley-profile-local-preintegration-v1'
    || !Array.isArray(tissueManifest.diffusionDistanceMm) || tissueManifest.diffusionDistanceMm.length !== 3
    || tissueManifest.diffusionDistanceMm.some(value => !Number.isFinite(value) || value <= 0)
    || !Number.isFinite(tissueManifest.maximumThicknessMm) || tissueManifest.maximumThicknessMm <= 0
    || !Number.isFinite(tissueManifest.maximumCurvaturePerMm) || tissueManifest.maximumCurvaturePerMm <= 0
    || !Number.isInteger(tissueManifest.maps?.diffusionLut?.width) || tissueManifest.maps.diffusionLut.width < 2
    || !Number.isInteger(tissueManifest.maps.diffusionLut.height) || tissueManifest.maps.diffusionLut.height < 2) {
    throw new Error('The skin diffusion profile needs a supported unit-labelled manifest.');
  }
  if (!Array.isArray(manifest?.albedoReference) || manifest.albedoReference.length !== 3
    || manifest.albedoReference.some(value => !Number.isFinite(value) || value <= 0 || value > 1)) {
    throw new Error('The skin atlas needs its recorded linear colour reference.');
  }
  const source = new MeshStandardMaterial({ map: textures.albedo, normalMap: textures.normal, roughnessMap: textures.roughness });
  source.normalScale.set(0.3, 0.3);
  source.userData = { albedoReference: [...manifest.albedoReference], nativeTissueMaps: true };
  const skin = createPhysicalSkinMaterial(skinColor, source, {
    surfaceDetail: false, skinScattering: { strength: 0.55, wrap: 0 },
  });
  source.dispose(); // Textures belong to the verified shared asset pack.
  skin.name = 'Parametric textured skin';
  skin.userData.visualAssetVersion = manifest.version;
  skin.userData.surfaceMaps = {
    albedo: 'authored-cc0', roughness: 'project-estimated', normal: 'project-estimated', scatterMask: 'project-estimated',
    thickness: 'neutral-geometry-normal-chord', diffusionLut: 'normalized-profile-preintegration',
  };
  Object.assign(skin.userData.skinScattering, {
    model: tissueManifest.model, regionalMask: true, thicknessMap: true,
    thicknessMeaning: 'neutral-object-inward-normal-chord', physiologicalDermalThickness: false,
    diffusionDistanceMm: [...tissueManifest.diffusionDistanceMm],
    thicknessMaximumMm: tissueManifest.maximumThicknessMm,
    limitations: [...tissueManifest.limitations],
  });
  skin.customProgramCacheKey = () => `growthtrack-hm08-profile-preintegration-v1-${manifest.version}-${tissueManifest.version}`;
  // The physical factory supplies PBR settings and colour/update uniforms.
  // Its legacy direct-wrap callback is deliberately replaced only here.
  skin.onBeforeCompile = shader => {
    if (!shader.fragmentShader.includes('#include <lights_physical_pars_fragment>')
      || !shader.vertexShader.includes('#include <defaultnormal_vertex>')) {
      skin.userData.skinScattering.shaderStatus = 'unsupported-shader';
      throw new Error('The tissue shader does not match the installed physical material layout.');
    }
    skin.userData.skinScattering.shaderStatus = 'installed';
    shader.uniforms.uSkinScatteringStrength = skin.uniforms.uSkinScatteringStrength;
    shader.uniforms.uParametricScatterMask = { value: textures.scatterMask };
    shader.uniforms.uParametricThickness = { value: textures.thickness };
    shader.uniforms.uParametricDiffusionLut = { value: textures.diffusionLut };
    shader.uniforms.uParametricThicknessMaxMm = { value: tissueManifest.maximumThicknessMm };
    shader.uniforms.uParametricDiffusionDistanceMm = { value: new Vector3(...tissueManifest.diffusionDistanceMm) };
    shader.uniforms.uParametricMaximumCurvaturePerMm = { value: tissueManifest.maximumCurvaturePerMm };
    shader.uniforms.uParametricLutSize = { value: new Vector2(tissueManifest.maps.diffusionLut.width, tissueManifest.maps.diffusionLut.height) };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vParametricSkinUv;\nvarying vec3 vParametricTissueNormal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvParametricSkinUv = uv;')
      .replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\nvParametricTissueNormal = normalize(transformedNormal);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <lights_physical_pars_fragment>', `#include <lights_physical_pars_fragment>\n${SKIN_DIFFUSION_GLSL}`);
  };
  return skin;
}
