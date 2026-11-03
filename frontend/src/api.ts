import { useCallback, useEffect, useState } from "react";
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let r: Response;
  try {
    r = await fetch("/api/v1" + path, init);
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new Error("Local server unreachable. Start AeroTwin and retry.");
  }
  const type = r.headers?.get("content-type") ?? "application/json";
  if (!type.includes("application/json"))
    throw new Error(
      `Local server returned HTTP ${r.status}. Check that AeroTwin is running at this address.`,
    );
  const data = await r.json();
  if (!r.ok)
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : JSON.stringify(data.detail ?? data),
    );
  return data;
}
export function post<T>(path: string, data: unknown) {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
export function useApi<T>(path: string) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((x) => x + 1), []);
  useEffect(() => {
    let valid = true;
    const controller = new AbortController();
    setData(undefined);
    setError("");
    request<T>(path, { signal: controller.signal })
      .then((v) => {
        if (valid) setData(v);
      })
      .catch((e) => {
        if (valid && e.name !== "AbortError") setError(e.message);
      });
    return () => {
      valid = false;
      controller.abort();
    };
  }, [path, revision]);
  return { data, error, reload };
}
