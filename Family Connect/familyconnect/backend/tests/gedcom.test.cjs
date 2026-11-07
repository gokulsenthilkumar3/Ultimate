const test = require('node:test');
const assert = require('node:assert/strict');
const { buildGedcom, parseGedcom, parseGedcomDate, nameKey, GEDCOM_LIMITS } = require('../dist/services/gedcom');

const d = value => new Date(value + 'T00:00:00Z');
const fixture = () => ({
  people: [
    { id: 'p1', name: 'Fictional Parent', gender: 'male', birthDate: d('1950-03-12'), birthLocation: 'Example Town', occupation: 'Teacher', religion: 'Example faith' },
    { id: 'p2', name: 'Fictional Partner', gender: 'female', birthDate: d('1952-11-05'), deathDate: d('2020-01-31') },
    { id: 'p3', name: 'கோகுல் செந்தில்', gender: 'male', birthDate: d('1980-02-29'), bio: 'Line one\nLine two\n\nAfter a blank line' },
    { id: 'p4', name: 'Fictional Cousin', gender: null },
  ],
  relationships: [
    { member1Id: 'p1', member2Id: 'p2', type: 'spouse', marriageDate: d('1975-06-01'), divorceDate: null },
    { member1Id: 'p1', member2Id: 'p3', type: 'parent' },
    { member1Id: 'p3', member2Id: 'p2', type: 'child' },
    { member1Id: 'p3', member2Id: 'p4', type: 'cousin' },
    { member1Id: 'p4', member2Id: 'p1', type: 'friend' },
  ],
});

test('exports valid GEDCOM 5.5.1 structure with bounded lines and CRLF endings', () => {
  const { text, summary } = buildGedcom({ ...fixture(), generatedAt: d('2026-11-07') });
  const lines = text.split('\r\n');
  assert.equal(lines[0], '0 HEAD'); assert.equal(lines.at(-2), '0 TRLR'); assert.equal(lines.at(-1), '');
  assert.ok(lines.includes('2 VERS 5.5.1')); assert.ok(lines.includes('1 CHAR UTF-8')); assert.ok(lines.includes('1 DATE 7 NOV 2026'));
  assert.ok(lines.every(line => Array.from(line).length <= 255 && /^\d{1,2} /.test(line) || line === ''));
  assert.ok(lines.includes('1 NAME Fictional /Parent/'));
  assert.deepEqual(summary, { people: 4, families: 1, omitted: { cousin: 1, friend: 1 } });
  assert.equal(text.includes('p1'), false, 'internal record IDs are not exported');
});

test('round trips people, dates, notes and relationship direction', () => {
  const parsed = parseGedcom(buildGedcom(fixture()).text);
  assert.deepEqual(parsed.errors, []); assert.deepEqual(parsed.warnings, []);
  const byName = Object.fromEntries(parsed.people.map(person => [person.name, person]));
  assert.deepEqual(Object.keys(byName).sort(), ['Fictional Cousin', 'Fictional Parent', 'Fictional Partner', 'கோகுல் செந்தில்'].sort());
  assert.deepEqual([byName['Fictional Parent'].gender, byName['Fictional Parent'].birthDate, byName['Fictional Parent'].birthLocation, byName['Fictional Parent'].occupation, byName['Fictional Parent'].religion], ['male', '1950-03-12', 'Example Town', 'Teacher', 'Example faith']);
  assert.equal(byName['Fictional Partner'].deathDate, '2020-01-31');
  assert.equal(byName['கோகுல் செந்தில்'].birthDate, '1980-02-29');
  assert.equal(byName['கோகுல் செந்தில்'].bio, 'Line one\nLine two\n\nAfter a blank line');
  assert.equal(byName['Fictional Cousin'].gender, null);
  const refName = Object.fromEntries(parsed.people.map(person => [person.ref, person.name]));
  const links = parsed.relationships.map(link => [link.type, refName[link.from], refName[link.to], link.marriageDate]).sort();
  assert.deepEqual(links, [
    ['parent', 'Fictional Parent', 'கோகுல் செந்தில்', null],
    ['parent', 'Fictional Partner', 'கோகுல் செந்தில்', null],
    ['spouse', 'Fictional Parent', 'Fictional Partner', '1975-06-01'],
  ].sort());
});

test('splits long and multi-line notes without losing text or splitting beside spaces', () => {
  const bio = Array.from({ length: 120 }, (_, index) => `word${index}`).join(' ') + '\nsecond paragraph 🙂 ' + 'x'.repeat(450);
  const { text } = buildGedcom({ people: [{ id: 'a', name: 'Fictional Person', bio }], relationships: [] });
  assert.ok(text.includes('2 CONC ') && text.includes('2 CONT '));
  assert.ok(text.split('\r\n').every(line => Array.from(line).length <= 255));
  assert.equal(parseGedcom(text).people[0].bio, bio);
});

test('neutralizes name delimiters, control characters and orphan links on export', () => {
  const { text } = buildGedcom({ people: [{ id: 'a', name: 'Ann /Evil/ \u0007Smith', bio: 'ok\u0000' }, { id: 'b', name: 'Single' }], relationships: [{ member1Id: 'a', member2Id: 'missing', type: 'spouse' }, { member1Id: 'a', member2Id: 'a', type: 'spouse' }] });
  assert.ok(text.includes('1 NAME Ann Evil /Smith/')); assert.equal(/[\u0000-\u0008]/.test(text), false);
  assert.ok(text.includes('1 NAME Single')); assert.equal(text.includes('FAM'), false);
  const parsed = parseGedcom(text); assert.deepEqual(parsed.people.map(person => person.name), ['Ann Evil Smith', 'Single']);
});

test('keeps a single-parent link and the right parent when a parent has several partners', () => {
  const people = ['a', 'b', 'c', 'kid1', 'kid2'].map(id => ({ id, name: `Fictional ${id}` }));
  const relationships = [
    { member1Id: 'a', member2Id: 'b', type: 'spouse' }, { member1Id: 'a', member2Id: 'c', type: 'spouse' },
    { member1Id: 'a', member2Id: 'kid1', type: 'parent' }, { member1Id: 'b', member2Id: 'kid1', type: 'parent' }, { member1Id: 'kid2', member2Id: 'a', type: 'child' },
  ];
  const parsed = parseGedcom(buildGedcom({ people, relationships }).text), name = Object.fromEntries(parsed.people.map(person => [person.ref, person.name]));
  const kids = parsed.relationships.filter(link => link.type === 'parent').map(link => `${name[link.from]}>${name[link.to]}`).sort();
  assert.deepEqual(kids, ['Fictional a>Fictional kid1', 'Fictional a>Fictional kid2', 'Fictional b>Fictional kid1']);
  assert.equal(parsed.relationships.filter(link => link.type === 'spouse').length, 2);
});

const SAMPLE = [
  '\uFEFF0 HEAD', '1 SOUR Other Tool', '1 GEDC', '2 VERS 5.5.1', '1 CHAR UTF-8',
  '0 @I1@ INDI', '1 NAME Ravi /Kumar/ Jr', '1 SEX M', '1 BIRT', '2 DATE 4 JUL 1960', '2 PLAC Chennai, India', '1 DEAT', '2 DATE ABT 2015', '1 OBJE', '2 FILE C:\\private\\photo.jpg', '1 NOTE First line', '2 CONT Second line', '2 CONC  continued',
  '0 @I2@ INDI', '1 NAME /Lakshmi/', '1 SEX F', '1 BIRT', '2 DATE 1962', '1 FAMS @F1@',
  '0 @I3@ INDI', '1 NAME', '2 GIVN Asha', '2 SURN Ravi', '1 SEX U', '1 FAMC @F1@', '2 PEDI adopted', '1 SOUR @S1@',
  '0 @I4@ INDI', '1 FAMC @F1@', '0 @F1@ FAM', '1 HUSB @I1@', '1 WIFE @I2@', '1 CHIL @I3@', '1 CHIL @I4@', '1 CHIL @I99@', '1 MARR', '2 DATE BET 1980 AND 1981', '0 @S1@ SOUR', '0 TRLR',
].join('\n');

test('parses a foreign file: partial dates, adoption, missing links, media and unknown records are reported not trusted', () => {
  const parsed = parseGedcom(SAMPLE);
  assert.deepEqual(parsed.errors, []);
  const person = Object.fromEntries(parsed.people.map(item => [item.ref, item]));
  assert.equal(person['@I1@'].name, 'Ravi Kumar Jr'); assert.equal(person['@I1@'].birthDate, '1960-07-04'); assert.equal(person['@I1@'].birthLocation, 'Chennai, India');
  assert.deepEqual([person['@I1@'].deathDate, person['@I1@'].deathDatePrecision, person['@I1@'].deathDateApproximate, person['@I1@'].deathRecorded], ['2015-01-01', 'year', true, false]);
  assert.equal(person['@I1@'].bio, 'First line\nSecond line continued');
  assert.deepEqual([person['@I2@'].birthDate, person['@I2@'].birthDatePrecision, person['@I2@'].birthDateApproximate], ['1962-01-01', 'year', false]); assert.equal(person['@I2@'].bio, null); assert.equal(person['@I3@'].name, 'Asha Ravi');
  assert.deepEqual(parsed.relationships.filter(link => link.type === 'parent').map(link => [link.to, link.label]).sort(), [['@I3@', 'Adoptive parent'], ['@I3@', 'Adoptive parent'], ['@I4@', null], ['@I4@', null]]); assert.equal(person['@I3@'].gender, null); assert.equal(person['@I4@'].name, 'Unknown person');
  assert.deepEqual(parsed.stats, { people: 4, families: 1, relationships: 5 });
  assert.ok(parsed.warnings.some(text => /^2 people have a month-only, year-only or approximate date/.test(text)));
  assert.ok(parsed.warnings.some(text => /marriage or divorce date/.test(text)));
  assert.ok(parsed.warnings.some(text => /adopted, foster or sealing/.test(text)));
  assert.ok(parsed.warnings.some(text => /not in the file/.test(text)));
  assert.ok(parsed.warnings.some(text => /no name/.test(text)));
  assert.equal(parsed.ignored.OBJE, 1); assert.equal(parsed.ignored.SOUR, 2);
  assert.equal(JSON.stringify(parsed).includes('private'), false, 'media paths are neither read nor echoed');
});

test('keeps adoptive and foster links as labeled parent connections through a round trip', () => {
  const people = ['mum', 'dad', 'kid', 'ward', 'mixed'].map(id => ({ id, name: `Fictional ${id}` }));
  const relationships = [
    { member1Id: 'mum', member2Id: 'kid', type: 'parent', customLabel: 'Adoptive parent' }, { member1Id: 'kid', member2Id: 'dad', type: 'child', customLabel: ' adoptive PARENT ' },
    { member1Id: 'mum', member2Id: 'ward', type: 'parent', customLabel: 'Foster parent' },
    { member1Id: 'mum', member2Id: 'mixed', type: 'parent', customLabel: 'Adoptive parent' }, { member1Id: 'dad', member2Id: 'mixed', type: 'parent', customLabel: null },
    { member1Id: 'mum', member2Id: 'dad', type: 'spouse' },
  ];
  const built = buildGedcom({ people, relationships });
  assert.ok(built.text.includes('\r\n2 PEDI adopted\r\n')); assert.ok(built.text.includes('\r\n2 PEDI foster\r\n'));
  assert.equal(built.text.split('PEDI').length - 1, 2, 'mixed parentage gets no PEDI'); assert.equal(built.summary.omitted.mixed_pedigree, 1);
  const parsed = parseGedcom(built.text), name = Object.fromEntries(parsed.people.map(person => [person.ref, person.name]));
  const labels = parsed.relationships.filter(link => link.type === 'parent').map(link => `${name[link.to]}:${link.label}`).sort();
  assert.deepEqual(labels, ['Fictional kid:Adoptive parent', 'Fictional kid:Adoptive parent', 'Fictional mixed:null', 'Fictional mixed:null', 'Fictional ward:Foster parent']);
});

test('keeps unreadable date wording in notes and records a death without a date', () => {
  const parsed = parseGedcom(['0 @I1@ INDI', '1 NAME A /Person/', '1 BIRT', '2 DATE BET 1800 AND 1810', '1 DEAT Y', '1 NOTE Original note', '0 @I2@ INDI', '1 NAME B /Person/', '1 DEAT', `2 DATE ABT \u0007${'x'.repeat(200)}`, '0 @I3@ INDI', '1 NAME C /Person/', '1 DEAT', '2 PLAC Somewhere'].join('\n'));
  const [first, second, third] = parsed.people;
  assert.equal(first.birthDate, null); assert.equal(first.bio, 'Imported date notes: Born BET 1800 AND 1810.\n\nOriginal note');
  assert.deepEqual([first.deathDate, first.deathRecorded], [null, true]);
  assert.ok(/^Imported date notes: Died ABT X{56}\.$/.test(second.bio), 'long or control-laden date text is cleaned and bounded to 60 characters'); assert.equal(second.deathRecorded, true);
  assert.deepEqual([third.deathDate, third.deathRecorded, third.bio], [null, true, null]);
  assert.ok(parsed.warnings.some(text => /^2 people have a date Family cannot read/.test(text)));
});

test('matches names regardless of order, case, punctuation and Latin accents without damaging other scripts', () => {
  assert.equal(nameKey('Ravi Kumar'), nameKey('Kumar, Ravi')); assert.equal(nameKey('K. Gokul'), nameKey('k gokul')); assert.equal(nameKey('José  Núñez'), nameKey('Jose Nunez'));
  assert.equal(nameKey('கோகுல் செந்தில்'), nameKey('செந்தில் கோகுல்'));
  assert.notEqual(nameKey('கோ'), nameKey('க')); assert.notEqual(nameKey('கோகுல்'), nameKey('கககல்'));
  assert.notEqual(nameKey('Ravi Kumar'), nameKey('Ravi Kumari'));
});

test('warns about repeated people inside one file but not placeholder names', () => {
  const text = ['0 @I1@ INDI', '1 NAME Ravi /Kumar/', '1 BIRT', '2 DATE 4 JUL 1960', '0 @I2@ INDI', '1 NAME Kumar, Ravi', '1 BIRT', '2 DATE 4 JUL 1960', '0 @I3@ INDI', '0 @I4@ INDI', '0 @I5@ INDI', '1 NAME Ravi /Kumar/', '1 BIRT', '2 DATE 5 JUL 1960'].join('\n');
  const warnings = parseGedcom(text).warnings.filter(message => /share a name and birth date/.test(message));
  assert.equal(warnings.length, 1); assert.match(warnings[0], /^2 people in the file/); assert.equal(/Unknown person/.test(warnings[0]), false);
});

test('accepts LF, CR and mixed line endings', () => {
  for (const separator of ['\n', '\r', '\r\n']) assert.equal(parseGedcom(['0 HEAD', '0 @I1@ INDI', '1 NAME Fictional /Person/', '0 TRLR'].join(separator)).people[0].name, 'Fictional Person');
});

test('reports non-UTF-8 declarations, malformed lines and a missing header without failing', () => {
  const parsed = parseGedcom(['0 @I1@ INDI', '1 NAME Fictional /Person/', 'not gedcom', '9 NAME skipped', '1 CHAR ANSEL', '0 HEAD', '1 CHAR ANSEL'].join('\n'));
  assert.deepEqual(parsed.errors, []);
  assert.ok(parsed.warnings.some(text => /ANSEL/.test(text))); assert.ok(parsed.warnings.some(text => /2 lines were not valid/.test(text)));
});

test('refuses files with no people, oversized input, too many people or families, and ancestry cycles', () => {
  assert.match(parseGedcom('0 HEAD\n0 TRLR').errors[0], /No people/);
  assert.match(parseGedcom('0 HEAD\n1 NOTE ' + 'x'.repeat(GEDCOM_LIMITS.maxBytes)).errors[0], /larger than/);
  const people = Array.from({ length: 3 }, (_, index) => `0 @I${index}@ INDI\n1 NAME Fictional ${index}`).join('\n');
  assert.match(parseGedcom(people, { maxPeople: 2 }).errors[0], /at most 2/);
  assert.match(parseGedcom(`${people}\n0 @F1@ FAM\n0 @F2@ FAM`, { maxFamilies: 1 }).errors[0], /at most 1/);
  assert.match(parseGedcom(people, { maxLines: 3 }).errors[0], /more than 3/);
  const cycle = ['0 @I1@ INDI', '1 NAME A', '0 @I2@ INDI', '1 NAME B', '0 @F1@ FAM', '1 HUSB @I1@', '1 CHIL @I2@', '0 @F2@ FAM', '1 HUSB @I2@', '1 CHIL @I1@'].join('\n');
  assert.match(parseGedcom(cycle).errors[0], /their own ancestor/);
  const self = parseGedcom(['0 @I1@ INDI', '1 NAME A', '0 @F1@ FAM', '1 HUSB @I1@', '1 CHIL @I1@'].join('\n'));
  assert.deepEqual(self.errors, []); assert.equal(self.relationships.length, 0); assert.ok(self.warnings.some(text => /own parent/.test(text)));
});

test('shortens oversized fields to the Family API limits and de-duplicates repeated records', () => {
  const parsed = parseGedcom(['0 @I1@ INDI', `1 NAME ${'N'.repeat(400)}`, `1 OCCU ${'O'.repeat(400)}`, '0 @I1@ INDI', '1 NAME Duplicate'].join('\n'));
  assert.equal(parsed.people.length, 1); assert.equal(Array.from(parsed.people[0].name).length, 160); assert.equal(Array.from(parsed.people[0].occupation).length, 300);
  assert.ok(parsed.warnings.some(text => /appears more than once/.test(text)));
});

test('reads day, month, year and approximate Gregorian dates and rejects impossible or unsupported ones', () => {
  const day = { precision: 'day', approximate: false, status: 'parsed' };
  const cases = [
    ['12 MAR 1950', '1950-03-12', day], ['1 jan 2000', '2000-01-01', day], ['@#DGREGORIAN@ 29 FEB 2000', '2000-02-29', day],
    ['MAR 1950', '1950-03-01', { ...day, precision: 'month' }], ['1950', '1950-01-01', { ...day, precision: 'year' }],
    ['ABT 1950', '1950-01-01', { precision: 'year', approximate: true, status: 'parsed' }], ['about 12 MAR 1950', '1950-03-12', { precision: 'day', approximate: true, status: 'parsed' }], ['CAL MAR 1950', '1950-03-01', { precision: 'month', approximate: true, status: 'parsed' }],
    ['29 FEB 1900', null, { status: 'unparsed' }], ['31 APR 1950', null, { status: 'unparsed' }], ['5 JAN 0999', null, { status: 'unparsed' }], ['999', null, { status: 'unparsed' }],
    ['1 JAN 1950 BC', null, { status: 'unparsed' }], ['@#DJULIAN@ 1 JAN 1700', null, { status: 'unparsed' }], ['BET 1800 AND 1810', null, { status: 'unparsed' }], ['BEF 1950', null, { status: 'unparsed' }], ['FROM 1950 TO 1960', null, { status: 'unparsed' }],
  ];
  for (const [text, iso, expected] of cases) { const result = parseGedcomDate(text); assert.equal(result.iso, iso, text); for (const [key, value] of Object.entries(expected)) assert.equal(result[key], value, `${text} ${key}`); }
  assert.equal(parseGedcomDate('').status, 'none'); assert.equal(parseGedcomDate(undefined).iso, null);
});

test('round trips month, year and approximate dates and a death with no date', () => {
  const people = [
    { id: 'a', name: 'Fictional Month', birthDate: d('1950-03-01'), birthDatePrecision: 'month' },
    { id: 'b', name: 'Fictional Year', birthDate: d('1950-01-01'), birthDatePrecision: 'year', deathDate: d('2001-01-01'), deathDatePrecision: 'year', deathDateApproximate: true },
    { id: 'c', name: 'Fictional About', birthDate: d('1950-03-12'), birthDateApproximate: true, deathRecorded: true },
    { id: 'd', name: 'Fictional Living', birthDate: d('1950-03-12') },
  ];
  const { text } = buildGedcom({ people, relationships: [] });
  for (const line of ['2 DATE MAR 1950', '2 DATE 1950', '2 DATE ABT 2001', '2 DATE ABT 12 MAR 1950', '1 DEAT Y', '2 DATE 12 MAR 1950']) assert.ok(text.includes(line + '\r\n'), line);
  const fields = parsed => parsed.people.map(({ name, birthDate, birthDatePrecision, birthDateApproximate, deathDate, deathDatePrecision, deathDateApproximate, deathRecorded }) => ({ name, birthDate, birthDatePrecision, birthDateApproximate, deathDate, deathDatePrecision, deathDateApproximate, deathRecorded }));
  const byName = Object.fromEntries(fields(parseGedcom(text)).map(person => [person.name, person]));
  assert.deepEqual(byName['Fictional Month'], { name: 'Fictional Month', birthDate: '1950-03-01', birthDatePrecision: 'month', birthDateApproximate: false, deathDate: null, deathDatePrecision: 'day', deathDateApproximate: false, deathRecorded: false });
  assert.deepEqual([byName['Fictional Year'].deathDate, byName['Fictional Year'].deathDatePrecision, byName['Fictional Year'].deathDateApproximate], ['2001-01-01', 'year', true]);
  assert.deepEqual([byName['Fictional About'].birthDatePrecision, byName['Fictional About'].birthDateApproximate, byName['Fictional About'].deathRecorded, byName['Fictional About'].deathDate], ['day', true, true, null]);
  assert.deepEqual([byName['Fictional Living'].deathRecorded, byName['Fictional Living'].birthDateApproximate], [false, false]);
});

test('never throws on hostile or random input and does not pollute prototypes', () => {
  let seed = 7;
  const next = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff);
  const alphabet = ['0 ', '1 ', '2 ', '@I1@', '@__proto__@', 'INDI', 'FAM', 'NAME', 'CONC', 'CONT', ' ', '\n', '\r', '/', '9', '\u0000', 'é', '_PROTO', 'HUSB', 'CHIL', 'DATE'];
  for (let round = 0; round < 300; round++) {
    const text = Array.from({ length: 1 + next() % 60 }, () => alphabet[next() % alphabet.length]).join('');
    const parsed = parseGedcom(text); assert.ok(Array.isArray(parsed.people) && Array.isArray(parsed.errors));
  }
  parseGedcom('0 @__proto__@ INDI\n1 NAME Evil\n1 _PROTO x\n0 @constructor@ FAM\n1 CHIL @__proto__@\n1 HUSB @constructor@');
  assert.equal({}.polluted, undefined); assert.equal(Object.keys(Object.prototype).length, 0);
});
