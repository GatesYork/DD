import { test, expect } from '@playwright/test';

// Deterministic API fixtures validate integration without consuming a real token.
// Real Mapbox streets and account access must also be checked after deployment.
test.beforeEach(async ({ page }) => {
  await page.route('https://api.mapbox.com/**', route => {
    if (route.request().url().includes('/styles/')) return route.fulfill({ json: { version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#142533' } }] } });
    return route.fulfill({ json: {} });
  });
  await page.route('https://events.mapbox.com/**', route => route.fulfill({ json: {} }));
});

test('loads the real map widget and only requests location after a click', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 33.0828, longitude: -83.2318, accuracy: 20 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Use my location', exact: true })).toBeEnabled({ timeout: 15000 });
  await expect(page.locator('.mapboxgl-canvas')).toBeVisible();
  await expect(page.getByTestId('current-location-marker')).toHaveCount(0);
  await page.getByRole('button', { name: 'Use my location', exact: true }).click();
  await expect(page.getByTestId('current-location-marker')).toBeVisible();
  await expect(page.getByText(/accuracy about 20 m/)).toBeVisible();
  await page.getByRole('button', { name: 'Clear my location', exact: true }).click();
  await expect(page.getByTestId('current-location-marker')).toHaveCount(0);
  await page.getByRole('button', { name: /Georgia College/ }).click();
  await page.getByRole('button', { name: /University of Georgia/ }).click();
  await expect(page.getByText('Athens · Street map')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Use my location', exact: true })).toBeEnabled({ timeout: 15000 });
  await page.getByRole('button', { name: 'Use my location', exact: true }).click();
  await expect(page.getByTestId('current-location-marker')).toBeVisible();
  await page.getByRole('button', { name: 'Find a ride', exact: true }).click();
  await expect(page.getByText('Your people. Your ride.')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel ride', exact: true }).click();
  await expect(page.getByTestId('current-location-marker')).toHaveCount(0);
});

test('handles location denial without preventing map use', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (_success, failure) => failure?.({ code: 1, message: 'Denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Use my location', exact: true }).click();
  await expect(page.getByText(/Location permission was denied/)).toBeVisible();
  await expect(page.getByTestId('current-location-marker')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Back to campus' })).toBeEnabled({ timeout: 15000 });
});

test('shows an actionable map error and retries after an API failure', async ({ page }) => {
  let fail = true;
  await page.route('https://api.mapbox.com/styles/**', route => fail
    ? route.fulfill({ status: 401, json: { message: 'Invalid token' } })
    : route.fulfill({ json: { version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#142533' } }] } }));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Mapbox rejected the token (401)');
  fail = false;
  await page.getByRole('button', { name: 'Retry map' }).click();
  await expect(page.getByRole('button', { name: 'Use my location', exact: true })).toBeEnabled({ timeout: 15000 });
  await expect(page.getByRole('alert')).toHaveCount(0);
});

for (const [status, message] of [[403, 'Mapbox denied map access (403)'], [429, 'Mapbox’s request limit was reached (429)']] as const) {
  test(`explains HTTP ${status} without exposing the token`, async ({ page }) => {
    await page.route('https://api.mapbox.com/styles/**', route => route.fulfill({ status, json: { message: 'Request failed' } }));
    await page.goto('/');
    await expect(page.getByRole('alert')).toContainText(message);
    await expect(page.getByRole('alert')).not.toContainText('pk.test');
    await expect(page.getByRole('button', { name: 'Retry map' })).toBeVisible();
  });
}

test('explains a blocked network request', async ({ page }) => {
  await page.route('https://api.mapbox.com/styles/**', route => route.abort('blockedbyclient'));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('The browser could not load Mapbox data');
});
