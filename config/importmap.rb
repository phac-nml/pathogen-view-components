# frozen_string_literal: true

# Pin pathogen controllers individually for importmap
# Note: pin_all_from doesn't work reliably with engine paths, so we pin explicitly
pin 'pathogen_view_components/tabs_controller', to: 'pathogen_view_components/tabs_controller.js'
pin 'pathogen_view_components/tooltip_controller', to: 'pathogen_view_components/tooltip_controller.js'
pin 'pathogen_view_components/data_grid_controller', to: 'pathogen_view_components/data_grid_controller.js'
pin 'pathogen_view_components/toolbar_controller', to: 'pathogen_view_components/toolbar_controller.js'
pin 'pathogen_view_components/toolbar_controller/constants',
    to: 'pathogen_view_components/toolbar_controller/constants.js'
pin 'pathogen_view_components/toolbar_controller/roving_focus',
    to: 'pathogen_view_components/toolbar_controller/roving_focus.js'
pin 'pathogen_view_components/toolbar_controller/text_entry',
    to: 'pathogen_view_components/toolbar_controller/text_entry.js'
pin 'pathogen_view_components/toolbar_controller/visibility',
    to: 'pathogen_view_components/toolbar_controller/visibility.js'
pin 'pathogen_view_components/data_grid_controller/navigation',
    to: 'pathogen_view_components/data_grid_controller/navigation.js'
pin 'pathogen_view_components/data_grid_controller/scroll',
    to: 'pathogen_view_components/data_grid_controller/scroll.js'
pin 'pathogen_view_components/data_grid_controller/widget_mode',
    to: 'pathogen_view_components/data_grid_controller/widget_mode.js'
pin 'pathogen_view_components/data_grid_controller/virtualizer',
    to: 'pathogen_view_components/data_grid_controller/virtualizer.js'
pin 'pathogen_view_components/data_grid_controller/page_cache',
    to: 'pathogen_view_components/data_grid_controller/page_cache.js'
pin 'pathogen_view_components/data_grid_controller/page_source',
    to: 'pathogen_view_components/data_grid_controller/page_source.js'
pin 'pathogen_view_components/data_grid_controller/paginated_virtual_rows',
    to: 'pathogen_view_components/data_grid_controller/paginated_virtual_rows.js'
pin 'pathogen_view_components/data_grid_controller/pagination_mode',
    to: 'pathogen_view_components/data_grid_controller/pagination_mode.js'
pin 'pathogen_view_components/data_grid_controller/virtual_window',
    to: 'pathogen_view_components/data_grid_controller/virtual_window.js'
pin 'pathogen_view_components/data_grid_controller/virtual_columns',
    to: 'pathogen_view_components/data_grid_controller/virtual_columns.js'

# Pin main entry point
pin 'pathogen_view_components', to: 'pathogen_view_components.js'

# Controller dependencies
pin 'uuid', to: 'https://cdn.jsdelivr.net/npm/uuid@13.0.0/+esm'
pin '@floating-ui/dom', to: 'https://cdn.jsdelivr.net/npm/@floating-ui/dom@1.7.6/+esm'
pin '@floating-ui/core', to: 'https://cdn.jsdelivr.net/npm/@floating-ui/core@1.7.5/+esm'
pin '@floating-ui/utils', to: 'https://cdn.jsdelivr.net/npm/@floating-ui/utils@0.2.11/+esm'
pin '@floating-ui/utils/dom', to: 'https://cdn.jsdelivr.net/npm/@floating-ui/utils@0.2.11/dom/+esm'
