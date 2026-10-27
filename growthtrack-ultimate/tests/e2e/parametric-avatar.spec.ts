import { test, expect } from './foundation-fixture';
import { setupHumanViewer } from './helpers/human-viewer';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { unzipSync } from 'three/addons/libs/fflate.module.js';
import { validateBytes } from 'gltf-validator';

async function setRange(input: any, value: number) {
  await input.evaluate((element: HTMLInputElement, next: number) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, String(next));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

test('parametric shapes save separately and editable exports reopen with a valid rig', async ({ page }, testInfo) => {
  const fixture = await setupHumanViewer(page, 'reduce');
  await page.getByRole('button', { name: 'Parametric human editor', exact: true }).click();
  const editor = page.getByRole('region', { name: 'Parametric human editor', exact: true });
  const canvas = editor.locator('canvas');
  await expect(canvas).toHaveAttribute('data-parametric-ready', 'true', { timeout: 45000 });
  await editor.getByText('Export & restore', { exact: true }).click();
  await expect(editor.getByRole('button', { name: 'Export shape-editing GLB', exact: true }))
    .toHaveAccessibleDescription(/changing shapes or poses in another app requires refitting the joints and clothing/i);
  await expect(canvas).toHaveAttribute('data-identity-morph-layers', '0');
  await expect(canvas).toHaveAttribute('data-skin-maps', '6');
  await expect(canvas).toHaveAttribute('data-eye-meshes', '8');
  await expect(canvas).toHaveAttribute('data-attachment-count', '2');
  await editor.getByLabel('Shape region', { exact: true }).selectOption('nose');
  await setRange(editor.getByRole('slider', { name: 'Nose width', exact: true }), 0.45);
  await expect(editor.getByRole('slider', { name: 'Nose width', exact: true })).toHaveValue('0.45');
  await editor.getByRole('group', { name: 'Parametric editing version' }).getByRole('button', { name: 'Goal', exact: true }).click();
  await expect(editor.getByRole('slider', { name: 'Nose width', exact: true })).toHaveValue('0');
  await setRange(editor.getByRole('slider', { name: 'Nose width', exact: true }), -0.2);
  await editor.getByRole('group', { name: 'Parametric editing version' }).getByRole('button', { name: 'Current', exact: true }).click();
  await expect(editor.getByRole('slider', { name: 'Nose width', exact: true })).toHaveValue('0.45');
  await editor.getByRole('button', { name: 'Save edits', exact: true }).click();
  await expect.poll(() => fixture.targets().parametricAvatar?.contexts.current.parameters.noseWider).toBe(0.45);
  expect(fixture.targets().parametricAvatar.contexts.goal.parameters.noseNarrower).toBe(0.2);
  expect(fixture.bodyWrites).toHaveLength(0);
  await editor.getByRole('group', { name: 'Parametric camera' }).getByRole('button', { name: 'Face', exact: true }).click();
  await mkdir('artifacts/parametric-human', { recursive: true });
  await editor.screenshot({ path: 'artifacts/parametric-human/editor-desktop.png' });
  await editor.getByText('Preview capability and export details', { exact: true }).click();
  await editor.getByRole('button', { name: 'Run 3-second preview sample', exact: true }).click();
  await expect(editor.getByText(/^Frame interval p95:/)).toBeVisible({ timeout: 20000 });
  await writeFile('artifacts/parametric-human/browser-preview.json', JSON.stringify({
    userAgent: await page.evaluate(() => navigator.userAgent),
    viewport: page.viewportSize(), scenario: 'stationary portrait, skin material, single avatar',
    sample: await editor.getByText(/^Frame interval p95:/).textContent(),
    capabilityEvidence: await editor.locator('.parametric-studio__diagnostics').textContent(),
    physicalDeviceCertification: false,
  }, null, 2));
  await editor.getByLabel('Parametric material', { exact: true }).selectOption('clay');
  const downloadPromise = page.waitForEvent('download');
  await editor.getByRole('button', { name: 'Export editable package', exact: true }).click();
  const download = await downloadPromise;
  const packagePath = testInfo.outputPath('avatar-editable.zip');
  await download.saveAs(packagePath);
  const entries = unzipSync(new Uint8Array(await readFile(packagePath)));
  expect(Object.keys(entries)).toEqual(expect.arrayContaining(['avatar.glb', 'avatar.json', 'basis.glb', 'manifest.json', 'licenses/CC0.txt']));
  const semantic = JSON.parse(new TextDecoder().decode(entries['avatar.json']));
  expect(semantic.contexts.current.parameters.noseWider).toBe(0.45);
  expect(semantic.contexts.goal.parameters.noseNarrower).toBe(0.2);
  expect(Object.keys(entries)).toEqual(expect.arrayContaining(['licenses/SKIN-SOURCE.md', 'licenses/short02-CC0.txt', 'licenses/tee-CC0.txt', 'licenses/EYES-SOURCE.md', 'licenses/thickness-SOURCE.md']));
  const report = await validateBytes(entries['avatar.glb'], { maxIssues: 30 });
  expect(report.issues.numErrors, JSON.stringify(report.issues.messages)).toBe(0);
  expect(report.issues.numWarnings, JSON.stringify(report.issues.messages)).toBe(0);
  await writeFile('artifacts/parametric-human/avatar-export.glb', entries['avatar.glb']);
  await writeFile('artifacts/parametric-human/export-validation.json', JSON.stringify(report, null, 2));
  const data = entries['avatar.glb'], header = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const gltf = JSON.parse(new TextDecoder().decode(data.subarray(20, 20 + header.getUint32(12, true))));
  expect(gltf.skins[0].joints).toHaveLength(52);
  expect(gltf.materials.find((material: any) => material.name === 'Skin' || material.extensions?.KHR_materials_ior)?.extensions).toBeDefined();
  const skinMaterial = gltf.materials.find((material: any) => material.name === 'Parametric textured skin');
  expect(skinMaterial.pbrMetallicRoughness.baseColorTexture).toBeDefined();
  expect(skinMaterial.pbrMetallicRoughness.metallicRoughnessTexture).toBeDefined();
  expect(skinMaterial.normalTexture.extensions.KHR_texture_transform.scale).toEqual([64, 64]);
  expect(gltf.images.length).toBeGreaterThanOrEqual(7);
  expect(gltf.nodes.map((node: any) => node.name)).toEqual(expect.arrayContaining(['Authored short02 hair', 'Authored casual tee']));
  expect(gltf.materials.find((material: any) => material.name === 'Eye transmissive cornea').extensions.KHR_materials_ior.ior).toBe(1.336);
  expect(gltf.nodes.filter((node: any) => /layered eye/.test(node.name || ''))).toHaveLength(8);
  expect(JSON.parse(new TextDecoder().decode(entries['manifest.json'])).capabilities).toMatchObject({ rigFitting: 'performed', expressionBank: 'none' });
  expect(gltf.meshes.every((mesh: any) => mesh.primitives.every((primitive: any) => !primitive.targets?.length))).toBe(true);
  const editingDownloadPromise = page.waitForEvent('download', { timeout: 60000 });
  await editor.getByRole('button', { name: 'Export shape-editing GLB', exact: true }).click();
  const editingDownload = await editingDownloadPromise;
  const editingPath = testInfo.outputPath('avatar-shape-editing.glb');
  await editingDownload.saveAs(editingPath);
  const editingData = new Uint8Array(await readFile(editingPath));
  const editingReport = await validateBytes(editingData, { maxIssues: 30 });
  expect(editingReport.issues.numErrors, JSON.stringify(editingReport.issues.messages)).toBe(0);
  expect(editingReport.issues.numWarnings, JSON.stringify(editingReport.issues.messages)).toBe(0);
  const editingHeader = new DataView(editingData.buffer, editingData.byteOffset, editingData.byteLength);
  const editingGltf = JSON.parse(new TextDecoder().decode(editingData.subarray(20, 20 + editingHeader.getUint32(12, true))));
  const body = editingGltf.meshes[editingGltf.nodes.find((node: any) => node.name === 'Body').mesh];
  expect(body.extras.targetNames).toEqual(JSON.parse(await readFile('src/config/parametricHuman.json', 'utf8')).morphTargets);
  expect(body.primitives[0].targets).toHaveLength(306);
  expect(body.weights[body.extras.targetNames.indexOf('noseWider')]).toBe(0.45);
  expect(body.weights[body.extras.targetNames.indexOf('noseNarrower')]).toBe(0);
  expect(editingGltf.skins[0].joints).toHaveLength(52);
  for (const node of editingGltf.nodes.filter((node: any) => /layered eye/.test(node.name || ''))) {
    expect(editingGltf.meshes[node.mesh].primitives[0].targets).toHaveLength(30);
  }
  expect(editingGltf.nodes.filter((node: any) => /layered eye/.test(node.name || ''))).toHaveLength(8);
  const cover = editingGltf.meshes[editingGltf.nodes.find((node: any) => node.name === 'Fitted shorts preview').mesh];
  expect(cover.primitives[0].targets).toHaveLength(306);
  for (const name of ['Authored short02 hair', 'Authored casual tee']) {
    const attachment = editingGltf.meshes[editingGltf.nodes.find((node: any) => node.name === name).mesh];
    expect(attachment.primitives[0].targets).toHaveLength(306);
    expect(attachment.extras.targetNames).toEqual(body.extras.targetNames);
    expect(attachment.weights[attachment.extras.targetNames.indexOf('noseWider')]).toBe(0.45);
  }
  await writeFile('artifacts/parametric-human/avatar-shape-editing.glb', editingData);
  await writeFile('artifacts/parametric-human/shape-editing-validation.json', JSON.stringify(editingReport, null, 2));
  // Preparing the desktop shape bank must not mount it in the live renderer.
  await expect(canvas).toHaveAttribute('data-identity-morph-layers', '0');
  await expect(editor.getByRole('slider', { name: 'Nose width', exact: true })).toHaveValue('0.45');
  await setRange(editor.getByRole('slider', { name: 'Nose width', exact: true }), 0.1);
  await editor.getByLabel('Avatar package file', { exact: true }).setInputFiles(packagePath);
  await expect(editor.getByRole('region', { name: 'Review imported avatar' })).toBeVisible();
  await editor.getByRole('button', { name: 'Restore editing state', exact: true }).click();
  await expect(editor.getByRole('slider', { name: 'Nose width', exact: true })).toHaveValue('0.45');
  await editor.getByRole('button', { name: 'Save edits', exact: true }).click();
  await page.getByRole('button', { name: 'Body tracker', exact: true }).click();
  await page.locator('.chamber-canvas-wrap canvas').scrollIntoViewIfNeeded();
  await expect(page.locator('.chamber-canvas-wrap canvas')).toHaveAttribute('data-camera-position', /.+/, { timeout: 45000 });
  await page.getByRole('button', { name: 'Parametric human editor', exact: true }).click();
  await editor.getByLabel('Shape region', { exact: true }).selectOption('nose');
  await expect(editor.getByRole('slider', { name: 'Nose width', exact: true })).toHaveValue('0.45');
  expect(fixture.errors).toEqual([]);
});

test('parametric editor fits mobile width and preserves per-person state', async ({ page }) => {
  const fixture = await setupHumanViewer(page, 'reduce');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Parametric human editor', exact: true }).click();
  const editor = page.getByRole('region', { name: 'Parametric human editor', exact: true });
  await expect(editor.locator('canvas')).toHaveAttribute('data-identity-morph-layers', '0', { timeout: 45000 });
  await editor.getByLabel('Shape control level', { exact: true }).selectOption('advanced');
  await editor.getByLabel('Find a shape feature', { exact: true }).fill('nose wider');
  await setRange(editor.getByRole('slider', { name: 'Nose Wider', exact: true }), 0.35);
  await page.getByRole('button', { name: 'Create a person', exact: true }).click();
  await page.getByRole('textbox', { name: 'Person’s name', exact: true }).fill('Second person');
  await page.getByRole('button', { name: 'Create person', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Person', exact: true })).not.toHaveValue('self');
  await page.getByRole('button', { name: 'Parametric human editor', exact: true }).click();
  await editor.getByLabel('Shape region', { exact: true }).selectOption('nose');
  await expect(editor.getByRole('slider', { name: 'Nose width', exact: true })).toHaveValue('0');
  await page.getByRole('combobox', { name: 'Person', exact: true }).selectOption('self');
  await page.getByRole('button', { name: 'Parametric human editor', exact: true }).click();
  await editor.getByLabel('Shape region', { exact: true }).selectOption('nose');
  await expect(editor.getByRole('slider', { name: 'Nose width', exact: true })).toHaveValue('0.35');
  const bounds = await editor.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(391);
  await editor.screenshot({ path: 'artifacts/parametric-human/editor-mobile.png' });
  expect(fixture.errors).toEqual([]);
});
