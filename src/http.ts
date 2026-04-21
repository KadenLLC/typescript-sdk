import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import {
  AuthenticationError,
  ConflictError,
  MaildeskError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  ServerError,
  ValidationError,
} from "./errors";
import type { MaildeskOptions } from "./types";

export const DEFAULT_BASE_URL = "http://localhost:3000";
export const DEFAULT_TIMEOUT_MS = 30_000;

export interface HttpRequest {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}

export class HttpClient {
  private readonly axios: AxiosInstance;

  constructor(opts: MaildeskOptions) {
    if (!opts.apiKey) {
      throw new MaildeskError("apiKey is required");
    }
    this.axios = axios.create({
      baseURL: opts.baseUrl ?? DEFAULT_BASE_URL,
      timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      validateStatus: () => true,
    });
  }

  async request<T>(req: HttpRequest): Promise<T> {
    const config: AxiosRequestConfig = {
      method: req.method,
      url: req.path,
      params: req.query ? stripUndefined(req.query) : undefined,
      data: req.body,
    };

    let response;
    try {
      response = await this.axios.request(config);
    } catch (err) {
      const axiosErr = err as AxiosError;
      throw new NetworkError(axiosErr.message || "Network request failed");
    }

    const { status, data, headers } = response;
    const requestId =
      typeof headers === "object" && headers !== null
        ? (headers["x-request-id"] as string | undefined)
        : undefined;

    if (status >= 200 && status < 300) {
      return data as T;
    }

    const message = extractMessage(data) ?? `Request failed with status ${status}`;
    const errorOpts = { statusCode: status, body: data, requestId };

    switch (true) {
      case status === 401:
        throw new AuthenticationError(message, errorOpts);
      case status === 404:
        throw new NotFoundError(message, errorOpts);
      case status === 409:
        throw new ConflictError(message, errorOpts);
      case status === 400 || status === 422:
        throw new ValidationError(message, errorOpts);
      case status === 429: {
        const retryAfterHeader = headers["retry-after"];
        const retryAfter = parseRetryAfter(retryAfterHeader);
        throw new RateLimitError(message, { ...errorOpts, retryAfter });
      }
      case status >= 500:
        throw new ServerError(message, errorOpts);
      default:
        throw new MaildeskError(message, errorOpts);
    }
  }
}

function extractMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const m = (body as { message?: unknown }).message;
  if (typeof m === "string") return m;
  if (Array.isArray(m)) return m.filter(x => typeof x === "string").join("; ");
  return undefined;
}

function parseRetryAfter(header: unknown): number | undefined {
  if (typeof header !== "string") return undefined;
  const n = parseInt(header, 10);
  return isNaN(n) ? undefined : n;
}

function stripUndefined(
  obj: Record<string, string | number | undefined>,
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}
