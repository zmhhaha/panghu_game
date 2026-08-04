import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { URL } from "node:url";
import { createStore } from "./store.mjs";
import { getPrincipal } from "./auth.mjs";

const store = await createStore();
const portFlag = process.argv.indexOf("--port");
const port = Number(portFlag >= 0 ? process.argv[portFlag + 1] : process.env.PORT || 3001);
const maxBodyBytes = 64 * 1024;

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(body), "cache-control": "no-store" });
  response.end(body);
}

function errorResponse(response, error) {
  const status = Number(error.statusCode || 500);
  sendJson(response, status, { error: status >= 500 ? "internal_error" : error.message, requestId: response.requestId });
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) { const error = new Error("request body too large"); error.statusCode = 413; throw error; }
    chunks.push(chunk);
  }
  if (!size) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { const error = new Error("invalid JSON body"); error.statusCode = 400; throw error; }
}

function routeId(pathname, suffix) {
  const prefix = "/api/v1/games/";
  if (!pathname.startsWith(prefix) || !pathname.endsWith(suffix)) return null;
  const id = pathname.slice(prefix.length, -suffix.length);
  return id && !id.includes("/") ? decodeURIComponent(id) : null;
}

async function handle(request, response) {
  response.requestId = request.headers["x-request-id"] || randomUUID();
  const url = new URL(request.url || "/", "http://shapan.local");
  if (request.method === "GET" && url.pathname === "/api/health") {
    try { sendJson(response, 200, { service: "shapan-api", version: "0.1.0", ...(await store.health()) }); }
    catch (error) { errorResponse(response, error); }
    return;
  }
  if (!url.pathname.startsWith("/api/")) { sendJson(response, 404, { error: "not_found" }); return; }

  let principal;
  try { principal = getPrincipal(request); await store.ensureUser(principal); }
  catch (error) { errorResponse(response, error); return; }

  try {
    if (request.method === "GET" && url.pathname === "/api/v1/auth/me") { sendJson(response, 200, { user: principal }); return; }
    if (request.method === "GET" && url.pathname === "/api/v1/campaigns") { sendJson(response, 200, { campaigns: await store.listCampaigns() }); return; }
    if (request.method === "GET" && url.pathname === "/api/v1/games") { sendJson(response, 200, { games: await store.listGames(principal.id) }); return; }
    if (request.method === "POST" && url.pathname === "/api/v1/games") {
      const body = await readJson(request);
      if (!body.campaignId) { const error = new Error("campaignId is required"); error.statusCode = 400; throw error; }
      const game = await store.createGame(principal.id, body.campaignId);
      if (!game) { const error = new Error("unknown campaign"); error.statusCode = 400; throw error; }
      sendJson(response, 201, { game });
      return;
    }

    const startId = routeId(url.pathname, "/start");
    if (request.method === "POST" && startId) {
      const result = await store.startGame(principal.id, startId);
      if (result.kind === "missing") { const error = new Error("game not found"); error.statusCode = 404; throw error; }
      if (result.kind === "invalid") { const error = new Error(result.message); error.statusCode = 409; throw error; }
      sendJson(response, 200, result);
      return;
    }

    const stateId = routeId(url.pathname, "/state");
    if (request.method === "GET" && stateId) {
      const state = await store.getState(principal.id, stateId);
      if (!state) { const error = new Error("game not found"); error.statusCode = 404; throw error; }
      sendJson(response, 200, state);
      return;
    }

    const orderId = routeId(url.pathname, "/orders");
    if (request.method === "POST" && orderId) {
      const body = await readJson(request);
      if (typeof body.text !== "string" || body.text.trim().length < 2 || body.text.length > 4000 || typeof body.recipientId !== "string") {
        const error = new Error("recipientId and text are required"); error.statusCode = 400; throw error;
      }
      const result = await store.createOrder(principal.id, orderId, { ...body, text: body.text.trim() });
      if (result.kind === "missing") { const error = new Error("game not found"); error.statusCode = 404; throw error; }
      if (result.kind === "invalid") { const error = new Error(result.message); error.statusCode = result.message === "game has not started" ? 409 : 400; throw error; }
      sendJson(response, result.duplicate ? 200 : 201, result);
      return;
    }

    const eventsId = routeId(url.pathname, "/events");
    if (request.method === "GET" && eventsId) {
      const state = await store.getState(principal.id, eventsId);
      if (!state) { const error = new Error("game not found"); error.statusCode = 404; throw error; }
      let cursor = Number(url.searchParams.get("after") || request.headers["last-event-id"] || 0);
      response.writeHead(200, { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-accel-buffering": "no" });
      response.write(`event: snapshot\ndata: ${JSON.stringify(state)}\n\n`);
      const timer = setInterval(async () => {
        try {
          const events = await store.getEvents(principal.id, eventsId, cursor);
          if (events === null) { clearInterval(timer); response.end(); return; }
          for (const event of events) { cursor = event.id; response.write(`id: ${event.id}\nevent: world_event\ndata: ${JSON.stringify(event)}\n\n`); }
          response.write(`: heartbeat ${Date.now()}\n\n`);
        } catch { clearInterval(timer); response.end(); }
      }, Number(process.env.SSE_POLL_MS || 2000));
      request.on("close", () => clearInterval(timer));
      return;
    }
    sendJson(response, 404, { error: "not_found" });
  } catch (error) { errorResponse(response, error); }
}

const server = createServer((request, response) => { handle(request, response); });
server.requestTimeout = 0;
server.keepAliveTimeout = 65_000;
server.listen(port, "0.0.0.0", () => console.log(`[shapan-api] listening on ${port}`));

async function shutdown() {
  server.close();
  await store.close();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
