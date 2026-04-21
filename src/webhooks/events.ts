import { SubscriptionStatus } from "../types";

export const WEBHOOK_SIGNATURE_HEADER = "X-Maildesk-Signature";
export const WEBHOOK_TIMESTAMP_HEADER = "X-Maildesk-Timestamp";

export enum WebhookEventType {
  SUBSCRIBER_CREATED = "subscriber.created",
  SUBSCRIBER_CONFIRMED = "subscriber.confirmed",
  SUBSCRIBER_UNSUBSCRIBED = "subscriber.unsubscribed",
  SUBSCRIBER_UPDATED = "subscriber.updated",
}

export interface ContactEventPayload {
  type: WebhookEventType;
  eventId: string;
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: SubscriptionStatus | string;
  createdAt: string;
}

export type WebhookEvent = ContactEventPayload;
