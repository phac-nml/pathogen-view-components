export class PaginationStatusPresenter {
  #grid;
  #status;
  #position;
  #retry;
  #refresh;
  #virtualStatusMessage;

  constructor({ grid, status, position, retry, refresh, virtualStatusMessage }) {
    this.#grid = grid;
    this.#status = status;
    this.#position = position;
    this.#retry = retry;
    this.#refresh = refresh;
    this.#virtualStatusMessage = virtualStatusMessage;
  }

  get hasStatus() {
    return this.#status instanceof HTMLElement;
  }

  setBusy({ isBusy, paginationError, hasMore, cursorMode, totalRows }) {
    if (!this.hasStatus) return false;

    this.#grid?.setAttribute("aria-busy", String(isBusy));
    const key = isBusy ? "loadingText" : paginationError || (hasMore ? "loadedText" : "endText");
    this.#status.textContent =
      !isBusy && !paginationError && !cursorMode
        ? this.#virtualStatusMessage("loadedText", "")
        : this.message(key, {
            count: totalRows,
          });

    return true;
  }

  showError(refreshRequired) {
    if (!this.hasStatus) return null;

    const recoverWithRefresh = refreshRequired === true && this.#hasRefreshControl();
    const key = recoverWithRefresh ? "mismatchText" : "fetchErrorText";

    this.#status.textContent = this.message(key);
    if (this.#retry instanceof HTMLElement) this.#retry.hidden = recoverWithRefresh;
    if (this.#refresh instanceof HTMLElement) this.#refresh.hidden = !recoverWithRefresh;

    return key;
  }

  #hasRefreshControl() {
    return this.#refresh instanceof HTMLElement && this.#refresh.isConnected;
  }

  clearRecovery(activeElement) {
    if (!this.hasStatus) return false;

    const retryHadFocus = this.#retry instanceof HTMLElement && activeElement === this.#retry;
    if (this.#retry instanceof HTMLElement) this.#retry.hidden = true;
    if (this.#refresh instanceof HTMLElement) this.#refresh.hidden = true;

    return retryHadFocus;
  }

  updatePosition({ start, end, count, total }) {
    if (!(this.#position instanceof HTMLElement) || !this.hasStatus) return;

    this.#position.textContent = this.message(total === null ? "rangeText" : "rangeTotalText", {
      start,
      end,
      count,
      total,
    });
  }

  message(key, values = {}) {
    const template = this.#status?.dataset[key] || "";
    return template.replace(/%\{(\w+)\}/g, (_, name) => String(values[name] ?? ""));
  }
}
