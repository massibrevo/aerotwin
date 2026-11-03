import { test, expect } from "@playwright/test";
const now = new Date().toISOString();
const plane = (i = 0) => ({
  icao24: i.toString(16).padStart(6, "0"),
  callsign: `TEST${i}`,
  registration: `TEST-${i}`,
  aircraft_type: "B738",
  lat: 41.297,
  lon: 2.078,
  ground: false,
  altitude_ft: 12000,
  ground_speed_kt: 250,
  track_deg: 90,
  vertical_rate_fpm: 0,
  observed_at_utc: now,
  received_at_utc: now,
  provider: "ADSB.lol",
  data_age_seconds: 0,
});
const snap = (aircraft: object[]) => ({
  mode: "live",
  status: "live",
  source: "ADSB.lol",
  attribution: "ADSB.lol · ODbL",
  aircraft,
  received_at: now,
});

test("crowded traffic uses GPU icons and bounded list/offline rendering", async ({
  page,
}) => {
  await page.route("https://tiles.openfreemap.org/**", (route) =>
    route.fulfill({ json: { version: 8, sources: {}, layers: [] } }),
  );
  await page.route("**/api/v1/aircraft?**", (route) =>
    new URL(route.request().url()).searchParams.get("mode") === "live"
      ? route.fulfill({
          json: snap(Array.from({ length: 1200 }, (_, i) => plane(i))),
        })
      : route.continue(),
  );
  await page.goto("/radar");
  await page.getByRole("button", { name: "Live ADS-B", exact: true }).click();
  await expect(page.locator(".online-map")).toHaveAttribute(
    "data-map-ready",
    "true",
  );
  await expect(page.locator(".radar-map")).toHaveAttribute(
    "data-renderer",
    "webgl",
  );
  await expect(page.locator(".map-aircraft")).toHaveCount(0);
  await expect(page.locator(".aircraft-row")).toHaveCount(200);
  await page.getByRole("button", { name: /Show next 200 aircraft/ }).click();
  await expect(page.locator(".aircraft-row")).toHaveCount(400);
  await page
    .getByRole("button", { name: "Use offline map", exact: true })
    .click();
  await expect(page.locator(".svg-aircraft")).toHaveCount(500);
  await expect(
    page.getByText(/Offline map: 500 of 1200 aircraft drawn/),
  ).toBeVisible();
  await page.getByLabel("Search aircraft", { exact: true }).fill("TEST1199");
  await expect(page.locator(".aircraft-row")).toHaveCount(1);
  await page.locator(".aircraft-row").click();
  await expect(page.getByLabel("Aircraft inspector")).toContainText("TEST1199");
});

test("recording is opt-in, playback is historical and deletion is explicit", async ({
  page,
}) => {
  const key = "a".repeat(32);
  let session: any;
  let frames: any[] = [];
  let liveCalls = 0;
  await page.route("**/api/v1/recordings", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      session = {
        id: key,
        label: body.label,
        frames: 0,
        active: true,
        bytes: 0,
        created_at: now,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        query: { lat: 41.297, lon: 2.078, radius_nm: 100 },
        stop_reason: null,
      };
      return route.fulfill({ json: { id: key, query: session.query } });
    }
    return route.fulfill({
      json: {
        sessions: session ? [session] : [],
        used_bytes: 0,
        max_bytes: 52428800,
        max_frames: 1000,
        max_sessions: 20,
      },
    });
  });
  await page.route(`**/api/v1/recordings/${key}/stop`, (route) => {
    session.active = false;
    return route.fulfill({ json: { status: "stopped" } });
  });
  await page.route(`**/api/v1/recordings/${key}`, (route) => {
    session = undefined;
    return route.fulfill({ json: { status: "deleted" } });
  });
  await page.route(`**/api/v1/recordings/${key}/frames?**`, (route) => {
    const index = Number(
      new URL(route.request().url()).searchParams.get("index"),
    );
    return route.fulfill({
      json: {
        ...frames[index],
        mode: "recorded",
        status: "recorded",
        source: "RECORDED ADSB.lol · NOT LIVE",
        frame: index,
        frame_count: frames.length,
      },
    });
  });
  await page.route("**/api/v1/aircraft?**", (route) => {
    const u = new URL(route.request().url());
    if (u.searchParams.get("mode") !== "live") return route.continue();
    liveCalls++;
    const data: any = snap([plane()]);
    if (u.searchParams.get("recording_id") && session?.active) {
      data.received_at = new Date(
        Date.parse(now) + frames.length * 30000,
      ).toISOString();
      frames.push({ ...data });
      session.frames = frames.length;
      data.recording_state = { status: "recording", frames: frames.length };
    }
    return route.fulfill({ json: data });
  });
  await page.goto("/radar");
  await page
    .getByRole("button", { name: "Use offline map", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Observation recordings", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Start local LIVE recording",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Close recording library", exact: true })
    .click();
  await page.getByRole("button", { name: "Live ADS-B", exact: true }).click();
  await page
    .getByRole("button", { name: "Observation recordings", exact: true })
    .click();
  await page.getByLabel("Recording label").fill("Test saved observations");
  await page
    .getByRole("button", { name: "Start local LIVE recording", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Stop recording", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Refresh now", exact: true }).click();
  await expect.poll(() => frames.length).toBeGreaterThanOrEqual(2);
  await page
    .getByRole("button", { name: "Stop recording", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Replay observations", exact: true })
    .click();
  await expect(page.locator(".topbar")).toContainText("RECORDED · NOT LIVE");
  const after = liveCalls;
  await page.getByRole("button", { name: "Next frame", exact: true }).click();
  await expect(page.getByLabel("Replay frame", { exact: true })).toHaveValue(
    "1",
  );
  await page.getByLabel("Recorded playback speed").selectOption("500");
  await page.getByLabel("Replay frame", { exact: true }).press("Home");
  await page
    .getByRole("button", { name: "Play recorded session", exact: true })
    .click();
  await expect(page.getByLabel("Replay frame", { exact: true })).toHaveValue(
    "1",
  );
  await expect(
    page.getByRole("button", { name: "Play recorded session", exact: true }),
  ).toBeVisible();
  expect(liveCalls).toBe(after);
  await page
    .getByRole("button", { name: "Observation recordings", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete recording", exact: true })
    .click();
  await expect(
    page.getByText(
      "Delete this recording permanently? Its saved positions cannot be recovered.",
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Permanently delete recording", exact: true })
    .click();
  await expect(page.locator(".topbar")).toContainText("SYNTHETIC DEMO");
});

test("airport runway/weather units and mathematical documentation are accessible", async ({
  page,
}) => {
  await page.route("**/api/v1/airports/*/weather", (route) =>
    route.fulfill({
      json: {
        status: "available",
        station: "LEBL",
        observation: {
          observed_at: now,
          raw: "METAR LEBL test observation",
          temperature_c: 14,
          dewpoint_c: 9,
          wind_direction: 320,
          wind_speed_kt: 8,
          wind_gust_kt: null,
          pressure_hpa: 1016,
          visibility_sm: 6,
          visibility_lower_bound: true,
          flight_category: "VFR",
        },
      },
    }),
  );
  await page.goto("/airports");
  await expect(page.getByLabel("Airport reference details")).toContainText(
    "Europe/Madrid",
  );
  await expect(
    page.getByRole("heading", { name: "Runway reference", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Airport weather observation")).toContainText(
    "8 kt",
  );
  await page.getByRole("switch", { name: "Metric units", exact: true }).click();
  await expect(page.getByLabel("Airport weather observation")).toContainText(
    "15 km/h",
  );
  await page.getByLabel("Airport search", { exact: true }).fill("Heathrow");
  await page
    .getByRole("button", { name: "Search airports", exact: true })
    .click();
  await expect(page.locator(".airport-results")).toContainText("LHR");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/math");
  await expect(
    page.getByRole("heading", { name: "Mathematical methods", level: 1 }),
  ).toBeVisible();
  await expect(
    page.locator(".math-equation").filter({ hasText: "Wilson" }),
  ).toContainText("p̂");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
