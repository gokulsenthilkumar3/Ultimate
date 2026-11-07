/**
 * GEDCOM 5.5.1 interchange. Pure functions: no database, network, file or media access.
 *
 * Export writes only fields this service stores. Import parses untrusted text into a bounded,
 * validated preview; it never follows OBJE/FILE paths or URLs and never executes anything.
 * Spec: https://gedcom.io/specs/ (5.5.1 is the widely supported baseline for Gramps,
 * FamilySearch, MyHeritage and Ancestry exports).
 */

export const GEDCOM_LIMITS = Object.freeze({ maxBytes: 1024 * 1024, maxLines: 100_000, maxPeople: 1_000, maxFamilies: 2_500, maxExportPeople: 5_000, maxExportRelationships: 25_000 });
export type GedcomLimits = { maxBytes: number; maxLines: number; maxPeople: number; maxFamilies: number };

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WARNING_CAP = 50;
const FIELD_LIMITS = { name: 160, birthLocation: 300, occupation: 300, religion: 200, bio: 10_000 } as const;
const PARENT_TYPES = new Set(['parent', 'child']);
const SYMMETRIC = new Set(['spouse']);
// Pedigree travels on the parent connection's label, so it needs no schema change: GEDCOM PEDI <-> these labels.
const PEDIGREE_LABELS: Record<string, string> = { adopted: 'Adoptive parent', foster: 'Foster parent', sealing: 'Sealing parent' };
const pedigreeOfLabel = (label?: string | null) => Object.keys(PEDIGREE_LABELS).find(kind => PEDIGREE_LABELS[kind].toLowerCase() === (label || '').trim().toLowerCase()) || null;

/** Order- and punctuation-insensitive name key for duplicate checks; Latin accents fold, other scripts are left intact. */
export function nameKey(name: string): string {
  let text = name.normalize('NFC').toLowerCase();
  if (/^[\p{Script=Latin}\p{P}\p{S}\p{Z}\p{N}]+$/u.test(text)) text = text.normalize('NFD').replace(/\p{Mn}/gu, '');
  return text.replace(/[\p{P}\p{S}]+/gu, ' ').split(/\s+/).filter(Boolean).sort().join(' ');
}

// ─── Export ───────────────────────────────────────────────────────────────────

export interface ExportPerson { id: string; name: string; gender?: string | null; birthDate?: Date | null; birthDatePrecision?: string | null; birthDateApproximate?: boolean | null; birthLocation?: string | null; deathDate?: Date | null; deathDatePrecision?: string | null; deathDateApproximate?: boolean | null; deathRecorded?: boolean | null; occupation?: string | null; religion?: string | null; bio?: string | null }
export interface ExportRelationship { member1Id: string; member2Id: string; type: string; customLabel?: string | null; marriageDate?: Date | null; divorceDate?: Date | null }
export interface GedcomExport { text: string; summary: { people: number; families: number; omitted: Record<string, number> } }

const gedDate = (date: Date) => `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${String(date.getUTCFullYear()).padStart(4, '0')}`;
/** Writes only the precision that is stored: "12 MAR 1950", "MAR 1950", "1950", and "ABT ..." when approximate. */
function gedDatePartial(date: Date, precision?: string | null, approximate?: boolean | null): string {
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const text = precision === 'year' ? year : precision === 'month' ? `${MONTHS[date.getUTCMonth()]} ${year}` : gedDate(date);
  return approximate ? `ABT ${text}` : text;
}
const clean = (value: string) => value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');

/** One logical value becomes CONT (newline) and CONC (length) continuation lines, never splitting a code point. */
function emit(lines: string[], level: number, tag: string, value?: string | null): void {
  if (value === undefined || value === null || value === '') { lines.push(`${level} ${tag}`); return; }
  const parts = clean(value).split(/\r\n|\r|\n/);
  parts.forEach((part, index) => {
    const chars = Array.from(part);
    let first = true;
    do {
      // Readers may trim whitespace at a CONC boundary, so avoid splitting beside a space where possible.
      let take = Math.min(200, chars.length);
      while (take > 1 && take < chars.length && (/\s/.test(chars[take - 1]) || /\s/.test(chars[take]))) take--;
      const chunk = chars.splice(0, take).join('');
      if (index === 0 && first) lines.push(`${level} ${tag} ${chunk}`.trimEnd());
      else lines.push(`${level + 1} ${first ? 'CONT' : 'CONC'} ${chunk}`.trimEnd());
      first = false;
    } while (chars.length);
  });
}

/** "Given Names Surname" -> "Given Names /Surname/"; slashes in stored names would corrupt the surname delimiters. */
function gedName(full: string): string {
  const words = clean(full).replace(/\//g, ' ').split(/\s+/).filter(Boolean);
  if (words.length < 2) return words.join(' ');
  return `${words.slice(0, -1).join(' ')} /${words[words.length - 1]}/`;
}

export function buildGedcom({ people, relationships, generatedAt = new Date() }: { people: ExportPerson[]; relationships: ExportRelationship[]; generatedAt?: Date }): GedcomExport {
  const sorted = [...people].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const person = new Map(sorted.map(item => [item.id, item]));
  const xref = new Map(sorted.map((item, index) => [item.id, `@I${index + 1}@`]));
  const omitted: Record<string, number> = {};
  const omit = (type: string) => { omitted[type] = (omitted[type] || 0) + 1; };

  type Family = { key: string; husband?: string; wife?: string; children: Set<string>; marriage?: Date | null; divorce?: Date | null; spouse: boolean };
  const families = new Map<string, Family>();
  const roles = (a: string, b?: string): { husband?: string; wife?: string } => {
    if (!b) return person.get(a)?.gender === 'female' ? { wife: a } : { husband: a };
    const female = (id: string) => person.get(id)?.gender === 'female', male = (id: string) => person.get(id)?.gender === 'male';
    if (female(a) && !female(b)) return { wife: a, husband: b };
    if (female(b) && !female(a)) return { wife: b, husband: a };
    if (male(b) && !male(a)) return { husband: b, wife: a };
    return a <= b ? { husband: a, wife: b } : { husband: b, wife: a };
  };
  const family = (a: string, b?: string): Family => {
    const key = b ? [a, b].sort().join('|') : `solo:${a}`;
    let found = families.get(key);
    if (!found) { found = { key, ...roles(a, b), children: new Set(), spouse: false }; families.set(key, found); }
    return found;
  };

  const parentsOf = new Map<string, Map<string, string | null>>();
  for (const link of relationships) {
    if (!person.has(link.member1Id) || !person.has(link.member2Id) || link.member1Id === link.member2Id) continue;
    if (link.type === 'spouse') {
      const found = family(link.member1Id, link.member2Id);
      found.spouse = true; found.marriage = link.marriageDate ?? found.marriage; found.divorce = link.divorceDate ?? found.divorce;
    } else if (PARENT_TYPES.has(link.type)) {
      const [parent, child] = link.type === 'parent' ? [link.member1Id, link.member2Id] : [link.member2Id, link.member1Id];
      const labels = parentsOf.get(child) || new Map<string, string | null>();
      labels.set(parent, link.customLabel ?? null); parentsOf.set(child, labels);
    } else omit(link.type);
  }
  const pedigreeOf = new Map<string, string>();
  for (const [child, labels] of parentsOf) {
    const parents = [...labels.keys()].sort();
    let chosen: string[] = parents.slice(0, 2);
    if (parents.length > 2) {
      const pair = parents.flatMap((a, i) => parents.slice(i + 1).map(b => [a, b])).find(([a, b]) => families.get([a, b].sort().join('|'))?.spouse);
      chosen = pair || chosen; omitted.extra_parents = (omitted.extra_parents || 0) + parents.length - 2;
    }
    const kinds = new Set(chosen.map(parent => pedigreeOfLabel(labels.get(parent))));
    if (kinds.size === 1 && [...kinds][0]) pedigreeOf.set(child, [...kinds][0]!);
    else if (kinds.size > 1) omitted.mixed_pedigree = (omitted.mixed_pedigree || 0) + 1;
    family(chosen[0], chosen[1]).children.add(child);
  }

  const ordered = [...families.values()].sort((a, b) => a.key.localeCompare(b.key));
  const famRef = new Map(ordered.map((item, index) => [item.key, `@F${index + 1}@`]));
  const spouseOf = new Map<string, string[]>(), childOf = new Map<string, string>();
  for (const item of ordered) {
    for (const id of [item.husband, item.wife]) if (id) spouseOf.set(id, [...(spouseOf.get(id) || []), famRef.get(item.key)!]);
    for (const id of item.children) childOf.set(id, famRef.get(item.key)!);
  }

  const lines: string[] = [];
  emit(lines, 0, 'HEAD'); emit(lines, 1, 'SOUR', 'GrowthTrack Family Connect'); emit(lines, 2, 'NAME', 'Family Connect');
  emit(lines, 1, 'GEDC'); emit(lines, 2, 'VERS', '5.5.1'); emit(lines, 2, 'FORM', 'LINEAGE-LINKED');
  emit(lines, 1, 'CHAR', 'UTF-8'); emit(lines, 1, 'DATE', gedDate(generatedAt));
  for (const item of sorted) {
    lines.push(`0 ${xref.get(item.id)} INDI`);
    emit(lines, 1, 'NAME', gedName(item.name));
    if (item.gender === 'male') emit(lines, 1, 'SEX', 'M'); else if (item.gender === 'female') emit(lines, 1, 'SEX', 'F');
    if (item.birthDate || item.birthLocation) { emit(lines, 1, 'BIRT'); if (item.birthDate) emit(lines, 2, 'DATE', gedDatePartial(item.birthDate, item.birthDatePrecision, item.birthDateApproximate)); if (item.birthLocation) emit(lines, 2, 'PLAC', item.birthLocation); }
    if (item.deathDate) { emit(lines, 1, 'DEAT'); emit(lines, 2, 'DATE', gedDatePartial(item.deathDate, item.deathDatePrecision, item.deathDateApproximate)); }
    else if (item.deathRecorded) emit(lines, 1, 'DEAT', 'Y');
    if (item.occupation) emit(lines, 1, 'OCCU', item.occupation);
    if (item.religion) emit(lines, 1, 'RELI', item.religion);
    if (item.bio) emit(lines, 1, 'NOTE', item.bio);
    for (const ref of spouseOf.get(item.id) || []) emit(lines, 1, 'FAMS', ref);
    if (childOf.has(item.id)) { emit(lines, 1, 'FAMC', childOf.get(item.id)); if (pedigreeOf.has(item.id)) emit(lines, 2, 'PEDI', pedigreeOf.get(item.id)); }
  }
  for (const item of ordered) {
    lines.push(`0 ${famRef.get(item.key)} FAM`);
    if (item.husband) emit(lines, 1, 'HUSB', xref.get(item.husband));
    if (item.wife) emit(lines, 1, 'WIFE', xref.get(item.wife));
    for (const id of [...item.children].sort((a, b) => xref.get(a)!.localeCompare(xref.get(b)!, undefined, { numeric: true }))) emit(lines, 1, 'CHIL', xref.get(id));
    if (item.marriage) { emit(lines, 1, 'MARR'); emit(lines, 2, 'DATE', gedDate(item.marriage)); }
    if (item.divorce) { emit(lines, 1, 'DIV'); emit(lines, 2, 'DATE', gedDate(item.divorce)); }
  }
  emit(lines, 0, 'TRLR');
  return { text: lines.join('\r\n') + '\r\n', summary: { people: sorted.length, families: ordered.length, omitted } };
}

// ─── Import ───────────────────────────────────────────────────────────────────

export interface ParsedPerson { ref: string; name: string; gender: 'male' | 'female' | null; birthDate: string | null; birthDatePrecision: 'day' | 'month' | 'year'; birthDateApproximate: boolean; birthLocation: string | null; deathDate: string | null; deathDatePrecision: 'day' | 'month' | 'year'; deathDateApproximate: boolean; deathRecorded: boolean; occupation: string | null; religion: string | null; bio: string | null }
export interface ParsedRelationship { type: 'spouse' | 'parent' | 'step_parent'; from: string; to: string; label: string | null; marriageDate: string | null; divorceDate: string | null }
export interface GedcomParse {
  people: ParsedPerson[]; relationships: ParsedRelationship[];
  warnings: string[]; warningCount: number; errors: string[]; ignored: Record<string, number>;
  stats: { people: number; families: number; relationships: number };
}

interface Node { level: number; xref: string | null; tag: string; value: string; children: Node[] }

function readLine(raw: string): { level: number; xref: string | null; tag: string; value: string } | null {
  const line = raw.replace(/^\s+/, '');
  const levelEnd = line.search(/\s/);
  if (levelEnd < 1 || levelEnd > 2 || !/^\d+$/.test(line.slice(0, levelEnd))) return null;
  let rest = line.slice(levelEnd).replace(/^\s+/, '');
  let xref: string | null = null;
  if (rest.startsWith('@')) {
    const end = rest.indexOf('@', 1);
    if (end < 2 || end > 41 || !/^[A-Za-z0-9_.:-]+$/.test(rest.slice(1, end)) || (rest[end + 1] !== undefined && !/\s/.test(rest[end + 1]))) return null;
    xref = rest.slice(0, end + 1); rest = rest.slice(end + 1).replace(/^\s+/, '');
  }
  const tagEnd = rest.search(/\s/);
  const tag = tagEnd === -1 ? rest : rest.slice(0, tagEnd);
  if (!/^_?[A-Za-z0-9]{1,31}$/.test(tag)) return null;
  return { level: Number(line.slice(0, levelEnd)), xref, tag: tag.toUpperCase(), value: tagEnd === -1 ? '' : rest.slice(tagEnd + 1).trimEnd() };
}

export interface ParsedDate { iso: string | null; precision: 'day' | 'month' | 'year'; approximate: boolean; status: 'none' | 'parsed' | 'unparsed'; text: string }

/**
 * Reads the Gregorian forms Family can store: "D MON YYYY", "MON YYYY" and "YYYY", each optionally
 * prefixed ABT/ABOUT/CAL/EST/CIRCA. Month and year dates are stored as the first day of the period.
 * Ranges (BET, BEF, AFT, FROM, TO), other calendars and impossible dates are "unparsed": no date is
 * invented and the caller keeps the original wording.
 */
export function parseGedcomDate(text: string | undefined): ParsedDate {
  const raw = (text || '').replace(/^@#DGREGORIAN@\s*/i, '').trim().toUpperCase();
  if (!raw) return { iso: null, precision: 'day', approximate: false, status: 'none', text: '' };
  const original = Array.from(clean(raw)).slice(0, 60).join('');
  const unparsed: ParsedDate = { iso: null, precision: 'day', approximate: false, status: 'unparsed', text: original };
  const qualifier = /^(?:ABT|ABOUT|CAL|EST|CIRCA)\.?\s+(.+)$/.exec(raw);
  const approximate = Boolean(qualifier), value = qualifier ? qualifier[1] : raw;
  const months = 'JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC';
  const found = new RegExp(`^(?:(\\d{1,2}) (${months}) (\\d{4})|(${months}) (\\d{4})|(\\d{4}))$`).exec(value);
  if (!found) return unparsed;
  const precision = found[1] ? 'day' : found[4] ? 'month' : 'year';
  const year = Number(found[3] || found[5] || found[6]), month = found[1] ? MONTHS.indexOf(found[2]) : found[4] ? MONTHS.indexOf(found[4]) : 0, day = found[1] ? Number(found[1]) : 1;
  const date = new Date(Date.UTC(year, month, day));
  if (year < 1000 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) return unparsed;
  return { iso: date.toISOString().slice(0, 10), precision, approximate, status: 'parsed', text: original };
}

export function parseGedcom(input: string, overrides: Partial<GedcomLimits> = {}): GedcomParse {
  const limits = { maxBytes: GEDCOM_LIMITS.maxBytes, maxLines: GEDCOM_LIMITS.maxLines, maxPeople: GEDCOM_LIMITS.maxPeople, maxFamilies: GEDCOM_LIMITS.maxFamilies, ...overrides };
  const result: GedcomParse = { people: [], relationships: [], warnings: [], warningCount: 0, errors: [], ignored: {}, stats: { people: 0, families: 0, relationships: 0 } };
  const warn = (message: string) => { result.warningCount++; if (result.warnings.length < WARNING_CAP) result.warnings.push(message); };
  const fail = (message: string) => { if (result.errors.length < WARNING_CAP) result.errors.push(message); };
  const ignored = new Map<string, number>();
  const ignore = (tag: string) => ignored.set(tag, (ignored.get(tag) || 0) + 1);
  const finish = (): GedcomParse => { result.ignored = Object.fromEntries([...ignored].sort((a, b) => b[1] - a[1]).slice(0, 20)); return result; };

  if (typeof input !== 'string' || Buffer.byteLength(input, 'utf8') > limits.maxBytes) { fail(`The file is larger than ${Math.round(limits.maxBytes / 1024)} KB. Split it or remove media before importing.`); return finish(); }
  const rows = input.replace(/^﻿/, '').split(/\r\n|\r|\n/);
  if (rows.length > limits.maxLines) { fail(`The file has more than ${limits.maxLines.toLocaleString('en')} lines.`); return finish(); }

  // Build the record tree; CONC/CONT lines extend their parent's value.
  const records: Node[] = [], stack: Node[] = [];
  let badLines = 0;
  rows.forEach(raw => {
    if (!raw.trim()) return;
    const line = readLine(raw);
    if (!line) { badLines++; return; }
    if (line.level === 0) { const node: Node = { ...line, children: [] }; records.push(node); stack.length = 0; stack.push(node); return; }
    if (!stack.length || line.level > stack.length) { badLines++; return; }
    const parent = stack[line.level - 1];
    if (line.tag === 'CONC' || line.tag === 'CONT') { parent.value += (line.tag === 'CONT' ? '\n' : '') + line.value; return; }
    const node: Node = { ...line, children: [] };
    parent.children.push(node); stack.length = line.level; stack.push(node);
  });
  if (badLines) warn(`${badLines} line${badLines === 1 ? ' was' : 's were'} not valid GEDCOM and ${badLines === 1 ? 'was' : 'were'} skipped.`);
  if (!records.some(record => record.tag === 'HEAD')) warn('The file has no GEDCOM header (HEAD). It may not be a GEDCOM file.');
  const header = records.find(record => record.tag === 'HEAD');
  const charset = header?.children.find(child => child.tag === 'CHAR')?.value.toUpperCase();
  if (charset && !['UTF-8', 'UTF8', 'UNICODE'].includes(charset)) warn(`The file declares the ${charset.slice(0, 20)} character set but was read as UTF-8. Names with accents may be wrong; export as UTF-8 and retry.`);

  const individuals = records.filter(record => record.tag === 'INDI' && record.xref), families = records.filter(record => record.tag === 'FAM' && record.xref);
  if (individuals.length > limits.maxPeople) { fail(`The file has ${individuals.length.toLocaleString('en')} people; import at most ${limits.maxPeople.toLocaleString('en')} at a time.`); return finish(); }
  if (families.length > limits.maxFamilies) { fail(`The file has ${families.length.toLocaleString('en')} families; import at most ${limits.maxFamilies.toLocaleString('en')} at a time.`); return finish(); }
  for (const record of records) if (!['HEAD', 'TRLR', 'INDI', 'FAM'].includes(record.tag)) ignore(record.tag);
  if (!individuals.length) { fail('No people were found in this file.'); return finish(); }

  const child = (node: Node, tag: string) => node.children.find(item => item.tag === tag);
  const truncate = (field: keyof typeof FIELD_LIMITS, value: string, label: string) => {
    const text = Array.from(value);
    if (text.length <= FIELD_LIMITS[field]) return value;
    warn(`${label} was shortened to ${FIELD_LIMITS[field].toLocaleString('en')} characters.`); return text.slice(0, FIELD_LIMITS[field]).join('');
  };
  const unreadable: string[] = [];
  let imprecise = 0;
  const byRef = new Map<string, ParsedPerson>();
  for (const record of individuals) {
    if (byRef.has(record.xref!)) { warn(`Person ${record.xref} appears more than once; only the first was kept.`); continue; }
    const nameNode = child(record, 'NAME');
    let name = (nameNode?.value || '').replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
    if (!name && nameNode) name = [child(nameNode, 'GIVN')?.value, child(nameNode, 'SURN')?.value].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    if (!name) { name = 'Unknown person'; warn(`Person ${record.xref} has no name and was imported as “Unknown person”.`); }
    name = truncate('name', name, `A name (${record.xref})`);
    const sex = child(record, 'SEX')?.value.toUpperCase();
    const birth = child(record, 'BIRT'), death = child(record, 'DEAT');
    const born = parseGedcomDate(birth && child(birth, 'DATE')?.value), died = parseGedcomDate(death && child(death, 'DATE')?.value);
    if (born.status === 'unparsed' || died.status === 'unparsed') unreadable.push(name);
    if ((born.iso && (born.precision !== 'day' || born.approximate)) || (died.iso && (died.precision !== 'day' || died.approximate))) imprecise++;
    // A DEAT record with no usable date still means the person has died; Family can record that without a date.
    const deathRecorded = Boolean(death) && !died.iso;
    // Wording Family cannot store as a day, month or year (ranges, other calendars) is kept at the start of the notes rather than lost.
    const dateNotes = [born.status === 'unparsed' ? `Born ${born.text}` : '', died.status === 'unparsed' ? `Died ${died.text}` : ''].filter(Boolean);
    if (born.iso && died.iso && died.iso < born.iso) warn(`${name} has a death date before the birth date.`);
    const optional = (field: 'birthLocation' | 'occupation' | 'religion' | 'bio', value: string | undefined, label: string) => { const text = (value || '').trim(); return text ? truncate(field, text, `${label} for ${name}`) : null; };
    const noteNodes = record.children.filter(item => item.tag === 'NOTE' && !item.value.startsWith('@'));
    for (const item of record.children) if (!['NAME', 'SEX', 'BIRT', 'DEAT', 'OCCU', 'RELI', 'NOTE', 'FAMC', 'FAMS'].includes(item.tag)) ignore(item.tag);
    if (record.children.some(item => item.tag === 'NOTE' && item.value.startsWith('@'))) ignore('NOTE (shared)');
    byRef.set(record.xref!, {
      ref: record.xref!, name, gender: sex === 'M' ? 'male' : sex === 'F' ? 'female' : null,
      birthDate: born.iso, birthDatePrecision: born.precision, birthDateApproximate: born.approximate, birthLocation: optional('birthLocation', birth && child(birth, 'PLAC')?.value, 'Birth place'),
      deathDate: died.iso, deathDatePrecision: died.precision, deathDateApproximate: died.approximate, deathRecorded, occupation: optional('occupation', child(record, 'OCCU')?.value, 'Occupation'), religion: optional('religion', child(record, 'RELI')?.value, 'Religion'),
      bio: optional('bio', [dateNotes.length ? `Imported date notes: ${dateNotes.join('; ')}.` : '', ...noteNodes.map(item => item.value)].filter(Boolean).join('\n\n'), 'Notes'),
    });
  }
  if (unreadable.length) warn(`${unreadable.length} ${unreadable.length === 1 ? 'person has' : 'people have'} a date Family cannot read as a day, month or year, such as a range or another calendar (for example ${unreadable.slice(0, 3).join(', ')}). The original wording is kept at the start of their notes.`);
  if (imprecise) warn(`${imprecise} ${imprecise === 1 ? 'person has' : 'people have'} a month-only, year-only or approximate date. They are imported with that certainty and are not used for birthday reminders.`);


  const sameName = new Map<string, number>();
  for (const item of byRef.values()) if (item.name !== 'Unknown person') { const key = `${nameKey(item.name)}|${item.birthDate || ''}`; sameName.set(key, (sameName.get(key) || 0) + 1); }
  const twins = [...byRef.values()].filter(item => (sameName.get(`${nameKey(item.name)}|${item.birthDate || ''}`) || 0) > 1 && item.name !== 'Unknown person');
  if (twins.length) warn(`${twins.length} people in the file share a name and birth date (for example ${twins.slice(0, 3).map(item => item.name).join(', ')}). They will be imported as separate people; check for repeats.`);
  result.people = [...byRef.values()];

  const pedigree = new Map<string, string>();
  for (const record of individuals) for (const link of record.children.filter(item => item.tag === 'FAMC')) {
    const kind = child(link, 'PEDI')?.value.toLowerCase();
    if (kind) pedigree.set(`${record.xref}>${link.value}`, kind);
  }
  const seen = new Set<string>(), edges: ParsedRelationship[] = [];
  const add = (edge: ParsedRelationship) => {
    const key = [edge.type, edge.from, edge.to].join('>'), reverse = [edge.type, edge.to, edge.from].join('>');
    if (seen.has(key) || (SYMMETRIC.has(edge.type) && seen.has(reverse))) return;
    seen.add(key); edges.push(edge);
  };
  let missing = 0, adopted = 0, partialFamilies = 0;
  for (const record of families) {
    const husband = child(record, 'HUSB')?.value, wife = child(record, 'WIFE')?.value;
    const parents = [husband, wife].filter((ref): ref is string => Boolean(ref));
    for (const ref of parents) if (!byRef.has(ref)) missing++;
    const known = parents.filter(ref => byRef.has(ref));
    const marriage = child(record, 'MARR'), divorce = child(record, 'DIV');
    const married = parseGedcomDate(marriage && child(marriage, 'DATE')?.value), divorced = parseGedcomDate(divorce && child(divorce, 'DATE')?.value);
    const exact = (date: ParsedDate) => (date.status === 'parsed' && date.precision === 'day' && !date.approximate ? date.iso : null);
    if ((married.status !== 'none' && !exact(married)) || (divorced.status !== 'none' && !exact(divorced))) partialFamilies++;
    if (known.length === 2 && known[0] !== known[1]) add({ type: 'spouse', from: known[0], to: known[1], label: null, marriageDate: exact(married), divorceDate: exact(divorced) });
    for (const link of record.children.filter(item => item.tag === 'CHIL')) {
      if (!byRef.has(link.value)) { missing++; continue; }
      const kind = pedigree.get(`${link.value}>${record.xref}`);
      if (kind === 'adopted' || kind === 'foster' || kind === 'sealing') adopted++;
      for (const ref of known) {
        if (ref === link.value) { warn(`${byRef.get(ref)!.name} is listed as their own parent; that link was skipped.`); continue; }
        add({ type: kind === 'step' ? 'step_parent' : 'parent', from: ref, to: link.value, label: kind && PEDIGREE_LABELS[kind] ? PEDIGREE_LABELS[kind] : null, marriageDate: null, divorceDate: null });
      }
    }
    for (const item of record.children) if (!['HUSB', 'WIFE', 'CHIL', 'MARR', 'DIV'].includes(item.tag)) ignore(item.tag);
  }
  if (partialFamilies) warn(`${partialFamilies} marriage or divorce ${partialFamilies === 1 ? 'date is' : 'dates are'} not an exact day (relationships store exact dates only) and will not be imported.`);
  if (missing) warn(`${missing} family link${missing === 1 ? '' : 's'} pointed to people who are not in the file and ${missing === 1 ? 'was' : 'were'} skipped.`);
  if (adopted) warn(`${adopted} adopted, foster or sealing parent link${adopted === 1 ? '' : 's'} will be imported as parent links labeled “Adoptive parent”, “Foster parent” or “Sealing parent”, so the family line is kept and the kind of link stays visible.`);

  // A person cannot be their own ancestor; stop before anything could be written.
  const children = new Map<string, string[]>();
  for (const edge of edges) if (edge.type !== 'spouse') children.set(edge.from, [...(children.get(edge.from) || []), edge.to]);
  const state = new Map<string, 1 | 2>();
  const cyclic = (start: string): string | null => {
    const path: { ref: string; next: number }[] = [{ ref: start, next: 0 }];
    state.set(start, 1);
    while (path.length) {
      const top = path[path.length - 1], list = children.get(top.ref) || [];
      if (top.next >= list.length) { state.set(top.ref, 2); path.pop(); continue; }
      const next = list[top.next++];
      if (state.get(next) === 1) return next;
      if (!state.has(next)) { state.set(next, 1); path.push({ ref: next, next: 0 }); }
    }
    return null;
  };
  for (const ref of children.keys()) if (!state.has(ref)) { const loop = cyclic(ref); if (loop) { fail(`${byRef.get(loop)?.name || loop} would become their own ancestor. Correct the parent links in the source file.`); break; } }

  result.relationships = edges;
  result.stats = { people: result.people.length, families: families.length, relationships: edges.length };
  return finish();
}
