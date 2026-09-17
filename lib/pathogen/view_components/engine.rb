# frozen_string_literal: true

require 'rails/engine'
require 'view_component'
require 'view_component/version'
require_relative '../button_to_helper'
require_relative '../view_helper'
require_relative '../form_helper'
require_relative '../form_tag_helper'

module Pathogen
  module ViewComponents
    # :nodoc:
    class Engine < ::Rails::Engine
      isolate_namespace Pathogen::ViewComponents

      config.autoload_paths = %W[
        #{root}/lib
      ]

      config.eager_load_paths = %W[
        #{root}/app/components
        #{root}/app/lib
      ]

      # Set options for ViewComponent
      config.view_component.raise_on_invalid_options = false
      config.view_component.silence_deprecations = false
      config.view_component.validate_class_names = !Rails.env.production?
      config.view_component.raise_on_invalid_aria = !Rails.env.production?

      initializer 'pathogen_view_components' do
        ActiveSupport.on_load(:action_view) do
          include Pathogen::ButtonToHelper
          include Pathogen::ViewHelper
          include Pathogen::FormHelper
          include Pathogen::FormTagHelper
        end
      end

      initializer 'pathogen_view_components.assets' do |app|
        if app.config.respond_to?(:assets)
          app.config.assets.precompile += %w[pathogen_view_components.css]

          # Hosts bundle JavaScript; publish only the precompiled component CSS.
          if app.config.assets.respond_to?(:excluded_paths)
            app.config.assets.excluded_paths += [
              root.join('app/assets/stylesheets/pathogen').to_s,
              root.join('app/assets/javascripts').to_s
            ]
          end
        end
      end
    end
  end
end
