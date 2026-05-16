// Mock for server/routes/phase4a.js
// Returns a no-op Express middleware so index.js mounts it safely.
export default () => (_req, _res, next) => next();
