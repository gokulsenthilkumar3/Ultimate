export function domainError(status, code, message) {
  return Object.assign(new Error(message), { status, code });
}

export function sendDomainError(res, error) {
  const status = Number.isInteger(error?.status) ? error.status : 500;
  return res.status(status).json({
    code: status === 500 ? 'INTERNAL_ERROR' : error?.code || 'REQUEST_FAILED',
    error: status === 500 ? 'Unable to complete this request.' : error.message,
  });
}

// SQLite serializes writers. Retry the entire transaction after a competing
// writer commits so duplicate/quota checks run against the committed state.
export async function transactionWithRetry(prisma, work) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await prisma.$transaction(async tx => {
        // The libsql adapter starts a deferred transaction. A zero-row UPDATE
        // acquires the writer reservation before reads, avoiding lock upgrades
        // between independent clients. It never modifies any account data.
        if (typeof tx.$executeRawUnsafe === 'function') await tx.$executeRawUnsafe('UPDATE "User" SET "id" = "id" WHERE 0');
        return work(tx);
      }, { timeout: 15000 });
    }
    catch (error) {
      const cause = error.meta?.driverAdapterError?.cause;
      const retryable = ['P2034', 'P2002', 'SQLITE_BUSY', 'SQLITE_BUSY_SNAPSHOT', 'SQLITE_LOCKED'].includes(error.code)
        || ['5', '6', '517'].includes(String(cause?.originalCode))
        || /SQLITE_BUSY|database (?:file )?is locked|write conflict/i.test(`${error.message || ''} ${cause?.originalMessage || ''}`);
      if (!retryable) throw error;
      if (attempt >= 5) throw domainError(503, 'DATABASE_BUSY', 'Storage is busy. Retry this request shortly.');
      await new Promise(resolve => setTimeout(resolve, 30 * (attempt + 1) + Math.floor(Math.random() * 30)));
    }
  }
}
