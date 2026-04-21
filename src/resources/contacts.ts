import { HttpClient } from "../http";
import type {
  BulkContactResult,
  Contact,
  CreateContactInput,
  PaginatedContacts,
  PaginationParams,
  UpdateContactInput,
} from "../types";

export class ContactsResource {
  constructor(private readonly http: HttpClient) {}

  async list(params: PaginationParams = {}): Promise<PaginatedContacts> {
    return this.http.request<PaginatedContacts>({
      method: "GET",
      path: "/api/subscribers",
      query: { page: params.page, limit: params.limit },
    });
  }

  async get(id: string): Promise<Contact> {
    const res = await this.http.request<{ subscriber: Contact }>({
      method: "GET",
      path: `/api/subscribers/${encodeURIComponent(id)}`,
    });
    return res.subscriber;
  }

  async create(input: CreateContactInput): Promise<Contact> {
    const body = {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      isConfirmed: input.isConfirmed ?? false,
      tags: input.tags ?? [],
    };
    const res = await this.http.request<{ subscriber: Contact }>({
      method: "POST",
      path: "/api/subscribers",
      body,
    });
    return res.subscriber;
  }

  async bulkCreate(subscribers: CreateContactInput[]): Promise<BulkContactResult> {
    const body = {
      subscribers: subscribers.map(s => ({
        email: s.email,
        firstName: s.firstName,
        lastName: s.lastName,
        isConfirmed: s.isConfirmed ?? false,
        tags: s.tags ?? [],
      })),
    };
    return this.http.request<BulkContactResult>({
      method: "POST",
      path: "/api/subscribers/bulk",
      body,
    });
  }

  async update(id: string, input: UpdateContactInput): Promise<Contact> {
    const res = await this.http.request<{ subscriber: Contact }>({
      method: "PUT",
      path: `/api/subscribers/${encodeURIComponent(id)}`,
      body: input,
    });
    return res.subscriber;
  }

  async delete(id: string): Promise<void> {
    await this.http.request<void>({
      method: "DELETE",
      path: `/api/subscribers/${encodeURIComponent(id)}`,
    });
  }

  async *listAll(params: { limit?: number } = {}): AsyncGenerator<Contact, void, unknown> {
    const limit = params.limit ?? 50;
    let page = 1;
    let seen = 0;
    while (true) {
      const res = await this.list({ page, limit });
      for (const c of res.subscribers) {
        yield c;
      }
      seen += res.subscribers.length;
      if (res.subscribers.length === 0 || seen >= res.total) return;
      page += 1;
    }
  }
}
