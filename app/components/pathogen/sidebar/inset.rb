# frozen_string_literal: true

module Pathogen
  class Sidebar
    # Main content region that reacts to sidebar mode.
    class Inset < Pathogen::Component
      BASE_CLASSES = %w[
        pathogen-sidebar-inset
        relative min-w-0 flex-1
        bg-[var(--pvc-color-surface)]
      ].join(' ').freeze

      def initialize(**system_arguments)
        @system_arguments = system_arguments
      end

      def call
        tag.div(**attributes) { content }
      end

      private

      def attributes
        {
          class: class_names(BASE_CLASSES, @system_arguments[:class]),
          data: data_attributes,
          **@system_arguments.except(:class, :data)
        }
      end

      def data_attributes
        incoming = (@system_arguments[:data] || {}).deep_stringify_keys
        incoming.merge('pathogen--sidebar-target' => 'inset')
      end
    end
  end
end
