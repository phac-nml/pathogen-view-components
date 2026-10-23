// Preview frames are static, so they only need Stimulus and the Pathogen controllers.
import { Application } from "@hotwired/stimulus";
import { registerPathogenControllers } from "pathogen_view_components";

registerPathogenControllers(Application.start());
