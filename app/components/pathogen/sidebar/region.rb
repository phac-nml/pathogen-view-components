# frozen_string_literal: true

module Pathogen
  class Sidebar
    # Shared shell for sidebar layout regions (header, content, footer, inset).
    # Subclasses declare a `BASE_CLASSES` constant; overrides can change the tag.
    class Region < Pathogen::Component
      def initialize(**system_arguments)
        @system_arguments = system_arguments
      end

      def call
        tag.div(**attributes) { content }
      end

      private

      def attributes
        {
          class: class_names(self.class::BASE_CLASSES, @system_arguments[:class]),
          data: @system_arguments[:data] || {},
          **@system_arguments.except(:class, :data)
        }
      end
    end
  end
end
