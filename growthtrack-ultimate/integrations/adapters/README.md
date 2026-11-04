# Optional integration packages

The owner selected **optional packages and templates; keep the existing runtime**. These packages cover the 32 catalog entries requiring integrations. They are disabled integration starting points, not 32 production integrations.

Generate with `npm run adapters:sync`; verify with `npm run adapters:check`. Each package has an explicit acceptance manifest and a bounded read-only HTTP health bridge. Language/framework/database services must implement that bridge in their owning runtime and add their own data access, authorization, native driver configuration and fixtures. A shared health bridge does not implement SQL, a vendor AI API or a cloud deployment API.

GitLab, Bitbucket, Jenkins and CircleCI include verification pipeline examples. AWS/Azure/GCP/serverless include disabled deployment plans; Kubernetes includes a zero-replica placeholder deployment. Review and supply image digests, identity, secrets, network/storage and rollback settings before applying anything. No pipeline files are copied to repository-root provider locations automatically.

Use an independent environment and lockfile per runtime. Do not install all database drivers/frameworks into Ultimate. Preserve existing product sessions, permission checks and databases. No service is started, called or selected for data access merely by importing a package or changing a planning profile.

MERN remains an optional isolated-service architecture. No evidence justifies replacing Ultimate SQLite or the product-owned PostgreSQL stores. Its bridge package is not a working MongoDB-backed application; implementing that application remains a separate domain task with migration and backup acceptance gates.
