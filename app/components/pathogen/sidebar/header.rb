# frozen_string_literal: true

module Pathogen
  class Sidebar
    # Top layout row inside the sidebar (branding and primary controls).
    class Header < Region
      BASE_CLASSES = %w[
        pathogen-sidebar-header
        flex items-center gap-2
        border-b border-[color:var(--pvc-color-border)]
        p-2
      ].join(' ').freeze
    end
  end
end
