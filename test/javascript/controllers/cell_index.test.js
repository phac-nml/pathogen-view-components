import { expect, it } from "vitest";

import { CellIndex } from "../../../app/assets/javascripts/pathogen_view_components/data_grid_controller/cell_index";

const cell = (row, column) => {
  const element = document.createElement("div");
  element.setAttribute("data-pathogen--data-grid-row-index", row);
  element.setAttribute("data-pathogen--data-grid-column-index", column);
  return element;
};

it("indexes detached cells and returns no match for a missing coordinate", () => {
  const first = cell(1, 0);
  const last = cell(1, 2);
  const index = new CellIndex(() => [first, last]);

  expect(index.at(1, 2)).toBe(last);
  expect(index.at(1, 1)).toBeNull();
  expect(index.at(2, 0)).toBeNull();
  expect(index.has(first)).toBe(true);
  expect(index.indexOf(first)).toBe(0);
  expect(index.indexOf(cell(1, 0))).toBe(-1);
});

it("replaces stale cell identities after the source changes", () => {
  const oldCell = cell(1, 0);
  const replacement = cell(1, 0);
  let cells = [oldCell];
  const index = new CellIndex(() => cells);
  expect(index.at(1, 0)).toBe(oldCell);

  cells = [replacement];
  index.invalidate();

  expect(index.has(oldCell)).toBe(false);
  expect(index.at(1, 0)).toBe(replacement);
  expect(index.rows.get(1)).toEqual([replacement]);
});
