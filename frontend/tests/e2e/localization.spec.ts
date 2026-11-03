import { test, expect } from "@playwright/test";
const routes = [
  ["/", "Il tuo spazio aereo, in prospettiva."],
  ["/radar", "Radar in tempo reale"],
  ["/pulse", "Traffico aeroportuale"],
  ["/history", "Esplora storico"],
  ["/forecast", "Laboratorio previsioni"],
  ["/analytics", "Analisi e statistiche"],
  ["/airports", "Esplora aeroporti"],
  ["/network", "Simulatore di disservizi"],
  ["/data", "Dati ed esperimenti"],
  ["/about", "Metodologia"],
  ["/guide", "Guida all’uso"],
  ["/math", "Metodi matematici"],
];
test("Italian persists through every page, reload, command navigation and mobile layouts", async ({
  page,
}) => {
  await page.route("**/api/v1/airports/*/weather", (route) =>
    route.fulfill({
      json: {
        status: "unavailable",
        reason: "Weather provider unavailable or invalid response",
        observation: null,
      },
    }),
  );
  await page.goto("/");
  await page
    .getByRole("combobox", { name: "Interface language" })
    .selectOption("it");
  for (const [path, title] of routes) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("lang", "it");
    // The radar deliberately hides the shared heading to maximise map area.
    if (path !== "/radar")
      await expect(
        page.getByRole("heading", { name: title, level: 1 }),
      ).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Lingua dell’interfaccia" }),
    ).toHaveValue("it");
    if (path === "/airports")
      await expect(
        page.getByLabel("Dettagli di riferimento aeroporto"),
      ).toContainText("Orientamenti veri");
  }
  await page
    .getByRole("button", { name: "Cerca nell’app", exact: true })
    .click();
  await page
    .getByPlaceholder("Cerca una pagina o un’azione…")
    .fill("Esplora aeroporti");
  await page
    .getByRole("option")
    .filter({ hasText: "Esplora aeroporti" })
    .click();
  await expect(page).toHaveURL(/\/airports$/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Esplora aeroporti", level: 1 }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/airports", "/analytics", "/radar", "/math"]) {
    await page.goto(path);
    await expect(
      page.getByRole("combobox", { name: "Lingua dell’interfaccia" }),
    ).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  }
});
test("changing language preserves radar aircraft and unit choice and updates accessible controls", async ({
  page,
}) => {
  await page.goto("/radar");
  await page
    .getByRole("button", { name: /SYN101/ })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: "SYN101" })).toBeVisible();
  await page.getByRole("switch", { name: "Metric units", exact: true }).check();
  await page
    .getByRole("combobox", { name: "Interface language" })
    .selectOption("it");
  await expect(page.getByRole("heading", { name: "SYN101" })).toBeVisible();
  await expect(
    page.getByRole("switch", { name: "Unità metriche", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByText("OSSERVAZIONE AEROMOBILE", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Registrazioni delle osservazioni",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Avvia registrazione locale IN DIRETTA" }),
  ).toBeDisabled();
  await page
    .getByRole("combobox", { name: "Lingua dell’interfaccia" })
    .selectOption("en");
  await expect(page.getByRole("heading", { name: "SYN101" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start local LIVE recording" }),
  ).toBeDisabled();
});
test("existing API errors translate without reissuing a request", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/v1/analytics/**", (route) => {
    requests++;
    return route.fulfill({
      status: 400,
      json: {
        detail:
          "Periods must be ordered and non-overlapping: A start ≤ A end < B start ≤ B end",
      },
    });
  });
  await page.goto("/analytics");
  await expect(page.getByRole("alert")).toContainText(
    "Periods must be ordered",
  );
  const before = requests;
  await page
    .getByRole("combobox", { name: "Interface language" })
    .selectOption("it");
  await expect(page.getByRole("alert")).toContainText(
    "I periodi devono essere ordinati",
  );
  expect(requests).toBe(before);
});
