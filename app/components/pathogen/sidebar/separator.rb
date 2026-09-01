# frozen_string_literal: true

module Pathogen
  class Sidebar
    # Visual divider between sidebar regions.
    class Separator < Region
      BASE_CLASSES = %w[
        pathogen-sidebar-separator
        my-2 border-0 border-t border-[color:var(--pvc-color-border)]
      ].join(' ').freeze

      def call
        tag.hr(**attributes)
      end

      private

      def attributes
        super.except(:aria).merge('aria-hidden': true)
      end
    end
  end
end
