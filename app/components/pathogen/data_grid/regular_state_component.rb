# frozen_string_literal: true

module Pathogen
  module DataGrid
    # Renders the non-virtual table state for DataGridComponent.
    class RegularStateComponent < StateComponent
      ROW_CLASSES = %w[
        bg-[var(--pvc-data-grid-body-bg)] transition-colors duration-150
        hover:bg-[var(--pvc-data-grid-row-hover-bg)]
        focus-within:bg-[var(--pvc-data-grid-row-hover-bg)]
      ].freeze

      def row_classes
        class_names('pvc-data-grid__row', *ROW_CLASSES)
      end
    end
  end
end
