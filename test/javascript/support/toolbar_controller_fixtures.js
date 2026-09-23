export const TOOLBAR_ACTIONS =
  "keydown->pathogen--toolbar#handleKeyDown focusin->pathogen--toolbar#handleFocusIn click->pathogen--toolbar#handleClick:capture";

export const toolbarShell = (innerHtml) => `
  <div id="toolbar-shell">
    <div
      role="toolbar"
      data-controller="pathogen--toolbar"
      data-action="${TOOLBAR_ACTIONS}"
    >
      ${innerHtml}
    </div>
  </div>
`;

export const toolbarMarkup = ({ includeInput = false } = {}) =>
  toolbarShell(`
      <button id="item-one" type="button" data-pathogen--toolbar-target="item" tabindex="-1">One</button>
      <button id="item-two" type="button" data-pathogen--toolbar-target="item" tabindex="-1">Two</button>
      <button id="item-three" type="button" data-pathogen--toolbar-target="item" tabindex="-1">Three</button>
      ${
        includeInput
          ? '<input id="item-search" type="search" data-pathogen--toolbar-target="item" tabindex="-1" value="abc" />'
          : ""
      }
    `);
