import fs from 'node:fs';
const file = 'growthtrack-ultimate/node_modules/vite/dist/node/chunks/node.js';
if (fs.existsSync(file)) {
  let code = fs.readFileSync(file, 'utf8');
  const target = `\t\tif (viteTempDir) try {\n\t\t\tawait fsp.mkdir(viteTempDir, { recursive: true });\n\t\t} catch (e) {\n\t\t\tif (e.code === "EACCES") viteTempDir = void 0;\n\t\t\telse throw e;\n\t\t}`;
  const replacement = `\t\tif (viteTempDir) try {\n\t\t\tawait fsp.mkdir(viteTempDir, { recursive: true });\n\t\t\tawait fsp.access(viteTempDir, 2);\n\t\t} catch (e) {\n\t\t\tviteTempDir = void 0;\n\t\t}`;
  if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync(file, code);
    console.log('Successfully patched Vite node.js chunk');
  } else {
    console.log('Target already patched or not found');
  }
}

