import { tx, useLocale } from "../../i18n";
import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { request } from "../../api";
import type { Aircraft } from "../../types";

type Photo = {
  src: string;
  link: string;
  photographer: string;
  matched_icao24: string;
};
export default function AircraftPhoto({
  aircraft,
  live,
}: {
  aircraft: Aircraft;
  live: boolean;
}) {
  useLocale();
  const eligible =
    live &&
    aircraft.provider === "ADSB.lol" &&
    /^[a-f\d]{6}$/i.test(aircraft.icao24);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(eligible);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!eligible) return;
    const controller = new AbortController();
    request<{ photo: Photo | null }>(`/aircraft/${aircraft.icao24}/photo`, {
      signal: controller.signal,
    })
      .then(({ photo }) => {
        if (
          !controller.signal.aborted &&
          photo?.matched_icao24.toLowerCase() === aircraft.icao24.toLowerCase()
        )
          setPhoto(photo);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [eligible, aircraft.icao24]);
  return (
    <div className="aircraft-photo">
      {photo && !failed ? (
        <>
          <a
            href={photo.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={tx("View aircraft photo on Planespotters.net")}
          >
            <img
              src={photo.src}
              alt={tx(
                `Aircraft ${aircraft.registration ?? aircraft.icao24.toUpperCase()}`,
              )}
              onError={() => setFailed(true)}
              referrerPolicy="no-referrer"
            />
          </a>
          <a
            className="photo-credit"
            href={photo.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            {tx("© ")}
            {tx(photo.photographer)} {tx(" · Planespotters.net ↗")}
          </a>
          <span className="photo-context">
            {tx("Reference photo · matched by ICAO hex")}
          </span>
        </>
      ) : (
        <div className="photo-placeholder" role="status">
          <Camera size={24} />
          <span>
            {tx(
              loading
                ? "Finding aircraft photo…"
                : eligible
                  ? "Aircraft photo unavailable"
                  : aircraft.provider === "ADSB.lol"
                    ? "Photo lookup disabled during recorded playback"
                    : "No real photo for synthetic / replay aircraft",
            )}
          </span>
        </div>
      )}
      <div className="photo-identity">
        <strong>{tx(aircraft.aircraft_type ?? "Type not provided")}</strong>
        <span>
          {tx(aircraft.registration ?? aircraft.icao24.toUpperCase())}
        </span>
      </div>
    </div>
  );
}
