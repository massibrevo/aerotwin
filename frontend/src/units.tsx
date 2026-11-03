import { tx, useLocale, numberLocale } from "./i18n";
import { SlidersHorizontal } from "lucide-react";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Dimension =
  "altitude" | "speed" | "distance" | "vertical" | "routeDistance";
export type Units = {
  altitude: "ft" | "m";
  speed: "kt" | "km/h" | "mph";
  distance: "NM" | "km" | "mi";
  vertical: "ft/min" | "m/s";
};
export const aviation: Units = {
  altitude: "ft",
  speed: "kt",
  distance: "NM",
  vertical: "ft/min",
};
export const metric: Units = {
  altitude: "m",
  speed: "km/h",
  distance: "km",
  vertical: "m/s",
};
const choices = {
  altitude: ["ft", "m"],
  speed: ["kt", "km/h", "mph"],
  distance: ["NM", "km", "mi"],
  vertical: ["ft/min", "m/s"],
};
export function validUnits(value: unknown): value is Units {
  return (
    !!value &&
    typeof value === "object" &&
    Object.entries(choices).every(([key, allowed]) =>
      allowed.includes((value as Record<string, string>)[key]),
    )
  );
}
export function unitTools(units: Units) {
  const factor = (kind: Dimension) =>
    ({
      altitude: units.altitude === "m" ? 0.3048 : 1,
      speed:
        units.speed === "km/h"
          ? 1.852
          : units.speed === "mph"
            ? 1852 / 1609.344
            : 1,
      distance:
        units.distance === "km"
          ? 1.852
          : units.distance === "mi"
            ? 1852 / 1609.344
            : 1,
      routeDistance:
        units.distance === "km"
          ? 1.609344
          : units.distance === "NM"
            ? 1609.344 / 1852
            : 1,
      vertical: units.vertical === "m/s" ? 0.3048 / 60 : 1,
    })[kind];
  const label = (kind: Dimension) =>
    units[kind === "routeDistance" ? "distance" : kind];
  const convert = (value: number, kind: Dimension) => value * factor(kind);
  const fromDisplay = (value: number, kind: Dimension) => value / factor(kind);
  const number = (
    value: number | null | undefined,
    kind: Dimension,
    digits = kind === "vertical" && units.vertical === "m/s" ? 1 : 0,
  ) =>
    value == null || !Number.isFinite(value)
      ? "—"
      : convert(value, kind).toLocaleString(numberLocale(), {
          maximumFractionDigits: digits,
        });
  const format = (
    value: number | null | undefined,
    kind: Dimension,
    digits?: number,
  ) => `${number(value, kind, digits)} ${label(kind)}`;
  return { units, label, convert, fromDisplay, number, format };
}
const UnitContext = createContext({
  ...unitTools(aviation),
  setUnits: (_: Units) => {},
});
export function UnitsProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const [units, setValue] = useState<Units>(() => {
    try {
      const stored: unknown = JSON.parse(
        localStorage.getItem("aerotwin:units") ?? "null",
      );
      return validUnits(stored) ? stored : aviation;
    } catch {
      return aviation;
    }
  });
  const value = useMemo(
    () => ({
      ...unitTools(units),
      setUnits: (next: Units) => {
        setValue(next);
        try {
          localStorage.setItem("aerotwin:units", JSON.stringify(next));
        } catch {
          /* Still works in memory if storage is disabled. */
        }
      },
    }),
    [units, locale],
  );
  return (
    <UnitContext.Provider value={value}>{tx(children)}</UnitContext.Provider>
  );
}
export const useUnits = () => useContext(UnitContext);
export function UnitsControl() {
  useLocale();
  const u = useUnits();
  const [open, setOpen] = useState(false);
  const isMetric = (Object.keys(metric) as (keyof Units)[]).every(
    (key) => u.units[key] === metric[key],
  );
  return (
    <div
      className="units-control"
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <button
        className="metric-switch"
        role="switch"
        aria-label={tx("Metric units")}
        aria-checked={isMetric}
        title={tx("Switch live between aviation and metric units")}
        onClick={() => u.setUnits(isMetric ? aviation : metric)}
      >
        <span className="metric-track" aria-hidden="true">
          <i />
        </span>
        <span>{tx("Metric")}</span>
      </button>
      <button
        className="units-toggle"
        aria-label={tx("Display units")}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <SlidersHorizontal size={15} aria-hidden="true" />
        <span>{tx("Units")}</span>
      </button>
      {open && (
        <>
          <button
            className="units-backdrop"
            aria-label={tx("Close units settings")}
            onClick={() => setOpen(false)}
          />
          <div
            className="units-panel"
            role="group"
            aria-label={tx("Display unit settings")}
          >
            <div className="units-heading">
              <strong>{tx("Display units")}</strong>
              <button
                onClick={() => setOpen(false)}
                aria-label={tx("Close display units")}
              >
                {tx("×")}
              </button>
            </div>
            <div className="units-presets">
              <button onClick={() => u.setUnits(aviation)}>
                {tx("Aviation units")}
              </button>
              <button onClick={() => u.setUnits(metric)}>
                {tx("Metric units")}
              </button>
            </div>
            {(Object.keys(choices) as (keyof Units)[]).map((key) => (
              <label key={key}>
                {tx(
                  {
                    altitude: "Altitude",
                    speed: "Speed",
                    distance: "Distance",
                    vertical: "Vertical rate",
                  }[key],
                )}
                <select
                  aria-label={tx(`${key} units`)}
                  value={u.units[key]}
                  onChange={(e) =>
                    u.setUnits({ ...u.units, [key]: e.target.value })
                  }
                >
                  {choices[key].map((unit) => (
                    <option key={unit}>{tx(unit)}</option>
                  ))}
                </select>
              </label>
            ))}
            <p>
              {tx(
                "Updates instantly across the workspace. Saved on this device.",
              )}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
