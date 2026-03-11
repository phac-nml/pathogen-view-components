// Import all Pathogen controllers using importmap-mapped paths
import TabsController from "pathogen_view_components/tabs_controller";
import TooltipController from "pathogen_view_components/tooltip_controller";
import DataGridController from "pathogen_view_components/data_grid_controller";

function registerPathogenControllers(application) {
  if (!application || typeof application.register !== "function") {
    console.error("[pathogen] Invalid Stimulus application instance");
    return;
  }

  application.register("pathogen--tabs", TabsController);
  application.register("pathogen--tooltip", TooltipController);
  application.register("pathogen--data-grid", DataGridController);

  if (import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[pathogen] Registered 3 Stimulus controllers");
  }
}

export { TabsController, TooltipController, DataGridController, registerPathogenControllers };
