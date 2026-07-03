import { describe, expect, it } from "vitest";

describe("detached pathogen_button_to markup", () => {
  it("submits the sibling form referenced by the button form attribute", () => {
    document.body.innerHTML = `
      <div class="flex justify-end gap-2">
        <form id="delete-specimen-001" class="button_to hidden" method="post" action="/specimens/1">
          <input type="hidden" name="_method" value="delete" autocomplete="off">
          <input type="hidden" name="token" value="abc" autocomplete="off">
        </form>
        <button id="delete-button" form="delete-specimen-001" type="submit" data-turbo-confirm="Delete specimen-001?">
          Delete
        </button>
      </div>
    `;

    const form = document.getElementById("delete-specimen-001");
    const button = document.getElementById("delete-button");
    const submittedEntries = [];
    let submitter = null;

    form.addEventListener("submit", (event) => {
      submitter = event.submitter;
      submittedEntries.push(...Array.from(new FormData(form).entries()));
      event.preventDefault();
    });

    button.click();

    expect(button.form).toBe(form);
    expect(submitter).toBe(button);
    expect(submittedEntries).toEqual([
      ["_method", "delete"],
      ["token", "abc"],
    ]);
    expect(button.dataset.turboConfirm).toBe("Delete specimen-001?");
  });
});
