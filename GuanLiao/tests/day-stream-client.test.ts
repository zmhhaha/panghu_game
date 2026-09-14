import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

function client(fetchMock: typeof fetch) {
  const window: Record<string, any> = {};
  runInNewContext(readFileSync(new URL("../agent-client.js", import.meta.url), "utf8"), {
    window, fetch: fetchMock, AbortController, TextDecoder, setTimeout, clearTimeout, console,
  });
  return window.GuanLiaoAgents;
}
const dayRunId = "59c84758-9b7c-4d20-9da1-caa0909c7f23";
function stream(text: string) {
  const bytes = new TextEncoder().encode(text);
  let index = 0;
  return new Response(new ReadableStream({
    pull(controller) {
      if (index === bytes.length) controller.close();
      else controller.enqueue(bytes.slice(index, ++index));
    },
  }), { headers: { "content-type": "text/event-stream" } });
}

describe("day stream client", () => {
  it("decodes fragmented UTF-8 and CRLF events before the final result", async () => {
    const progress = { dayRunId, status: "completed", report: "奉结。河堤已经合龙。" };
    const final = { dayRunId, propagation: [], completions: [] };
    const fetchMock = vi.fn(async () => stream(
      ": heartbeat\r\n\r\nevent: progress\r\ndata: " + JSON.stringify(progress)
      + "\r\n\r\nevent: result\r\ndata: " + JSON.stringify(final) + "\r\n\r\n",
    ));
    const received = vi.fn();
    expect(await client(fetchMock).day({ dayRunId }, received)).toEqual(final);
    expect(received).toHaveBeenCalledWith(progress);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a truncated stream and never retries automatically", async () => {
    const fetchMock = vi.fn(async () => stream(": heartbeat\n\n"));
    await expect(client(fetchMock).day({ dayRunId }, () => {})).rejects.toThrow("Missing final day result");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects events from a different day", async () => {
    const fetchMock = vi.fn(async () => stream('event: result\ndata: {"dayRunId":"other"}\n\n'));
    await expect(client(fetchMock).day({ dayRunId }, () => {})).rejects.toThrow("Day identity mismatch");
  });
});
