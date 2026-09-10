import { classifyResponse, normalizeConnectionError } from "../network/errors";

export interface OpenAlexProbeResult {
  count: number;
  firstTitle: string;
  fetchedAt: string;
}

export async function probeOpenAlex(
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<OpenAlexProbeResult> {
  try {
    const url = new URL("https://api.openalex.org/works");
    url.searchParams.set("search", "retrieval augmented generation");
    url.searchParams.set("per_page", "1");
    const response = await fetcher(url, {
      signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw classifyResponse(response.status);
    const data = (await response.json()) as {
      meta?: { count?: number };
      results?: Array<{ title?: string }>;
    };
    if (typeof data.meta?.count !== "number" || !data.results?.[0]?.title)
      throw new Error("Invalid OpenAlex response");
    return {
      count: data.meta.count,
      firstTitle: data.results[0].title,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw normalizeConnectionError(error);
  }
}
