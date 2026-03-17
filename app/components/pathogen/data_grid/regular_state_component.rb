# frozen_string_literal: true

module Pathogen
  module DataGrid
    # Renders the non-virtual table state for DataGridComponent.
    class RegularStateComponent < Pathogen::Component
      def initialize(grid:)
        @grid = grid
      end
    end
  end
end
