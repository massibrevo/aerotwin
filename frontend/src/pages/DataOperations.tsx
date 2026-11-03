import { tx, useLocale, numberLocale } from "../i18n";
import { useEffect, useState } from "react";
import { request, post } from "../api";
import { Panel, State, Badge } from "../components/UI";

interface Job {
  id: string;
  status: string;
  stage: string;
  error?: string;
}
export default function DataOperations({ onChange }: { onChange: () => void }) {
  useLocale();
  const [file, setFile] = useState<File>();
  const [zones, setZones] = useState("{}");
  const [dataset, setDataset] = useState("synthetic");
  const [job, setJob] = useState<Job>();
  const [importing, setImporting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!job || !["queued", "running"].includes(job.status)) return;
    const controller = new AbortController();
    const id = setInterval(
      () =>
        request<Job>("/jobs/" + job.id, { signal: controller.signal })
          .then((j) => {
            setJob(j);
            if (j.status === "succeeded") {
              setNotice("Model and measured validation report saved.");
              onChange();
            }
            if (j.status === "failed") setError(j.error ?? "Training failed");
          })
          .catch((e) => {
            if (e.name !== "AbortError") setError(e.message);
          }),
      1200,
    );
    return () => {
      clearInterval(id);
      controller.abort();
    };
  }, [job?.id, job?.status, onChange]);
  useEffect(() => {
    const id = sessionStorage.getItem("aerotwin:last-training-job");
    if (id)
      request<Job>("/jobs/" + id)
        .then(setJob)
        .catch(() => sessionStorage.removeItem("aerotwin:last-training-job"));
  }, []);
  const training = !!job && ["queued", "running"].includes(job.status);
  return (
    <Panel title={tx("Prepare data & train models")}>
      <p className="muted">
        {tx(
          "Import an official BTS CSV locally, inspect its quality report, then train. No file is sent to an external service. Browser imports are limited to 20 MiB; use the CLI for larger files. Each successful import replaces the active snapshot; previous snapshots remain on disk.",
        )}
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setNotice("");
          if (!file) return;
          if (file.size > 20 * 1024 * 1024) {
            setError("CSV exceeds 20 MiB. Use the CLI for larger files.");
            return;
          }
          try {
            const map = JSON.parse(zones);
            if (!map || Array.isArray(map) || typeof map !== "object")
              throw new Error("Timezone map must be a JSON object");
            setImporting(true);
            const result = await request<{
              rows: number;
              duplicates_removed: number;
            }>(
              "/data/import-bts?timezone_map=" +
                encodeURIComponent(JSON.stringify(map)),
              {
                method: "POST",
                headers: { "Content-Type": "text/csv" },
                body: file,
              },
            );
            setNotice(
              `Imported ${result.rows.toLocaleString(numberLocale())} BTS-schema rows; ${result.duplicates_removed} duplicate rows removed. Previous BTS model must be retrained.`,
            );
            onChange();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setImporting(false);
          }
        }}
      >
        <div className="form-grid">
          <label>
            {tx("BTS CSV file")}
            <input
              aria-label={tx("BTS CSV file")}
              type="file"
              accept=".csv,text/csv"
              required
              onChange={(e) => setFile(e.target.files?.[0])}
            />
          </label>
          <label>
            {tx("Additional airport IANA timezones (JSON)")}
            <textarea
              aria-label={tx("Airport timezone mapping")}
              value={zones}
              onChange={(e) => setZones(e.target.value)}
              rows={3}
              placeholder={tx('{"SFO":"America/Los_Angeles"}')}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={importing || training || starting || !file}
        >
          {tx(
            importing ? "Validating and importing…" : "Import BTS CSV locally",
          )}
        </button>
      </form>
      <div className="controls-bar" style={{ marginTop: 24 }}>
        <label>
          {tx("Training dataset")}
          <select
            aria-label={tx("Training dataset")}
            value={dataset}
            onChange={(e) => setDataset(e.target.value)}
          >
            <option value="synthetic">{tx("Synthetic demo")}</option>
            <option value="bts">{tx("Imported BTS")}</option>
          </select>
        </label>
        <button
          disabled={training || importing || starting}
          onClick={async () => {
            setStarting(true);
            setError("");
            setNotice("");
            try {
              const next = await post<Job>("/models/train", { dataset });
              sessionStorage.setItem("aerotwin:last-training-job", next.id);
              setJob(next);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setStarting(false);
            }
          }}
        >
          {tx(training ? "Training in progress…" : "Train and evaluate model")}
        </button>
      </div>
      {job && (
        <div className="notice" role="status">
          <Badge>{tx(job.status)}</Badge>
          <span>{tx(job.stage)}</span>
          {training && (
            <progress aria-label={tx("Model training in progress")} />
          )}
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          {tx(notice)}
        </div>
      )}
      <State error={error} />
    </Panel>
  );
}
