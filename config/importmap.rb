# frozen_string_literal: true

# Pin pathogen controllers individually for importmap
# Note: pin_all_from doesn't work reliably with engine paths, so we pin explicitly
pin 'pathogen_view_components/tabs_controller', to: 'pathogen_view_components/tabs_controller.js'
pin 'pathogen_view_components/tooltip_controller', to: 'pathogen_view_components/tooltip_controller.js'
pin 'pathogen_view_components/data_grid_controller', to: 'pathogen_view_components/data_grid_controller.js'

# Pin main entry point
pin 'pathogen_view_components', to: 'pathogen_view_components.js'

# Controller dependencies
pin 'uuid', to: 'https://cdn.jsdelivr.net/npm/uuid@13.0.0/+esm'
pin '@floating-ui/dom', to: 'https://cdn.jsdelivr.net/npm/@floating-ui/dom@1.7.6/+esm'
pin '@floating-ui/core', to: 'https://cdn.jsdelivr.net/npm/@floating-ui/core@1.7.5/+esm'
pin '@floating-ui/utils', to: 'https://cdn.jsdelivr.net/npm/@floating-ui/utils@0.2.11/+esm'
pin '@floating-ui/utils/dom', to: 'https://cdn.jsdelivr.net/npm/@floating-ui/utils@0.2.11/dom/+esm'
