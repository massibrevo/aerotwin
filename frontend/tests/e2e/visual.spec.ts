import { test, expect } from "@playwright/test";
if (process.env.AEROTWIN_VISUAL_CAPTURE) {
  test("capture redesigned radar with real free basemap and synthetic observations", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 1050 });
    await page.goto("/radar");
    await expect(page.locator(".online-map")).toHaveAttribute(
      "data-map-ready",
      "true",
      { timeout: 20000 },
    );
    await page
      .getByRole("button", { name: "Select SYN101", exact: true })
      .click();
    await expect(page.getByLabel("Aircraft inspector")).toContainText("SYN101");
    await page.screenshot({
      path: "../docs/screenshots/radar-v0.3.png",
      animations: "disabled",
    });
  });
  test("capture redesigned overview and forecast", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1100 });
    await page.goto("/");
    await expect(page.getByText("3,840", { exact: true })).toBeVisible();
    await page.locator(".chart").first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(1800);
    await expect(page.locator(".recharts-area-curve").first()).toBeVisible();
    await page.getByRole("heading",{name:"Your airspace. In perspective."}).scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "../docs/screenshots/overview-v0.3.png",
      fullPage: true,
      animations: "disabled",
    });
    await page.goto("/forecast");
    await page
      .getByRole("button", { name: "Predict departure delay", exact: true })
      .click();
    await expect(page.getByLabel("Prediction result")).toBeVisible();
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: "../docs/screenshots/forecast-v0.3.png",
      fullPage: true,
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: "Switch to dark theme", exact: true })
      .click();
    await page.screenshot({
      path: "../docs/screenshots/forecast-dark-v0.3.png",
      fullPage: true,
      animations: "disabled",
    });
  });
}
