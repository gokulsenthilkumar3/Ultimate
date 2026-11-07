# Windows installer and release delivery

Implemented and locally verified on 6 November 2026.

## Delivered

- [Public Windows release](https://github.com/gokulsenthilkumar3/Ultimate/releases/tag/desktop-v2.0.1) and [Windows x64 installer](https://github.com/gokulsenthilkumar3/Ultimate/releases/download/desktop-v2.0.1/GrowthTrack-Ultimate-2.0.1-x64-Setup.exe).
- NSIS per-user one-click setup, application icon, Desktop/Start Menu shortcuts and uninstaller. User data is retained on uninstall. The installer is unsigned; a signing-secret hook and CI signing-required option are prepared.
- `npm run release:windows` builds the installer, verifies packaged runtime/UI files and creates checksums, a manifest and release notes. `npm run release:windows:draft -- --publish` builds/uploads/verifies and publishes a new version in one command. Existing published releases cannot be overwritten by that helper.
- `.github/workflows/windows-release.yml` prepares the equivalent workflow-dispatch button. It becomes available after these source changes are merged into the repository's default branch. This delivery did not push or merge the source worktree.
- Ignore rules protect local environments, private databases/backups, credentials, installers and packaging output. Required `build/uiBuildInfo.js` and `build/icon.ico` are explicitly retained as source assets. Existing tracked historical files were not blindly removed.

## Verification

The final installer is 303,529,118 bytes. SHA-256:

```text
3e5b0a98dbb6232e7a062d64978b9398f45da5687efcc85df57f1d4cca39b38d
```

GitHub's uploaded asset digest matches the local installer. An unauthenticated download check returned HTTP 200 with the expected length and a Windows `MZ` executable header. The public release includes `SHA256SUMS.txt`, `release-manifest.json` and `RELEASE-NOTES.txt`.

The installer completed with exit code 0 on the user's approved Windows installation. Both shortcuts point to the installed executable; uninstall registration and the uninstaller file were verified. All 991 selected UI/runtime files in the installed archive matched the verified workspace build. The installed application opened the real saved profile and its public health endpoint reported Microsoft SQL Server / CONNECTED. Account/record contents were not read for that check.

A separate isolated profile completed first-account setup, login and a state read using the embedded SQLite workspace. Its API used an independent loopback port, avoiding the existing API on port 3001. A second isolated check retained a saved SQL Server API connection and exercised native companion pin/close. No owner database, local environment, private upload or signing key is included in the distribution profile.

These checks found and fixed the packaged SQLite-client fallback and retained explicit native companion preload configuration. Database migrations are not part of installer execution; changing a user's provider remains an operator-reviewed action.

The UI fingerprint is `9ca7a3dbe3ae2c859c6caf7ca10b98586f424f92dd6723380b7b94b6e770225b`. The binary was built from a local working tree with pending source changes, explicitly recorded in release provenance. The tag's source archive alone does not reproduce that working-tree build. Future CI builds record their exact checked-out commit.

Local evidence remains under ignored `.code-index/` fixture, installer and install-verification records. No missing historical artifact was recreated or marked available.
