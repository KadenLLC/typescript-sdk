import nock from "nock";
import {
  AuthenticationError,
  Maildesk,
  MaildeskError,
  RateLimitError,
  ServerError,
  ValidationError,
} from "../src";

const BASE = "https://api.maildesk.test";
const API_KEY = "sk_test_123";

function newClient() {
  return new Maildesk({ apiKey: API_KEY, baseUrl: BASE });
}

afterEach(() => nock.cleanAll());

describe("Maildesk client", () => {
  it("requires apiKey", () => {
    expect(() => new Maildesk({ apiKey: "" })).toThrow(MaildeskError);
  });

  it("sends Authorization and Content-Type headers", async () => {
    nock(BASE, {
      reqheaders: {
        authorization: `Bearer ${API_KEY}`,
        "content-type": "application/json",
      },
    })
      .get("/api/tags")
      .query(true)
      .reply(200, { tags: [], total: 0, page: 1, limit: 50 });

    await newClient().tags.list();
  });

  it("maps 401 to AuthenticationError with server message", async () => {
    nock(BASE)
      .get("/api/tags")
      .query(true)
      .reply(401, { statusCode: 401, message: "Bad token" });

    await expect(newClient().tags.list()).rejects.toMatchObject({
      name: "AuthenticationError",
      message: "Bad token",
      statusCode: 401,
    });
  });

  it("maps 400 to ValidationError", async () => {
    nock(BASE)
      .post("/api/tags")
      .reply(400, { statusCode: 400, message: ["name should not be empty"] });

    const err = await newClient()
      .tags.create({ name: "" })
      .catch(e => e);
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.message).toContain("name should not be empty");
  });

  it("maps 429 to RateLimitError with retryAfter", async () => {
    nock(BASE)
      .get("/api/tags")
      .query(true)
      .reply(429, { statusCode: 429, message: "Too many requests" }, { "Retry-After": "42" });

    const err = await newClient()
      .tags.list()
      .catch(e => e);
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.retryAfter).toBe(42);
  });

  it("maps 500 to ServerError", async () => {
    nock(BASE).get("/api/tags").query(true).reply(500, { message: "boom" });
    await expect(newClient().tags.list()).rejects.toBeInstanceOf(ServerError);
  });

  it("query params omit undefined values", async () => {
    nock(BASE)
      .get("/api/tags")
      .query(q => !("page" in q) && !("limit" in q))
      .reply(200, { tags: [], total: 0, page: 1, limit: 50 });

    await newClient().tags.list();
  });
});
