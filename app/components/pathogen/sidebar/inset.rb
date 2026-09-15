# frozen_string_literal: true

module Pathogen
  class Sidebar
    # Main content region that reacts to sidebar mode.
    class Inset < Region
      BASE_CLASSES = %w[
        pathogen-sidebar-inset
        relative min-w-0 flex-1
        bg-[var(--pvc-color-surface)]
      ].join(' ').freeze
    end
  end
end
