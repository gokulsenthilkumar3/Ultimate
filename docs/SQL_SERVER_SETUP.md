# SQL Server and SSMS setup

The local Ultimate API now uses Microsoft SQL Server through `DATABASE_PROVIDER=sqlserver`. SSMS is the management application; Prisma remains the internal query layer. You do not need Prisma Studio or the Prisma CLI to execute the supplied T-SQL script.

## Connect locally

1. Open SQL Server Management Studio and connect to `localhost\SQLEXPRESS` (or `.\SQLEXPRESS`) using Windows authentication.
2. Expand **Databases → GrowthTrackDB → Tables**. There are 73 application tables plus the technical `__GrowthTrackSchema` bootstrap marker.
3. The application uses a separate restricted SQL login over encrypted loopback TCP on port **14333**. Its generated password is held only in ignored local configuration; do not paste it into chat, source control or browser settings.
4. Use SSMS for custom T-SQL. The optional browser DB console at `http://localhost:5556` shows the SQL Server source and supports bounded table/schema reads; arbitrary SQL is disabled for that provider.

SQL Express mixed authentication, TCP and its service restart were explicitly approved. The source SQLite database was retained. Before cutover, an encrypted backup was created and restored for verification; 3,857 records across the current 73-model contract were copied in a transaction and compared by canonical row values. Missing legacy tables were treated as empty only after inspecting the actual SQLite schema. Populated unmapped columns cause the migration to stop. Synchronization identity cursors were preserved using parameterized operator inserts. Temporary identity permissions were revoked after migration.

## Schema script for another empty database

Open [GrowthTrack_MSSQL_SSMS.sql](GrowthTrack_MSSQL_SSMS.sql) in SSMS and execute it. It creates `GrowthTrackDB` if absent, then provisions its tables and constraints in a transaction. It contains no table drops or foreign-key removal. A matching repeat run does nothing; an existing unrelated or mismatched schema is rejected. Use a reviewed migration for an existing database rather than modifying the bootstrap marker.

The script targets SQL Server 2017+ and was executed on the local SQL Server 17.x instance. It is not an Azure SQL deployment script. It does not seed personal accounts, import records or switch an application process. The mirror under `growthtrack-ultimate/prisma/GrowthTrack_MSSQL_SSMS.sql` has identical T-SQL. Regenerate both with `npm run schema:ssms` after model changes; review before executing.

The SQL DDL schema uses `NO ACTION` foreign keys to avoid SQL Server cascade-path conflicts. The SQL Server application client uses relation emulation to retain the original cascade-delete behavior while the database still enforces those foreign keys. Direct SSMS deletes must therefore respect dependent records. Monetary minor-unit and goal-owner integrity rules are also installed. Rollback-only SQL Server checks exercised owner creation, tasks, money, Notes revisions, MFA replay prevention and related-record deletion.

## Configure the application

Server-only settings in the ignored Ultimate `.env` select the provider:

```dotenv
DATABASE_PROVIDER=sqlserver
DATABASE_URL=sqlserver://localhost:14333;database=GrowthTrackDB;user=;password=;encrypt=true;
BACKUP_ENABLED=false
```

Fill credentials locally. The current local candidate explicitly trusts the local server certificate; use a properly validated certificate for remote deployments. Neither the database URL nor credentials belong in a `VITE_` variable. Changing the provider requires a data migration, validation and API restart; it is not a safe instant UI toggle.

The checked-in SQLite schema remains the canonical model contract. The generator produces SQL Server DDL and a separate SQL Server application-client schema. `npm --prefix growthtrack-ultimate run db:generate` generates both clients and fails instead of silently using a stale client.

SQL Server uses its own backup/restore workflow. SQLite's encrypted backup scheduler must not be enabled for a SQL Server URL. Configure and test a SQL Server backup job before relying on this installation for ongoing records. Existing encrypted SQLite cutover backups remain under the ignored application backup directory. Keep their key separately protected.

The previous SQLite configuration is retained in an ignored cutover backup. It is a pre-cutover recovery point, not a continuously synchronized copy. Once new SQL Server writes occur, switching back without a reviewed reverse migration would lose those newer changes.

## Desktop synchronization

- `npm run desktop` checks the UI source fingerprint and rebuilds stale assets before launch.
- `npm run desktop:dev` opens the running Vite UI with HMR on loopback.
- Build the local SQL Server-connected executable with `node growthtrack-ultimate/scripts/build-desktop.mjs --local-server`. Its public connection file points to `http://127.0.0.1:3001/Ultimate/`, with no database credentials. The API must be running.
- A normal build without `--local-server` retains the standalone desktop setup. No application database is silently copied or switched.
- A release is considered verified only after `scripts/verify-desktop-build.mjs` compares packaged UI/runtime files with the current source and checks `dist/build-info.json`. The unchanged marketing version `2.0.1` alone does not prove freshness.
- Local executable signing is reported from its actual Authenticode status. ASAR integrity metadata is not a publisher signature.

## Original local delivery snapshot — 6 November 2026

This original delivery used `growthtrack-release-20261105190044/win-unpacked/GrowthTrack Ultimate.exe`. The familiar `growthtrack-release-local/win-unpacked` path points to it through a workspace-local junction. Its previous package was retained in `growthtrack-release-local/win-unpacked.previous-20261106-verified`; no user database was moved with it. The later [one-click Windows installer](WINDOWS_APP_RELEASE_GUIDE.md) is now the installed delivery and public download. It preserves the saved SQL Server-backed API connection; it does not embed that API's database credentials.

The build verifier compared 992 UI/runtime files and confirmed source fingerprint `22d86247fa1ca9ba0bba51ba8c0289b80b16d29af89d2eacc670823f0845290a`. A packaged Electron test with an isolated profile loaded Welcome from the live API, read native system status, opened/closed the companion and verified that private actions still require sign-in. It found and verified the explicit companion-preload fix. Actual runtime versions: Electron 44.3.0, Chromium 152.0.7977.78 and Node 24.20.0. Authenticode reports **NotSigned**.

Final local checks returned HTTP 200 for the API (`3001`, database `Microsoft SQL Server / CONNECTED`), UI (`5000/Ultimate/`), gateway (`5300/health`) and DB Studio (`5556/api/tables`, 73 application tables). Running the SSMS bootstrap again reported a matching schema and made no changes. Schema mirrors match. TypeScript, focused native/configuration tests, agent tests and repository/documentation checks passed. These are bounded local checks, not a claim that every domain/provider integration has been exercised on SQL Server.
