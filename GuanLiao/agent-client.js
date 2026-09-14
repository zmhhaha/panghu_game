(() => {
  "use strict";

  const AGENT_TIMEOUT_MS = 75000;
  const STATE_TIMEOUT_MS = 8000;
  let agentApiUnavailable = false;
  let stateMutationQueue = Promise.resolve();

  async function fetchWithTimeout(path, options, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(path, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async function agentRequest(path, payload) {
    if (agentApiUnavailable) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS);
    try {
      const response = await fetch(path, {
        signal: controller.signal,
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (response.status === 404 || response.status === 405 || response.status === 501) {
        agentApiUnavailable = true;
        return null;
      }
      if (!response.ok) throw new Error(`Agent API HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.warn("GuanLiao Agent API unavailable; using deterministic fallback", error);
      }
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  async function loadServerState() {
    try {
      const response = await fetchWithTimeout("/api/state", {
        method: "GET",
        headers: { accept: "application/json" },
        cache: "no-store"
      }, STATE_TIMEOUT_MS);
      const isJson = response.headers.get("content-type")?.includes("application/json");
      if (response.status === 404 && isJson) return { available: true, state: null, updatedAt: null };
      if (!response.ok || !isJson) return { available: false, state: null, updatedAt: null };
      const value = await response.json();
      return { available: true, state: value.state ?? null, updatedAt: value.updatedAt ?? null };
    } catch {
      return { available: false, state: null, updatedAt: null };
    }
  }

  function enqueueStateMutation(operation) {
    const result = stateMutationQueue.then(operation, operation);
    stateMutationQueue = result.then(() => undefined, () => undefined);
    return result;
  }

  function saveServerState(state) {
    return enqueueStateMutation(async () => {
      try {
        const response = await fetchWithTimeout("/api/state", {
          method: "PUT",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ state })
        }, STATE_TIMEOUT_MS);
        return response.ok;
      } catch {
        return false;
      }
    });
  }

  function clearServerState() {
    return enqueueStateMutation(async () => {
      try {
        const response = await fetchWithTimeout("/api/state", { method: "DELETE" }, STATE_TIMEOUT_MS);
        return response.ok;
      } catch {
        return false;
      }
    });
  }

  window.GuanLiaoAgents = {
    async day(payload, onProgress, parentSignal) {
      const controller = new AbortController();
      const cancel = () => controller.abort(parentSignal?.reason);
      if (parentSignal?.aborted) cancel();
      else parentSignal?.addEventListener("abort", cancel, { once: true });
      const timer = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS);
      let reader;
      try {
        const response = await fetch("/api/agents/day", {
          method: "POST", signal: controller.signal,
          headers: { "content-type": "application/json", accept: "text/event-stream" },
          body: JSON.stringify(payload)
        });
        if (!response.ok || !response.body || !response.headers.get("content-type")?.includes("text/event-stream")) {
          throw new Error("Day stream unavailable");
        }
        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "", result = null;
        const consume = () => {
          let boundary;
          while ((boundary = buffer.indexOf("\n\n")) >= 0) {
            const frame = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            const lines = frame.split("\n");
            const event = lines.find(line => line.startsWith("event:"))?.slice(6).trim();
            const data = lines.filter(line => line.startsWith("data:")).map(line => line.slice(5).trimStart()).join("\n");
            if (!data) continue;
            const value = JSON.parse(data);
            if (value.dayRunId !== payload.dayRunId) throw new Error("Day identity mismatch");
            if (event === "failure") throw new Error("Day stream interrupted");
            if (event === "progress" && !result) onProgress?.(value);
            if (event === "result") {
              if (result) throw new Error("Duplicate day result");
              result = value;
            }
          }
        };
        while (true) {
          const { value, done } = await reader.read();
          buffer += decoder.decode(value, { stream: !done });
          buffer = buffer.replace(/\r\n/g, "\n");
          if (buffer.length > 4 * 1024 * 1024) throw new Error("Day frame too large");
          consume();
          if (result) return result;
          if (done) throw new Error("Missing final day result");
        }
      } finally {
        clearTimeout(timer);
        parentSignal?.removeEventListener("abort", cancel);
        await reader?.cancel().catch(() => {});
        controller.abort();
      }
    },
    async propagate(payload) {
      return agentRequest("/api/agents/propagate", payload);
    },
    async propagateBatch(payload) {
      return agentRequest("/api/agents/propagate-batch", payload);
    },
    async complete(payload) {
      return agentRequest("/api/agents/complete", payload);
    },
    resetAvailability() {
      agentApiUnavailable = false;
    }
  };

  window.GuanLiaoState = {
    load: loadServerState,
    save: saveServerState,
    clear: clearServerState
  };
})();
