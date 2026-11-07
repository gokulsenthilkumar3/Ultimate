import { createSealer } from './sync/sealer.js';
import { domainError, sendDomainError } from './errors.js';

const LOGIN = /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i;
const REPO = /^[a-z\d_.-]{1,100}$/i;
const PROVIDER = 'github';
const summarize = repo => ({
  id: repo.id, name: repo.name, full_name: repo.full_name, html_url: LOGIN.test(repo.owner?.login) && REPO.test(repo.name) ? `https://github.com/${repo.owner.login}/${repo.name}` : null,
  description: repo.description, private: Boolean(repo.private), fork: Boolean(repo.fork),
  language: repo.language, stargazers_count: repo.stargazers_count, forks_count: repo.forks_count,
  pushed_at: repo.pushed_at, updated_at: repo.updated_at,
  owner: { login: repo.owner?.login }, permissions: { admin: repo.permissions?.admin === true },
});

export function registerGithubRoutes(app, auth, { prisma, config, audit = async () => {}, fetchImpl = fetch }) {
  const sealer = createSealer(config.security.encryptionKey);
  const context = id => `${id}:github:secret`;
  const stateContext = id => `${id}:github:state`;
  const find = id => prisma.integrationCredential.findUnique({ where: { userId_provider: { userId: id, provider: PROVIDER } } });
  const wrap = handler => async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    try { await handler(req, res); } catch (error) { sendDomainError(res, error); }
  };
  async function github(route, token, { method = 'GET', body, deadline } = {}) {
    const url = new URL(`https://api.github.com${route}`);
    if (url.origin !== 'https://api.github.com') throw domainError(400, 'INVALID_GITHUB_ROUTE', 'Invalid GitHub request.');
    let response;
    try {
      response = await fetchImpl(url, { method, redirect: 'error', signal: AbortSignal.timeout(Math.max(1, Math.min(12000, deadline ? deadline - Date.now() : 12000))),
        headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'GrowthTrack', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch { throw domainError(503, 'GITHUB_UNAVAILABLE', 'GitHub did not respond. Retry the connection.'); }
    if (!response.ok) {
      const status = response.status;
      throw domainError(status === 401 ? 401 : status === 404 ? 404 : status === 403 || status === 429 ? 429 : 502,
        'GITHUB_REQUEST_FAILED', status === 401 ? 'GitHub authorization expired. Reconnect your account.' : status === 404 ? 'GitHub could not find this account or repository with the current permissions.' : status === 403 || status === 429 ? 'GitHub limited this request or the token lacks permission. Check its repository access and retry later.' : 'GitHub could not complete this request.');
    }
    if (response.status === 204) return null;
    const reader = response.body?.getReader();
    let text;
    if (reader) {
      const chunks = []; let bytes = 0;
      for (;;) {
        const part = await reader.read(); if (part.done) break;
        bytes += part.value.byteLength;
        if (bytes > 3 * 1024 * 1024) { await reader.cancel(); throw domainError(502, 'GITHUB_RESPONSE_LIMIT', 'GitHub returned too much data.'); }
        chunks.push(Buffer.from(part.value));
      }
      text = Buffer.concat(chunks).toString('utf8');
    } else text = await response.text();
    if (Buffer.byteLength(text) > 3 * 1024 * 1024) throw domainError(502, 'GITHUB_RESPONSE_LIMIT', 'GitHub returned too much data.');
    try { return JSON.parse(text); } catch { throw domainError(502, 'GITHUB_INVALID_RESPONSE', 'GitHub returned an unreadable response.'); }
  }
  async function credential(id, management = false) {
    const row = await find(id);
    if (!row?.enabled || !row.accessTokenCiphertext) throw domainError(409, 'GITHUB_NOT_CONNECTED', 'Connect GitHub to include private repositories.');
    const state = sealer.open(row.clientIdCiphertext, stateContext(id)) || {};
    if (management && state.allowManagement !== true) throw domainError(403, 'GITHUB_MANAGEMENT_DISABLED', 'Enable repository management explicitly before changing GitHub.');
    return { token: sealer.open(row.accessTokenCiphertext, context(id)), row, state };
  }
  app.get('/api/integrations/github/connection', auth, wrap(async (req, res) => {
    const row = await find(req.user.id);
    const state = row?.clientIdCiphertext ? sealer.open(row.clientIdCiphertext, stateContext(req.user.id)) : {};
    res.json({ connected: Boolean(row?.enabled && row.accessTokenCiphertext), login: row?.accountName || null,
      allowManagement: state?.allowManagement === true, encryptionReady: sealer.canSeal });
  }));
  app.put('/api/integrations/github/connection', auth, wrap(async (req, res) => {
    const token = req.body?.token;
    if (typeof token !== 'string' || token.length < 20 || token.length > 512 || /\s/.test(token)) throw domainError(400, 'INVALID_GITHUB_TOKEN', 'Enter a valid GitHub token.');
    if (!sealer.canSeal) throw domainError(503, 'ENCRYPTION_KEY_REQUIRED', 'Configure the server encryption key before connecting GitHub.');
    const account = await github('/user', token);
    if (!LOGIN.test(account?.login)) throw domainError(502, 'GITHUB_ACCOUNT_INVALID', 'GitHub did not return a valid account.');
    const data = { accountName: account.login, enabled: true,
      accessTokenCiphertext: sealer.seal(token, context(req.user.id), { requireEncryption: true }),
      clientIdCiphertext: sealer.seal({ allowManagement: req.body?.allowManagement === true }, stateContext(req.user.id)) };
    await prisma.integrationCredential.upsert({ where: { userId_provider: { userId: req.user.id, provider: PROVIDER } }, create: { userId: req.user.id, provider: PROVIDER, ...data }, update: data });
    await audit({ action: 'connect', userId: req.user.id, provider: PROVIDER });
    res.json({ connected: true, login: account.login, allowManagement: req.body?.allowManagement === true });
  }));
  app.delete('/api/integrations/github/connection', auth, wrap(async (req, res) => {
    await prisma.integrationCredential.deleteMany({ where: { userId: req.user.id, provider: PROVIDER } });
    await audit({ action: 'disconnect', userId: req.user.id, provider: PROVIDER });
    res.json({ connected: false });
  }));
  app.get('/api/integrations/github/repos', auth, wrap(async (req, res) => {
    const row = await find(req.user.id);
    const connected = Boolean(row?.enabled && row.accessTokenCiphertext);
    const login = connected ? row.accountName : req.query.username;
    if (typeof login !== 'string' || !LOGIN.test(login)) throw domainError(400, 'INVALID_GITHUB_LOGIN', 'Set a valid GitHub username or connect an account.');
    const token = connected ? sealer.open(row.accessTokenCiphertext, context(req.user.id)) : null;
    const repos = []; let truncated = false; const deadline = Date.now() + 20000;
    for (let page = 1; page <= 10; page++) {
      const route = connected ? '/user/repos' : `/users/${encodeURIComponent(login)}/repos`;
      const batch = await github(`${route}?sort=updated&per_page=100&page=${page}${connected ? '&affiliation=owner,collaborator,organization_member' : ''}`, token, { deadline });
      if (!Array.isArray(batch)) throw domainError(502, 'GITHUB_INVALID_RESPONSE', 'GitHub did not return a repository list.');
      repos.push(...batch.map(summarize));
      if (batch.length < 100) break;
      truncated = page === 10;
      if (Date.now() >= deadline - 500) { truncated = true; break; }
    }
    res.json({ repositories: [...new Map(repos.map(repo => [repo.id, repo])).values()], login, visibility: connected ? 'authorized' : 'public-only', truncated });
  }));
  app.get('/api/integrations/github/contributions', auth, wrap(async (req, res) => {
    const { token } = await credential(req.user.id);
    const result = await github('/graphql', token, { method: 'POST', body: { query: '{ viewer { login contributionsCollection { totalCommitContributions totalIssueContributions totalPullRequestContributions restrictedContributionsCount contributionCalendar { totalContributions weeks { contributionDays { date contributionCount color } } } } } }' } });
    if (result.errors?.length || !result.data?.viewer) throw domainError(403, 'GITHUB_CONTRIBUTIONS_UNAVAILABLE', 'Contribution access needs the correct GitHub account and profile permissions. Private activity is limited by GitHub privacy settings.');
    res.json(result.data.viewer);
  }));
  const repoPath = req => {
    if (!LOGIN.test(req.params.owner) || !REPO.test(req.params.name) || ['.', '..'].includes(req.params.name)) throw domainError(400, 'INVALID_GITHUB_REPO', 'Invalid repository name.');
    return `/repos/${encodeURIComponent(req.params.owner)}/${encodeURIComponent(req.params.name)}`;
  };
  const repoBody = req => {
    if (typeof req.body?.name !== 'string' || !REPO.test(req.body.name) || ['.', '..'].includes(req.body.name) || typeof req.body.private !== 'boolean' || typeof req.body.description !== 'string' || req.body.description.length > 350) throw domainError(400, 'INVALID_GITHUB_REPO', 'Check the repository name, description and visibility.');
    return { name: req.body.name, description: req.body.description, private: req.body.private };
  };
  app.post('/api/integrations/github/repos', auth, wrap(async (req, res) => {
    const { token } = await credential(req.user.id, true);
    const repo = await github('/user/repos', token, { method: 'POST', body: repoBody(req) });
    await audit({ action: 'repository-create', userId: req.user.id, provider: PROVIDER, repositoryId: repo.id }); res.json(summarize(repo));
  }));
  app.patch('/api/integrations/github/repos/:owner/:name', auth, wrap(async (req, res) => {
    const { token } = await credential(req.user.id, true);
    const repo = await github(repoPath(req), token, { method: 'PATCH', body: repoBody(req) });
    await audit({ action: 'repository-update', userId: req.user.id, provider: PROVIDER, repositoryId: repo.id }); res.json(summarize(repo));
  }));
  app.delete('/api/integrations/github/repos/:owner/:name', auth, wrap(async (req, res) => {
    const { token } = await credential(req.user.id, true); const route = repoPath(req);
    if (req.body?.confirmation !== `${req.params.owner}/${req.params.name}`) throw domainError(400, 'CONFIRMATION_REQUIRED', 'Confirm the exact repository before deletion.');
    await github(route, token, { method: 'DELETE' });
    await audit({ action: 'repository-delete', userId: req.user.id, provider: PROVIDER }); res.json({ success: true });
  }));
}
