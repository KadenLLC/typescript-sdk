import nock from "nock";
import {
  Maildesk,
  NotFoundError,
  SubscriptionStatus,
  BulkContactFailureReason,
} from "../src";

const BASE = "https://api.maildesk.test";
const API_KEY = "sk_test_123";

function newClient() {
  return new Maildesk({ apiKey: API_KEY, baseUrl: BASE });
}

const contactFixture = {
  id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  email: "john@example.com",
  firstName: "John",
  lastName: "Doe",
  status: SubscriptionStatus.CONFIRMED,
  tags: ["Newsletter"],
  createdAt: "2026-04-01T10:00:00.000Z",
};

beforeEach(() => {
  if (!nock.isActive()) nock.activate();
});

afterEach(() => {
  nock.cleanAll();
});

describe("ContactsResource", () => {
  it("list includes page/limit query and returns paginated result", async () => {
    nock(BASE)
      .get("/api/subscribers")
      .query({ page: 2, limit: 25 })
      .matchHeader("authorization", `Bearer ${API_KEY}`)
      .reply(200, {
        subscribers: [contactFixture],
        total: 1,
        page: 2,
        limit: 25,
      });

    const res = await newClient().contacts.list({ page: 2, limit: 25 });
    expect(res.total).toBe(1);
    expect(res.subscribers[0]?.email).toBe("john@example.com");
  });

  it("get unwraps { subscriber }", async () => {
    nock(BASE)
      .get(`/api/subscribers/${contactFixture.id}`)
      .reply(200, { subscriber: contactFixture });

    const c = await newClient().contacts.get(contactFixture.id);
    expect(c.id).toBe(contactFixture.id);
  });

  it("create sends defaults for isConfirmed and tags", async () => {
    const scope = nock(BASE)
      .post("/api/subscribers", body => {
        expect(body).toEqual({
          email: "new@example.com",
          firstName: "New",
          lastName: "Person",
          isConfirmed: false,
          tags: [],
        });
        return true;
      })
      .reply(201, { subscriber: contactFixture });

    const c = await newClient().contacts.create({
      email: "new@example.com",
      firstName: "New",
      lastName: "Person",
    });
    expect(c.id).toBe(contactFixture.id);
    scope.done();
  });

  it("bulkCreate returns failed[] on partial failure", async () => {
    nock(BASE)
      .post("/api/subscribers/bulk")
      .reply(200, {
        failed: [
          {
            index: 1,
            email: "dup@example.com",
            reason: BulkContactFailureReason.EMAIL_ALREADY_EXISTS,
          },
        ],
      });

    const res = await newClient().contacts.bulkCreate([
      { email: "a@example.com", firstName: "A", lastName: "Z" },
      { email: "dup@example.com", firstName: "D", lastName: "U" },
    ]);
    expect(res.failed).toHaveLength(1);
    expect(res.failed[0]?.reason).toBe(BulkContactFailureReason.EMAIL_ALREADY_EXISTS);
  });

  it("update sends partial body", async () => {
    nock(BASE)
      .put(`/api/subscribers/${contactFixture.id}`, body => {
        expect(body).toEqual({ firstName: "Renamed" });
        return true;
      })
      .reply(200, { subscriber: { ...contactFixture, firstName: "Renamed" } });

    const c = await newClient().contacts.update(contactFixture.id, { firstName: "Renamed" });
    expect(c.firstName).toBe("Renamed");
  });

  it("delete resolves on 204", async () => {
    nock(BASE).delete(`/api/subscribers/${contactFixture.id}`).reply(204);
    await expect(newClient().contacts.delete(contactFixture.id)).resolves.toBeUndefined();
  });

  it("throws NotFoundError on 404", async () => {
    nock(BASE)
      .get("/api/subscribers/missing")
      .reply(404, { statusCode: 404, message: "Contact not found" });

    await expect(newClient().contacts.get("missing")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("listAll walks all pages", async () => {
    const page1 = Array.from({ length: 2 }, (_, i) => ({
      ...contactFixture,
      id: `p1-${i}`,
      email: `p1-${i}@example.com`,
    }));
    const page2 = Array.from({ length: 1 }, (_, i) => ({
      ...contactFixture,
      id: `p2-${i}`,
      email: `p2-${i}@example.com`,
    }));

    nock(BASE)
      .get("/api/subscribers")
      .query({ page: 1, limit: 2 })
      .reply(200, { subscribers: page1, total: 3, page: 1, limit: 2 });
    nock(BASE)
      .get("/api/subscribers")
      .query({ page: 2, limit: 2 })
      .reply(200, { subscribers: page2, total: 3, page: 2, limit: 2 });

    const collected: string[] = [];
    for await (const c of newClient().contacts.listAll({ limit: 2 })) {
      collected.push(c.id);
    }
    expect(collected).toEqual(["p1-0", "p1-1", "p2-0"]);
  });
});
