import type { Request } from "express";
import { describe, expect, it } from "vitest";
import { extractAuthenticatedUser } from "../src/middleware/auth.js";

const requestWithHeaders = (headers: Record<string, string>) => ({ headers }) as unknown as Request;

describe("authentication", () => {
  it("uses stable Casdoor subject instead of username as the user key", () => {
    const user = extractAuthenticatedUser(requestWithHeaders({ "x-auth-request-sub": "subject-123", "x-forwarded-preferred-username": "会改名的用户" }), { NODE_ENV: "production", TRUST_PROXY_AUTH_HEADERS: "true" });
    expect(user?.id).toBe("casdoor:subject-123");
    expect(user?.username).toBe("会改名的用户");
  });

  it("rejects proxy headers in production unless the trust boundary is enabled", () => {
    const user = extractAuthenticatedUser(requestWithHeaders({ "x-auth-request-sub": "forged", "x-forwarded-user": "forged" }), { NODE_ENV: "production" });
    expect(user).toBeNull();
  });

  it("never falls back to a development user in production", () => {
    expect(extractAuthenticatedUser(requestWithHeaders({}), { NODE_ENV: "production", TRUST_PROXY_AUTH_HEADERS: "true" })).toBeNull();
  });
});

