import { afterEach, expect, test } from "vitest";
import { memo, useState } from "react";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { getLocale, numberLocale, setLocale, tx, useLocale } from "./i18n";
import { unitTools, metric } from "./units";
afterEach(() => {
  cleanup();
  setLocale("en");
});
test("memoised pages change language without losing component state", () => {
  const Card = memo(function Card() {
    useLocale();
    const [value, setValue] = useState("SYN101");
    return (
      <>
        <label>
          {tx("Aircraft details")}
          <input value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        <span>{unitTools(metric).number(1234.5, "altitude", 2)}</span>
      </>
    );
  });
  render(
    <>
      <button onClick={() => setLocale(getLocale() === "en" ? "it" : "en")}>
        Language
      </button>
      <Card />
    </>,
  );
  fireEvent.change(screen.getByLabelText("Aircraft details"), {
    target: { value: "CUSTOM LABEL" },
  });
  fireEvent.click(screen.getByText("Language"));
  expect(screen.getByLabelText("Dettagli aeromobile")).toHaveValue(
    "CUSTOM LABEL",
  );
  expect(document.documentElement.lang).toBe("it");
  expect(localStorage.getItem("aerotwin:locale")).toBe("it");
  expect(screen.getByText("376,28")).toBeVisible();
  fireEvent.click(screen.getByText("Language"));
  expect(screen.getByLabelText("Aircraft details")).toHaveValue("CUSTOM LABEL");
});
test("translation preserves codes, raw payloads, formula symbols and unit conversion", () => {
  setLocale("it");
  const raw = {
    callsign: "RAM964Y",
    metar: "LEBL 031230Z 23008KT CAVOK 18/10 Q1021",
    value: 12000,
  };
  expect(tx(raw)).toBe(raw);
  expect(tx(raw.callsign)).toBe("RAM964Y");
  expect(tx(raw.metar)).toBe(raw.metar);
  expect(tx("MAE = (1/n) Σ |ŷᵢ − yᵢ|")).toBe("MAE = (1/n) Σ |ŷᵢ − yᵢ|");
  expect(unitTools(metric).convert(12000, "altitude")).toBe(3657.6000000000004);
  expect(tx("Received 12s ago")).toBe("Ricevuto 12 s fa");
  expect(tx("Server restarted; recording ended")).toContain("riavviato");
  expect(numberLocale()).toBe("it-IT");
});
test("an unavailable storage backend still permits changing language", () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    Storage.prototype,
    "setItem",
  )!;
  Object.defineProperty(Storage.prototype, "setItem", {
    value() {
      throw new Error("disabled");
    },
    configurable: true,
  });
  try {
    setLocale("it");
    expect(getLocale()).toBe("it");
    expect(tx("Control tower")).toBe("Torre di controllo");
  } finally {
    Object.defineProperty(Storage.prototype, "setItem", descriptor);
  }
});
