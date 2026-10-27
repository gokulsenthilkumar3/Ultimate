import manifest from '../config/parametricHuman.json';
import { assertAvatarAssetCompatible, createAvatarDocument, validateAvatarDocument } from './avatarDocument';

export const PARAMETRIC_HUMAN = Object.freeze(manifest);
// Package integrity is checked against its own original manifest first. Only
// known material/solver upgrades may change interpretation after that check;
// topology, source, parameter and rig identities still match exactly. The
// explicit adapters below reject every other material or solver identity.
export const PARAMETRIC_REIMPORT_ASSET = Object.freeze(Object.fromEntries(Object.entries(manifest.asset).filter(([key]) => !['materialVersion', 'solverVersion'].includes(key))));
export const PARAMETRIC_GROUPS = Object.freeze([
  ['body', 'Body'], ['head', 'Head shape'], ['eyes', 'Eyes'], ['brows', 'Brows'],
  ['nose', 'Nose'], ['mouth', 'Mouth'], ['cheeks', 'Cheeks'], ['jaw', 'Jaw and chin'],
  ['ears', 'Ears'], ['neck', 'Neck'], ['torso', 'Torso'], ['hips', 'Waist and hips'],
  ['arms', 'Arms'], ['legs', 'Legs'],
].map(([id, label]) => Object.freeze({ id, label })));
const category = name => /^eye/.test(name) ? 'eyes' : /^ear/.test(name) ? 'ears'
  : /^brows/.test(name) ? 'brows' : /^cheek/.test(name) ? 'cheeks'
    : /^(head|forehead)/.test(name) ? 'head' : /^jaw/.test(name) ? 'jaw'
      : /^nose/.test(name) ? 'nose' : /^mouth/.test(name) ? 'mouth'
        : /^neck/.test(name) ? 'neck' : /^(chest|torso|bust|shoulders)/.test(name) ? 'torso'
          : /^(hips|waist|belly|gluteus)/.test(name) ? 'hips' : /^arms/.test(name) ? 'arms'
            : /^(legs|thighs|calves)/.test(name) ? 'legs' : 'body';
const words = value => value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, ch => ch.toUpperCase());
export const PARAMETRIC_PARAMETERS = Object.freeze(manifest.morphTargets.map(name => Object.freeze({
  id: name, label: words(name), group: category(name), min: 0, max: 1, step: 0.01, unit: 'shape weight',
  support: /^(height|legs.*(Longer|Shorter)|arms.*(Longer|Shorter|Taller)|neck(Longer|Shorter)|chest(Taller|Shorter)|hips(Taller|Shorter))/.test(name) ? 'neutral-preview-only' : 'shape',
})));
const parameterNames = new Set(manifest.morphTargets);

// Signed artistic controls, each with explicit source bindings. These are not
// measured centimetres or a claim that all source morph combinations are valid.
export const SIMPLE_HUMAN_CONTROLS = Object.freeze([
  ['nose.width', 'Nose width', 'noseNarrower', 'noseWider', 'nose'],
  ['nose.length', 'Nose length', 'noseShorter', 'noseLonger', 'nose'],
  ['nose.nostrils', 'Nostril width', 'noseNostrilsNarrower', 'noseNostrilsWider', 'nose'],
  ['mouth.width', 'Mouth width', 'mouthNarrower', 'mouthWider', 'mouth'],
  ['mouth.upperLip', 'Upper lip fullness', 'mouthUpperLipThinner', 'mouthUpperLipFuller', 'mouth'],
  ['mouth.lowerLip', 'Lower lip fullness', 'mouthLowerLipThinner', 'mouthLowerLipFuller', 'mouth'],
  ['jaw.width', 'Jaw width', 'jawNarrower', 'jawWider', 'jaw'],
  ['chin.projection', 'Chin projection', 'jawChinBack', 'jawChinForward', 'jaw'],
  ['head.width', 'Head width', 'headNarrower', 'headWider', 'head'],
  ['head.height', 'Head height', 'headShorter', 'headTaller', 'head'],
  ['eyes.size', 'Eye size', ['eyeSmallerLeft', 'eyeSmallerRight'], ['eyeBiggerLeft', 'eyeBiggerRight'], 'eyes'],
  ['eyes.spacing', 'Eye spacing', ['eyeInwardLeft', 'eyeInwardRight'], ['eyeOutwardLeft', 'eyeOutwardRight'], 'eyes'],
  ['neck.width', 'Neck width', 'neckThinner', 'neckThicker', 'neck'],
  ['chest.width', 'Chest width', 'chestNarrower', 'chestWider', 'torso'],
  ['shoulders.width', 'Shoulder width', 'shouldersNarrower', 'shouldersWider', 'torso'],
  ['waist.width', 'Waist width', 'waistNarrower', 'waistWider', 'hips'],
  ['hips.width', 'Hip width', 'hipsNarrower', 'hipsWider', 'hips'],
  ['arms.width', 'Arm fullness', 'armsThinner', 'armsThicker', 'arms'],
  ['thighs.width', 'Thigh fullness', 'thighsThinner', 'thighsThicker', 'legs'],
  ['calves.width', 'Calf fullness', 'calvesThinner', 'calvesThicker', 'legs'],
  ['body.build', 'Body fullness', 'bodyThinner', 'bodyHeavier', 'body'],
  ['body.definition', 'Muscle definition', 'bodySofter', 'bodyMuscular', 'body'],
].map(([id, label, negative, positive, group]) => Object.freeze({ id, label, negative: [negative].flat(), positive: [positive].flat(), group })));

export function simpleControlValue(parameters, control) {
  const average = keys => keys.reduce((sum, key) => sum + (parameters[key] || 0), 0) / keys.length;
  return average(control.positive) - average(control.negative);
}
export function setSimpleControl(parameters, control, value) {
  if (!Number.isFinite(value) || value < -1 || value > 1) throw new Error('Shape control must be between -1 and 1.');
  const next = { ...parameters };
  for (const key of control.negative) next[key] = Math.max(0, -value);
  for (const key of control.positive) next[key] = Math.max(0, value);
  return next;
}

export function createParametricDocument() {
  return createAvatarDocument({ asset: manifest.asset,
    current: { appearance: { skinColor: '#bd8b6a', eyeColor: '#523b2d' } },
    goal: { appearance: { skinColor: '#bd8b6a', eyeColor: '#523b2d' } },
  });
}

/** Validate the capabilities this editor can actually reproduce, before save/import. */
export function validateParametricDocument(input) {
  const source = validateAvatarDocument(input);
  const previousMaterial = source.asset.materialVersion, previousSolver = source.asset.solverVersion;
  const adaptMaterial = ['growthtrack-skin-v1', 'growthtrack-skin-v2'].includes(previousMaterial);
  const adaptSolver = previousSolver === 'cpu-identity-v1';
  if (adaptMaterial || adaptSolver) {
    assertAvatarAssetCompatible(source.asset, { ...manifest.asset,
      ...(adaptMaterial ? { materialVersion: previousMaterial } : {}), ...(adaptSolver ? { solverVersion: previousSolver } : {}),
    });
    if (adaptMaterial) source.asset.materialVersion = manifest.asset.materialVersion;
    if (adaptSolver) source.asset.solverVersion = manifest.asset.solverVersion;
    for (const context of Object.values(source.contexts)) context.provenance = { ...context.provenance,
      ...(adaptMaterial ? { visualAssetUpgrade: { from: previousMaterial, to: manifest.asset.materialVersion } } : {}),
      ...(adaptSolver ? { solverUpgrade: { from: previousSolver, to: manifest.asset.solverVersion } } : {}),
    };
  }
  const document = validateAvatarDocument(source, { expectedAsset: manifest.asset });
  for (const context of Object.values(document.contexts)) {
    for (const [name, value] of Object.entries(context.parameters)) {
      if (!parameterNames.has(name) || value < 0 || value > 1) throw new Error(`Unsupported shape parameter: ${name}.`);
    }
    for (const key of ['proportions', 'expressions', 'pose', 'equipment', 'measurements', 'customEdits']) {
      if (Object.keys(context[key]).length) throw new Error(`${key} needs an adapter before this editor can reproduce it.`);
    }
    for (const [key, color] of Object.entries(context.appearance)) {
      if (!['skinColor', 'eyeColor'].includes(key) || typeof color !== 'string' || !/^#[\da-f]{6}$/i.test(color)) throw new Error('Unsupported avatar appearance.');
    }
  }
  return document;
}

export function patchParametricContext(input, patch, context = input.activeContext) {
  if (!['current', 'goal'].includes(context)) throw new Error('Choose Current or Goal.');
  return validateParametricDocument({ ...input, updatedAt: new Date().toISOString(), contexts: { ...input.contexts, [context]: { ...input.contexts[context], ...patch } } });
}
