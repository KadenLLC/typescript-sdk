import { HttpClient } from "../http";
import type {
  CreateTagInput,
  PaginatedTags,
  PaginationParams,
  Tag,
  UpdateTagInput,
} from "../types";

export class TagsResource {
  constructor(private readonly http: HttpClient) {}

  async list(params: PaginationParams = {}): Promise<PaginatedTags> {
    return this.http.request<PaginatedTags>({
      method: "GET",
      path: "/api/tags",
      query: { page: params.page, limit: params.limit },
    });
  }

  async get(id: string): Promise<Tag> {
    const res = await this.http.request<{ tag: Tag }>({
      method: "GET",
      path: `/api/tags/${encodeURIComponent(id)}`,
    });
    return res.tag;
  }

  async create(input: CreateTagInput): Promise<Tag> {
    const res = await this.http.request<{ tag: Tag }>({
      method: "POST",
      path: "/api/tags",
      body: input,
    });
    return res.tag;
  }

  async update(id: string, input: UpdateTagInput): Promise<Tag> {
    const res = await this.http.request<{ tag: Tag }>({
      method: "PUT",
      path: `/api/tags/${encodeURIComponent(id)}`,
      body: input,
    });
    return res.tag;
  }

  async delete(id: string): Promise<void> {
    await this.http.request<void>({
      method: "DELETE",
      path: `/api/tags/${encodeURIComponent(id)}`,
    });
  }

  async *listAll(params: { limit?: number } = {}): AsyncGenerator<Tag, void, unknown> {
    const limit = params.limit ?? 50;
    let page = 1;
    let seen = 0;
    while (true) {
      const res = await this.list({ page, limit });
      for (const t of res.tags) {
        yield t;
      }
      seen += res.tags.length;
      if (res.tags.length === 0 || seen >= res.total) return;
      page += 1;
    }
  }
}
