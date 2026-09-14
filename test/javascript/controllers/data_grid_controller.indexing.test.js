import { Application } from "@hotwired/stimulus";
import { afterEach, expect, it, vi } from "vitest";

import DataGridController from "../../../app/assets/javascripts/pathogen_view_components/data_grid_controller";

let application;

afterEach(() => {
  application?.stop();
  document.body.innerHTML = "";
});

it("reuses logical cell indexes when focus moves inside the rendered window", async () => {
  const rows = Array.from({ length: 100 }, (_, index) => {
    const cells = [0, 1, 2].map(
      (column) => `<div role="gridcell" tabindex="${index === 0 && column === 0 ? 0 : -1}"
        data-pathogen--data-grid-target="cell" data-pathogen--data-grid-row-index="${index + 1}"
        data-pathogen--data-grid-column-index="${column}">Row ${index + 1}</div>`,
    );
    return `<div role="row" style="height:40px">${cells.join("")}</div>`;
  });
  document.body.innerHTML = `<div data-controller="pathogen--data-grid">
    <div data-pathogen--data-grid-target="scrollContainer">
      <div role="grid" data-pathogen--data-grid-target="grid" data-pvc-data-grid-column-widths="100,100,100">
        <div data-pathogen--data-grid-target="viewport"><div class="pvc-data-grid__spacer"></div>${rows.join("")}</div>
      </div>
    </div>
    <p data-pathogen--data-grid-target="virtualStatus"></p>
  </div>`;
  const scroll = document.querySelector('[data-pathogen--data-grid-target="scrollContainer"]');
  Object.defineProperties(scroll, { clientHeight: { value: 200 }, clientWidth: { value: 300 } });
  const distantCell = document.querySelector('[data-pathogen--data-grid-row-index="100"]');
  application = Application.start();
  application.register("pathogen--data-grid", DataGridController);
  await Promise.resolve();
  await Promise.resolve();

  const first = document.querySelector('[role="gridcell"]');
  first.focus();
  first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
  await Promise.resolve();
  const readDistantCell = vi.spyOn(distantCell, "getAttribute");
  expect(distantCell.isConnected).toBe(false);

  document.activeElement.dispatchEvent(
    new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true }),
  );

  expect(document.activeElement).toBe(first);
  expect(readDistantCell).not.toHaveBeenCalled();
});
