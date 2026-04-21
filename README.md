# @maildesk/sdk

Official TypeScript SDK for the [Maildesk](https://maildesk.io) API. Typed, Node 18+.

Covers:

- **Contacts** — list, get, create, bulk create (with partial-failure reporting), update, delete, auto-paginate
- **Tags** — list, get, create, update, delete, auto-paginate
- **Webhooks** — HMAC-SHA256 signature verification + typed event payloads

## Install

```bash
npm install @maildesk/sdk
# or
yarn add @maildesk/sdk
# or
pnpm add @maildesk/sdk
```

## Quick start

```ts
import { Maildesk } from "@maildesk/sdk";

const client = new Maildesk({
  apiKey: process.env.MAILDESK_API_KEY!,
  baseUrl: "https://api.maildesk.io",
});

const contact = await client.contacts.create({
  email: "jane@example.com",
  firstName: "Jane",
  lastName: "Doe",
  isConfirmed: true,
  tags: ["01HQZTAG00000000000000"],
});

console.log(contact.id);
```

## Authentication

All requests are authenticated with an API secret key sent as a Bearer token. Generate one from the Maildesk dashboard under **Developer → API keys**.

```ts
const client = new Maildesk({ apiKey: "sk_..." });
```

## Configuration

| Option      | Type   | Default                    | Notes                                      |
| ----------- | ------ | -------------------------- | ------------------------------------------ |
| `apiKey`    | string | —                          | **Required.** Your Maildesk secret key.    |
| `baseUrl`   | string | `http://localhost:3000`    | Point at your Maildesk deployment.         |
| `timeoutMs` | number | `30000`                    | Per-request timeout in milliseconds.       |

## Contacts

```ts
// List (paginated)
const { subscribers, total, page, limit } = await client.contacts.list({ page: 1, limit: 50 });

// Get one
const contact = await client.contacts.get("01ARZ3NDEKTSV4RRFFQ69G5FAV");

// Create
const created = await client.contacts.create({
  email: "new@example.com",
  firstName: "New",
  lastName: "Person",
  isConfirmed: true,
  tags: ["01HQZTAG00000000000000"],
});

// Update (partial)
const updated = await client.contacts.update(created.id, { firstName: "Renamed" });

// Delete
await client.contacts.delete(created.id);

// Auto-paginate every contact
for await (const c of client.contacts.listAll({ limit: 100 })) {
  console.log(c.email);
}
```

### Bulk create — partial failures

`bulkCreate` accepts up to **100 contacts per call** and returns a `failed` array with per-item reasons. A fully successful batch returns `{ failed: [] }`.

```ts
import { BulkContactFailureReason } from "@maildesk/sdk";

const { failed } = await client.contacts.bulkCreate([
  { email: "a@example.com", firstName: "A", lastName: "Z" },
  { email: "dup@example.com", firstName: "D", lastName: "U" },
]);

for (const f of failed) {
  if (f.reason === BulkContactFailureReason.EMAIL_ALREADY_EXISTS) {
    // already in the database — ignore or re-sync
  } else if (f.reason === BulkContactFailureReason.DUPLICATE_IN_REQUEST) {
    // two rows in the same batch had the same email
  } else {
    // INTERNAL_ERROR — retry
  }
}
```

## Tags

```ts
const { tags } = await client.tags.list({ page: 1, limit: 50 });

const tag = await client.tags.create({ name: "Newsletter", description: "Weekly list" });
await client.tags.update(tag.id, { description: "Updated" });
await client.tags.delete(tag.id);

for await (const t of client.tags.listAll()) {
  console.log(t.name);
}
```

Tag names are unique per business — attempting to create a duplicate throws `ConflictError`.

## Webhooks

Maildesk signs every outbound webhook with HMAC-SHA256 using your API secret. The SDK ships a `verifyWebhook` helper that validates the signature, enforces a timestamp tolerance, and returns a typed event.

**Event types:**

- `subscriber.created`
- `subscriber.confirmed`
- `subscriber.unsubscribed`
- `subscriber.updated`

### Express

```ts
import express from "express";
import { verifyWebhook, InvalidSignatureError, StaleWebhookError } from "@maildesk/sdk";

const app = express();

// IMPORTANT: use a raw-body parser for this route — signature verification
// is computed over the exact bytes on the wire, not a re-serialized JSON string.
app.post(
  "/webhooks/maildesk",
  express.raw({ type: "application/json" }),
  (req, res) => {
    try {
      const event = verifyWebhook({
        rawBody: req.body, // Buffer
        signatureHeader: req.header("X-Maildesk-Signature"),
        secret: process.env.MAILDESK_WEBHOOK_SECRET!,
      });

      switch (event.type) {
        case "subscriber.created":
          // ...
          break;
        case "subscriber.unsubscribed":
          // ...
          break;
      }

      res.status(200).send("ok");
    } catch (err) {
      if (err instanceof InvalidSignatureError || err instanceof StaleWebhookError) {
        res.status(400).send(err.message);
        return;
      }
      throw err;
    }
  },
);
```

### Options

```ts
verifyWebhook({
  rawBody,          // string | Buffer — raw request body
  signatureHeader,  // value of X-Maildesk-Signature header
  secret,           // your API secret key
  toleranceSeconds: 300, // default — reject timestamps older than 5 minutes. 0 disables.
});
```

### Idempotency

Every event has a unique `eventId`. Retries (e.g. on 5xx responses from your endpoint) reuse the same `eventId`, so persist it and skip duplicates:

```ts
const event = verifyWebhook({ ... });
if (await seenEventIds.has(event.eventId)) return;
await seenEventIds.add(event.eventId);
// process event
```

## Error handling

All errors extend `MaildeskError` and carry `statusCode`, `body`, and an optional `requestId`.

| Error                  | Trigger                                      |
| ---------------------- | -------------------------------------------- |
| `AuthenticationError`  | 401 — missing/invalid API key                |
| `NotFoundError`        | 404 — resource not found                     |
| `ConflictError`        | 409 — unique-constraint violation            |
| `ValidationError`      | 400 / 422 — request body or query invalid    |
| `RateLimitError`       | 429 — includes `.retryAfter` (seconds)       |
| `ServerError`          | 5xx                                          |
| `NetworkError`         | transport-level failure (DNS, timeout, etc.) |
| `InvalidSignatureError`| webhook signature didn't verify              |
| `StaleWebhookError`    | webhook timestamp outside tolerance          |

```ts
import { RateLimitError } from "@maildesk/sdk";

try {
  await client.contacts.create({ ... });
} catch (err) {
  if (err instanceof RateLimitError && err.retryAfter) {
    await new Promise(r => setTimeout(r, err.retryAfter * 1000));
    // retry
  }
  throw err;
}
```

The server enforces **120 requests per 60 seconds per API key**. Back off on 429.

## Pagination

List endpoints default to `page=1, limit=50`. Use `listAll()` for an async iterator that walks every page:

```ts
for await (const contact of client.contacts.listAll()) {
  // ...
}
```

## Development

```bash
npm install
npm run build     # bundles CJS + ESM + .d.ts into dist/
npm test          # runs jest with nock-mocked HTTP
npm run typecheck # tsc --noEmit
```

## License

MIT
