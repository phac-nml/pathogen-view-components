# frozen_string_literal: true

module Pathogen
  module DataGrid
    # Renders the virtualized div-grid state for DataGridComponent.
    class VirtualStateComponent < Pathogen::Component
      def initialize(grid:)
        @grid = grid
      end
    end
  end
end
