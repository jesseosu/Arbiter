const request = require("supertest");

// Prevent the content generator interval from running during tests
jest.mock("../../backend/src/data/contentStore", () => {
  const actual = jest.requireActual("../../backend/src/data/contentStore");
  return {
    ...actual,
    startGenerator: jest.fn(),
    stopGenerator: jest.fn(),
  };
});

const { app, server } = require("../../backend/server");

afterAll((done) => {
  server.close(done);
});

describe("Appeals workflow", () => {
  let contentId;
  let appealId;

  beforeAll(() => {
    // Create a content item directly via the store
    const { addItem } = require("../../backend/src/data/contentStore");
    const item = addItem("Test content for appeal integration test");
    contentId = item.id;
  });

  test("GET /api/appeals returns array", async () => {
    const res = await request(app).get("/api/appeals");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("POST /api/appeals creates an appeal", async () => {
    const res = await request(app)
      .post("/api/appeals")
      .send({ contentId, requester: "test_user", reason: "I did not violate any rules" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.status).toBe("pending");
    expect(res.body.content_id).toBe(contentId);
    appealId = res.body.id;
  });

  test("POST /api/appeals validates required fields", async () => {
    const res = await request(app)
      .post("/api/appeals")
      .send({ contentId });
    expect(res.status).toBe(400);
  });

  test("GET /api/appeals/:id returns the appeal", async () => {
    const res = await request(app).get(`/api/appeals/${appealId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(appealId);
  });

  test("GET /api/appeals?status=pending includes our appeal", async () => {
    const res = await request(app).get("/api/appeals?status=pending");
    expect(res.status).toBe(200);
    const found = res.body.find((a) => a.id === appealId);
    expect(found).toBeDefined();
  });

  test("POST /api/appeals/:id/decision upholds appeal", async () => {
    const res = await request(app)
      .post(`/api/appeals/${appealId}/decision`)
      .send({ action: "uphold", reviewedBy: "senior_mod" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("upheld");
    expect(res.body.reviewed_by).toBe("senior_mod");
  });

  test("POST /api/appeals/:id/decision rejects invalid action", async () => {
    const res = await request(app)
      .post(`/api/appeals/${appealId}/decision`)
      .send({ action: "unknown", reviewedBy: "senior_mod" });
    expect(res.status).toBe(400);
  });

  test("GET /api/appeals/9999 returns 404", async () => {
    const res = await request(app).get("/api/appeals/9999");
    expect(res.status).toBe(404);
  });
});

describe("Content API", () => {
  test("GET /api/content returns array", async () => {
    const res = await request(app).get("/api/content");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("GET /api/content/:id returns item with signals", async () => {
    const list = await request(app).get("/api/content");
    const id = list.body[0]?.id;
    if (!id) return;

    const res = await request(app).get(`/api/content/${id}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("risk_score");
    expect(res.body).toHaveProperty("signals");
    expect(res.body).toHaveProperty("category");
    expect(res.body).toHaveProperty("actionHistory");
  });

  test("GET /api/health returns ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  test("GET /api/metrics returns expected shape", async () => {
    const res = await request(app).get("/api/metrics");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("queue");
    expect(res.body).toHaveProperty("decisions");
    expect(res.body).toHaveProperty("throughput");
    expect(res.body).toHaveProperty("rules");
  });

  test("POST /api/actions validates missing fields", async () => {
    const res = await request(app)
      .post("/api/actions")
      .send({ contentId: 1 });
    expect(res.status).toBe(400);
  });

  test("POST /api/actions rejects invalid action", async () => {
    const res = await request(app)
      .post("/api/actions")
      .send({ contentId: 1, action: "delete" });
    expect(res.status).toBe(400);
  });
});
