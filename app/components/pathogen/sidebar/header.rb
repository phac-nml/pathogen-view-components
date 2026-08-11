# frozen_string_literal: true

module Pathogen
  class Sidebar
    # Top layout row inside the sidebar (branding and primary controls).
    class Header < Pathogen::Component
      BASE_CLASSES = %w[
        pathogen-sidebar-header
        flex items-center gap-2
        border-b border-[color:var(--pvc-color-border)]
        p-2
      ].join(' ')

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
          data: @system_arguments[:data] || {}
        }.merge(@system_arguments.except(:class, :data))
      end
    end
  end
end
