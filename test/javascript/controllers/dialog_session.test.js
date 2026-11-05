import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DialogSession } from "../../../app/assets/javascripts/pathogen_view_components/dialog_controller/session";

describe("DialogSession", () => {
  let dialog;
  let onClose;

  beforeEach(() => {
    document.body.innerHTML = '<dialog id="dialog"></dialog>';
    dialog = document.getElementById("dialog");
    dialog.showModal = vi.fn(() => {
      dialog.open = true;
    });
    dialog.close = vi.fn(() => {
      dialog.open = false;
    });
    onClose = vi.fn();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("opens once and shares the modal scroll ownership", () => {
    const session = new DialogSession({ dialog, trigger: null, onClose });

    expect(session.open()).toBe(true);
    expect(session.open()).toBe(false);
    expect(dialog.showModal).toHaveBeenCalledOnce();
    expect(document.body.style.overflow).toBe("hidden");

    session.finish();
    expect(onClose).toHaveBeenCalledOnce();
    expect(onClose.mock.calls[0][0]).toMatchObject({
      reason: "programmatic",
      restoreFocus: true,
      trigger: null,
    });
    expect(document.body.style.overflow).toBe("");
    session.finish();
  });

  it("closes with the requested reason and focus policy", () => {
    const trigger = document.createElement("button");
    const session = new DialogSession({ dialog, trigger, onClose });
    session.open();

    expect(session.close({ restoreFocus: false, reason: "cancel" })).toBe(true);
    expect(dialog.close).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledWith({ reason: "cancel", restoreFocus: false, trigger });
    expect(session.close()).toBe(false);
  });

  it("finishes an already-closed native dialog and ignores an open one", () => {
    const session = new DialogSession({ dialog, trigger: null, onClose });
    session.open();

    session.nativeClose();
    expect(onClose).not.toHaveBeenCalled();
    dialog.open = false;
    session.nativeClose();
    expect(onClose).toHaveBeenCalledOnce();

    const closedSession = new DialogSession({ dialog, trigger: null, onClose });
    expect(closedSession.close()).toBe(false);
  });
});
