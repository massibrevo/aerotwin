import { test, expect } from "@playwright/test";
if (process.env.AEROTWIN_VISUAL_CAPTURE) {
  test("capture Analytics studio and model diagnostics on synthetic data", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 1100 });
    await page.goto("/analytics");
    await expect(page.getByLabel("Schedule analytics results")).toContainText(
      "Period scorecard",
    );
    for (const chart of await page.locator(".chart").all()) {
      await chart.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
    }
    await page
      .getByRole("heading", { name: "Analytics studio", exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "../docs/screenshots/analytics-v0.4.png",
      fullPage: true,
      animations: "disabled",
    });
    await page.goto("/forecast");
    await page
      .getByRole("button", { name: "Predict departure delay", exact: true })
      .click();
    const diagnostics = page.getByLabel("Extended model diagnostics");
    await expect(diagnostics).toContainText("Evidence against the baseline");
    for (const chart of await diagnostics.locator(".chart").all()) {
      await chart.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
    }
    await diagnostics.screenshot({
      path: "../docs/screenshots/diagnostics-v0.4.png",
      animations: "disabled",
    });
    await page.goto("/radar");
    await page
      .getByRole("button", { name: "Use offline map", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Select SYN101", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Save aircraft to favourites", exact: true })
      .click();
    await page
      .getByRole("button", { name: "All aircraft", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Favourites (1)", exact: true })
      .click();
    await page.screenshot({
      path: "../docs/screenshots/favourites-v0.4.png",
      animations: "disabled",
    });
  });
}
