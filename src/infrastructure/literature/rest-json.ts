import type { Paper } from "../../../contracts/domain";
import type { LiteratureSourceManifest } from "../../domain/literature-source/literature-source";
import { createSearchCacheKey, type LiteratureAdapter, type LiteratureQuery, type LiteratureSearchOptions, type LiteratureSearchResult, type SearchStatus, validateLiteratureQuery } from "../../domain/search/literature";

const safePath = /^(?:[A-Za-z_][\w-]*)(?:\[\])?(?:\.(?:[A-Za-z_][\w-]*)(?:\[\])?)*$/;
const forbiddenSegments = new Set(["__proto__", "prototype", "constructor"]);

export function validateRestJsonManifest(manifest: LiteratureSourceManifest) {
  if (manifest.adapter.kind !== "rest-json") throw new Error("不是 REST JSON 来源。");
  const base = new URL(manifest.adapter.baseUrl);
  if (base.username || base.password || base.hash || base.search) throw new Error("Base URL 不能包含凭证、查询或片段。");
  if (base.protocol !== "https:" && !(base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname)))
    throw new Error("Custom REST Source 必须使用 HTTPS；本机 localhost 可使用 HTTP。");
  const search = manifest.adapter.search;
  if (!search.path.startsWith("/") || search.path.includes("..") || search.path.includes("://")) throw new Error("Search path 必须是安全的站内绝对路径。");
  for (const path of [search.itemsPath, ...Object.values(search.fields)]) {
    if (!safePath.test(path) || path.split(/[.[\]]+/).some((part) => forbiddenSegments.has(part)))
      throw new Error("REST JSON 字段映射包含不安全路径。");
  }
  if (manifest.auth.kind !== "none" && !manifest.auth.credentialSlot) throw new Error("认证来源必须声明 credentialSlot。");
  if (manifest.auth.kind === "api-key-header" && (!manifest.auth.headerName || ["host", "cookie", "content-length"].includes(manifest.auth.headerName.toLowerCase())))
    throw new Error("API Key Header 名称无效。");
  if (manifest.auth.kind === "query-param" && !manifest.auth.queryParamName) throw new Error("Query param 认证必须声明参数名。");
  return manifest;
}

export class RestJsonLiteratureAdapter implements LiteratureAdapter {
  readonly source: string;
  constructor(private readonly manifest: LiteratureSourceManifest, private readonly options: { fetcher?: typeof fetch; getCredential?: (slot: string) => string | null } = {}) {
    validateRestJsonManifest(manifest);
    this.source = manifest.id;
  }

  async search(query: LiteratureQuery, options: LiteratureSearchOptions, signal: AbortSignal): Promise<LiteratureSearchResult> {
    validateLiteratureQuery(query);
    const manifest = validateRestJsonManifest(this.manifest);
    if (manifest.adapter.kind !== "rest-json") throw new Error("不是 REST JSON 来源。");
    const startedAt = new Date().toISOString();
    const endpoint = new URL(manifest.adapter.search.path, manifest.adapter.baseUrl);
    const parameter = manifest.adapter.search.queryParameter ?? "q";
    const headers: Record<string, string> = { Accept: "application/json" };
    let credential: string | null = null;
    if (manifest.auth.kind !== "none") credential = this.options.getCredential?.(manifest.auth.credentialSlot!) ?? null;
    if (manifest.auth.kind !== "none" && !credential) return failure("source_unavailable", null, endpoint.origin + endpoint.pathname, query, options, this.source, startedAt);
    if (manifest.auth.kind === "api-key-header") headers[manifest.auth.headerName!] = credential!;
    if (manifest.auth.kind === "bearer") headers.Authorization = `Bearer ${credential!}`;
    if (manifest.auth.kind === "query-param") endpoint.searchParams.set(manifest.auth.queryParamName!, credential!);
    let body: string | undefined;
    if (manifest.adapter.search.method === "GET") endpoint.searchParams.set(parameter, query.keywords);
    else { headers["Content-Type"] = "application/json"; body = JSON.stringify({ [parameter]: query.keywords, limit: options.limit }); }
    let status: SearchStatus = "completed";
    let httpStatus: number | null = null;
    let papers: Paper[] = [];
    try {
      const response = await (this.options.fetcher ?? fetch)(endpoint, { method: manifest.adapter.search.method, headers, body, signal, redirect: "error" });
      httpStatus = response.status;
      if (!response.ok) status = response.status === 429 ? "rate_limited" : "source_unavailable";
      else {
        const data: unknown = await response.json();
        const items = readPath(data, manifest.adapter.search.itemsPath);
        if (!Array.isArray(items)) status = "invalid_response";
        else papers = items.slice(0, options.limit).flatMap((item, index) => mapPaper(item, manifest, index));
        if (status === "completed" && !papers.length) status = "empty";
      }
    } catch { status = signal.aborted ? "cancelled" : "source_unavailable"; }
    return makeResult(status, httpStatus, endpoint.origin + endpoint.pathname, query, options, this.source, startedAt, papers);
  }
}

function readPath(value: unknown, path: string): unknown {
  let current = value;
  for (const raw of path.split(".")) {
    const array = raw.endsWith("[]");
    const key = array ? raw.slice(0, -2) : raw;
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
    if (array && !Array.isArray(current)) return undefined;
  }
  return current;
}

function textAt(item: unknown, path?: string) {
  if (!path) return null;
  const value = readPath(item, path);
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : null;
}
function authorsAt(item: unknown, path?: string) {
  if (!path) return [];
  const value = readPath(item, path);
  if (Array.isArray(value)) return value.flatMap((entry) => typeof entry === "string" ? [entry] : entry && typeof entry === "object" && typeof (entry as Record<string, unknown>).name === "string" ? [(entry as Record<string, unknown>).name as string] : []);
  return typeof value === "string" ? value.split(/[,;]/).map((author) => author.trim()).filter(Boolean) : [];
}
function mapPaper(item: unknown, manifest: LiteratureSourceManifest, index: number): Paper[] {
  if (manifest.adapter.kind !== "rest-json") return [];
  const fields = manifest.adapter.search.fields;
  const title = textAt(item, fields.title);
  if (!title) return [];
  const external = textAt(item, fields.externalId);
  const doi = textAt(item, fields.doi)?.toLowerCase();
  const arxiv = textAt(item, fields.arxiv) ?? undefined;
  const year = Number(textAt(item, fields.year));
  return [{
    id: `${manifest.id}:${external || doi || index}:${crypto.randomUUID()}`,
    externalIds: { ...(doi ? { doi } : {}), ...(arxiv ? { arxiv } : {}) },
    title, authors: authorsAt(item, fields.authors), year: Number.isInteger(year) ? year : null,
    venue: textAt(item, fields.venue), url: textAt(item, fields.url) ?? manifest.metadata?.homepage ?? manifest.adapter.baseUrl,
    abstract: textAt(item, fields.abstract), source: manifest.id, fetchedAt: new Date().toISOString(), relatedVersionIds: [],
  }];
}
function makeResult(status: SearchStatus, httpStatus: number | null, endpoint: string, query: LiteratureQuery, options: LiteratureSearchOptions, source: string, startedAt: string, papers: Paper[]): LiteratureSearchResult {
  return { papers, nextCursor: null, record: { id: crypto.randomUUID(), source, query, cacheKey: createSearchCacheKey(source, query, options), status, startedAt, endedAt: new Date().toISOString(), resultCount: papers.length, totalAvailable: null, pagesFetched: status === "completed" ? 1 : 0, diagnostic: { endpoint, httpStatus, rateLimitRemaining: null, rateLimitResetSeconds: null, requestCostUsd: null, errorCode: status === "completed" || status === "empty" ? null : status } } };
}
function failure(status: SearchStatus, httpStatus: number | null, endpoint: string, query: LiteratureQuery, options: LiteratureSearchOptions, source: string, startedAt: string) { return makeResult(status, httpStatus, endpoint, query, options, source, startedAt, []); }
