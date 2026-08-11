# frozen_string_literal: true

module Pathogen
  class Sidebar
    # Main scrolling content stack in the sidebar body.
    class Content < Pathogen::Component
      BASE_CLASSES = %w[
        pathogen-sidebar-content
        flex min-h-0 flex-1 flex-col gap-1
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
