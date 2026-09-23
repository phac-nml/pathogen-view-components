# frozen_string_literal: true

pin 'pathogen_view_components', to: 'pathogen_view_components.js'
pin_all_from Pathname.new(__dir__).join('../app/assets/javascripts/pathogen_view_components'),
             under: 'pathogen_view_components'
