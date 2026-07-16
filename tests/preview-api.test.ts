import { describe, expect, it, vi } from "vitest";
import { fetchLinkPreview } from "../src/features/inbox/preview-api";

describe("preview API client", () => {
  it("uses the production route without a trailing slash", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ title: "Example Domain" })));
    await expect(fetchLinkPreview("https://example.com", fetcher, "https://api.080492.xyz")).resolves.toEqual({ title: "Example Domain" });
    expect(fetcher).toHaveBeenCalledWith("https://api.080492.xyz/v1/preview", expect.objectContaining({ method: "POST" }));
  });
});
