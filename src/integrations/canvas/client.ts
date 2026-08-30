import { canvasResponseError } from "./errors";

export interface CanvasClientConfig {
  baseUrl: string;
  accessToken: string;
  timeoutMs?: number;
}

export class CanvasClient {
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly timeoutMs: number;

  constructor(config: CanvasClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.accessToken = config.accessToken;
    this.timeoutMs = config.timeoutMs ?? 12_000;
  }

  async get<T>(path: string, params: Record<string, string | string[]> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}/api/v1/${path.replace(/^\//, "")}`);
    appendSearchParams(url, params);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
      signal: AbortSignal.timeout(this.timeoutMs),
      cache: "no-store",
    });
    if (!response.ok) throw canvasResponseError(response.status);
    return (await response.json()) as T;
  }

  async getAll<T>(path: string, params: Record<string, string | string[]> = {}): Promise<T[]> {
    const results: T[] = [];
    let url: URL | undefined = new URL(`${this.baseUrl}/api/v1/${path.replace(/^\//, "")}`);
    appendSearchParams(url, { per_page: "100", ...params });

    while (url) {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
        signal: AbortSignal.timeout(this.timeoutMs),
        cache: "no-store",
      });
      if (!response.ok) throw canvasResponseError(response.status);
      const page = (await response.json()) as T[];
      results.push(...page);
      url = nextPageUrl(response.headers.get("link"));
    }
    return results;
  }
}

function appendSearchParams(
  url: URL,
  params: Record<string, string | string[]>,
): void {
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(key, item);
    } else {
      url.searchParams.set(key, value);
    }
  }
}

function nextPageUrl(linkHeader: string | null): URL | undefined {
  if (!linkHeader) return undefined;
  const next = linkHeader
    .split(",")
    .map((part) => part.trim())
    .find((part) => part.endsWith('rel="next"'));
  const match = next?.match(/<([^>]+)>/);
  return match?.[1] ? new URL(match[1]) : undefined;
}
