import type { Request } from "express";
import { afterEach, describe, expect, it } from "vitest";
import { extractUser } from "../src/middleware/auth.js";

const originalNodeEnv = process.env.NODE_ENV;
const originalTrust = process.env.TRUST_PROXY_AUTH_HEADERS;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  if (originalTrust === undefined) delete process.env.TRUST_PROXY_AUTH_HEADERS;
  else process.env.TRUST_PROXY_AUTH_HEADERS = originalTrust;
});

describe("proxy authentication", () => {
  it("rejects forwarded identity in production until proxy headers are trusted", () => {
    process.env.NODE_ENV = "production";
    delete process.env.TRUST_PROXY_AUTH_HEADERS;
    const request = {
      headers: { "x-auth-request-sub": "subject-1", "x-forwarded-user": "official" },
    } as unknown as Request;

    expect(extractUser(request)).toBeNull();
    process.env.TRUST_PROXY_AUTH_HEADERS = "true";
    expect(extractUser(request)?.id).toBe("casdoor:subject-1");
  });
});
