# frozen_string_literal: true

module Pathogen
  module DataGrid
    # Renders a single virtual data row with pinned and center lanes.
    #
    # Used by VirtualStateComponent for SSR rows and by host-app row endpoints
    # that return server-rendered HTML fragments for paginated virtual mode.
    class VirtualRowComponent < VirtualStateComponent
      attr_reader :global_row_index

      def initialize(grid:, row:, global_row_index:)
        super(grid:)
        @row = row
        @global_row_index = global_row_index
      end

      def local_row_index
        @global_row_index - @grid.virtual_row_offset
      end
    end
  end
end
