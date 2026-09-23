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

          javascript_assets_path = root.join('app/assets/javascripts').to_s

          # Hosts bundle JavaScript; publish only the precompiled component CSS.
          if app.config.assets.respond_to?(:excluded_paths)
            app.config.assets.excluded_paths += [
              root.join('app/assets/stylesheets/pathogen').to_s
            ]

            if app.config.respond_to?(:importmap)
              app.config.assets.excluded_paths.delete_if { |path| path.to_s == javascript_assets_path }
            else
              app.config.assets.excluded_paths << javascript_assets_path
            end
          end

          if app.config.respond_to?(:importmap) && app.config.assets.paths.exclude?(javascript_assets_path)
            app.config.assets.paths << javascript_assets_path
          end
        end
      end

      initializer 'pathogen_view_components.importmap', before: 'importmap' do |app|
        next unless app.config.respond_to?(:importmap)

        importmap_config_path = root.join('config/importmap.rb')
        if app.config.importmap.paths.exclude?(importmap_config_path)
          app.config.importmap.paths << importmap_config_path
        end

        javascript_assets_path = root.join('app/assets/javascripts')
        if app.config.importmap.cache_sweepers.exclude?(javascript_assets_path)
          app.config.importmap.cache_sweepers << javascript_assets_path
        end
      end
    end
  end
end
