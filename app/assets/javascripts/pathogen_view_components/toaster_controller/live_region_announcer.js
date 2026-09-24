const ANNOUNCE_DEBOUNCE_MS = 75;

class LiveRegionAnnouncer {
  #hostElement;
  #resolvePoliteTarget;
  #resolveAssertiveTarget;
  #debounceMs;
  #queue = { polite: [], assertive: [] };
  #flushTimeout = null;
  #flushHandle = null;

  constructor({ hostElement, politeTarget, assertiveTarget, debounceMs = ANNOUNCE_DEBOUNCE_MS }) {
    this.#hostElement = hostElement;
    this.#resolvePoliteTarget = politeTarget;
    this.#resolveAssertiveTarget = assertiveTarget;
    this.#debounceMs = debounceMs;
  }

  disconnect() {
    if (this.#flushTimeout) {
      clearTimeout(this.#flushTimeout);
      this.#flushTimeout = null;
    }

    if (this.#flushHandle) {
      cancelAnimationFrame(this.#flushHandle);
      this.#flushHandle = null;
    }

    this.#queue = { polite: [], assertive: [] };
  }

  announce({ message, politeness = "polite" }) {
    const normalizedMessage = typeof message === "string" ? message.trim() : "";
    if (normalizedMessage.length === 0) return;

    const queueName = politeness === "assertive" ? "assertive" : "polite";
    this.#queue[queueName].push(normalizedMessage);
    this.#scheduleFlush();
  }

  #scheduleFlush() {
    if (this.#flushTimeout) clearTimeout(this.#flushTimeout);

    this.#flushTimeout = window.setTimeout(() => {
      this.#flushTimeout = null;
      if (!this.#hostElement?.isConnected) return;

      this.#flushHandle = requestAnimationFrame(() => {
        this.#flushHandle = null;
        if (!this.#hostElement?.isConnected) return;

        this.#flushRegion("polite");
        this.#flushRegion("assertive");
      });
    }, this.#debounceMs);
  }

  #flushRegion(politeness) {
    const messages = this.#queue[politeness];
    this.#queue[politeness] = [];

    const target = politeness === "assertive" ? this.#resolveAssertiveTarget?.() : this.#resolvePoliteTarget?.();
    if (!target || messages.length === 0) return;

    const text = messages
      .map((part, index) => (index < messages.length - 1 && !/[.!?]$/.test(part) ? `${part}.` : part))
      .join(" ");

    this.#write(target, text);
  }

  #write(target, text) {
    if (target.textContent === text) {
      target.textContent = "";
      requestAnimationFrame(() => {
        if (!target.isConnected) return;
        target.textContent = text;
      });
      return;
    }

    target.textContent = text;
  }
}

export { ANNOUNCE_DEBOUNCE_MS, LiveRegionAnnouncer };
