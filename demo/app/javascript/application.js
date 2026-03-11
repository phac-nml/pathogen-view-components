import "@hotwired/turbo-rails";
import { Application } from "@hotwired/stimulus";
import { registerPathogenControllers } from "pathogen_view_components";

const application = Application.start();
registerPathogenControllers(application);
