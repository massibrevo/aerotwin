import { test, expect } from "@playwright/test";

test("favourites persist without positions and synthetic identities stay explicit", async ({
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
    .getByRole("button", { name: "Save aircraft to favourites", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Remove aircraft from favourites",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByText("Synthetic aircraft · no real identity or route lookup."),
  ).toBeVisible();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("aerotwin:favourites")!),
  );
  expect(stored[0].mode).toBe("demo");
  expect(stored[0]).not.toHaveProperty("lat");
  await page.reload();
  await page
    .getByRole("button", { name: "Favourites (1)", exact: true })
    .click();
  await expect(page.getByLabel("Saved aircraft")).toContainText("SYN101");
  await expect(
    page.getByLabel("Traffic in coverage").locator(".aircraft-photo"),
  ).toHaveCount(0);
  await expect(page.getByLabel("Saved aircraft")).toContainText("DEMO");
  await page
    .getByRole("button", { name: "Inspect saved aircraft", exact: true })
    .click();
  await expect(page.getByLabel("Aircraft inspector")).toContainText("SYN101");
  await page
    .getByRole("button", {
      name: "Remove aircraft from favourites",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "All aircraft", exact: true }).click();
  await expect(
    page.getByLabel("Traffic in coverage").locator(".aircraft-photo"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Favourites (0)", exact: true }),
  ).toBeVisible();
});

test("registration search, worldwide locate and sourced aircraft details are functional", async ({
  page,
}) => {
  const now = new Date().toISOString();
  const within = {
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
    observed_at_utc: now,
    received_at_utc: now,
    provider: "ADSB.lol",
    data_age_seconds: 0,
  };
  const remote = {
    ...within,
    icao24: "406123",
    callsign: "BAW123",
    registration: "G-TEST",
    lat: 51.47,
    lon: -0.45,
  };
  const snapshot = (aircraft: object[]) => ({
    mode: "live",
    status: "live",
    source: "ADSB.lol",
    attribution: "ADSB.lol",
    received_at: now,
    aircraft,
  });
  let searched = "";
  await page.route("**/api/v1/aircraft?**", (route) => {
    const u = new URL(route.request().url());
    return u.searchParams.get("mode") === "live"
      ? route.fulfill({
          json: snapshot([
            Number(u.searchParams.get("lat")) > 50 ? remote : within,
          ]),
        })
      : route.continue();
  });
  await page.route("**/api/v1/aircraft/search?**", (route) => {
    searched = route.request().url();
    return route.fulfill({ json: snapshot([remote]) });
  });
  await page.route("**/api/v1/aircraft/*/photo", (route) =>
    route.fulfill({ json: { status: "not_found", photo: null } }),
  );
  await page.route("**/api/v1/aircraft/*/details**", (route) =>
    route.fulfill({
      json: {
        source: "HexDB",
        retrieved_at: now,
        caveat: "Database reference only. Route not verified for this flight.",
        aircraft: {
          registration: "G-TEST",
          manufacturer: "Boeing",
          type: "737 reference",
          registered_owner: "Example registered owner",
          operator_flag_code: "BAW",
        },
        route_reference: {
          airports: [
            { icao: "EGLL", iata: "LHR", name: "Heathrow" },
            { icao: "KJFK", iata: "JFK", name: "John F Kennedy" },
          ],
          updated_at: "2014-04-20T11:02:19Z",
          verified_for_observation: false,
        },
      },
    }),
  );
  await page.goto("/radar");
  await page
    .getByRole("button", { name: "Use offline map", exact: true })
    .click();
  await page.getByRole("button", { name: "Live ADS-B", exact: true }).click();
  await page.getByLabel("Search aircraft", { exact: true }).fill("CN-RGG");
  await expect(page.locator(".aircraft-row")).toHaveCount(1);
  await expect(page.locator(".aircraft-row")).toContainText("RAM964Y");
  await page.getByLabel("Search aircraft", { exact: true }).fill("G-TEST");
  await page.getByLabel("Live lookup type").selectOption("registration");
  await page
    .getByRole("button", { name: "Find worldwide", exact: true })
    .click();
  await expect(page.locator(".lookup-result")).toContainText("BAW123");
  expect(new URL(searched).searchParams.get("kind")).toBe("registration");
  await page.locator(".lookup-result").click();
  await expect(page.getByLabel("Aircraft inspector")).toContainText("BAW123");
  const details = page.getByLabel("Aircraft database details");
  await expect(details).toContainText("Example registered owner");
  await expect(details).toContainText("Unverified route reference");
  await expect(details).toContainText("2014-04-20");
  await page
    .getByRole("button", { name: "Save aircraft to favourites", exact: true })
    .click();
  await page.getByRole("button", { name: "All aircraft", exact: true }).click();
  await page
    .getByRole("button", { name: "Favourites (1)", exact: true })
    .click();
  await expect(page.getByLabel("Saved aircraft")).toContainText("LIVE");
  await page.reload();
  await page.getByRole("button", { name: "Live ADS-B", exact: true }).click();
  await page
    .getByRole("button", { name: "Favourites (1)", exact: true })
    .click();
  await expect(page.getByLabel("Saved aircraft")).toContainText(
    "Not in current snapshot",
  );
  await page
    .getByRole("button", { name: "Find live position", exact: true })
    .click();
  await expect(page.getByLabel("Live lookup type")).toHaveValue("hex");
  await page
    .getByRole("button", { name: "Find worldwide", exact: true })
    .click();
  await expect(page.locator(".lookup-result")).toContainText("BAW123");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("analytics compares non-overlapping periods, exports provenance, and handles bad dates", async ({
  page,
}) => {
  await page.goto("/analytics");
  const results = page.getByLabel("Schedule analytics results");
  await expect(
    page.getByText("SYNTHETIC EXAMPLES", { exact: true }),
  ).toBeVisible();
  await expect(results).toContainText("Period scorecard");
  await page.getByLabel("Comparison grouping").selectOption("origin");
  await page
    .getByRole("button", { name: "Compare periods", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Group comparison · origin",
      exact: true,
    }),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export analysis JSON", exact: true })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(
    "aerotwin-synthetic-comparison.json",
  );
  const startB = await page
    .getByLabel("Comparison b_start", { exact: true })
    .inputValue();
  await page.getByLabel("Comparison a_end", { exact: true }).fill(startB);
  await page
    .getByRole("button", { name: "Compare periods", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("non-overlapping");
  await page
    .getByRole("button", { name: "Reset periods", exact: true })
    .click();
  await expect(results).toContainText("Period scorecard");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("forecast exposes actual sensitivity and measured residual and baseline diagnostics", async ({
  page,
}) => {
  await page.goto("/forecast");
  await expect(page.getByLabel("Extended model diagnostics")).toContainText(
    "Evidence against the baseline",
  );
  await expect(page.getByLabel("Extended model diagnostics")).toContainText(
    "Wilson",
  );
  await page
    .getByRole("button", { name: "Predict departure delay", exact: true })
    .click();
  await expect(page.getByLabel("Per-flight sensitivity")).toContainText(
    "not additive contributions",
  );
  await expect(
    page.getByLabel("Per-flight sensitivity").locator("tbody tr"),
  ).toHaveCount(7);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
