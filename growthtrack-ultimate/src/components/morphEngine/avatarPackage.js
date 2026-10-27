import { zipSync, unzipSync, strToU8 } from 'three/addons/libs/fflate.module.js';
import { parseAvatarDocument, serializeAvatarDocument, validateAvatarDocument, MAX_AVATAR_DOCUMENT_BYTES } from '../../lib/avatarDocument.js';

export const AVATAR_PACKAGE_FORMAT = 'growthtrack-avatar-package';
export const AVATAR_PACKAGE_VERSION = 1;
export const MAX_AVATAR_PACKAGE_BYTES = 128 * 1024 * 1024;
const MAX_MANIFEST_BYTES = 256 * 1024;
const MAX_LICENSE_BYTES = 64 * 1024;
const MAX_GLB_JSON_BYTES = 4 * 1024 * 1024;
const MAX_ENTRIES = 24;
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
// fflate distinguishes binary leaves with instanceof. Normalize to its realm
// for iframe inputs and DOM test environments that provide a second constructor.
const ZipBytes = strToU8('', true).constructor;
const HASH = /^[a-f0-9]{64}$/;
const LICENSE_PATH = /^licenses\/[a-zA-Z0-9][a-zA-Z0-9_.-]{0,100}\.(txt|md|json)$/;
const FIXED_PATHS = ['avatar.glb', 'avatar.json', 'basis.glb', 'manifest.json', 'README.txt'];
const README = 'GrowthTrack editable avatar package v1\n\n'
  + 'avatar.glb is an optimized viewing/export representation. It does not contain the original identity slider bank.\n'
  + 'avatar.json preserves independent Current/Goal semantic editing state. basis.glb preserves the authoring basis.\n'
  + 'Third-party editors do not automatically understand this semantic document. Changing topology, vertex order, rig or bind space may invalidate parameter and garment correspondence.\n'
  + 'Reopening semantic state does not import external geometry modifications. Custom browser shaders are not automatically preserved in glTF materials.\n'
  + 'Included source notices describe the recorded assets; this package is not a legal certification of new external content.\n';
const CAPABILITIES = Object.freeze({
  rigFitting: ['unknown', 'not-performed', 'performed'],
  expressionBank: ['unknown', 'none', 'preserved'],
  browserSkinScattering: ['unknown', 'not-exported', 'baked-approximation'],
  clothing: ['unknown', 'none', 'fitted-shorts-preview', 'exported-unverified'],
});

function fail(message) { throw new Error(`Avatar package: ${message}`); }
function bytes(value, label) {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  fail(`${label} must be binary data.`);
}
function decode(value, label) {
  try { return decoder.decode(value); } catch { fail(`${label} is not valid UTF-8.`); }
}
function plainRecord(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) fail(`${label} must be an object.`);
}
function allowedPath(path) { return FIXED_PATHS.includes(path) || LICENSE_PATH.test(path); }
function entryLimit(path) {
  if (path === 'avatar.json') return MAX_AVATAR_DOCUMENT_BYTES;
  if (path === 'manifest.json') return MAX_MANIFEST_BYTES;
  if (path === 'README.txt' || LICENSE_PATH.test(path)) return MAX_LICENSE_BYTES;
  return MAX_AVATAR_PACKAGE_BYTES;
}
function json(bytesValue, label, limit) {
  if (bytesValue.byteLength > limit) fail(`${label} exceeds its size limit.`);
  try { return JSON.parse(decode(bytesValue, label)); } catch (error) { fail(`${label} contains invalid JSON (${error.message}).`); }
}

export async function avatarSha256(value) {
  if (!globalThis.crypto?.subtle) fail('SHA-256 requires a secure browser context.');
  // Make a detached copy so callers cannot alter the hashed view during await.
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes(value, 'hash input').slice());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Container and self-contained URI checks, not a full glTF conformance certificate. */
export function validatePackageGlb(value, label = 'GLB') {
  const data = bytes(value, label);
  if (data.byteLength < 20 || data.byteLength > MAX_AVATAR_PACKAGE_BYTES) fail(`${label} has an invalid size.`);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== data.byteLength) fail(`${label} must be a complete glTF 2 GLB.`);
  let offset = 12;
  let metadata;
  let chunks = 0;
  while (offset < data.byteLength) {
    if (offset + 8 > data.byteLength) fail(`${label} has a truncated chunk.`);
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    if (length % 4 || offset + 8 + length > data.byteLength) fail(`${label} has an invalid chunk length.`);
    if (chunks === 0) {
      if (type !== 0x4e4f534a) fail(`${label} must begin with a JSON chunk.`);
      metadata = json(data.subarray(offset + 8, offset + 8 + length), `${label} JSON`, MAX_GLB_JSON_BYTES);
      if (metadata?.asset?.version !== '2.0') fail(`${label} must declare glTF 2.0.`);
    } else if (type !== 0x004e4942 || chunks !== 1) fail(`${label} has unsupported or duplicate chunks.`);
    chunks++;
    offset += 8 + length;
  }
  // Package reimport must never trigger a remote fetch from image/buffer URIs.
  for (const key of ['buffers', 'images']) {
    if (metadata[key] !== undefined && !Array.isArray(metadata[key])) fail(`${label} ${key} must be an array.`);
    for (const resource of metadata[key] || []) {
      plainRecord(resource, `${label} resource`);
      if (resource.uri !== undefined && (typeof resource.uri !== 'string' || !/^data:/i.test(resource.uri))) fail(`${label} contains external resources; embed them before exporting.`);
    }
  }
  return { bytes: data.byteLength, metadata };
}

function licenseReferences(input = []) {
  if (!Array.isArray(input) || input.length > 16) fail('licenseReferences must contain at most 16 entries.');
  return input.map((reference) => {
    plainRecord(reference, 'licence reference');
    if (Object.keys(reference).some((key) => !['label', 'url', 'license'].includes(key))) fail('unsupported licence reference field.');
    for (const key of ['label', 'url', 'license']) if (typeof reference[key] !== 'string' || reference[key].length < 1 || reference[key].length > 2048 || Array.from(reference[key]).some((character) => character.charCodeAt(0) < 32)) fail('invalid licence reference.');
    if (!/^https:\/\//i.test(reference.url)) fail('licence reference URLs must use HTTPS.');
    return { label: reference.label, url: reference.url, license: reference.license };
  });
}

function packageCapabilities(input = {}) {
  plainRecord(input, 'capabilities');
  if (Object.keys(input).some((key) => !Object.prototype.hasOwnProperty.call(CAPABILITIES, key))) fail('unsupported capability field.');
  const result = {};
  for (const [key, options] of Object.entries(CAPABILITIES)) {
    const value = input[key] ?? 'unknown';
    if (!options.includes(value)) fail(`unsupported capability ${key}.`);
    result[key] = value;
  }
  return result;
}

/** ZIP v1 is deliberately STORE-only: no compressed entry can allocate a zip bomb. */
export async function exportAvatarPackage({ document, glb, basis, licenseFiles = {}, licenseReferences: references = [], geometryProfile = 'identity-baked-rigged', capabilities: declaredCapabilities = {} }) {
  const safeDocument = validateAvatarDocument(document);
  const capabilities = packageCapabilities(declaredCapabilities);
  if (!['identity-baked-rigged', 'evaluated-surface'].includes(geometryProfile)) fail('unsupported geometry profile.');
  const inputGlb = bytes(glb, 'avatar.glb');
  const inputBasis = bytes(basis, 'basis.glb');
  if (inputGlb.byteLength + inputBasis.byteLength > MAX_AVATAR_PACKAGE_BYTES - 65536) fail('package exceeds the 128 MiB limit.');
  const glbData = inputGlb.slice();
  const basisData = inputBasis.slice();
  validatePackageGlb(glbData, 'avatar.glb');
  validatePackageGlb(basisData, 'basis.glb');
  const entries = { 'avatar.glb': glbData, 'avatar.json': encoder.encode(serializeAvatarDocument(safeDocument)), 'basis.glb': basisData,
    'README.txt': encoder.encode(`${README}\nDeclared capabilities/limitations:\n${JSON.stringify(capabilities, null, 2)}\n\nUnknown means unverified. These declarations do not establish garment fit, animation quality or shader parity in an external editor.\n`) };
  plainRecord(licenseFiles, 'licenseFiles');
  for (const [name, text] of Object.entries(licenseFiles)) {
    const path = name.startsWith('licenses/') ? name : `licenses/${name}`;
    if (!LICENSE_PATH.test(path) || typeof text !== 'string') fail('licence files must have safe .txt, .md or .json names and text contents.');
    entries[path] = encoder.encode(text);
  }
  if (Object.keys(entries).length >= MAX_ENTRIES) fail('too many package files.');
  let total = 0;
  for (const [path, data] of Object.entries(entries)) {
    if (data.byteLength > entryLimit(path)) fail(`${path} exceeds its size limit.`);
    total += data.byteLength;
  }
  if (total > MAX_AVATAR_PACKAGE_BYTES - 65536) fail('package exceeds the 128 MiB limit.');
  const fileRecords = {};
  for (const [path, data] of Object.entries(entries)) fileRecords[path] = { bytes: data.byteLength, sha256: await avatarSha256(data) };
  if (safeDocument.asset.sourceHash && safeDocument.asset.sourceHash !== fileRecords['basis.glb'].sha256) fail('basis.glb does not match the document sourceHash.');
  const manifest = {
    format: AVATAR_PACKAGE_FORMAT,
    schemaVersion: AVATAR_PACKAGE_VERSION,
    documentId: safeDocument.id,
    asset: safeDocument.asset,
    activeContext: safeDocument.activeContext,
    geometryProfile,
    semanticEditing: 'avatar.json + basis.glb',
    externalGeometryReimport: 'not-supported',
    capabilities,
    licenseReferences: licenseReferences(references),
    files: fileRecords,
  };
  entries['manifest.json'] = encoder.encode(JSON.stringify(manifest, null, 2));
  const result = zipSync(Object.fromEntries(Object.entries(entries).map(([path, content]) => [path, new ZipBytes(content)])), { level: 0 });
  if (result.byteLength > MAX_AVATAR_PACKAGE_BYTES) fail('package exceeds the 128 MiB limit.');
  return result;
}

function preflightZip(data) {
  // Read the central directory before fflate constructs an object from paths.
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let end = data.byteLength - 22;
  for (; end >= Math.max(0, data.byteLength - 65557); end--) if (view.getUint32(end, true) === 0x06054b50 && end + 22 + view.getUint16(end + 20, true) === data.byteLength) break;
  if (end < Math.max(0, data.byteLength - 65557)) fail('invalid ZIP directory.');
  // fflate finds the last EOCD signature without checking its comment length.
  // A comment could therefore hide a second directory that bypasses these
  // STORE/size checks. Keep v1 comment-free so both parsers use the same EOCD.
  if (view.getUint16(end + 20, true) !== 0) fail('ZIP comments are not supported in package v1.');
  if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) fail('multipart ZIP files are not supported.');
  const count = view.getUint16(end + 10, true);
  const directorySize = view.getUint32(end + 12, true);
  let offset = view.getUint32(end + 16, true);
  if (count < 5 || count > MAX_ENTRIES || view.getUint16(end + 8, true) !== count || offset + directorySize !== end) fail('invalid ZIP entry count or directory.');
  const paths = new Set();
  let total = 0;
  for (let index = 0; index < count; index++) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50) fail('invalid ZIP entry.');
    const flags = view.getUint16(offset + 8, true);
    const compression = view.getUint16(offset + 10, true);
    const stored = view.getUint32(offset + 20, true);
    const size = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const local = view.getUint32(offset + 42, true);
    if (offset + 46 + nameLength + extraLength + commentLength > end || local + 30 > data.byteLength || view.getUint32(local, true) !== 0x04034b50) fail('invalid ZIP entry offsets.');
    const name = decode(data.subarray(offset + 46, offset + 46 + nameLength), 'ZIP path');
    if (!allowedPath(name) || paths.has(name)) fail('unknown, unsafe or duplicate ZIP path.');
    if (compression !== 0 || (flags & ~0x800) !== 0 || stored !== size || size > entryLimit(name)) fail('only bounded, unencrypted STORE entries are supported in package v1.');
    const localNameLength = view.getUint16(local + 26, true);
    const localExtraLength = view.getUint16(local + 28, true);
    const localName = decode(data.subarray(local + 30, local + 30 + localNameLength), 'local ZIP path');
    const localEnd = local + 30 + localNameLength + localExtraLength + size;
    if (localName !== name || view.getUint16(local + 6, true) !== flags || view.getUint16(local + 8, true) !== compression || view.getUint32(local + 18, true) !== stored || view.getUint32(local + 22, true) !== size || localEnd > view.getUint32(end + 16, true)) fail('inconsistent ZIP entry.');
    total += size;
    if (total > MAX_AVATAR_PACKAGE_BYTES) fail('unpacked package exceeds the 128 MiB limit.');
    paths.add(name);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  if (offset !== end || FIXED_PATHS.some((path) => !paths.has(path))) fail('package is missing required files.');
  return paths;
}

/** Safe semantic round-trip only; returned GLB geometry is never automatically applied. */
export async function importAvatarPackage(value, { expectedAsset } = {}) {
  const input = bytes(value, 'ZIP');
  if (input.byteLength < 22 || input.byteLength > MAX_AVATAR_PACKAGE_BYTES) fail('ZIP exceeds the 128 MiB limit or is incomplete.');
  const data = input.slice();
  const paths = preflightZip(data);
  let entries;
  try { entries = unzipSync(data); } catch { fail('invalid ZIP contents.'); }
  const manifest = json(entries['manifest.json'], 'manifest.json', MAX_MANIFEST_BYTES);
  plainRecord(manifest, 'manifest');
  const fields = ['format', 'schemaVersion', 'documentId', 'asset', 'activeContext', 'geometryProfile', 'semanticEditing', 'externalGeometryReimport', 'capabilities', 'licenseReferences', 'files'];
  if (Object.keys(manifest).some((key) => !fields.includes(key)) || manifest.format !== AVATAR_PACKAGE_FORMAT || manifest.schemaVersion !== AVATAR_PACKAGE_VERSION) fail('unsupported package format/version or manifest field.');
  if (!['identity-baked-rigged', 'evaluated-surface'].includes(manifest.geometryProfile) || manifest.semanticEditing !== 'avatar.json + basis.glb' || manifest.externalGeometryReimport !== 'not-supported') fail('unsupported editing or geometry profile.');
  // Older v1 packages lack this declaration: retain compatibility and label
  // each capability unknown instead of inventing support from a rigged GLB.
  const capabilities = packageCapabilities(manifest.capabilities);
  licenseReferences(manifest.licenseReferences);
  plainRecord(manifest.files, 'manifest.files');
  if (Object.keys(manifest.files).length !== paths.size - 1) fail('manifest file set differs from ZIP.');
  for (const [path, metadata] of Object.entries(manifest.files)) {
    if (!paths.has(path) || path === 'manifest.json') fail('manifest refers to an unknown file.');
    plainRecord(metadata, `manifest ${path}`);
    if (Object.keys(metadata).some((key) => !['bytes', 'sha256'].includes(key)) || !HASH.test(metadata.sha256) || metadata.bytes !== entries[path].byteLength || await avatarSha256(entries[path]) !== metadata.sha256) fail(`${path} failed its integrity check.`);
  }
  const document = parseAvatarDocument(decode(entries['avatar.json'], 'avatar.json'), { expectedAsset });
  if (document.id !== manifest.documentId || document.activeContext !== manifest.activeContext || JSON.stringify(document.asset) !== JSON.stringify(manifest.asset)) fail('manifest and document identity do not match.');
  validatePackageGlb(entries['avatar.glb'], 'avatar.glb');
  validatePackageGlb(entries['basis.glb'], 'basis.glb');
  const verifiedBasis = !!document.asset.sourceHash && document.asset.sourceHash === manifest.files['basis.glb'].sha256;
  if (document.asset.sourceHash && !verifiedBasis) fail('authoring basis does not match the sourceHash.');
  return {
    document,
    glb: entries['avatar.glb'],
    basis: entries['basis.glb'],
    manifest: { ...manifest, capabilities },
    licenseFiles: Object.fromEntries(Object.entries(entries).filter(([path]) => LICENSE_PATH.test(path)).map(([path, content]) => [path, decode(content, path)])),
    compatibility: { semantic: expectedAsset ? 'exact-asset-match' : 'needs-asset-verification', basis: verifiedBasis ? 'sha256-verified' : 'needs-source-verification', externalGeometry: 'not-applied' },
  };
}
