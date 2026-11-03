import { tx, useLocale } from "../../i18n";
import { useEffect, useRef, useState } from "react";
import { request } from "../../api";
import type { Aircraft, Snapshot } from "../../types";
export default function LiveLookup({
  query,
  onLocate,
}: {
  query: string;
  onLocate: (a: Aircraft) => void;
}) {
  useLocale();
  const [kind, setKind] = useState("callsign");
  const [result, setResult] = useState<Snapshot>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    if (/^[a-f\d]{6}$/i.test(query.trim())) setKind("hex");
  }, [query]);
  useEffect(() => {
    controller.current?.abort();
    setResult(undefined);
    setError("");
    setBusy(false);
    return () => controller.current?.abort();
  }, [query, kind]);
  return (
    <div className="live-lookup">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          controller.current?.abort();
          const current = new AbortController();
          controller.current = current;
          setBusy(true);
          setError("");
          setResult(undefined);
          try {
            const data = await request<Snapshot>(
              `/aircraft/search?kind=${kind}&query=${encodeURIComponent(query.trim())}`,
              { signal: current.signal },
            );
            if (!current.signal.aborted) setResult(data);
          } catch (e) {
            if (!current.signal.aborted) setError((e as Error).message);
          } finally {
            if (!current.signal.aborted) setBusy(false);
          }
        }}
      >
        <select
          aria-label={tx("Live lookup type")}
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="callsign">{tx("Exact callsign")}</option>
          <option value="registration">{tx("Registration")}</option>
          <option value="hex">{tx("ICAO hex")}</option>
        </select>
        <button type="submit" disabled={busy || query.trim().length < 2}>
          {tx(busy ? "Searching…" : "Find worldwide")}
        </button>
      </form>
      <small>{tx("Local filter above · worldwide lookup uses ADSB.lol")}</small>
      {error && <p role="alert">{tx(error)}</p>}
      {result && (
        <div role="status">
          {tx(
            result.status === "unavailable"
              ? result.error
              : result.aircraft.length
                ? `${result.aircraft.length} positioned match(es)`
                : "No positioned match. This does not prove the aircraft is not flying.",
          )}
        </div>
      )}
      {result?.aircraft.slice(0, 20).map((a) => (
        <button
          className="lookup-result"
          key={a.icao24}
          onClick={() => {
            onLocate(a);
            setResult(undefined);
          }}
        >
          <strong>{tx(a.callsign ?? a.icao24.toUpperCase())}</strong>
          <span>
            {tx(a.registration ?? a.icao24.toUpperCase())}{" "}
            {tx(" · position age at receipt")}
            {tx(" ")}
            {tx(Math.round(a.data_age_seconds))}
            {tx("s")}
          </span>
          <small>
            {tx("Observed ")}
            {tx(new Date(a.observed_at_utc).toISOString().slice(11, 19))}
            {tx(" ")}
            {tx("UTC")}
          </small>
          <b>{tx("Locate on radar →")}</b>
        </button>
      ))}
    </div>
  );
}
