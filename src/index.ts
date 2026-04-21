export { Maildesk } from "./client";
export * from "./types";
export {
  MaildeskError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  ServerError,
  NetworkError,
  InvalidSignatureError,
  StaleWebhookError,
} from "./errors";
export { ContactsResource } from "./resources/contacts";
export { TagsResource } from "./resources/tags";
export {
  verifyWebhook,
  WebhookEventType,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
} from "./webhooks";
export type { WebhookEvent, ContactEventPayload, VerifyWebhookOptions } from "./webhooks";
