# frozen_string_literal: true

module Pathogen
  class Sidebar
    # Main scrolling content stack in the sidebar body.
    class Content < Region
      BASE_CLASSES = %w[
        pathogen-sidebar-content
        flex min-h-0 flex-1 flex-col gap-1
        p-2
      ].join(' ').freeze
    end
  end
end
