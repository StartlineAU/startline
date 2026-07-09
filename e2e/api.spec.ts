import { test, expect } from "@playwright/test";

test.describe("checkout API", () => {
  test("POST /api/checkout returns 400 for missing fields", async ({ request }) => {
    const res = await request.post("/api/checkout", {
      data: {},
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("First name is required");
  });

  test("POST /api/checkout returns 404 for non-existent event", async ({ request }) => {
    const res = await request.post("/api/checkout", {
      data: {
        eventId: "non-existent-id",
        waveLabel: "Early Bird",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        mobile: "0400000000",
        emergencyContactName: "Emergency",
        emergencyContactPhone: "0400000001",
        waiverAccepted: true,
        dateOfBirth: "1990-01-01",
      },
    });
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("Event not found");
  });
});

test.describe("stripe webhook", () => {
  // Stripe webhook secret differs in CI — test locally only
  const stripeWebhookTest = process.env.CI ? test.skip : test;
  stripeWebhookTest("POST /api/stripe/webhook returns 400 without signature", async ({ request }) => {
    const res = await request.post("/api/stripe/webhook", {
      data: { type: "payment_intent.succeeded" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });
});

test.describe("profile API", () => {
  test("GET /api/organiser/profile returns 401 without auth", async ({ request }) => {
    const res = await request.get("/api/organiser/profile");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Unauthorised");
  });
});
