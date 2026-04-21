export enum SubscriptionStatus {
  CONFIRMED = "CONFIRMED",
  UNCONFIRMED = "UNCONFIRMED",
  UNSUBSCRIBED = "UNSUBSCRIBED",
  PERMANENT_BOUNCE = "PERMANENT_BOUNCE",
}

export enum BulkContactFailureReason {
  DUPLICATE_IN_REQUEST = "DUPLICATE_IN_REQUEST",
  EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

export interface Contact {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: SubscriptionStatus;
  tags: string[];
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedContacts {
  subscribers: Contact[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginatedTags {
  tags: Tag[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateContactInput {
  email: string;
  firstName: string;
  lastName: string;
  isConfirmed?: boolean;
  tags?: string[];
}

export interface UpdateContactInput {
  firstName?: string;
  lastName?: string;
  tags?: string[];
}

export interface BulkContactFailure {
  index: number;
  email: string;
  reason: BulkContactFailureReason;
}

export interface BulkContactResult {
  failed: BulkContactFailure[];
}

export interface CreateTagInput {
  name: string;
  description?: string;
}

export interface UpdateTagInput {
  name?: string;
  description?: string;
}

export interface MaildeskOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
}
