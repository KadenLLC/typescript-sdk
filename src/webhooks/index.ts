import { createHmac, timingSafeEqual } from "crypto";
import { InvalidSignatureError, StaleWebhookError } from "../errors";
import type { WebhookEvent } from "./events";

export {
  WebhookEventType,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
} from "./events";
export type { WebhookEvent, ContactEventPayload } from "./events";
export { InvalidSignatureError, StaleWebhookError } from "../errors";

export interface VerifyWebhookOptions {
  /** Raw request body, exactly as received on the wire. Must be string or Buffer — do NOT JSON.parse first. */
  rawBody: string | Buffer;
  /** Value of the `X-Maildesk-Signature` header, e.g. `t=1700000000,v1=abcdef...`. */
  signatureHeader: string | undefined | null;
  /** The business's API secret key (same value used as Bearer token). */
  secret: string;
  /** Reject signatures whose timestamp is older than this many seconds. Defaults to 300 (5 minutes). Set to 0 to disable. */
  toleranceSeconds?: number;
  /** Override current time for testing. Unix seconds. */
  nowSeconds?: number;
}

interface ParsedSignature {
  timestamp: number;
  v1: string;
}

function parseSignatureHeader(header: string): ParsedSignature {
  const parts = header.split(",").map(s => s.trim());
  let timestamp: number | undefined;
  let v1: string | undefined;
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const key = part.slice(0, eq);
    const value = part.slice(eq + 1);
    if (key === "t") {
      const n = parseInt(value, 10);
      if (!isNaN(n)) timestamp = n;
    } else if (key === "v1") {
      v1 = value;
    }
  }
  if (timestamp === undefined || !v1) {
    throw new InvalidSignatureError("Malformed X-Maildesk-Signature header");
  }
  return { timestamp, v1 };
}

function toBuffer(body: string | Buffer): Buffer {
  return typeof body === "string" ? Buffer.from(body, "utf8") : body;
}

export function verifyWebhook(opts: VerifyWebhookOptions): WebhookEvent {
  const { signatureHeader, secret, rawBody } = opts;
  if (!signatureHeader) {
    throw new InvalidSignatureError("Missing X-Maildesk-Signature header");
  }
  if (!secret) {
    throw new InvalidSignatureError("Secret is required");
  }

  const { timestamp, v1 } = parseSignatureHeader(signatureHeader);

  const tolerance = opts.toleranceSeconds ?? 300;
  if (tolerance > 0) {
    const now = opts.nowSeconds ?? Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > tolerance) {
      throw new StaleWebhookError(
        `Webhook timestamp ${timestamp} is outside tolerance of ${tolerance}s from now=${now}`,
      );
    }
  }

  const bodyBuf = toBuffer(rawBody);
  const signedPayload = Buffer.concat([
    Buffer.from(`${timestamp}.`, "utf8"),
    bodyBuf,
  ]);
  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(v1, "utf8");
  if (expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) {
    throw new InvalidSignatureError("Signature mismatch");
  }

  try {
    return JSON.parse(bodyBuf.toString("utf8")) as WebhookEvent;
  } catch {
    throw new InvalidSignatureError("Webhook body is not valid JSON");
  }
}
