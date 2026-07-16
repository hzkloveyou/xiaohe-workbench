import { describe, expect, it, vi } from "vitest";
import { checkWorkbenchServices } from "../src/features/status/status-api";

describe("service status", () => {
  it("reports one failure without rejecting the whole list", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => String(input).includes("api.080492.xyz") ? new Response("bad", { status: 503 }) : new Response("ok"));
    const result = await checkWorkbenchServices(fetcher);
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "site", state: "up" }),
      expect.objectContaining({ id: "api", state: "down" }),
      expect.objectContaining({ id: "github", state: "up" })
    ]));
  });
});
