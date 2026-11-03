import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { PLAN_DOCUMENTS, PLAN_ID_FIELDS, PLAN_MIGRATION } from '../server/domains/planContract.js';
import { BODY_METRIC_RANGES } from '../src/lib/bodyMetricContract.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const marker = '// Generated plan record models: scripts/generate-plan-records.mjs';
const q = value => `"${value}"`;
const literal = value => `'${value.replaceAll("'", "''")}'`;
const identity = { clientId: 'String', clientIdType: 'String', clientCreatedAt: 'String', clientUpdatedAt: 'String' };
const expanded = fields => Object.entries(fields).flatMap(([key, type]) => type === 'Scalar'
  ? [[`${key}ValueType`, 'String'], [`${key}Value`, 'Float'], [`${key}StringValue`, 'String'], [`${key}BooleanValue`, 'Boolean']]
  : [[key, type === 'Labels' ? 'String' : type]]);

export function planPrismaModels() {
  const blocks = [];
  function node(definition, parent) {
    const lines = [
      `model ${definition.name} {`, '  id String @id @default(uuid())',
      ...(parent ? ['  parentId String', `  parent ${parent.name} @relation(fields: [parentId], references: [id], onDelete: Cascade)`, '  position Int']
        : ['  userId String @unique', '  user User @relation(fields: [userId], references: [id], onDelete: Cascade)']),
      ...Object.entries(identity).map(([key, type]) => `  ${key} ${type}?`),
      ...expanded(definition.fields).map(([key, type]) => `  ${key} ${type}?`),
      '  present String @default("[]")', '  data String?',
      ...Object.entries(definition.children || {}).map(([key, child]) => `  ${key} ${child.name}[]`),
      ...(definition.maps ? [`  readings ${definition.reading.name}[]`] : []),
      ...(!parent ? ['  createdAt DateTime @default(now())', '  updatedAt DateTime @default(now()) @updatedAt', '  createdBy String?', '  updatedBy String?'] : ['  @@unique([parentId, position])']),
      `  @@map("${definition.table}")`, '}',
    ];
    blocks.push(lines.join('\n'));
    for (const child of Object.values(definition.children || {})) node(child, definition);
    if (definition.maps) blocks.push(`model ${definition.reading.name} {
  id String @id @default(uuid())
  parentId String
  parent ${definition.name} @relation(fields: [parentId], references: [id], onDelete: Cascade)
  scope String
  key String
  valueType String
  value Float?
  stringValue String?
  booleanValue Boolean?
  unit String?
  @@unique([parentId, scope, key])
  @@index([scope, key, value])
  @@map("${definition.reading.table}")
}`);
  }
  for (const definition of Object.values(PLAN_DOCUMENTS)) node(definition);
  return `${marker}\n${blocks.join('\n\n')}\n`;
}

// JSON functions always see a verified object/array, including in correlated
// subqueries: SQLite may evaluate those before a surrounding WHERE predicate.
const jt = (payload, key) => `json_type(${payload}, ${literal(`$.${key}`)})`;
const jv = (payload, key) => `json_extract(${payload}, ${literal(`$.${key}`)})`;
const safeArray = (payload, key) => `CASE WHEN ${jt(payload,key)}='array' THEN ${jv(payload,key)} ELSE '[]' END`;
const safeObject = (payload, key) => `CASE WHEN ${jt(payload,key)}='object' THEN ${jv(payload,key)} ELSE '{}' END`;
const jsonValue = alias => `CASE ${alias}.type WHEN 'text' THEN json_quote(${alias}.value) WHEN 'true' THEN 'true' WHEN 'false' THEN 'false' WHEN 'null' THEN 'null' ELSE ${alias}.value END`;
const numberKind = (type, value) => `(${type} IN ('integer','real') OR (${type}='text' AND CASE WHEN json_valid(${value}) THEN json_type(${value}) IN ('integer','real') ELSE false END))`;
function valid(payload, key, type) {
  const kind = jt(payload, key), value = jv(payload, key);
  if (type === 'String') return `${kind} IN ('text','null')`;
  if (type === 'Boolean') return `${kind} IN ('true','false','null')`;
  if (type === 'Labels') {
    const array = safeArray(payload, key);
    return `(${kind}='null' OR (${kind}='array' AND json_array_length(${array})<=1000 AND NOT EXISTS(SELECT 1 FROM json_each(${array}) label WHERE label.type<>'text')))`;
  }
  if (type === 'Scalar') return `(${kind} IN ('text','true','false','null') OR (${kind} IN ('integer','real') AND abs(${value})<=1.7976931348623157e308))`;
  return `(${kind}='null' OR (${numberKind(kind,value)} AND abs(CAST(${value} AS REAL))<=1000000000000${type === 'Int' ? ` AND CAST(${value} AS REAL)=CAST(${value} AS INTEGER) AND CAST(${value} AS REAL) BETWEEN 0 AND 2147483647` : ''}))`;
}
function listValid(payload, key) {
  const array = safeArray(payload, key);
  return `(${jt(payload,key)}='array' AND json_array_length(${array})<=1000 AND NOT EXISTS(SELECT 1 FROM json_each(${array}) item WHERE item.type<>'object'))`;
}
function readingValid(alias, specification) {
  return specification.numeric ? `(${alias}.type='null' OR (${numberKind(`${alias}.type`,`${alias}.value`)} AND abs(CAST(${alias}.value AS REAL))<=1000000000000))`
    : `(${alias}.type IN ('text','true','false','null') OR (${alias}.type IN ('integer','real') AND abs(${alias}.value)<=1.7976931348623157e308))`;
}
const mapResidual = (payload, key, specification) => `(SELECT json_group_object(entry.key,json(${jsonValue('entry')})) FROM json_each(${safeObject(payload,key)}) entry WHERE NOT ${readingValid('entry',specification)})`;

export function planBackfillSQL() {
  const sql = [];
  function node(definition, field, parent, property) {
    const source = `_plan_source_${definition.name}`;
    if (!parent) {
      sql.push(`CREATE TEMP TABLE ${q(source)} AS SELECT 'legacy-plan:${field}:'||hex(u.id) AS id,u.id AS userId,0 AS position,u.${q(field)} AS payload,u.createdAt,u.updatedAt FROM "User" u WHERE CASE WHEN json_valid(u.${q(field)}) THEN json_type(u.${q(field)})='object' ELSE false END;`);
    } else {
      const parentSource = `_plan_source_${parent.name}`;
      sql.push(`CREATE TEMP TABLE ${q(source)} AS SELECT s.id||':${property}:'||j.key AS id,s.id AS parentId,j.key AS position,j.value AS payload FROM ${q(parentSource)} s,json_each(${safeArray('s.payload',property)}) j WHERE ${listValid('s.payload',property)};`);
    }
    const columns = { id: 's.id', ...(parent ? { parentId: 's.parentId', position: 's.position' } : { userId: 's.userId', createdAt: 's.createdAt', updatedAt: 's.updatedAt' }) };
    const simple = [];
    const recognized = [];
    for (const [key, column] of Object.entries(PLAN_ID_FIELDS)) {
      const kind = jt('s.payload',key), value = jv('s.payload',key);
      const accepts = key === 'id' ? `(${kind} IN ('text','null') OR (${kind} IN ('integer','real') AND abs(${value})<=1.7976931348623157e308))` : `${kind} IN ('text','null')`;
      columns[column] = `CASE WHEN ${accepts} THEN ${key === 'id' ? `CAST(${value} AS TEXT)` : value} END`;
      if (key === 'id') columns.clientIdType = `CASE WHEN ${accepts} THEN CASE ${kind} WHEN 'text' THEN 'string' WHEN 'null' THEN 'null' ELSE 'number' END END`;
      simple.push(`(p.key=${literal(key)} AND ${accepts})`);
    }
    for (const [key, type] of Object.entries(definition.fields)) {
      const accepts = valid('s.payload',key,type), kind = jt('s.payload',key), value = jv('s.payload',key);
      simple.push(`(p.key=${literal(key)} AND ${accepts})`);
      if (type === 'Scalar') {
        columns[`${key}ValueType`] = `CASE WHEN ${accepts} THEN CASE ${kind} WHEN 'text' THEN 'string' WHEN 'true' THEN 'boolean' WHEN 'false' THEN 'boolean' WHEN 'null' THEN 'null' ELSE 'number' END END`;
        columns[`${key}Value`] = `CASE WHEN ${accepts} AND ${kind} IN ('integer','real') THEN ${value} END`;
        columns[`${key}StringValue`] = `CASE WHEN ${kind}='text' THEN ${value} END`;
        columns[`${key}BooleanValue`] = `CASE WHEN ${kind} IN ('true','false') THEN ${value} END`;
      } else columns[key] = `CASE WHEN ${accepts} THEN ${['Int','Float'].includes(type) ? `CAST(${value} AS ${type === 'Int' ? 'INTEGER' : 'REAL'})` : value} END`;
    }
    recognized.push(...simple);
    const removed = [...simple];
    for (const key of Object.keys(definition.children || {})) {
      const accepts = listValid('s.payload',key);
      recognized.push(`(p.key=${literal(key)} AND (${accepts} OR ${jt('s.payload',key)}='null'))`);
      removed.push(`(p.key=${literal(key)} AND ${accepts})`);
    }
    const residualCases = [];
    for (const [key, specification] of Object.entries(definition.maps || {})) {
      const kind = jt('s.payload',key), residual = mapResidual('s.payload',key,specification);
      recognized.push(`(p.key=${literal(key)} AND ${kind} IN ('object','null'))`);
      removed.push(`(p.key=${literal(key)} AND ${kind}='object' AND ${residual}='{}')`);
      residualCases.push(`WHEN p.key=${literal(key)} AND ${kind}='object' THEN ${residual}`);
    }
    columns.present = `(SELECT json_group_array(p.key) FROM json_each(s.payload) p WHERE ${recognized.join(' OR ') || 'false'})`;
    columns.data = `NULLIF((SELECT json_group_object(p.key,json(CASE ${residualCases.join(' ')} ELSE ${jsonValue('p')} END)) FROM json_each(s.payload) p WHERE NOT (${removed.join(' OR ') || 'false'})),'{}')`;
    // CASE without a WHEN is not valid SQL for definitions with no scalar maps.
    if (!residualCases.length) columns.data = `NULLIF((SELECT json_group_object(p.key,json(${jsonValue('p')})) FROM json_each(s.payload) p WHERE NOT (${removed.join(' OR ') || 'false'})),'{}')`;
    sql.push(`INSERT INTO ${q(definition.table)} (${Object.keys(columns).map(q).join(',')}) SELECT ${Object.values(columns).join(',')} FROM ${q(source)} s;`);
    for (const [scope, specification] of Object.entries(definition.maps || {})) {
      const numeric = specification.numeric;
      const unit = specification.unit ? literal(specification.unit) : `CASE WHEN j.type IN ('integer','real') THEN CASE j.key ${Object.entries(BODY_METRIC_RANGES).map(([key,range])=>`WHEN ${literal(key)} THEN ${literal(range.unit)}`).join(' ')} END END`;
      sql.push(`INSERT INTO ${q(definition.reading.table)} (id,parentId,scope,key,valueType,value,stringValue,booleanValue,unit)
SELECT s.id||':${scope}:'||hex(j.key),s.id,${literal(scope)},j.key,
 CASE j.type WHEN 'null' THEN 'null' ${numeric ? "ELSE 'number'" : "WHEN 'text' THEN 'string' WHEN 'true' THEN 'boolean' WHEN 'false' THEN 'boolean' ELSE 'number'"} END,
 CASE WHEN ${numeric ? "j.type<>'null'" : "j.type IN ('integer','real')"} THEN CAST(j.value AS REAL) END,
 ${numeric ? 'NULL' : "CASE WHEN j.type='text' THEN j.value END"},${numeric ? 'NULL' : "CASE WHEN j.type IN ('true','false') THEN j.value END"},${unit}
 FROM ${q(source)} s,json_each(${safeObject('s.payload',scope)}) j WHERE ${readingValid('j',specification)};`);
    }
    for (const [key, child] of Object.entries(definition.children || {})) node(child, field, definition, key);
  }
  for (const [field, definition] of Object.entries(PLAN_DOCUMENTS)) node(definition, field);
  for (const [field, definition] of Object.entries(PLAN_DOCUMENTS)) sql.push(`UPDATE "User" SET ${q(field)}=NULL WHERE id IN (SELECT userId FROM ${q(definition.table)}) OR ${q(field)}='null';`);
  const drop = definition => { for (const child of Object.values(definition.children || {})) drop(child); sql.push(`DROP TABLE ${q(`_plan_source_${definition.name}`)};`); };
  for (const definition of Object.values(PLAN_DOCUMENTS)) drop(definition);
  return sql.join('\n\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, baseline] = process.argv.slice(2);
  if (mode === '--schema' && !baseline) {
    const filename = path.join(root,'prisma/schema.prisma');
    const before = fs.readFileSync(filename,'utf8').split(marker)[0].trimEnd();
    fs.writeFileSync(filename, `${before}\n\n${planPrismaModels()}`);
  } else if (mode === '--migration' && baseline) {
    const ddl = execFileSync(process.execPath, ['node_modules/prisma/build/index.js','migrate','diff','--from-schema',path.resolve(baseline),'--to-schema','prisma/schema.prisma','--script'], { cwd: root, encoding:'utf8', stdio:['ignore','pipe','inherit'] });
    const directory = path.join(root,'prisma/migrations',PLAN_MIGRATION);
    fs.mkdirSync(directory,{recursive:true});
    // Migration history is immutable once created. Further schema changes need
    // a new migration instead of rewriting an installation's applied checksum.
    fs.writeFileSync(path.join(directory,'migration.sql'), `-- Promote fixed plan records; retain malformed documents and custom extensions.\nBEGIN IMMEDIATE;\n\n${ddl.trim()}\n\n${planBackfillSQL()}\n\nCOMMIT;\n`, { flag: 'wx' });
  } else throw new Error('Usage: node scripts/generate-plan-records.mjs --schema | --migration <previous-schema-file>');
}
