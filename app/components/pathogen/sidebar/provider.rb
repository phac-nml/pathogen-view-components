# frozen_string_literal: true

module Pathogen
  class Sidebar
    # Wrapper that owns sidebar mode, persistence, and overlay state.
    class Provider < Pathogen::Component
      BASE_CLASSES = %w[
        pathogen-sidebar-provider
        relative flex min-h-screen w-full items-stretch
      ].join(' ').freeze

      SIDEBAR_VALUE_DEFAULTS = {
        'pathogen--sidebar-breakpoint-value' => '(min-width: 80rem)'
      }.freeze

      def initialize(id: 'sidebar', open: true, **system_arguments)
        @id = id
        @open = open
        @system_arguments = system_arguments
      end

      def call
        tag.div(**provider_attributes) do
          safe_join([
                      tag.div(**overlay_attributes),
                      content
                    ])
        end
      end

      private

      def provider_attributes
        {
          class: class_names(BASE_CLASSES, @system_arguments[:class]),
          style: css_variables,
          data: root_data_attributes,
          **@system_arguments.except(:class, :data, :style)
        }
      end

      def css_variables
        incoming = @system_arguments[:style].to_s.strip
        vars = '--pathogen-sidebar-width:16rem;--pathogen-sidebar-width-rail:3.25rem;'
        return vars if incoming.blank?

        "#{incoming.chomp(';')};#{vars}"
      end

      def root_data_attributes
        incoming = (@system_arguments[:data] || {}).deep_stringify_keys

        # Component-owned wiring (controller list, open state, storage key) is
        # merged last so callers can override labels/breakpoint but not internals.
        SIDEBAR_VALUE_DEFAULTS
          .merge(translated_values)
          .merge(incoming)
          .merge(
            'controller' => merged_controllers(incoming),
            'pathogen--sidebar-open-value' => @open,
            'pathogen--sidebar-storage-key-value' => Pathogen::Sidebar.storage_key(@id)
          )
      end

      def merged_controllers(incoming)
        [incoming['controller'], 'pathogen--sidebar'].compact.join(' ').strip
      end

      def translated_values
        {
          'pathogen--sidebar-collapse-label-value' => t('.collapse_label'),
          'pathogen--sidebar-expand-label-value' => t('.expand_label'),
          'pathogen--sidebar-open-label-value' => t('.open_label'),
          'pathogen--sidebar-close-label-value' => t('.close_label')
        }
      end

      def overlay_attributes
        {
          class: 'pathogen-sidebar-overlay hidden',
          aria: { hidden: true },
          data: {
            action: 'click->pathogen--sidebar#closeOffcanvas',
            'pathogen--sidebar-target': 'overlay'
          }
        }
      end
    end
  end
end
