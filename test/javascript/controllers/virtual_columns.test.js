import { describe, expect, it } from "vitest";

import { CenterColumnWindow } from "../../../app/assets/javascripts/pathogen_view_components/data_grid_controller/virtual_columns";

function buildRow() {
  document.body.innerHTML = `<div role="row"><div data-pvc-data-grid-lane="center">${Array.from(
    { length: 6 },
    (_, index) =>
      `<div role="gridcell" tabindex="-1" data-pathogen--data-grid-column-index="${index + 1}"><button>Action ${index + 1}</button></div>`,
  ).join("")}</div></div>`;
  const row = document.querySelector('[role="row"]');
  const lane = row.firstElementChild;
  const cells = Array.from(lane.children);
  const window = new CenterColumnWindow({ pinnedCount: () => 1, cellSelector: '[role="gridcell"]' });
  return { row, lane, cells, window };
}

describe("CenterColumnWindow incremental rendering", () => {
  it("makes no DOM or style mutations when the lane range is unchanged", () => {
    const { row, lane, window } = buildRow();
    const range = { startIndex: 1, endIndex: 4 };
    window.apply(row, range);
    const observer = new MutationObserver(() => {});
    observer.observe(lane, { childList: true, attributes: true, subtree: true });

    window.apply(row, range);

    expect(observer.takeRecords()).toEqual([]);
    observer.disconnect();
  });

  it("only removes the leaving cell and inserts the entering cell", () => {
    const { row, lane, cells, window } = buildRow();
    window.apply(row, { startIndex: 1, endIndex: 4 });
    const observer = new MutationObserver(() => {});
    observer.observe(lane, { childList: true, attributes: true, subtree: true });

    window.apply(row, { startIndex: 2, endIndex: 5 });

    const changes = observer.takeRecords();
    expect(changes.flatMap((change) => Array.from(change.removedNodes))).toEqual([cells[0]]);
    expect(changes.flatMap((change) => Array.from(change.addedNodes))).toEqual([cells[3]]);
    expect(changes.filter((change) => change.type === "attributes")).toEqual([]);
    expect(Array.from(lane.children)).toEqual(cells.slice(1, 4));
    observer.disconnect();
  });

  it("keeps an offscreen focused cell connected and releases it when retention changes", () => {
    const { row, lane, cells, window } = buildRow();
    window.apply(row, { startIndex: 1, endIndex: 4 });
    const button = cells[0].querySelector("button");
    button.focus();
    const observer = new MutationObserver(() => {});
    observer.observe(lane, { childList: true });

    window.apply(row, { startIndex: 4, endIndex: 7 }, cells[0]);

    expect(document.activeElement).toBe(button);
    expect(Array.from(lane.children)).toEqual([cells[0], ...cells.slice(3)]);
    expect(observer.takeRecords().flatMap((change) => Array.from(change.removedNodes))).not.toContain(cells[0]);

    cells[3].querySelector("button").focus();
    window.apply(row, { startIndex: 4, endIndex: 7 }, cells[3]);
    expect(Array.from(lane.children)).toEqual(cells.slice(3));
    observer.disconnect();
  });

  it("restores all original cells in order and allows the same range to be applied again", () => {
    const { row, lane, cells, window } = buildRow();
    const range = { startIndex: 3, endIndex: 5 };
    window.apply(row, range);

    window.restore(row);
    expect(Array.from(lane.children)).toEqual(cells);
    expect(window.allCellsForRow(row)).toEqual(cells);

    window.apply(row, range);
    expect(Array.from(lane.children)).toEqual(cells.slice(2, 4));
  });
});
