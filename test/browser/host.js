import { Application } from "@hotwired/stimulus";
import { registerPathogenControllers } from "pathogen_view_components";

const application = Application.start();
registerPathogenControllers(application);
window.pathogenBrowser = { application, events: [] };
for (const name of ["before-close", "opened", "closed"]) {
  document.addEventListener(`pathogen--dialog:${name}`, (event) => {
    window.pathogenBrowser.events.push({ name, reason: event.detail?.reason, id: event.target.id });
  });
}
document.querySelector("#main-form").addEventListener("submit", (event) => {
  event.preventDefault();
  document.querySelector("#form-status").textContent = "Saved project name";
});
