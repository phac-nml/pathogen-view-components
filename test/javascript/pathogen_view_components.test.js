import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CopyableValueController,
  DataGridController,
  DisclosureController,
  registerPathogenControllers,
  SidebarController,
  TabsController,
  ToolbarController,
  TooltipController,
} from "../../app/assets/javascripts/pathogen_view_components";

const createApplication = () => ({ register: vi.fn() });

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("pathogen_view_components entrypoint", () => {
  it("exports every Pathogen controller", () => {
    expect(TabsController).toBeTypeOf("function");
    expect(TooltipController).toBeTypeOf("function");
    expect(DisclosureController).toBeTypeOf("function");
    expect(DataGridController).toBeTypeOf("function");
    expect(SidebarController).toBeTypeOf("function");
    expect(ToolbarController).toBeTypeOf("function");
    expect(CopyableValueController).toBeTypeOf("function");
  });

  it("registers all controllers under their Pathogen identifiers", () => {
    const application = createApplication();

    registerPathogenControllers(application);

    expect(application.register.mock.calls).toEqual([
      ["pathogen--tabs", TabsController],
      ["pathogen--tooltip", TooltipController],
      ["pathogen--disclosure", DisclosureController],
      ["pathogen--data-grid", DataGridController],
      ["pathogen--sidebar", SidebarController],
      ["pathogen--toolbar", ToolbarController],
      ["pathogen--copyable-value", CopyableValueController],
    ]);
  });

  it("logs a debug summary when running in development", () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.stubEnv("DEV", true);

    registerPathogenControllers(createApplication());

    expect(debug).toHaveBeenCalledWith("[pathogen] Registered 7 Stimulus controllers");
  });

  it("stays silent outside of development", () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.stubEnv("DEV", false);

    registerPathogenControllers(createApplication());

    expect(debug).not.toHaveBeenCalled();
  });

  it("logs an error and skips registration for an invalid application", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    registerPathogenControllers(null);
    registerPathogenControllers({});

    expect(error).toHaveBeenCalledTimes(2);
    expect(error).toHaveBeenCalledWith("[pathogen] Invalid Stimulus application instance");
  });
});
