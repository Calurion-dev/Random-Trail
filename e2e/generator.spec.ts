import { test, expect } from '@playwright/test';

test.describe('RandomParcours', () => {
  test('charge la page et affiche le générateur', async ({ page }) => {
    await page.goto('/#');
    await expect(page.locator('text=Générateur')).toBeVisible({ timeout: 10000 });
    // header present
    await expect(page.locator('header')).toBeVisible();
  });

  test('formulaire présent avec contrôles', async ({ page }) => {
    await page.goto('/#');
    await expect(page.getByText('Point de départ')).toBeVisible();
    await expect(page.getByText('Type de parcours')).toBeVisible();
    await expect(page.getByText('Préférences terrain')).toBeVisible();
  });

  test('navigation vers enregistrés / activité / réglages', async ({ page }) => {
    await page.goto('/#');
    await page.getByRole('link', { name: /Enregistrés/ }).click();
    await expect(page).toHaveURL(/#\/saved/);
    await page.getByRole('link', { name: /Activité/ }).click();
    await expect(page).toHaveURL(/#\/activity/);
    await page.getByRole('link', { name: /Réglages/ }).click();
    await expect(page).toHaveURL(/#\/settings/);
    await expect(page.getByText('Moteur de routage')).toBeVisible();
  });

  test('import bouton present et accepte geojson', async ({ page }) => {
    await page.goto('/#');
    const input = page.locator('input[type="file"]');
    await expect(input).toHaveCount(1);
    await expect(input).toHaveAttribute('accept', /geojson/);
  });

  test('theme et offline section visibles en réglages', async ({ page }) => {
    await page.goto('/#/settings');
    await expect(page.getByText('Thème & moteur de routage')).toBeVisible();
    await expect(page.getByText('Offline — pack tuiles')).toBeVisible();
  });
});
