# frozen_string_literal: true

module Pathogen
  class Sidebar
    # Visual divider between sidebar regions.
    class Separator < Pathogen::Component
      BASE_CLASSES = %w[
        pathogen-sidebar-separator
        my-2 border-0 border-t border-[color:var(--pvc-color-border)]
      ].join(' ')

      def initialize(**system_arguments)
        @system_arguments = system_arguments
      end

      def call
        tag.hr(**attributes)
      end

      private

      def attributes
        {
          class: class_names(BASE_CLASSES, @system_arguments[:class]),
          'aria-hidden': true,
          data: @system_arguments[:data] || {}
        }.merge(@system_arguments.except(:class, :data, :aria))
      end
    end
  end
end
