import { test, expect } from "@playwright/test";
test("offline end-to-end control tower, radar, history, forecast and simulator", async ({
  page,
}) => {
  await page.route("https://**/*", (route) => route.abort());
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your airspace. In perspective." }),
  ).toBeVisible();
  await expect(page.locator(".land").first()).toBeAttached();
  if (process.env.AEROTWIN_CAPTURE)
    await page.screenshot({
      path: "../docs/screenshots/control-tower.png",
      fullPage: true,
    });
  await page.getByRole("link", { name: "Live radar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Select SYN101", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Select SYN101", exact: true })
    .click();
  await expect(page.getByLabel("Aircraft inspector")).toContainText("a00000");
  await page.getByLabel("Search aircraft").fill("SYN101");
  await expect(page.locator(".aircraft-row")).toHaveCount(1);
  await page.getByLabel("Search aircraft").fill("");
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await expect(page.locator(".radar-status")).toContainText("2025-01-01");
  await page.getByRole("button", { name: "Next frame" }).click();
  await page
    .getByRole("link", { name: "Historical explorer", exact: true })
    .click();
  await page.getByLabel("Historical origin").selectOption("ATL");
  await expect(page.locator("tbody tr").first()).toContainText("ATL");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator(".pagination")).toContainText("Page 2");
  await page.getByRole("link", { name: "Forecast lab", exact: true }).click();
  await page.getByRole("button", { name: "Predict departure delay" }).click();
  await expect(page.getByLabel("Prediction result")).toContainText(
    "Nominal 90%",
  );
  await page
    .getByRole("link", { name: "Disruption simulator", exact: true })
    .click();
  await page.getByRole("button", { name: "Run simulation" }).click();
  await expect(page.getByLabel("Simulation results")).toContainText(
    "ADDITIONAL DELAY",
  );
  for (const path of ["/pulse", "/data", "/about"]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("main")).not.toContainText(
      "Internal Server Error",
    );
  }
});
test("live outage is explicit and never becomes synthetic LIVE", async ({
  page,
}) => {
  await page.route("**/api/v1/aircraft?**", async (route) => {
    const u = new URL(route.request().url());
    if (u.searchParams.get("mode") === "live")
      await route.fulfill({
        json: {
          mode: "live",
          status: "unavailable",
          source: "ADSB.lol",
          aircraft: [],
          received_at: null,
          error: "Live provider unavailable. Select demo explicitly.",
          retry_after_seconds: 60,
          attribution: "ADSB.lol",
        },
      });
    else await route.continue();
  });
  await page.goto("/radar");
  await page.getByRole("button", { name: "Live ADS-B", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Live provider unavailable",
  );
  await expect(page.locator(".aircraft")).toHaveCount(0);
  await expect(page.locator(".topbar")).toContainText("LIVE UNAVAILABLE");
  await page
    .getByRole("button", { name: "Synthetic demo", exact: true })
    .click();
  await expect(page.locator(".aircraft")).toHaveCount(42);
});
test("online map style is requested and offline switch works", async ({
  page,
}) => {
  let requested = false;
  await page.route("https://tiles.openfreemap.org/**", async (route) => {
    requested = true;
    await route.fulfill({
      json: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#08111d" },
          },
        ],
      },
    });
  });
  await page.goto("/radar");
  await page.getByRole("button", { name: "Enable online map" }).click();
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect.poll(() => requested).toBe(true);
  await page.getByRole("button", { name: "Use offline map" }).click();
  await expect(page.locator(".land").first()).toBeAttached();
});
test("responsive radar and model inputs remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/forecast");
  await page.getByRole("button", { name: "Predict departure delay" }).click();
  await expect(page.getByLabel("Prediction result")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("unavailable online tiles automatically return to offline geometry", async ({
  page,
}) => {
  await page.route("https://tiles.openfreemap.org/**", (r) =>
    r.fulfill({ status: 503, body: "Unavailable in test" }),
  );
  await page.goto("/radar");
  await page.getByRole("button", { name: "Enable online map" }).click();
  await expect(
    page.getByRole("button", { name: "Enable online map" }),
  ).toBeVisible({ timeout: 20000 });
  await expect(page.locator(".map-warning")).toContainText(
    /unavailable|timed out/,
  );
  await expect(page.locator(".land").first()).toBeAttached();
});

test("Italian guide explains interpretation and limits", async ({ page }) => {
  await page.goto("/guide");
  await expect(
    page.getByRole("heading", { name: "Guida rapida · italiano" }),
  ).toBeVisible();
  await expect(page.locator("main")).toContainText("120 minuti");
  await expect(page.locator("main")).toContainText(
    "non significa accuratezza del 93%",
  );
});

test("model training from the interface finishes and persists a measured report", async ({
  page,
}) => {
  await page.goto("/data");
  await page
    .getByRole("button", { name: "Train and evaluate model", exact: true })
    .click();
  await expect(
    page.getByText("Model and measured validation report saved.", {
      exact: true,
    }),
  ).toBeVisible({ timeout: 45000 });
  await page.reload();
  await expect(page.locator("main")).toContainText("gradient_boosting");
});

test("malformed CSV import is rejected with a visible explanation", async ({
  page,
}) => {
  await page.goto("/data");
  await page.getByLabel("BTS CSV file", { exact: true }).setInputFiles({
    name: "invalid.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("wrong,columns\n1,2\n"),
  });
  await page
    .getByRole("button", { name: "Import BTS CSV locally", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Missing BTS columns");
});

test("valid BTS-schema fixture imports, trains and predicts end to end", async ({
  page,
}) => {
  const lines = [
    "FlightDate,Reporting_Airline,Origin,Dest,CRSDepTime,DepDelay,Cancelled,Diverted,Distance,Flight_Number_Reporting_Airline",
  ];
  for (let d = 0; d < 40; d++)
    for (let j = 0; j < 16; j++) {
      const date = new Date(Date.UTC(2025, 0, 1 + d))
        .toISOString()
        .slice(0, 10);
      lines.push(
        `${date},DL,${j % 2 ? "JFK,ATL" : "ATL,JFK"},${(6 + j) * 100},${((d * 7 + j) % 40) - 5},0,0,760,${100 + j}`,
      );
    }
  await page.goto("/data");
  await page.getByLabel("BTS CSV file", { exact: true }).setInputFiles({
    name: "generated-test-fixture.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(lines.join("\n")),
  });
  await page
    .getByRole("button", { name: "Import BTS CSV locally", exact: true })
    .click();
  await expect(page.getByText(/Imported 640 BTS-schema rows/)).toBeVisible();
  await page
    .getByLabel("Training dataset", { exact: true })
    .selectOption("bts");
  await page
    .getByRole("button", { name: "Train and evaluate model", exact: true })
    .click();
  await expect(
    page.getByText("Model and measured validation report saved.", {
      exact: true,
    }),
  ).toBeVisible({ timeout: 45000 });
  await page.goto("/forecast");
  await page.getByLabel("Trained model", { exact: true }).selectOption("bts");
  await page
    .getByRole("button", { name: "Predict departure delay", exact: true })
    .click();
  await expect(page.getByLabel("Prediction result")).toContainText(
    "BTS IMPORT MODEL",
  );
});
