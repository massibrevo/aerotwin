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
  await page
    .getByRole("button", { name: "Use offline map", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Select SYN101", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Select SYN101", exact: true })
    .click();
  await expect(page.getByLabel("Aircraft inspector")).toContainText(/a00000/i);
  await page.getByRole("button", { name: "All aircraft", exact: true }).click();
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
  await page
    .getByRole("button", { name: "Use offline map", exact: true })
    .click();
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
  if (
    await page
      .getByRole("button", { name: "Enable online map", exact: true })
      .isVisible()
  )
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
  if (
    await page
      .getByRole("button", { name: "Enable online map", exact: true })
      .isVisible()
  )
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

test("command navigation and theme are functional and persistent", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Search workspace", exact: true })
    .click();
  await page.getByPlaceholder("Find a page or action…").fill("Forecast lab");
  await page.getByRole("option", { name: /Forecast lab/ }).click();
  await expect(page).toHaveURL(/\/forecast$/);
  await page
    .getByRole("button", { name: "Switch to dark theme", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .getByRole("button", { name: "Switch to light theme", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("radar filters, follow, display controls and narrow layout work", async ({
  page,
}) => {
  await page.goto("/radar");
  await page
    .getByRole("button", { name: "Use offline map", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Aircraft filters", exact: true })
    .click();
  await page.getByLabel("Minimum altitude", { exact: true }).press("End");
  await expect(page.locator(".aircraft-row")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(page.locator(".aircraft-row")).toHaveCount(42);
  await page
    .getByRole("button", { name: "Select SYN101", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Follow aircraft", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Following", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Next frame", exact: true }).click();
  await expect(page.getByLabel("Aircraft inspector")).toContainText("SYN101");
  await page.getByRole("button", { name: "Expand radar", exact: true }).click();
  await expect(page.locator(".radar-workspace")).toHaveClass(/radar-expanded/);
  await page.keyboard.press("Escape");
  await expect(page.locator(".radar-workspace")).not.toHaveClass(
    /radar-expanded/,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel("Aircraft inspector")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("switching to live clears demo aircraft and shows a connecting state", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  await page.route("**/api/v1/aircraft?**", async (route) => {
    if (new URL(route.request().url()).searchParams.get("mode") !== "live")
      return route.continue();
    await gate;
    await route.fulfill({
      json: {
        mode: "live",
        status: "unavailable",
        source: "ADSB.lol",
        aircraft: [],
        received_at: null,
        error: "Test live outage",
        retry_after_seconds: 60,
        attribution: "ADSB.lol",
      },
    });
  });
  await page.goto("/radar");
  await page
    .getByRole("button", { name: "Use offline map", exact: true })
    .click();
  await expect(page.locator(".aircraft")).toHaveCount(42);
  try {
    await page.getByRole("button", { name: "Live ADS-B", exact: true }).click();
    await expect(page.locator(".topbar")).toContainText("CONNECTING");
    await expect(page.locator(".aircraft")).toHaveCount(0);
  } finally {
    release();
  }
  await expect(page.locator(".topbar")).toContainText("LIVE UNAVAILABLE");
});

test("real aircraft photo has source credit and handles an image failure", async ({
  page,
}) => {
  let lookups = 0;
  await page.route("**/api/v1/aircraft/*/photo", async (route) => {
    lookups++;
    await route.fulfill({
      json: {
        status: "available",
        photo: {
          src: "https://t.plnspttrs.net/test.jpg",
          link: "https://www.planespotters.net/photo/1/test",
          photographer: "Test Photographer",
          matched_icao24: "0200ea",
        },
      },
    });
  });
  await page.route("https://t.plnspttrs.net/test.jpg", (route) =>
    route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
  await page.route("**/api/v1/aircraft?**", async (route) => {
    if (new URL(route.request().url()).searchParams.get("mode") !== "live")
      return route.continue();
    await route.fulfill({
      json: {
        mode: "live",
        status: "ok",
        source: "ADSB.lol",
        attribution: "ADSB.lol",
        received_at: new Date().toISOString(),
        aircraft: [
          {
            icao24: "0200ea",
            callsign: "RAM964Y",
            registration: "CN-RGG",
            aircraft_type: "B738",
            lat: 41.3,
            lon: 2.1,
            altitude_ft: 12000,
            ground_speed_kt: 250,
            track_deg: 90,
            vertical_rate_fpm: 0,
            ground: false,
            observed_at_utc: new Date().toISOString(),
            received_at_utc: new Date().toISOString(),
            provider: "ADSB.lol",
            data_age_seconds: 0,
          },
        ],
      },
    });
  });
  await page.goto("/radar");
  await page
    .getByRole("button", { name: "Use offline map", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Select SYN101", exact: true })
    .click();
  await expect(
    page.getByText("No real photo for synthetic / replay aircraft"),
  ).toBeVisible();
  expect(lookups).toBe(0);
  await page.getByRole("button", { name: "Live ADS-B", exact: true }).click();
  await page
    .getByRole("button", { name: "Select RAM964Y", exact: true })
    .click();
  const image = page.getByRole("img", { name: "Aircraft CN-RGG", exact: true });
  await expect(image).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Test Photographer/ }),
  ).toHaveAttribute("href", "https://www.planespotters.net/photo/1/test");
  await image.evaluate((img) => img.dispatchEvent(new Event("error")));
  await expect(
    page.getByText("Aircraft photo unavailable", { exact: true }),
  ).toBeVisible();
});

test("units convert instantly, preserve selection and filters, and persist across pages", async ({
  page,
}) => {
  await page.goto("/radar");
  await page
    .getByRole("button", { name: "Use offline map", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Select SYN101", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Follow aircraft", exact: true })
    .click();
  const inspector = page.getByLabel("Aircraft inspector");
  await expect(inspector.locator(".flight-metrics")).toContainText("2,000");
  await page
    .getByRole("button", { name: "Display units", exact: true })
    .click();
  await page.getByRole("button", { name: "Metric units", exact: true }).click();
  await page
    .getByRole("button", { name: "Close display units", exact: true })
    .click();
  await expect(inspector).toContainText("SYN101");
  await expect(inspector.locator(".flight-metrics")).toContainText("610");
  await expect(inspector.locator(".flight-metrics")).toContainText("333");
  await expect(inspector.locator(".flight-metrics")).toContainText("km/h");
  await expect(
    page.getByRole("button", { name: "Following", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".location-radius")).toContainText("185");
  await page.getByRole("button", { name: "All aircraft", exact: true }).click();
  await page
    .getByRole("button", { name: "Aircraft filters", exact: true })
    .click();
  const min = page.getByLabel("Minimum altitude", { exact: true });
  await min.press("ArrowRight");
  await expect(min).toHaveAttribute("aria-valuetext", "305 m");
  const filteredCount = await page.locator(".aircraft-row").count();
  await page
    .getByRole("button", { name: "Display units", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Aviation units", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Close display units", exact: true })
    .click();
  await expect(min).toHaveAttribute("aria-valuetext", "1,000 ft");
  await expect(page.locator(".aircraft-row")).toHaveCount(filteredCount);
  await page
    .getByRole("button", { name: "Display units", exact: true })
    .click();
  await page.getByRole("button", { name: "Metric units", exact: true }).click();
  await page
    .getByRole("button", { name: "Close display units", exact: true })
    .click();
  await page.reload();
  await page
    .getByRole("button", { name: "Display units", exact: true })
    .click();
  await expect(page.getByLabel("altitude units", { exact: true })).toHaveValue(
    "m",
  );
  await expect(page.getByLabel("speed units", { exact: true })).toHaveValue(
    "km/h",
  );
  await page
    .getByRole("button", { name: "Close display units", exact: true })
    .click();
  await page.getByRole("link", { name: "Control tower", exact: true }).click();
  await expect(page.locator(".profile-row")).toContainText([
    "Above 9,144 m",
    "Below 3,048 m",
  ]);
  await page.getByRole("link", { name: "Forecast lab", exact: true }).click();
  await expect(page.getByText("Distance / km", { exact: true })).toBeVisible();
  await page.getByLabel("Forecast distance", { exact: true }).fill("160.9344");
  const predictionRequest = page.waitForRequest(
    (r) => r.url().includes("/api/v1/predict") && r.method() === "POST",
  );
  await page
    .getByRole("button", { name: "Predict departure delay", exact: true })
    .click();
  expect((await predictionRequest).postDataJSON().distance).toBeCloseTo(100, 8);
  await expect(page.getByLabel("Prediction result")).toContainText(
    "Nominal 90%",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Display units", exact: true })
    .click();
  await expect(page.getByLabel("Display unit settings")).toBeVisible();
  await page
    .getByRole("button", { name: "Close units settings", exact: true })
    .hover({ position: { x: 2, y: 2 } });
  await expect(
    page.getByRole("button", { name: "Close units settings", exact: true }),
  ).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
