const fs = require('node:fs');
const path = require('node:path');
const { z } = require('zod');
process.env.REDIS_DISABLED = '1'; // Contract generation must never open external connections.
const { eventPatch, relationshipPatch } = require('../dist/controllers/recordMutations.controller');
const { eventRangeQuery } = require('../dist/controllers/eventRange.controller');
const { createFields } = require('../dist/controllers/members.controller');
const { relationshipCreate } = require('../dist/controllers/relationships.controller');
const { meSelectionBody } = require('../dist/controllers/personIdentity.controller');
const { gedcomPreviewBody, gedcomImportBody } = require('../dist/controllers/interchange.controller');
const { auditQuery } = require('../dist/controllers/audit.controller');
const root = path.resolve(__dirname, '..');
const jsonSchema = schema => z.toJSONSchema(schema, { unrepresentable: 'throw' });

function createContract() {
  const schemas = {
    EventPatch: { ...jsonSchema(eventPatch), minProperties: 1 },
    RelationshipPatch: { ...jsonSchema(relationshipPatch), minProperties: 1 },
    EventRangeQuery: jsonSchema(eventRangeQuery),
    PersonCreate: jsonSchema(createFields),
    RelationshipCreate: jsonSchema(relationshipCreate),
    MeSelection: jsonSchema(meSelectionBody),
    GedcomPreview: jsonSchema(gedcomPreviewBody),
    GedcomImport: jsonSchema(gedcomImportBody),
    AuditQuery: jsonSchema(auditQuery),
    DeleteConfirmation: { type: 'object', additionalProperties: false, required: ['confirm'], properties: { confirm: { type: 'string', description: 'Must exactly equal the record ID in the URL. Deletion is permanent and requires tree admin access.' } } },
    Error: { type: 'object', required: ['error'], properties: { error: { type: 'string' } } },
    Deleted: { type: 'object', required: ['deleted', 'id'], properties: { deleted: { const: true }, id: { type: 'string' }, storageCleanupPending: { type: 'boolean', description: 'Metadata was removed; physical storage cleanup still needs attention. Do not retry the committed deletion.' } } },
  };
  const paths = {};
  for (const [resource, methods] of [['members',['delete']],['relationships',['put','delete']],['events',['put','delete']],['documents',['delete']]]) {
    const item = { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^[A-Za-z0-9_-]+$', maxLength: 200 } }] };
    for (const method of methods) {
      const schema = method === 'delete' ? 'DeleteConfirmation' : resource === 'events' ? 'EventPatch' : 'RelationshipPatch';
      item[method] = {
        operationId: method + resource[0].toUpperCase() + resource.slice(1),
        description: method === 'delete' ? 'Tree admins only. No automatic retry. Member deletion removes attached relationships and detaches retained milestones/documents.' : 'Tree editors, family heads and admins. Ownership fields cannot be changed.',
        security: [{ UltimateSession: [], CsrfToken: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/' + schema } } } },
        responses: { '200': { description: 'Committed operation', ...(method === 'delete' ? { content: { 'application/json': { schema: { $ref: '#/components/schemas/Deleted' } } } } : {}) }, ...errors() },
      };
    }
    paths['/' + resource + '/{id}'] = item;
  }
  paths['/events'] = { get: {
    operationId: 'eventsInRange', security: [{ UltimateSession: [] }],
    description: 'Tree members only. Recorded milestones in an inclusive UTC date range of at most 366 days; 100 rows per page. Does not expand recurring birthdays or publish to Ultimate.',
    parameters: Object.entries(schemas.EventRangeQuery.properties).map(([name, schema]) => ({ name, in: 'query', required: ['treeId','from','to'].includes(name), schema })),
    responses: { '200': { description: 'rows, total, page, limit, from, to' }, ...errors() },
  } };
  for (const [resource, schema] of [['members','PersonCreate'],['relationships','RelationshipCreate']]) paths['/' + resource] = { post: {
    operationId: 'create' + resource, security: [{ UltimateSession: [], CsrfToken: [] }],
    description: resource === 'members' ? 'Create a person and optional relative link/Me selection atomically. Editors only. Me is an account preference, not a login claim.' : 'Explicit first-person-is-relation-of-second-person direction; presets are validated on the server. Ancestry cycles and duplicates are rejected.',
    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/' + schema } } } }, responses: { '201': { description: 'Created record' }, ...errors() },
  } };
  const treeId = { name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^[A-Za-z0-9_-]+$', maxLength: 200 } };
  paths['/trees/{id}/export/gedcom'] = { parameters: [treeId], get: {
    operationId: 'exportGedcom', security: [{ UltimateSession: [] }],
    description: 'Any tree member. Returns { filename, mediaType, gedcom, summary } where gedcom is GEDCOM 5.5.1 UTF-8 text. Trees above 5,000 people or 25,000 connections return 413. Connections GEDCOM cannot express (for example cousin, friend, mentor) are counted in summary.omitted, not exported. Internal record IDs are never exported.',
    responses: { '200': { description: 'filename, mediaType, gedcom, summary { people, families, omitted }' }, '413': { description: 'The tree is larger than the export limit.' }, ...errors() },
  } };
  paths['/trees/{id}/audit'] = { parameters: [treeId], get: {
    operationId: 'getAuditTrail', security: [{ UltimateSession: [] }],
    description: 'Tree admins only. Newest first, 50 entries per page. Each entry is metadata only: actor account ID, action, record kind and ID, and counts, kinds or field names. Names, biographies, dates, file names and before/after values are never recorded, and the private Me marker is not audited. Entries are written in the same transaction as the change they describe, have no foreign keys so they outlive the records, and cannot be edited or deleted through this API. Retention is an operator policy.',
    parameters: Object.entries(schemas.AuditQuery.properties).map(([name, schema]) => ({ name, in: 'query', required: false, schema })),
    responses: { '200': { description: 'rows (id, actorId, action, entity, entityId, details, createdAt), total, page, limit' }, ...errors() },
  } };
  paths['/trees/{id}/import/gedcom/preview'] = { parameters: [treeId], post: {
    operationId: 'previewGedcomImport', security: [{ UltimateSession: [], CsrfToken: [] }],
    description: 'Editors, family heads and admins. Validates and summarizes a GEDCOM file up to 1 MiB without writing anything: counts, warnings, ignored record types (media is never read), probable duplicates of existing people (name order, case, punctuation and Latin accents are ignored) and partial-date and ranges warnings.',
    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/GedcomPreview' } } } },
    responses: { '200': { description: 'canImport, stats, errors, warnings, warningCount, ignored, sample, duplicates, limits' }, ...errors() },
  } };
  paths['/trees/{id}/import/gedcom'] = { parameters: [treeId], post: {
    operationId: 'importGedcom', security: [{ UltimateSession: [], CsrfToken: [] }],
    description: 'Editors, family heads and admins. Re-parses the file on the server and, in one serializable transaction, creates new people and connections only; existing records are never changed. Probable duplicates return 409 DUPLICATES unless allowDuplicates is true. Up to 1,000 people and 2,500 families per file. Day, month-only, year-only and approximate Gregorian dates are stored with that certainty (month and year dates as the first day of the period); a death with no usable date is stored as deceased with an unknown date; ranges and other calendars are kept as text at the start of the person\'s notes. Send idempotencyKey (8-100 URL-safe characters) so a retry after a timeout or lost response returns the committed result with replayed: true instead of importing twice; the same key with a different file returns 422. A concurrent duplicate key returns 409. Adopted, foster and sealing parent links import as parent connections labeled Adoptive parent, Foster parent or Sealing parent. A transaction that exceeds its time budget returns 503 and changes nothing. No automatic retry.',
    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/GedcomImport' } } } },
    responses: { '201': { description: 'imported { people, relationships }, warnings, warningCount, ignored' }, '422': { description: 'The file has no people or fails validation.' }, ...errors() },
  } };
  paths['/trees/{id}/me'] = { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', maxLength: 200 } }], get: {
    operationId: 'getMyPerson', security: [{ UltimateSession: [] }], responses: { '200': { description: 'memberId and member; null when unselected or deleted' }, ...errors() },
  }, put: {
    operationId: 'setMyPerson', security: [{ UltimateSession: [], CsrfToken: [] }], description: 'Tree members may select/clear their own person. One scalar selection per account/tree replaces the previous value and grants no permissions.',
    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/MeSelection' } } } }, responses: { '200': { description: 'Updated memberId and member' }, ...errors() },
  } };
  return { openapi: '3.1.0', info: { title: 'Family native API additions', version: '1.3.0', description: 'Contract for stabilization, atomic person/relationship creation, Me selection, GEDCOM export/import and the audit trail. Profile payloads accept date certainty (birthDatePrecision, birthDateApproximate, deathDatePrecision, deathDateApproximate) and deathRecorded. Existing tree/profile/upload/session routes remain outside this contract. Request schemas are generated from the runtime Zod validators. Local permanent-delete behavior precedes the planned soft-delete migration.' }, servers: [{ url: '/api/native/family' }], paths,
    components: { securitySchemes: { UltimateSession: { type: 'apiKey', in: 'cookie', name: 'growthtrack_session' }, CsrfToken: { type: 'apiKey', in: 'header', name: 'X-CSRF-Token' } }, schemas } };
}
function errors() { return Object.fromEntries(['400','401','403','404','409','429','500','503'].map(code => [code, { description: 'Rejected, unavailable or rate limited. Review the error before retrying.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }])); }
module.exports = { createContract };
if (require.main === module) {
  const output = path.join(root, 'docs/stabilization.openapi.json');
  const text = JSON.stringify(createContract(), null, 2) + '\n';
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8') !== text) { console.error('Family contract drift. Run npm run contract:write.'); process.exit(1); }
    console.log('Family stabilization OpenAPI contract verified.');
  } else { fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, text); console.log('Family stabilization OpenAPI contract generated.'); }
}
