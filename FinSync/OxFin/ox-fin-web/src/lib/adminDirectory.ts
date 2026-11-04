import { timingSafeEqual } from 'node:crypto';

export function adminServiceAuthorized(header: string | null, secret: string | undefined) {
    if (!/^[a-f0-9]{64}$/i.test(secret || '')) return false;
    const token = header?.match(/^Bearer ([a-f0-9]{64})$/i)?.[1];
    return Boolean(token && timingSafeEqual(Buffer.from(token), Buffer.from(secret!)));
}

export function adminDirectoryInput(url: string) {
    const params = new URL(url).searchParams;
    if ([...params.keys()].some(key => !['q', 'status', 'plan', 'limit', 'offset'].includes(key) || params.getAll(key).length !== 1)) throw new Error('INVALID_FILTER');
    const limit = Number(params.get('limit') || 25), offset = Number(params.get('offset') || 0);
    const q = params.get('q') || '', status = params.get('status') || '', plan = params.get('plan') || '';
    if (![25, 50, 100].includes(limit) || !Number.isSafeInteger(offset) || offset < 0 || offset > 10000 || q.length > 200 || status.length > 40 || plan.length > 100) throw new Error('INVALID_FILTER');
    return { limit, offset, q, status, plan };
}
