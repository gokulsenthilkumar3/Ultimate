# Database TLS

Production connections require TLS with certificate and hostname verification.
Publicly trusted database certificates use Node's trust store. For a private CA,
set server-only `DATABASE_SSL_CA` to the PEM certificate content through deployment
secret configuration. Do not use a public frontend variable for this setting.

Production URL TLS options (`ssl`, `sslmode`, `sslcert`, `sslkey`, `sslrootcert`,
`uselibpqcompat`) are removed before pg parses the URL so they cannot override
the application's verified TLS policy. Deployments previously relying on URL
certificate paths must configure their CA through `DATABASE_SSL_CA`; URL client
certificate authentication is not supported by this helper.

Development keeps the existing local connection behavior. Query timing logs
contain duration and row counts, without SQL text or parameters.

Focused check, from this directory (no database connection is made):

```powershell
node --test src/lib/databaseConfig.test.mjs
```

These checks verify effective pg client configuration. A deployment must also
verify successful connection to its trusted database and rejection of an
untrusted server certificate before rollout.
