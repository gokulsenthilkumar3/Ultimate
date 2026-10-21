/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OWNER_NAME?: string;
  readonly VITE_OWNER_EMAIL?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
