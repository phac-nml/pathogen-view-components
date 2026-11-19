import { Application } from "@hotwired/stimulus";
import { registerPathogenControllers } from "../../app/assets/javascripts/pathogen_view_components.js";

registerPathogenControllers(Application.start());
