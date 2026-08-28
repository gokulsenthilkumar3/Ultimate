# Hardcoded UI and configuration audit

This audit separates app records from presentation and bootstrap configuration. User-entered records now belong in SQLite; visual constants and files needed before the API starts remain in source control.

## JSX/JS locations migrated to SQLite

- `src/components/MetricLogger.jsx`: blank inputs; completed check-ins are stored once in `metric_logs`.
- `src/components/SettingsPanel.jsx`: removed because it was unused. Profile baselines are stored in `metric_logs`, not a duplicate settings record.
- `src/components/SettingsModal.jsx`: identity and Health Score come from owner/health records; billing URL and app metadata come from `app_settings`.
- `src/components/HealthExtras.jsx`: health extras and recovery entries come from `health_profiles`; no fabricated measurements remain.
- `src/components/Current.jsx`: weather URL/codes and news sources come from `app_settings.currentSources`; location comes from the browser/API and SQLite.
- `src/components/Overview.jsx`: the status message is generated from current task, habit, goal, and metric data rather than a quote list.
- `src/components/Databases.jsx`: displays live local table counts/previews. Custom schemas and rows are stored in `custom_tables`.
- `src/config/navigation.js` and `src/components/PremiumSidebar.jsx`: code contains the safe icon-component mapping; editable labels, grouping, keywords, and order come from `app_settings.navigation`.
- `src/components/AppLauncher.jsx`: catalog content comes from `app_settings.appCatalog`; click behavior and icon rendering remain presentation code.
- `src/components/Documents.jsx` and `src/components/ProfileEditor.jsx`: provider choices come from `app_settings.documentProviders`.
- `src/lib/growthcast.js` and `src/components/AiDashboard.jsx`: Ollama endpoint, model, and timeout come from `app_settings.aiAgent`.
- `src/components/Maps.jsx`: Timeline URL, tracking preference, and capture source come from `app_settings.maps`; captured points are stored in `location_points`.

## JSON/config locations intentionally kept as files

- `public/manifest.json`: browser install metadata must be available before JavaScript or the local database loads, so it cannot depend on SQLite.
- `public/_headers`: hosting/security headers are interpreted by the web server before the application runs, so they must remain deployment configuration.
- `package.json`, `vite.config.js`, and `playwright.config.ts`: build and test configuration must exist before the API/database is available.
- `src/data/userData.js` and `src/constants/index.js`: field definitions, units, validation/domain metadata, and visual options remain code. They describe how records are edited; they are not user records.
- CSS colors, spacing, breakpoints, icons, validation limits, enum field choices, test fixtures, and fallback error text remain in source because they are presentation or safety behavior.

## SQLite-owned runtime data

- `metric_logs`: progress check-ins and the single profile baseline record.
- `health_profiles`: Health Score, Health+ and extras JSON.
- `owner_profiles`: identity and locally stored avatar data.
- `location_points`: captured map/timeline points.
- `custom_tables`: user-created database schemas and rows.
- `app_settings`: navigation, app catalog, providers, weather/news sources, Ollama, Maps, and app metadata.
- `audit_logs`: successful authenticated create/update/delete operations.

The literals in `scripts/seed-app-config.mjs` are database bootstrap defaults. Runtime components do not import them; administrators can edit the resulting `app_settings` values from the Databases tab.
