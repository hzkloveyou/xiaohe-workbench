export interface LinkPreview {
  title?: string;
  description?: string;
  siteName?: string;
}

export async function fetchLinkPreview(
  url: string,
  fetcher: typeof fetch = fetch,
  baseUrl = import.meta.env.VITE_API_URL ?? "https://api.080492.xyz"
): Promise<LinkPreview> {
  const response = await fetcher(`${baseUrl}/v1/preview`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url })
  });
  if (!response.ok) throw new Error("网页信息暂时无法读取");
  return response.json() as Promise<LinkPreview>;
}
