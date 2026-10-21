import fs from 'fs';
const aura = fs.readFileSync('src/components/morphEngine/AuraShader.js', 'utf8');
const skin = fs.readFileSync('src/components/morphEngine/SkinShader.js', 'utf8');
const vasc = fs.readFileSync('src/components/morphEngine/VascularityShader.js', 'utf8');

let uber = skin;
const vascStart = vasc.indexOf('export const VASCULARITY_GLSL = /* glsl */ ') + 44;
const vascEnd = vasc.indexOf(';', vascStart);
const vascGlsl = vasc.substring(vascStart, vascEnd);

// Replace veinPattern block entirely using index
const vPatStart = uber.indexOf('float veinPattern(vec3 pos) {');
const vPatEnd = uber.indexOf('}', vPatStart) + 1;
if(vPatStart > -1) {
  uber = uber.substring(0, vPatStart) + vascGlsl + uber.substring(vPatEnd);
}

// Replace Vascularity overlay block
const vOvStart = uber.indexOf('// -- Vascularity overlay -------------------------------------------------');
const vOvEnd = uber.indexOf('// -- Anatomy depth composite ----------------------------------------------', vOvStart);
if(vOvStart > -1) {
  const newOv = '// -- Vascularity overlay -------------------------------------------------\\n    if (uVascularityIntensity > 0.0) {\\n      vec4 overlay = vascularityOverlay(vWorldPosition, uVascularityIntensity, uTime);\\n      skinColor = mix(skinColor, overlay.rgb, overlay.a);\\n    }\\n\\n    ';
  uber = uber.substring(0, vOvStart) + newOv + uber.substring(vOvEnd);
}

uber = uber.replace(/export { FITZPATRICK_TABLE, ANATOMY_COLORS };/g, '');

const auraClean = aura.split('\\n').filter(l => !l.includes('import * as THREE')).join('\\n');

const finalCode = uber + '\\n' + auraClean + '\\nexport { FITZPATRICK_TABLE, ANATOMY_COLORS };\\n';

fs.writeFileSync('src/components/morphEngine/UberShader.js', finalCode);
