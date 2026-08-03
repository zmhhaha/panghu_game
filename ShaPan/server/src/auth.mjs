function headerValue(request, name) {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

export function getPrincipal(request) {
  const production = process.env.NODE_ENV === "production";
  const trusted = process.env.TRUST_PROXY_AUTH_HEADERS === "true";
  const subject = headerValue(request, "x-auth-request-sub") || headerValue(request, "x-forwarded-user");

  if (subject && (trusted || !production)) {
    return {
      id: subject,
      email: headerValue(request, "x-forwarded-email") || null,
      name: headerValue(request, "x-forwarded-preferred-username") || headerValue(request, "x-forwarded-user") || subject
    };
  }

  if (!production) {
    const id = process.env.DEV_USER_ID || "dev-user";
    return { id, email: `${id}@localhost`, name: "开发指挥官" };
  }

  const error = new Error("authentication required");
  error.statusCode = 401;
  throw error;
}
