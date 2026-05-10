/**
 * queryGuard — SELECT-only middleware for /api/query
 * Blocks any SQL that is not a pure SELECT statement.
 * Attach this middleware before the /api/query route handler.
 */

const BLOCKED_KEYWORDS = /\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|EXEC|EXECUTE|CALL|MERGE|REPLACE|LOAD|COPY)\b/i;

function queryGuard(req, res, next) {
  const sql = (req.body?.query || req.body?.sql || '').trim();

  if (!sql) {
    return res.status(422).json({ error: 'query is required' });
  }

  // Strip SQL comments before validation
  const stripped = sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--[^\n]*/g, '')
    .trim();

  // Must start with SELECT
  if (!/^SELECT\b/i.test(stripped)) {
    return res.status(403).json({ error: 'Only SELECT statements are allowed on /api/query' });
  }

  // Block any DML/DDL keywords anywhere in the query
  if (BLOCKED_KEYWORDS.test(stripped)) {
    return res.status(403).json({ error: 'Blocked keyword detected in query' });
  }

  next();
}

module.exports = queryGuard;
