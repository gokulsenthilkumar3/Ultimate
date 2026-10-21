# Self-hosted Ultimate deployment

The selected deployment is Docker Compose with one Ultimate web/API container and Caddy HTTPS. The current database remains SQLite and files use a persistent local volume. PostgreSQL, shared object storage, workers and a managed-cloud cutover remain pending. This setup does not establish mobile feature parity or a production release.

## Fresh installation

Run these commands from `growthtrack-ultimate` on a host with Docker Engine and Compose. Use a new deployment directory and volume; the initialization command refuses any existing database filename.

```sh
npm run deploy:secrets
docker compose build
docker compose run --rm ultimate init
```

`deploy:secrets` creates two random keys under ignored `deploy/secrets`, preserves existing keys, and prints no secret values. Protect those files with operating-system permissions and keep a separate encrypted backup. Compose mounts secrets as read-only files; the runtime reads only its supported secret names. This follows Docker's [secret mounting model](https://docs.docker.com/compose/how-tos/use-secrets/).

Set `APP_DOMAIN` in a deployment-specific environment or Compose environment file to a domain routed to this host. Caddy serves HTTPS and forwards the complete frontend and API to Ultimate. The default `localhost` uses a local certificate authority; clients must trust that authority for local HTTPS login. Secure session cookies require HTTPS. Do not expose the API container directly to the public network. Caddy is the sole trusted proxy in this configuration. See [Caddy reverse proxy behavior](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy).

Create the first owner once, using a temporary protected password file. Mount that file at `/run/secrets/owner_password` in a one-off container and set `OWNER_PASSWORD_FILE` to that path, together with `OWNER_EMAIL` and `OWNER_NAME`. Run the `owner` deployment command. It refuses to create an owner if a user already exists. Keep the password out of command history and remove temporary provisioning configuration after creation. Never put the password or file in the image.

```sh
docker compose up -d
docker compose ps
```

The runtime runs as the `node` user with a read-only root filesystem. Data, uploaded files, logs and backups live under the `ultimate_data` volume. Startup checks that storage was initialized; it does not create or upgrade owner storage automatically. The image includes generated Prisma code and shared server contracts and uses the locked dependency graph. Build stages follow Docker's [multi-stage build model](https://docs.docker.com/build/building/multi-stage/).

## Existing installation and upgrades

Do not run fresh initialization against an existing installation or copy an actively written SQLite database with its WAL omitted. Stop writes, take the verified backup, and restore to a separate staging location. Preserve original database, private file bytes, encryption keys and configuration together. Rehearse import and owner/data parity before assigning the deployment volume.

Older Notes storage requires the additive migration in [NOTES_API_V1.md](NOTES_API_V1.md). The current image enables versioned Notes and refuses incompatible storage. The migration helper supports rehearsal and explicit apply through `docker compose run --rm ultimate migrate-notes` and `docker compose run --rm ultimate migrate-notes --apply`. A historical `db push` installation still needs migration-history reconciliation before blanket migration deployment is adopted.

Tag a reviewed image with `RELEASE_TAG`, retain the previous image, and rehearse the upgrade against a restored copy. A rollback involving new writes requires reconciliation of those writes before selecting a restored database. No command here resets schemas, drops volumes or overwrites a live database.

## Encryption and backups

`APP_ENCRYPTION_KEY` is 32 random bytes encoded as 64 hexadecimal characters. New vault uploads are encrypted with AES-256-GCM and a random nonce; the storage identifier is authenticated. Download and preview verify authentication and the original byte checksum. Missing keys fail explicitly. Legacy plaintext files remain readable and are labelled accurately in My Files. SQLite records, logs and backup/rehearsal files are still plaintext; use encrypted host storage and protected encrypted backup destinations. This is server-side file encryption, not end-to-end encryption or a completed storage migration.

```sh
docker compose run --rm ultimate backup
```

The database backup verifies SQLite integrity, foreign keys, schema/count parity, SHA-256 and a fresh restore copy. It does **not** back up uploaded file bytes or encryption keys. A complete recovery set must include the entire data volume and matching secret files during a coordinated write pause. Do not treat a database-only backup as a complete application recovery.

## Verification and build runners

```sh
docker build --tag growthtrack-ultimate:verification .
npm run test:container
```

The smoke test creates a unique labelled disposable volume and account, tests the actual image's authentication/CSRF, Notes receipts/conflicts/history/deletion/restore/feed, encrypted file upload/download, frontend, health and database backup restore. It mounts no owner files and removes only its own label-verified temporary resources.

`.github/workflows/platform-builds.yml` at the repository root builds and smoke-tests the container. It also runs the existing iOS HealthWire tests and simulator compilation on `macos-15`, and Android companion tests/lint/debug compilation with Java 17 and Gradle 8.11.1. Those are companion build gates, not full Ultimate native clients or store-signed releases. The selected Android versions match [AGP 8.9 compatibility](https://developer.android.com/build/releases/agp-8-9-0-release-notes). Signing identities, store accounts, real-device checks and production host activation remain outstanding.
