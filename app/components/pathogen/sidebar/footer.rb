# frozen_string_literal: true

module Pathogen
  class Sidebar
    # Bottom layout row in the sidebar for account or status content.
    class Footer < Pathogen::Component
      BASE_CLASSES = %w[
        pathogen-sidebar-footer
        mt-auto border-t border-[color:var(--pvc-color-border)]
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
