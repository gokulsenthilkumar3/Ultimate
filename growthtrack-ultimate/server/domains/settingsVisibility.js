// Only deployment-level display/configuration settings may appear in shared
// configuration, bootstrap or the application's read-only database browser.
// Owner-scoped settings (including notification acknowledgements) must never
// be exposed by a broad AppSetting scan.
export const PUBLIC_SETTING_KEYS = Object.freeze(['navigation', 'appCatalog', 'portfolioUrl', 'aiAgent', 'weatherUrl', 'newsSources']);
export const publicSettingsWhere = () => ({ key: { in: [...PUBLIC_SETTING_KEYS] } });
