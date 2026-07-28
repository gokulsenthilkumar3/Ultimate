const fs = require('fs');

const aura = fs.readFileSync('src/components/morphEngine/AuraShader.js', 'utf8').replace(/\r\n/g, '\n');
const skin = fs.readFileSync('src/components/morphEngine/SkinShader.js', 'utf8').replace(/\r\n/g, '\n');
const vasc = fs.readFileSync('src/components/morphEngine/VascularityShader.js', 'utf8').replace(/\r\n/g, '\n');

// 1. Extract VASCULARITY_GLSL
const vascStart = vasc.indexOf('export const VASCULARITY_GLSL = /* glsl */ ') + 44;
const vascEnd = vasc.indexOf(';', vascStart);
const vascGlsl = vasc.substring(vascStart, vascEnd);

let uber = skin;

// 2. Replace veinPattern with vascGlsl
const veinPatternStart = uber.indexOf('float veinPattern(vec3 pos) {');
const veinPatternEnd = uber.indexOf('}', veinPatternStart) + 1;
if(veinPatternStart > -1) {
  uber = uber.substring(0, veinPatternStart) + vascGlsl + uber.substring(veinPatternEnd);
}

// 3. Replace Vascularity overlay in skinFragmentShader
const vOvStart = uber.indexOf('// -- Vascularity overlay -------------------------------------------------');
const vOvEnd = uber.indexOf('// -- Anatomy depth composite ----------------------------------------------', vOvStart);
if(vOvStart > -1) {
  const newOv = '// -- Vascularity overlay -------------------------------------------------\n    if (uVascularityIntensity > 0.0) {\n      vec4 overlay = vascularityOverlay(vWorldPosition, uVascularityIntensity, uTime);\n      skinColor = mix(skinColor, overlay.rgb, overlay.a);\n    }\n\n    ';
  uber = uber.substring(0, vOvStart) + newOv + uber.substring(vOvEnd);
}

// 4. Remove exports from skin
uber = uber.replace('export { FITZPATRICK_TABLE, ANATOMY_COLORS };', '');

// 5. Clean aura (remove THREE import)
const auraClean = aura.replace('import * as THREE from "three";', '');

// 6. Combine
const finalCode = uber + '\n' + auraClean + '\nexport { FITZPATRICK_TABLE, ANATOMY_COLORS };\n';

fs.writeFileSync('src/components/morphEngine/UberShader.js', finalCode);
