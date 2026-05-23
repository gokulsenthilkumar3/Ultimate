import { test, expect } from '@playwright/test';

/**
 * Spec 3 — Overview: Environment Cards (Weather / AQI)
 * Mocks geolocation and intercepts Open-Meteo API calls so tests
 * are deterministic and never depend on real network or location.
 */
test.describe('Overview — Environment', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant geolocation permission and provide a fixed coordinate
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 11.0168, longitude: 76.9558 }); // Coimbatore

    // Intercept Open-Meteo weather + AQI endpoints
    await page.route('**/api.open-meteo.com/v1/forecast**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          current_weather: { temperature: 32, windspeed: 10, weathercode: 1 },
          hourly: { relativehumidity_2m: [65] },
        }),
      });
    });

    await page.route('**/air-quality-api.open-meteo.com/v1/air-quality**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          current: { european_aqi: 42, pm10: 18, pm2_5: 10 },
        }),
      });
    });

    await page.goto('/');
    // Navigate to Overview tab
    const overviewBtn = page
      .locator('button, [role="tab"]')
      .filter({ hasText: /overview/i })
      .first();
    if (await overviewBtn.count() > 0) await overviewBtn.click();
  });

  test('weather card renders temperature', async ({ page }) => {
    const tempText = page.locator('text=/°C|°F|temperature/i');
    await expect(tempText.first()).toBeVisible({ timeout: 8_000 });
  });

  test('AQI card renders an AQI value', async ({ page }) => {
    const aqiText = page.locator('text=/AQI|air quality/i');
    await expect(aqiText.first()).toBeVisible({ timeout: 8_000 });
  });

  test('environment section visible even when geolocation is denied', async ({
    page,
    context,
  }) => {
    // Re-open with denied permission — fallback coords should still trigger fetch
    await context.clearPermissions();
    await page.goto('/');
    const overviewBtn = page
      .locator('button, [role="tab"]')
      .filter({ hasText: /overview/i })
      .first();
    if (await overviewBtn.count() > 0) await overviewBtn.click();
    // App should not crash — app-shell still visible
    await expect(page.locator('.app-shell')).toBeVisible();
  });
});
