import { test, expect } from "@playwright/test";
if (process.env.AEROTWIN_VISUAL_CAPTURE) {
  test("capture airport reference and mathematical methods", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 1100 });
    await page.route("**/api/v1/airports/*/weather", (route) =>
      route.fulfill({
        json: {
          status: "unavailable",
          station: "LEBL",
          observation: null,
          reason: "Offline screenshot: no weather report requested",
        },
      }),
    );
    await page.goto("/airports");
    await expect(page.getByLabel("Airport reference details")).toContainText(
      "Europe/Madrid",
    );
    await page.waitForTimeout(600);
    await page.screenshot({
      path: "../docs/screenshots/airports-v0.5.png",
      fullPage: true,
      animations: "disabled",
    });
    await page.goto("/math");
    await expect(
      page.getByRole("heading", { name: "Mathematical methods", level: 1 }),
    ).toBeVisible();
    await page.waitForTimeout(350);
    await page.screenshot({
      path: "../docs/screenshots/mathematics-v0.5.png",
      fullPage: true,
      animations: "disabled",
    });
    await page.goto("/radar");
    await page
      .getByRole("button", { name: "Use offline map", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Observation recordings", exact: true })
      .click();
    await expect(
      page.getByLabel("Observation recording library"),
    ).toContainText("Synthetic frames are never recorded");
    await page.screenshot({
      path: "../docs/screenshots/recordings-v0.5.png",
      animations: "disabled",
    });
  });
}
