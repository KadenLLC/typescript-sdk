import nock from "nock";
import { ConflictError, Maildesk } from "../src";

const BASE = "https://api.maildesk.test";
const API_KEY = "sk_test_123";

function newClient() {
  return new Maildesk({ apiKey: API_KEY, baseUrl: BASE });
}

const tagFixture = {
  id: "01HQZTAG00000000000000",
  name: "Newsletter",
  description: "Newsletter subscribers",
  createdAt: "2026-04-01T10:00:00.000Z",
};

afterEach(() => nock.cleanAll());

describe("TagsResource", () => {
  it("list returns paginated tags", async () => {
    nock(BASE)
      .get("/api/tags")
      .query({ page: 1, limit: 50 })
      .reply(200, { tags: [tagFixture], total: 1, page: 1, limit: 50 });

    const res = await newClient().tags.list({ page: 1, limit: 50 });
    expect(res.tags[0]?.name).toBe("Newsletter");
  });

  it("get unwraps { tag }", async () => {
    nock(BASE).get(`/api/tags/${tagFixture.id}`).reply(200, { tag: tagFixture });
    const t = await newClient().tags.get(tagFixture.id);
    expect(t.id).toBe(tagFixture.id);
  });

  it("create sends name/description body", async () => {
    nock(BASE)
      .post("/api/tags", { name: "Premium", description: "paid" })
      .reply(201, { tag: { ...tagFixture, name: "Premium", description: "paid" } });

    const t = await newClient().tags.create({ name: "Premium", description: "paid" });
    expect(t.name).toBe("Premium");
  });

  it("throws ConflictError on 409 duplicate name", async () => {
    nock(BASE)
      .post("/api/tags")
      .reply(409, { statusCode: 409, message: "Tag name already exists" });

    await expect(newClient().tags.create({ name: "Premium" })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("update sends partial body", async () => {
    nock(BASE)
      .put(`/api/tags/${tagFixture.id}`, { description: "updated" })
      .reply(200, { tag: { ...tagFixture, description: "updated" } });

    const t = await newClient().tags.update(tagFixture.id, { description: "updated" });
    expect(t.description).toBe("updated");
  });

  it("delete resolves on 204", async () => {
    nock(BASE).delete(`/api/tags/${tagFixture.id}`).reply(204);
    await expect(newClient().tags.delete(tagFixture.id)).resolves.toBeUndefined();
  });
});
