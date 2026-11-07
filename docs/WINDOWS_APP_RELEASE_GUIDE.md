# Publish an application through the portfolio

Current public release: [GrowthTrack Ultimate 2.0.2](https://github.com/gokulsenthilkumar3/Ultimate/releases/tag/desktop-v2.0.2). [Download the Windows x64 installer](https://github.com/gokulsenthilkumar3/Ultimate/releases/download/desktop-v2.0.2/GrowthTrack-Ultimate-2.0.2-x64-Setup.exe). This update adds the original growing-orbit icon and [streaming history imports/custom webhooks](STREAMING_CONNECTIONS.md). The release includes checksums, build provenance and notes; this build is unsigned. Windows publisher/security prompts are separate from the installer’s one-click workflow.

## One-command Windows build

Publisher metadata now uses **Gokul Senthilkumar**. The local 2.0.3 publisher build and the remaining identity-verified certificate setup are documented in [Windows publisher signing](WINDOWS_PUBLISHER_SIGNING.md). The public release linked above remains 2.0.2; changing metadata alone does not make it signed.

The installed local client is now 2.0.5 with the [playable Pebble welcome world](plans/2026-11-06-playable-welcome.md) and the separate [Kite agent](plans/2026-11-06-original-motion-worlds.md). This local animation update has not been published as a new public release.

From the workspace root, run `npm run release:windows`. This generates both database clients, builds the current UI, creates a Windows x64 NSIS installer, verifies the packaged UI/runtime and excludes private databases, local environments, uploads and signing keys. The timestamped output folder contains `GrowthTrack-Ultimate-<version>-x64-Setup.exe`, `SHA256SUMS.txt`, `release-manifest.json` and `RELEASE-NOTES.txt`.

Installation is per-user and adds Desktop/Start Menu shortcuts and an uninstaller. No Node.js/npm/Prisma Studio installation is needed on an end-user machine. A new private workspace starts its embedded API on an independent loopback port and asks the user to create an account. Existing saved server connections are retained. SQL Server/shared-server installations still require their configured backend to be reachable. Uninstall is configured to retain user data; it does not remove the SQL Server database.

Run `npm run release:windows:draft -- --from=growthtrack-release-<timestamp>` to upload the four verified files to a new GitHub draft. Omit `--from` to build first. `--update-draft` is restricted to unpublished drafts; published assets are not overwritten. Explicit `--publish` publishes only after upload verification. Release notes record whether the source working tree contained pending changes, rather than claiming the tag alone reproduces a local working-tree build.

## One-button GitHub release build

After the source changes and `.github/workflows/windows-release.yml` are merged, open **Actions → Windows one-click installer → Run workflow**. Enter `desktop-v<package version>`. The workflow installs locked dependencies, runs checks, builds/verifies the installer, saves CI artifacts and creates a draft. Select **Publish the verified installer publicly** only when ready to make it public. Use a new version for later releases rather than overwriting an existing installer.

Optional repository secrets `WINDOWS_CSC_LINK` and `WINDOWS_CSC_KEY_PASSWORD` enable code signing. Set repository variable `WINDOWS_SIGNING_REQUIRED=true` to block publication unless Authenticode verifies the installer. Secrets never enter Git or release manifests. Without a valid signing certificate the installer remains unsigned; a checksum does not establish publisher identity. The installer settings follow the [electron-builder NSIS options](https://www.electron.build/docs/nsis/).

The local one-click installation was executed successfully on 6 November 2026. The installed 991 UI/runtime files were compared with the verified build. Fresh-account setup/login and the embedded SQLite workspace passed in an isolated profile; a separate check confirmed the installed real profile retained its Microsoft SQL Server connection. The Desktop and Start Menu shortcuts and uninstaller were verified.

## Portfolio and distribution checklist

The portfolio source is at `D:\Projects\Personal Portfolio`. Its `/downloads/` route reads stable public GitHub release assets for the allowlisted repositories in `src/lib/downloads.ts`. It does not distribute installers from the owner's Downloads folder or private repositories.

1. Choose one application and confirm its current README/setup, license, server requirements and supported Windows versions. Ultimate is an Electron app; its desktop configuration must point to the intended secure backend. Do not package local environments, databases, logs, uploaded records or signing secrets.
2. From a clean release checkout, install using the lockfile. Run the documented build, type check, relevant tests and security audit. For Ultimate, use `npm run release:windows` to create the installer; `npm run build:desktop` creates an unpacked debugging build. A frontend build alone is not an installer.
3. Install the resulting Windows package in a clean VM/user profile. Verify first launch, login/logout, upgrades, backend configuration, offline/error behavior, model loading, companion pin/close, high-DPI/multi-monitor layout and uninstall. Confirm no development record or credential shipped.
4. Obtain a trusted code-signing certificate/provider and configure signing through the release secret manager. Sign and timestamp the executable and installer. A SHA-256 checksum verifies bytes, not publisher identity. Do not label an unsigned package as signed.
5. Produce checksums with `Get-FileHash -Algorithm SHA256 -LiteralPath '<installer-path>'`. Write release notes with version, operating system/architecture, backend requirements, known limitations and installation/uninstallation instructions.
6. Create a **draft** GitHub release on the correct public application repository. Attach the tested `.exe`/`.msi`/`.msix` (and checksum file), then review its exact files and notes. Publish only after that review. Avoid attaching source-only ZIP files as though they were Windows installers.
7. Add the repository to the portfolio allowlist only if the product should be distributed there. Verify the local downloads page shows the intended stable version, filename, size, download URL and digest when GitHub supplies one. Prereleases/drafts are skipped; missing releases remain visibly unavailable. The API is cached for 30 minutes.
8. Deploy the portfolio through its existing deployment workflow after reviewing the changes. Visit `/downloads/` on desktop/mobile and test one actual installation from the public link. A local page does not update the live portfolio automatically.
9. Keep a release checklist, support/contact link and security reporting path. Test upgrades from the previous release before publishing the next. Add auto-update only with signed updates, a verified feed and rollback behavior.

The nature-product area is currently a concept/contact entry, not a purchasable or downloadable product. Define and build that product, original artwork, licensing and checkout before advertising availability or taking payment.
