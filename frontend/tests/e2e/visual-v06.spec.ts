import { test, expect } from "@playwright/test";
if (process.env.AEROTWIN_LOCALE_CAPTURE) {
  test("capture the unified Italian analytics and observation interface", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 1100 });
    await page.goto("/analytics");
    await page
      .getByRole("combobox", { name: "Interface language" })
      .selectOption("it");
    await expect(
      page.getByLabel("Risultati delle analisi dei programmi"),
    ).toContainText("Riepilogo dei periodi");
    for (const chart of await page.locator(".chart").all())
      await chart.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: "../docs/screenshots/analytics-it-v0.6.png",
      fullPage: true,
      animations: "disabled",
    });
    await page.goto("/radar");
    await page
      .getByRole("button", { name: /SYN101/ })
      .first()
      .click();
    await expect(
      page.getByText("OSSERVAZIONE AEROMOBILE", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Usa mappa offline", exact: true })
      .click();
    await expect(page.locator(".svg-aircraft")).toHaveCount(42);
    await page.screenshot({
      path: "../docs/screenshots/radar-it-v0.6.png",
      fullPage: true,
      animations: "disabled",
    });
    await page.goto("/math");
    await expect(
      page.getByRole("heading", { name: "Metodi matematici", level: 1 }),
    ).toBeVisible();
    await page.screenshot({
      path: "../docs/screenshots/mathematics-it-v0.6.png",
      fullPage: true,
      animations: "disabled",
    });
  });
}
