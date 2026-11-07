import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sqlServerSchema, bootstrap } from '../scripts/sqlserver-schema.mjs';
test('SQL Server conversion bounds indexed text, keeps unbounded contents and prevents cascade-path cycles', () => {
  const schema = sqlServerSchema(fs.readFileSync('growthtrack-ultimate/prisma/schema.prisma', 'utf8'));
  assert.match(schema, /provider = "sqlserver"/);
  assert.match(schema, /content\s+String\?.*@db.NVarChar\(Max\)/);
  assert.match(schema, /email\s+String\s+@unique @db.NVarChar\(200\)/);
  assert.doesNotMatch(schema, /onDelete: Cascade/);
  assert.match(schema, /amountMinor\s+BigInt\?/);
});
test('SSMS bootstrap rejects mismatches without dropping existing data', () => {
  const sql = bootstrap('CREATE TABLE [dbo].[fixture] ([id] INT NOT NULL PRIMARY KEY);', 'a'.repeat(64));
  assert.doesNotMatch(sql, /\bDROP\s+(?:TABLE|CONSTRAINT)|\bTRUNCATE\s+TABLE/i);
  assert.match(sql, /Existing tables have no matching bootstrap marker/);
  assert.match(sql, /modelHash=N'a{64}'/);
});
