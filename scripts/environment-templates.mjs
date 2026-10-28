import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicFirebase = `# Public Firebase project configuration; these values are visible in the browser.
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_USE_EMULATORS=false
`;
const templates = {
  'FinSync/.env.example': `${publicFirebase}
# Variable reference for optional backend integrations. Never expose these to clients.
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
OPENAI_API_KEY=
PLAID_CLIENT_ID=
PLAID_SECRET=
FINVU_API_KEY=
# Next.js loads its own application folder's env file, not this parent file.
`,
  'FinSync/apps/web/.env.example': `${publicFirebase}
# Legacy compatibility only. A NEXT_PUBLIC_ key cannot protect production PII.
# Intentionally blank. Replace the browser encryption flow server-side before production.
NEXT_PUBLIC_ENCRYPTION_KEY=
`,
  'FinSync/OxFin/ox-fin-web/.env.example': `# Copy to .env.local. Set your own local connection and signing values.
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_BASE_PATH=
NEXT_PUBLIC_API_BASE=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_ID=
GITHUB_SECRET=
OXFIN_REDIS_URL=
OXFIN_PAYMENT_PROVIDER=
OXFIN_STRIPE_SECRET_KEY=
OXFIN_RAZORPAY_KEY_ID=
OXFIN_RAZORPAY_KEY_SECRET=
OXFIN_INVESTMENT_PROVIDER=
OXFIN_KITE_API_KEY=
OXFIN_KITE_ACCESS_TOKEN=
OXFIN_GROWW_API_KEY=
`,
  'FinSync/OxFin/ox-fin-backend/.env.example': `# Local infrastructure only. Supply your own password before docker compose up.
POSTGRES_USER=oxfin_user
POSTGRES_PASSWORD=
POSTGRES_DB=oxfin
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
REDIS_URL=redis://127.0.0.1:6379
# Existing volumes retain their existing credentials. This template does not rotate them.
`,
  'Family Connect/familyconnect/backend/.env.example': `# Copy to .env. Configure an existing or new local PostgreSQL database.
DATABASE_URL=
JWT_SECRET=
PORT=3104
REDIS_URL=
REDIS_DISABLED=1
GEMINI_API_KEY=
`,
  'Family Connect/familyconnect/frontend/.env.example': `# Copy to .env.local for standalone development. Public routing configuration only.
VITE_API_BASE=http://127.0.0.1:3104/api/v1
# The workspace launcher overrides product base routing.
`,
  'Equity/NiftyLens/.env.example': `${publicFirebase}
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
# Pipeline/server-only configuration. Never use a public prefix for a service role.
FIREBASE_SERVICE_ACCOUNT_JSON=
RENDER_EXTERNAL_URL=
`,
  'Forex/.env.example': `# Variable reference only. Export these in the process environment before launching.
# The application does not automatically load this file.
DATA_PATH=Dataset/Forex_Data.csv
MODEL_DIR=outputs
FEAT_CONFIG=config/features.yaml
OPENAI_API_KEY=
`,
};
for (const [file, text] of Object.entries(templates)) {
  const content = '# No usable credentials belong in tracked templates.\n' + text;
  const target = path.join(root, file);
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== content) throw new Error(`Environment template drift: ${file}`);
  } else fs.writeFileSync(target, content);
}
console.log(`${Object.keys(templates).length} environment templates ${process.argv.includes('--check') ? 'verified' : 'written'}. Local secret files were not accessed.`);
