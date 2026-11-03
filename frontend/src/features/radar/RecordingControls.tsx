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
  const [open, setOpen] = useState(false);
  const r = useApi<Inventory>("/recordings");
  const [label, setLabel] = useState("Observation session");
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
        aria-label="Observation recordings"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          r.reload();
        }}
      >
        {p.recordingId ? "● Recording" : "Record / sessions"}
      </button>
      {open && (
        <div
          className="recording-panel floating-panel"
          aria-label="Observation recording library"
        >
          <div className="floating-heading">
            <h3>Observation sessions</h3>
            <button
              aria-label="Close recording library"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>
          <p>
            Optional local storage of received LIVE snapshots. No background
            collection; keep this app visible. Synthetic frames are never
            recorded.
          </p>
          {p.recordingId ? (
            <button
              onClick={async () => {
                await p.stopRecording();
                r.reload();
              }}
            >
              Stop recording
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
                Session label
                <input
                  aria-label="Recording label"
                  maxLength={80}
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </label>
              <label>
                Automatically expire after
                <select
                  aria-label="Recording retention"
                  value={days}
                  onChange={(e) => setDays(+e.target.value)}
                >
                  {[1, 7, 30].map((d) => (
                    <option key={d} value={d}>
                      {d} day(s)
                    </option>
                  ))}
                </select>
              </label>
              <button disabled={busy || p.mode !== "live"} className="primary">
                Start local LIVE recording
              </button>
              {p.mode !== "live" && (
                <small>Switch to Live ADS-B to record.</small>
              )}
            </form>
          )}
          <p>
            Limit: {r.data?.max_frames ?? 1000} snapshots/session ·{" "}
            {r.data?.max_sessions ?? 20} sessions ·{" "}
            {((r.data?.used_bytes ?? 0) / 1048576).toFixed(1)} / 50 MiB
            compressed frame data. Expired sessions are removed automatically.
          </p>
          <button onClick={r.reload}>Refresh session list</button>
          {r.data?.sessions.map((session) => (
            <div className="session-row" key={session.id}>
              <strong>{session.label}</strong>
              <small>
                {session.frames} frames ·{" "}
                {session.active ? "Open session" : "Stopped"} · created{" "}
                {new Date(session.created_at).toLocaleString()}
              </small>
              <small>
                Expires {new Date(session.expires_at).toLocaleString()} ·{" "}
                {session.stop_reason ?? ""}
              </small>
              <button
                disabled={!session.frames || session.active}
                onClick={() => {
                  p.playRecording(session);
                  setOpen(false);
                }}
              >
                Replay observations
              </button>
              {session.active && session.id !== p.recordingId && (
                <button
                  onClick={async () => {
                    await post(`/recordings/${session.id}/stop`, {});
                    r.reload();
                  }}
                >
                  Close inactive tab's session
                </button>
              )}
              {deleting === session.id ? (
                <div>
                  <p>
                    Delete this recording permanently? Its saved positions
                    cannot be recovered.
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
                    Permanently delete recording
                  </button>
                  <button onClick={() => setDeleting(undefined)}>
                    Cancel deletion
                  </button>
                </div>
              ) : (
                <button onClick={() => setDeleting(session.id)}>
                  Delete recording
                </button>
              )}
            </div>
          ))}
          {(error || r.error || p.recordingNotice) && (
            <p role="alert">{error || r.error || p.recordingNotice}</p>
          )}
        </div>
      )}
    </div>
  );
}
