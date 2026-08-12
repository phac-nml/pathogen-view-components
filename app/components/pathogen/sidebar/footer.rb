# frozen_string_literal: true

module Pathogen
  class Sidebar
    # Bottom layout row in the sidebar for account or status content.
    class Footer < Region
      BASE_CLASSES = %w[
        pathogen-sidebar-footer
        mt-auto border-t border-[color:var(--pvc-color-border)]
        p-2
      ].join(' ').freeze
    end
  end
end
