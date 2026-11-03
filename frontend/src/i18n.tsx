import { useSyncExternalStore } from "react";
import { italian } from "./locales/it";
import { englishGuide } from "./locales/en";
export type Locale = "en" | "it";
const key = "aerotwin:locale";
let locale: Locale = "en";
try {
  if (localStorage.getItem(key) === "it") locale = "it";
} catch {
  /* in-memory choice remains available */
}
const listeners = new Set<() => void>();
const subscribe = (callback: () => void) => {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};
export const getLocale = () => locale;
export const numberLocale = () => (locale === "it" ? "it-IT" : "en-US");
function applyLocale() {
  if (typeof document !== "undefined") document.documentElement.lang = locale;
}
applyLocale();
export function setLocale(next: Locale) {
  if (next !== "it" && next !== "en") return;
  locale = next;
  try {
    localStorage.setItem(key, next);
  } catch {
    /* storage may be disabled */
  }
  applyLocale();
  for (const notify of listeners) notify();
}
export function useLocale() {
  return useSyncExternalStore(subscribe, getLocale, () => "en" as Locale);
}
// Translate presentation strings only. Codes, payloads, formulas and units are unchanged
// unless a complete, reviewed catalog entry explicitly identifies that UI string.
export function translate(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (locale !== "it") {
    const match = englishGuide[normalized];
    return match ? value.replace(value.trim(), match) : value;
  }
  const match = italian[normalized];
  if (match) return value.replace(value.trim(), match);
  for (const [pattern, replacement] of dynamicItalian) {
    if (pattern.test(value)) return value.replace(pattern, replacement);
  }
  return value;
}
export function tx<T>(value: T): T {
  if (typeof value === "string") return translate(value) as T;
  if (Array.isArray(value)) return value.map((item) => tx(item)) as T;
  return value;
}
const dynamicItalian: [RegExp, string][] = [
  [/^Select (.+)$/, "Seleziona $1"],
  [
    /^Offline map: (\d+) of (\d+) aircraft drawn\. Use search to narrow the display\.$/,
    "Mappa offline: disegnati $1 aeromobili su $2. Usa la ricerca per restringere la visualizzazione.",
  ],
  [
    /^(\d+) shared groups · (.+)% of A labels covered$/,
    "$1 gruppi comuni · coperto il $2% delle etichette di A",
  ],
  [
    /^(.+) missing delay labels across (.+) records$/,
    "$1 etichette del ritardo mancanti su $2 record",
  ],
  [/^(\d+) schedule-date blocks$/, "$1 blocchi di date programmate"],
  [/^(-?[\d.,]+) to (-?[\d.,]+) min$/, "da $1 a $2 min"],
  [
    /^(.+) is outside training range (\[.+\])\.$/,
    "$1 fuori dall’intervallo di addestramento $2.",
  ],

  [/^Aircraft (.+)$/, "Aeromobile $1"],
  [/^Remove favourite (.+)$/, "Rimuovi preferito $1"],
  [/^Simulate (.+)$/, "Simula $1"],
  [/^SNAPSHOT \/ (.+)$/, "ISTANTANEA / $1"],
  [/^Proxy: vertical rate (.+)$/, "Indicatore: velocità verticale $1"],
  [/^Median absolute error (.+) min$/, "Errore assoluto mediano $1 min"],
  [/^Replication P10–P90: (.+) min$/, "P10–P90 delle repliche: $1 min"],
  [/^Distance \/ (.+)$/, "Distanza / $1"],
  [/^Stale · (\d+)s since receipt$/, "Non recente · $1 s dalla ricezione"],
  [/^Received (\d+)s ago$/, "Ricevuto $1 s fa"],
  [/^(\d+) positioned match\(es\)$/, "$1 corrispondenze con posizione"],
  [/^ gust (.+)$/, " raffiche $1"],
  [
    /^Street maps support latitude ±85°, longitude ±180°, radius (.+)\.$/,
    "Le mappe stradali supportano latitudine ±85°, longitudine ±180°, raggio $1.",
  ],
  [
    /^Local server returned HTTP (\d+)\. Check that AeroTwin is running at this address\.$/,
    "Il server locale ha restituito HTTP $1. Verifica che AeroTwin sia attivo a questo indirizzo.",
  ],
  [/^Remove (.+) from favourites$/, "Rimuovi $1 dai preferiti"],
  [/^Save (.+) to favourites$/, "Salva $1 nei preferiti"],
  [/^Replay (.+)$/, "Riproduci $1"],
  [/^Delete (.+)$/, "Elimina $1"],
  [/^Page (\d+) of (\d+)$/, "Pagina $1 di $2"],
  [/^(\d+) flights$/, "$1 voli"],
  [
    /^Imported (.+) BTS-schema rows; (\d+) duplicate rows removed\. Previous BTS model must be retrained\.$/,
    "Importate $1 righe in formato BTS; rimossi $2 duplicati. Riaddestrare il precedente modello BTS.",
  ],
];

export function LanguageControl() {
  const current = useLocale();
  return (
    <label className="language-control">
      <span className="sr-only">
        {current === "it" ? "Lingua dell’interfaccia" : "Interface language"}
      </span>
      <select
        aria-label={
          current === "it" ? "Lingua dell’interfaccia" : "Interface language"
        }
        value={current}
        onChange={(event) => setLocale(event.target.value as Locale)}
      >
        <option value="en">English</option>
        <option value="it">Italiano</option>
      </select>
    </label>
  );
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (
      event.key === key &&
      (event.newValue === "it" || event.newValue === "en")
    ) {
      locale = event.newValue;
      applyLocale();
      for (const notify of listeners) notify();
    }
  });
}
