import { expect, test } from "vitest";
import ts from "typescript";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import { italian } from "./locales/it";
import { englishGuide } from "./locales/en";
// Reference names, mathematical symbols, code examples and source credits retain
// their exact spelling in either language. New UI prose must enter the catalog.
const invariant = new Set([
  "AeroTwin",
  "AEROTWIN /",
  "UTC",
  "UTC ·",
  "AT",
  "ESC",
  "MAE",
  "MAE / min",
  "RMSE",
  "hPa",
  "min",
  "LIVE",
  "/ T−120 MIN",
  "data/processed",
  "models",
  "AEROTWIN_HOME",
  "OpenFreeMap · OpenStreetMap data",
  "NOAA/NWS Aviation Weather Center ↗",
  "OpenFlights.org contributors · ODbL",
  "HexDB ↗",
  "· Planespotters.net ↗",
  '{"SFO":"America/Los_Angeles"}',
]);
test("all static presentation strings have reviewed bilingual coverage or explicit invariant status", () => {
  const root = resolve(process.cwd(), "src") + sep;
  const missing = new Set<string>();
  const check = (text: string, file: string) => {
    const value = text.replace(/\s+/g, " ").trim();
    if (
      !/[A-Za-z]{2}/.test(value) ||
      italian[value] ||
      englishGuide[value] ||
      invariant.has(value) ||
      /^AEROTWIN \/ v\d+\.\d+\.\d+$/.test(value) ||
      value.startsWith("python -m aerotwin.cli ")
    )
      return;
    missing.add(`${file}: ${value}`);
  };
  for (const file of readdirSync(root, { recursive: true }) as string[]) {
    if (
      !file.endsWith(".tsx") ||
      /(?:\.test\.|i18n|main\.tsx|test-setup)/.test(file)
    )
      continue;
    const source = ts.createSourceFile(
      file,
      readFileSync(root + file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const visit = (node: ts.Node) => {
      if (ts.isJsxText(node)) check(node.text, file);
      if (
        ts.isCallExpression(node) &&
        node.expression.getText(source) === "tx" &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      )
        check(node.arguments[0].text, file);
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  expect([...missing]).toEqual([]);
});
