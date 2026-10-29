// Shared, dependency-free bounds. Provider credentials and destinations stay server-side.
export const AGENT_LIMITS = Object.freeze({
  requestBytes: 64 * 1024,
  responseChars: 64 * 1024,
  streamBytes: 1024 * 1024,
  streamRecords: 8192,
  frameChars: 256 * 1024,
  jsonBytes: 256 * 1024,
  modelCount: 100,
  chatTokens: 4096,
  planTokens: 2048,
  planTtlMs: 10 * 60 * 1000,
  preparedPlans: 50,
  transcriptTurns: 50,
});
