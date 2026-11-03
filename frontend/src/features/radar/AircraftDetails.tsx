import { useEffect, useState } from "react";
import { request } from "../../api";
import type { Aircraft } from "../../types";
type Details = {
  aircraft: {
    registration: string | null;
    manufacturer: string | null;
    type: string | null;
    registered_owner: string | null;
    operator_flag_code: string | null;
  } | null;
  route_reference: {
    airports: { icao: string; iata: string | null; name: string | null }[];
    updated_at: string | null;
    verified_for_observation: false;
  } | null;
  retrieved_at: string;
  caveat: string;
};
export default function AircraftDetails({
  aircraft,
  live,
}: {
  aircraft: Aircraft;
  live: boolean;
}) {
  const [data, setData] = useState<Details>();
  const [loading, setLoading] = useState(false);
  const eligible =
    live &&
    aircraft.provider === "ADSB.lol" &&
    /^[a-f\d]{6}$/i.test(aircraft.icao24);
  useEffect(() => {
    if (!eligible) return;
    const abort = new AbortController();
    setLoading(true);
    setData(undefined);
    const callsign =
      aircraft.callsign && /^[a-z\d]{2,12}$/i.test(aircraft.callsign)
        ? `?callsign=${encodeURIComponent(aircraft.callsign)}`
        : "";
    request<Details>(`/aircraft/${aircraft.icao24}/details${callsign}`, {
      signal: abort.signal,
    })
      .then((d) => {
        if (!abort.signal.aborted) setData(d);
      })
      .catch(() => {})
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [eligible, aircraft.icao24, aircraft.callsign]);
  if (!eligible)
    return (
      <p className="reference-note">
        Synthetic aircraft · no real identity or route lookup.
      </p>
    );
  const conflict =
    data?.aircraft?.registration &&
    aircraft.registration &&
    data.aircraft.registration !== aircraft.registration;
  return (
    <section
      className="aircraft-reference"
      aria-label="Aircraft database details"
    >
      <h3>
        Aircraft details{" "}
        <a href="https://hexdb.io/" target="_blank" rel="noreferrer">
          HexDB ↗
        </a>
      </h3>
      {loading ? (
        <p role="status">Loading database reference…</p>
      ) : (
        <>
          {data?.aircraft ? (
            <dl>
              {Object.entries({
                Manufacturer: data.aircraft.manufacturer,
                Model: data.aircraft.type,
                "Registered owner": data.aircraft.registered_owner,
                "Operator code": data.aircraft.operator_flag_code,
                "Database registration": data.aircraft.registration,
              }).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value ?? "Not provided"}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>Aircraft database details unavailable.</p>
          )}
          {conflict && (
            <p role="alert">
              Registration differs from the observation. Treat this database
              identity as uncertain.
            </p>
          )}
          {data?.route_reference ? (
            <div className="route-reference">
              <strong>Unverified route reference</strong>
              <p>
                {data.route_reference.airports
                  .map((a) => a.iata ?? a.icao)
                  .join(" → ")}
              </p>
              <small>
                Database update: {data.route_reference.updated_at ?? "Unknown"}.
                Callsign association; not confirmed for this flight.
              </small>
            </div>
          ) : (
            <p className="reference-note">
              Verified route / schedule: unavailable.
            </p>
          )}
          <p className="reference-note">
            {data?.caveat ??
              "Optional database unavailable; live observations are unaffected."}
          </p>
          {data && (
            <small>
              Retrieved {new Date(data.retrieved_at).toLocaleString()} ·
              database lookup time, not record freshness
            </small>
          )}
        </>
      )}
    </section>
  );
}
