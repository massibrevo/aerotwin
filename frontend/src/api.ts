import { useCallback, useEffect, useState } from "react";
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch("/api/v1" + path, init);
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
    setData(undefined);
    setError("");
    request<T>(path)
      .then((v) => {
        if (valid) setData(v);
      })
      .catch((e) => {
        if (valid) setError(e.message);
      });
    return () => {
      valid = false;
    };
  }, [path, revision]);
  return { data, error, reload };
}
