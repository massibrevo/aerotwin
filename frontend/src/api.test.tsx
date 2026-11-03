import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { post, request, useApi } from "./api";
afterEach(() => {
  vi.unstubAllGlobals();
});
describe("API contract", () => {
  it("sends actual JSON prediction inputs", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ prediction_minutes: 17.2 }),
    });
    vi.stubGlobal("fetch", fetcher);
    expect(await post("/predict", { hour: 18 })).toEqual({
      prediction_minutes: 17.2,
    });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/v1/predict",
      expect.objectContaining({ method: "POST", body: '{"hour":18}' }),
    );
  });
  it("surfaces backend errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: "No trained model" }),
      }),
    );
    await expect(request("/predict")).rejects.toThrow("No trained model");
  });
  it("refreshes when data filters change", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((path: string) =>
        Promise.resolve({ ok: true, json: async () => ({ path }) }),
      ),
    );
    const h = renderHook(({ path }) => useApi<{ path: string }>(path), {
      initialProps: { path: "/historical/flights?origin=ATL" },
    });
    await waitFor(() => expect(h.result.current.data?.path).toContain("ATL"));
    h.rerender({ path: "/historical/flights?origin=JFK" });
    await waitFor(() => expect(h.result.current.data?.path).toContain("JFK"));
  });
});

it('explains a disconnected local server',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
 await expect(request('/health')).rejects.toThrow('Local server unreachable');
});
it('does not try parsing an HTML proxy error as JSON',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:502,headers:new Headers({'Content-Type':'text/html'})}));
 await expect(request('/health')).rejects.toThrow('HTTP 502');
});
