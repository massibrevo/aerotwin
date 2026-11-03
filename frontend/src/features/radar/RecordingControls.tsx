import { tx, useLocale, numberLocale } from "../../i18n";
import { useState, useEffect } from "react";
import { useApi, post, request } from "../../api";
import type { RadarProps, RecordedSession } from "../../types";
type Inventory = {
  sessions: RecordedSession[];
  used_bytes: number;
  max_bytes: number;
  max_frames: number;
  max_sessions: number;
};
export default function RecordingControls(p: RadarProps) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const r = useApi<Inventory>("/recordings");
  const [label, setLabel] = useState(() => tx("Observation session"));
  useEffect(() => {
    setLabel((current) =>
      ["Observation session", "Sessione di osservazione"].includes(current)
        ? tx("Observation session")
        : current,
    );
  }, [locale]);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string>();
  useEffect(() => {
    if (!open || !p.recordingId) return;
    const timer = setInterval(() => {
      if (!document.hidden) r.reload();
    }, 5000);
    return () => clearInterval(timer);
  }, [open, p.recordingId, r.reload]);
  return (
    <div className="recording-controls">
      <button
        aria-label={tx("Observation recordings")}
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          r.reload();
        }}
      >
        {tx(p.recordingId ? "● Recording" : "Record / sessions")}
      </button>
      {open && (
        <div
          className="recording-panel floating-panel"
          aria-label={tx("Observation recording library")}
        >
          <div className="floating-heading">
            <h3>{tx("Observation sessions")}</h3>
            <button
              aria-label={tx("Close recording library")}
              onClick={() => setOpen(false)}
            >
              {tx("×")}
            </button>
          </div>
          <p>
            {tx(
              "Optional local storage of received LIVE snapshots. No background collection; keep this app visible. Synthetic frames are never recorded.",
            )}
          </p>
          {p.recordingId ? (
            <button
              onClick={async () => {
                await p.stopRecording();
                r.reload();
              }}
            >
              {tx("Stop recording")}
            </button>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                try {
                  await p.startRecording(label, days);
                  r.reload();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                {tx("Session label")}
                <input
                  aria-label={tx("Recording label")}
                  maxLength={80}
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </label>
              <label>
                {tx("Automatically expire after")}
                <select
                  aria-label={tx("Recording retention")}
                  value={days}
                  onChange={(e) => setDays(+e.target.value)}
                >
                  {[1, 7, 30].map((d) => (
                    <option key={d} value={d}>
                      {tx(d)} {tx(" day(s)")}
                    </option>
                  ))}
                </select>
              </label>
              <button disabled={busy || p.mode !== "live"} className="primary">
                {tx("Start local LIVE recording")}
              </button>
              {p.mode !== "live" && (
                <small>{tx("Switch to Live ADS-B to record.")}</small>
              )}
            </form>
          )}
          <p>
            {tx("Limit: ")}
            {tx(r.data?.max_frames ?? 1000)} {tx(" snapshots/session ·")}
            {tx(" ")}
            {tx(r.data?.max_sessions ?? 20)} {tx(" sessions ·")}
            {tx(" ")}
            {tx(((r.data?.used_bytes ?? 0) / 1048576).toFixed(1))}{" "}
            {tx(
              " / 50 MiB compressed frame data. Expired sessions are removed automatically.",
            )}
          </p>
          <button onClick={r.reload}>{tx("Refresh session list")}</button>
          {r.data?.sessions.map((session) => (
            <div className="session-row" key={session.id}>
              <strong>{session.label}</strong>
              <small>
                {tx(session.frames)} {tx(" frames ·")}
                {tx(" ")}
                {tx(session.active ? "Open session" : "Stopped")}{" "}
                {tx(" · created")}
                {tx(" ")}
                {tx(
                  new Date(session.created_at).toLocaleString(numberLocale()),
                )}
              </small>
              <small>
                {tx("Expires ")}
                {tx(
                  new Date(session.expires_at).toLocaleString(numberLocale()),
                )}{" "}
                {tx(" ·")}
                {tx(" ")}
                {tx(session.stop_reason ?? "")}
              </small>
              <button
                disabled={!session.frames || session.active}
                onClick={() => {
                  p.playRecording(session);
                  setOpen(false);
                }}
              >
                {tx("Replay observations")}
              </button>
              {session.active && session.id !== p.recordingId && (
                <button
                  onClick={async () => {
                    await post(`/recordings/${session.id}/stop`, {});
                    r.reload();
                  }}
                >
                  {tx("Close inactive tab's session")}
                </button>
              )}
              {deleting === session.id ? (
                <div>
                  <p>
                    {tx(
                      "Delete this recording permanently? Its saved positions cannot be recovered.",
                    )}
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        if (session.id === p.recordingId)
                          await p.stopRecording();
                        await request(`/recordings/${session.id}`, {
                          method: "DELETE",
                        });
                        p.onRecordingDeleted(session.id);
                        setDeleting(undefined);
                        r.reload();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    {tx("Permanently delete recording")}
                  </button>
                  <button onClick={() => setDeleting(undefined)}>
                    {tx("Cancel deletion")}
                  </button>
                </div>
              ) : (
                <button onClick={() => setDeleting(session.id)}>
                  {tx("Delete recording")}
                </button>
              )}
            </div>
          ))}
          {(error || r.error || p.recordingNotice) && (
            <p role="alert">{tx(error || r.error || p.recordingNotice)}</p>
          )}
        </div>
      )}
    </div>
  );
}
