import { createHmac } from "crypto";
import {
  InvalidSignatureError,
  StaleWebhookError,
  verifyWebhook,
  WebhookEventType,
} from "../src";

const SECRET = "whsec_topsecret";

function sign(body: string, timestamp: number, secret = SECRET): string {
  const sig = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${sig}`;
}

function validBody() {
  return JSON.stringify({
    type: WebhookEventType.SUBSCRIBER_CREATED,
    eventId: "evt_01HABC",
    id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    status: "CONFIRMED",
    createdAt: "2026-04-01T10:00:00.000Z",
  });
}

describe("verifyWebhook", () => {
  it("accepts valid signature and returns parsed event", () => {
    const body = validBody();
    const ts = Math.floor(Date.now() / 1000);
    const event = verifyWebhook({
      rawBody: body,
      signatureHeader: sign(body, ts),
      secret: SECRET,
    });
    expect(event.type).toBe(WebhookEventType.SUBSCRIBER_CREATED);
    expect(event.email).toBe("john@example.com");
  });

  it("accepts Buffer body", () => {
    const body = validBody();
    const ts = Math.floor(Date.now() / 1000);
    const event = verifyWebhook({
      rawBody: Buffer.from(body, "utf8"),
      signatureHeader: sign(body, ts),
      secret: SECRET,
    });
    expect(event.eventId).toBe("evt_01HABC");
  });

  it("rejects tampered body", () => {
    const body = validBody();
    const ts = Math.floor(Date.now() / 1000);
    const sig = sign(body, ts);
    const tampered = body.replace("John", "Jane");
    expect(() =>
      verifyWebhook({ rawBody: tampered, signatureHeader: sig, secret: SECRET }),
    ).toThrow(InvalidSignatureError);
  });

  it("rejects wrong secret", () => {
    const body = validBody();
    const ts = Math.floor(Date.now() / 1000);
    expect(() =>
      verifyWebhook({
        rawBody: body,
        signatureHeader: sign(body, ts, "wrong_secret"),
        secret: SECRET,
      }),
    ).toThrow(InvalidSignatureError);
  });

  it("rejects stale timestamp outside tolerance", () => {
    const body = validBody();
    const now = 1_700_000_000;
    const tsOld = now - 600; // 10 minutes ago
    expect(() =>
      verifyWebhook({
        rawBody: body,
        signatureHeader: sign(body, tsOld),
        secret: SECRET,
        toleranceSeconds: 300,
        nowSeconds: now,
      }),
    ).toThrow(StaleWebhookError);
  });

  it("accepts stale timestamp when tolerance is 0 (disabled)", () => {
    const body = validBody();
    const now = 1_700_000_000;
    const tsOld = now - 999_999;
    const event = verifyWebhook({
      rawBody: body,
      signatureHeader: sign(body, tsOld),
      secret: SECRET,
      toleranceSeconds: 0,
      nowSeconds: now,
    });
    expect(event.type).toBe(WebhookEventType.SUBSCRIBER_CREATED);
  });

  it("rejects malformed header", () => {
    const body = validBody();
    expect(() =>
      verifyWebhook({ rawBody: body, signatureHeader: "garbage", secret: SECRET }),
    ).toThrow(InvalidSignatureError);
  });

  it("rejects missing header", () => {
    expect(() =>
      verifyWebhook({ rawBody: validBody(), signatureHeader: undefined, secret: SECRET }),
    ).toThrow(InvalidSignatureError);
  });

  it("rejects empty secret", () => {
    const body = validBody();
    const ts = Math.floor(Date.now() / 1000);
    expect(() =>
      verifyWebhook({ rawBody: body, signatureHeader: sign(body, ts), secret: "" }),
    ).toThrow(InvalidSignatureError);
  });
});
