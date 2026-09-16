import "@hotwired/turbo-rails";
import { Application, Controller } from "@hotwired/stimulus";
import {
  registerPathogenControllers,
  TabsController,
  TooltipController,
  DisclosureController,
  DataGridController,
} from "pathogen_view_components";

const application = Application.start();
const registrations = [];
const register = application.register.bind(application);
application.register = (identifier, controller) => {
  registrations.push(identifier);
  register(identifier, controller);
};
registerPathogenControllers(application);
window.pathogenHost = {
  application,
  Controller,
  registrations,
  controllerExports: { TabsController, TooltipController, DisclosureController, DataGridController },
};
