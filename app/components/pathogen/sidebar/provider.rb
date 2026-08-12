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
                      tag.button(**overlay_attributes),
                      tag.span('', **live_region_attributes),
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
        [incoming, vars].compact_blank.join(' ')
      end

      def root_data_attributes
        incoming = (@system_arguments[:data] || {}).deep_stringify_keys

        incoming.merge(
          'controller' => merged_controllers(incoming),
          'pathogen--sidebar-open-value' => @open,
          'pathogen--sidebar-storage-key-value' => "pathogen.sidebar.#{@id}.open"
        ).merge(SIDEBAR_VALUE_DEFAULTS).merge(translated_values)
      end

      def merged_controllers(incoming)
        [incoming['controller'], 'pathogen--sidebar'].compact.join(' ').strip
      end

      def translated_values
        {
          'pathogen--sidebar-collapse-label-value' => t('.collapse_label'),
          'pathogen--sidebar-expand-label-value' => t('.expand_label'),
          'pathogen--sidebar-open-label-value' => t('.open_label'),
          'pathogen--sidebar-close-label-value' => t('.close_label'),
          'pathogen--sidebar-announce-expanded-value' => t('.announce_expanded'),
          'pathogen--sidebar-announce-rail-value' => t('.announce_rail'),
          'pathogen--sidebar-announce-opened-value' => t('.announce_opened'),
          'pathogen--sidebar-announce-closed-value' => t('.announce_closed')
        }
      end

      def overlay_attributes
        {
          type: 'button',
          class: 'pathogen-sidebar-overlay hidden',
          tabindex: -1,
          aria: { hidden: true, label: t('.overlay_label') },
          data: {
            action: 'click->pathogen--sidebar#closeOffcanvas',
            'pathogen--sidebar-target': 'overlay'
          }
        }
      end

      def live_region_attributes
        {
          class: 'sr-only',
          aria: {
            live: 'polite',
            atomic: true
          },
          data: {
            'pathogen--sidebar-target': 'liveRegion'
          }
        }
      end
    end
  end
end
