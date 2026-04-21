export class MaildeskError extends Error {
  public readonly statusCode?: number;
  public readonly body?: unknown;
  public readonly requestId?: string;

  constructor(
    message: string,
    options: { statusCode?: number; body?: unknown; requestId?: string } = {},
  ) {
    super(message);
    this.name = "MaildeskError";
    this.statusCode = options.statusCode;
    this.body = options.body;
    this.requestId = options.requestId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AuthenticationError extends MaildeskError {
  constructor(message = "Authentication failed", opts?: ConstructorParameters<typeof MaildeskError>[1]) {
    super(message, opts);
    this.name = "AuthenticationError";
  }
}

export class NotFoundError extends MaildeskError {
  constructor(message = "Resource not found", opts?: ConstructorParameters<typeof MaildeskError>[1]) {
    super(message, opts);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends MaildeskError {
  constructor(message = "Conflict", opts?: ConstructorParameters<typeof MaildeskError>[1]) {
    super(message, opts);
    this.name = "ConflictError";
  }
}

export class ValidationError extends MaildeskError {
  constructor(message = "Validation failed", opts?: ConstructorParameters<typeof MaildeskError>[1]) {
    super(message, opts);
    this.name = "ValidationError";
  }
}

export class RateLimitError extends MaildeskError {
  public readonly retryAfter?: number;

  constructor(
    message = "Rate limit exceeded",
    opts: ConstructorParameters<typeof MaildeskError>[1] & { retryAfter?: number } = {},
  ) {
    super(message, opts);
    this.name = "RateLimitError";
    this.retryAfter = opts.retryAfter;
  }
}

export class ServerError extends MaildeskError {
  constructor(message = "Server error", opts?: ConstructorParameters<typeof MaildeskError>[1]) {
    super(message, opts);
    this.name = "ServerError";
  }
}

export class NetworkError extends MaildeskError {
  constructor(message = "Network error", opts?: ConstructorParameters<typeof MaildeskError>[1]) {
    super(message, opts);
    this.name = "NetworkError";
  }
}

export class InvalidSignatureError extends MaildeskError {
  constructor(message = "Invalid webhook signature") {
    super(message);
    this.name = "InvalidSignatureError";
  }
}

export class StaleWebhookError extends MaildeskError {
  constructor(message = "Webhook timestamp is outside tolerance window") {
    super(message);
    this.name = "StaleWebhookError";
  }
}
