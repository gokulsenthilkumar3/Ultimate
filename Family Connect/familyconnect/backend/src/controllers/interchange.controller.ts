import { createHash, randomBytes } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth.middleware';
import { cacheInvalidate } from '../services/cache.service';
import { buildGedcom, GEDCOM_LIMITS, nameKey, parseGedcom, ParsedPerson } from '../services/gedcom';
import { PartialDate, sameBirth } from '../services/datePrecision';
import { recordAudit } from '../services/audit';

const prisma = new PrismaClient();
const EDITOR_ROLES = ['admin', 'editor', 'family_head'];
const COMPARE_LIMIT = 20_000;
const treeParam = z.string().regex(/^[A-Za-z0-9_-]{1,200}$/);
export const gedcomPreviewBody = z.object({ text: z.string().max(GEDCOM_LIMITS.maxBytes) }).strict();
export const gedcomImportBody = gedcomPreviewBody.extend({ allowDuplicates: z.boolean().optional(), idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{8,100}$/).optional() }).strict();
const KEY_RETENTION_MS = 24 * 60 * 60 * 1000;

// A CUID-shaped, collision-resistant ID lets people be bulk-inserted while connections still map exactly, without relying on result order.
const newId = () => 'c' + randomBytes(12).toString('hex');
type Existing = { id: string; name: string; birthDate: Date | null; birthDatePrecision?: string | null; birthDateApproximate?: boolean | null };
const birthOf = (row: { birthDate: Date | string | null; birthDatePrecision?: string | null; birthDateApproximate?: boolean | null }): PartialDate => ({ date: row.birthDate, precision: (row.birthDatePrecision as PartialDate['precision']) || 'day', approximate: row.birthDateApproximate === true });

/** Same name (ignoring order, case, punctuation and Latin accents) and compatible birth dates: equal days, equal years when either date is less precise, or at least one unknown. A flag is a prompt to review, not a merge. */
function findDuplicates(people: ParsedPerson[], existing: Existing[]) {
  const byName = new Map<string, Existing[]>();
  for (const row of existing) byName.set(nameKey(row.name), [...(byName.get(nameKey(row.name)) || []), row]);
  const matches: { ref: string; name: string; existingId: string }[] = [];
  for (const person of people) {
    const hit = (byName.get(nameKey(person.name)) || []).find(row => sameBirth(birthOf(row), birthOf(person)));
    if (hit) matches.push({ ref: person.ref, name: person.name, existingId: hit.id });
  }
  return matches;
}

const fileName = (name: string | null | undefined) => (String(name || '').normalize('NFKD').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'family-tree') + '.ged';

/**
 * GEDCOM exchange. Export is a read for any tree member; preview and import need an editor role.
 * Import re-parses on the server (the preview is never trusted), writes only new people and
 * connections in one serializable transaction, and never fetches media paths or URLs.
 */
export function createInterchangeHandlers(database: PrismaClient = prisma, audit = (event: object) => console.info(JSON.stringify(event))) {
  const record = (event: object) => { try { audit({ event: 'family.interchange', ...event, at: new Date().toISOString() }); } catch { /* A committed operation must not be replayed after a log sink failure. */ } };

  async function exportGedcom(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) { res.status(401).json({ error: 'An Ultimate session is required.' }); return; }
    const treeId = treeParam.safeParse(req.params.id);
    if (!treeId.success) { res.status(400).json({ error: 'A valid tree is required.' }); return; }
    try {
      const result = await database.$transaction(async tx => {
        const access = await tx.accessControl.findUnique({ where: { treeId_userId: { treeId: treeId.data, userId: req.user!.id } } });
        if (!access) return { status: 403 as const };
        const [peopleCount, relationshipCount] = [await tx.member.count({ where: { treeId: treeId.data } }), await tx.relationship.count({ where: { treeId: treeId.data } })];
        if (peopleCount > GEDCOM_LIMITS.maxExportPeople || relationshipCount > GEDCOM_LIMITS.maxExportRelationships) return { status: 413 as const };
        const tree = await tx.familyTree.findUnique({ where: { id: treeId.data }, select: { name: true } });
        const people = await tx.member.findMany({ where: { treeId: treeId.data }, orderBy: [{ name: 'asc' }, { id: 'asc' }], select: { id: true, name: true, gender: true, birthDate: true, birthDatePrecision: true, birthDateApproximate: true, birthLocation: true, deathDate: true, deathDatePrecision: true, deathDateApproximate: true, deathRecorded: true, occupation: true, religion: true, bio: true } });
        const relationships = await tx.relationship.findMany({ where: { treeId: treeId.data }, select: { member1Id: true, member2Id: true, type: true, customLabel: true, marriageDate: true, divorceDate: true } });
        return { status: 200 as const, name: tree?.name, people, relationships };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
      if (result.status === 403) { res.status(403).json({ error: 'Access denied to this family tree.' }); return; }
      if (result.status === 413) { res.status(413).json({ error: `This tree is larger than the export limit of ${GEDCOM_LIMITS.maxExportPeople.toLocaleString('en')} people.` }); return; }
      const built = buildGedcom({ people: result.people, relationships: result.relationships });
      record({ actorId: req.user.id, action: 'export-gedcom', treeId: treeId.data, people: built.summary.people });
      // Exports move the whole tree out of the service, so they are worth a durable entry; a failed log write must not block the owner's own data.
      try { await recordAudit(database, { treeId: treeId.data, actorId: req.user.id, action: 'gedcom.export', entity: 'gedcom', details: { people: built.summary.people } }); } catch { /* best effort for a read */ }
      res.set('Cache-Control', 'no-store').json({ filename: fileName(result.name), mediaType: 'text/plain;charset=utf-8', gedcom: built.text, summary: built.summary });
    } catch { res.status(503).json({ error: 'The GEDCOM export could not be prepared. Try again.' }); }
  }

  async function previewGedcom(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) { res.status(401).json({ error: 'An Ultimate session is required.' }); return; }
    const treeId = treeParam.safeParse(req.params.id), body = gedcomPreviewBody.safeParse(req.body);
    if (!treeId.success || !body.success) { res.status(400).json({ error: `Choose a GEDCOM file up to ${GEDCOM_LIMITS.maxBytes / 1024} KB.` }); return; }
    try {
      const existing = await database.$transaction(async tx => {
        const access = await tx.accessControl.findUnique({ where: { treeId_userId: { treeId: treeId.data, userId: req.user!.id } } });
        if (!access || !EDITOR_ROLES.includes(access.role)) return null;
        return tx.member.findMany({ where: { treeId: treeId.data }, select: { id: true, name: true, birthDate: true, birthDatePrecision: true, birthDateApproximate: true }, take: COMPARE_LIMIT + 1 });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
      if (!existing) { res.status(403).json({ error: 'An editor role is required for this family tree.' }); return; }
      const parsed = parseGedcom(body.data.text);
      const comparable = existing.length <= COMPARE_LIMIT;
      const duplicates = comparable ? findDuplicates(parsed.people, existing) : [];
      res.set('Cache-Control', 'no-store').json({
        canImport: !parsed.errors.length && parsed.people.length > 0, stats: parsed.stats, errors: parsed.errors, warnings: parsed.warnings, warningCount: parsed.warningCount, ignored: parsed.ignored,
        sample: parsed.people.slice(0, 10).map(({ ref, name, birthDate, deathDate }) => ({ ref, name, birthDate, deathDate })),
        duplicates: { count: duplicates.length, checked: comparable, rows: duplicates.slice(0, 50) },
        limits: { people: GEDCOM_LIMITS.maxPeople, families: GEDCOM_LIMITS.maxFamilies },
      });
    } catch { res.status(503).json({ error: 'The GEDCOM file could not be reviewed. Try again.' }); }
  }

  async function importGedcom(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) { res.status(401).json({ error: 'An Ultimate session is required.' }); return; }
    const treeId = treeParam.safeParse(req.params.id), body = gedcomImportBody.safeParse(req.body);
    if (!treeId.success || !body.success) { res.status(400).json({ error: `Choose a GEDCOM file up to ${GEDCOM_LIMITS.maxBytes / 1024} KB.` }); return; }
    const userId = req.user.id, parsed = parseGedcom(body.data.text);
    if (parsed.errors.length || !parsed.people.length) { res.status(422).json({ error: parsed.errors[0] || 'No people were found in this file.', errors: parsed.errors, warnings: parsed.warnings }); return; }
    try {
      const outcome = await database.$transaction(async tx => {
        const access = await tx.accessControl.findUnique({ where: { treeId_userId: { treeId: treeId.data, userId } } });
        if (!access || !EDITOR_ROLES.includes(access.role)) return { status: 403 as const, body: { error: 'An editor role is required for this family tree.' } };
        const scope = `gedcom.import:${treeId.data}`, key = body.data.idempotencyKey;
        const requestHash = createHash('sha256').update(body.data.text).update(body.data.allowDuplicates ? '|duplicates' : '|unique').digest('hex');
        if (key) {
          // A retry after a timeout or lost response gets the committed result back instead of importing twice.
          const prior = await tx.idempotencyKey.findUnique({ where: { userId_scope_key: { userId, scope, key } } });
          if (prior) return prior.requestHash === requestHash ? { status: 200 as const, body: { ...(prior.response as object), replayed: true } } : { status: 422 as const, body: { error: 'This retry key was used for a different file. Review the file and start the import again.' } };
        }
        const existing = await tx.member.findMany({ where: { treeId: treeId.data }, select: { id: true, name: true, birthDate: true, birthDatePrecision: true, birthDateApproximate: true }, take: COMPARE_LIMIT + 1 });
        if (existing.length > COMPARE_LIMIT) return { status: 409 as const, body: { error: 'This tree is too large to check for duplicates before importing.' } };
        const duplicates = findDuplicates(parsed.people, existing);
        if (duplicates.length && !body.data.allowDuplicates) return { status: 409 as const, body: { code: 'DUPLICATES', error: `${duplicates.length} ${duplicates.length === 1 ? 'person looks' : 'people look'} like someone already in this tree. Review them, or import anyway.`, duplicates: { count: duplicates.length, rows: duplicates.slice(0, 50) } } };
        const people = parsed.people.map(person => ({ id: newId(), treeId: treeId.data, createdById: userId, name: person.name, gender: person.gender, birthDate: person.birthDate ? new Date(person.birthDate) : null, birthDatePrecision: person.birthDatePrecision, birthDateApproximate: person.birthDateApproximate, birthLocation: person.birthLocation, deathDate: person.deathDate ? new Date(person.deathDate) : null, deathDatePrecision: person.deathDatePrecision, deathDateApproximate: person.deathDateApproximate, deathRecorded: person.deathRecorded, occupation: person.occupation, religion: person.religion, bio: person.bio }));
        const ids = new Map(parsed.people.map((person, index) => [person.ref, people[index].id]));
        for (let start = 0; start < people.length; start += 500) await tx.member.createMany({ data: people.slice(start, start + 500) });
        const rows = parsed.relationships.map(link => ({ treeId: treeId.data, member1Id: ids.get(link.from)!, member2Id: ids.get(link.to)!, type: link.type, customLabel: link.label, marriageDate: link.marriageDate ? new Date(link.marriageDate) : null, divorceDate: link.divorceDate ? new Date(link.divorceDate) : null }));
        for (let start = 0; start < rows.length; start += 500) await tx.relationship.createMany({ data: rows.slice(start, start + 500) });
        const viewers = await tx.accessControl.findMany({ where: { treeId: treeId.data }, select: { userId: true }, take: 500 });
        const response = { imported: { people: parsed.people.length, relationships: rows.length }, warnings: parsed.warnings, warningCount: parsed.warningCount, ignored: parsed.ignored };
        await recordAudit(tx, { treeId: treeId.data, actorId: userId, action: 'gedcom.import', entity: 'gedcom', details: { people: parsed.people.length, relationships: rows.length, warnings: parsed.warningCount } });
        if (key) await tx.idempotencyKey.create({ data: { userId, scope, key, requestHash, status: 201, response } });
        await tx.idempotencyKey.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - KEY_RETENTION_MS) } } });
        return { status: 201 as const, viewers: viewers.map(row => row.userId), people: parsed.people.length, relationships: rows.length, response };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15_000, maxWait: 5_000 });
      if (outcome.status !== 201) { res.status(outcome.status).json(outcome.body); return; }
      await cacheInvalidate(`members:${treeId.data}`, ...outcome.viewers.flatMap(id => [`tree:${treeId.data}:user:${id}`, `trees:user:${id}`]));
      record({ actorId: userId, action: 'import-gedcom', treeId: treeId.data, people: outcome.people, relationships: outcome.relationships, warnings: parsed.warningCount });
      res.set('Cache-Control', 'no-store').status(201).json(outcome.response);
    } catch (error) {
      const code = (error as { code?: string }).code;
      // P2028: the transaction exceeded its time budget (kept below the bridge's 20 s limit) and was rolled back.
      if (code === 'P2002') { res.status(409).json({ error: 'This import is already running or has finished. Wait a moment, then reopen Family to check.' }); return; }
      if (code === 'P2028') { res.status(503).json({ error: 'The import took too long and was rolled back. Nothing was changed. Split the file into smaller parts and try again.' }); return; }
      res.status(code === 'P2034' ? 409 : 500).json({ error: 'The GEDCOM file could not be imported. Nothing was changed; refresh and try again.' });
    }
  }

  return { exportGedcom, previewGedcom, importGedcom };
}
export const { exportGedcom, previewGedcom, importGedcom } = createInterchangeHandlers();
