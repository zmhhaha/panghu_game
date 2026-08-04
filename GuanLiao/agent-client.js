(() => {
  "use strict";

  const AGENT_TIMEOUT_MS = 25000;
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
    try {
      const response = await fetchWithTimeout(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      }, AGENT_TIMEOUT_MS);
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
    async propagate(payload) {
      return agentRequest("/api/agents/propagate", payload);
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
