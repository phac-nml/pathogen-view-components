# frozen_string_literal: true

module Pathogen
  module DataGrid
    # Shared rendering helpers for virtual and regular data grid states.
    class StateComponent < Pathogen::Component
      def initialize(grid:)
        @grid = grid
      end

      private

      def header_cell_tag(tag_name:, column:, column_index:, scope: nil)
        attributes = column.header_cell_attributes(column_index: column_index)
        attributes = { scope: scope }.merge(attributes) if scope

        tag.public_send(tag_name, **attributes) do
          if column.default_header_label?
            tag.span(column.render_header, class: 'pathogen-data-grid__header-label')
          else
            column.render_header
          end
        end
      end

      def body_cell_tag(tag_name:, column:, row:, row_index:, column_index:)
        cell_payload = @grid.body_cell_payload(
          column: column,
          row: row,
          column_index: column_index,
          active: @grid.default_active_row_index == row_index + 1 && column_index.zero?
        )

        tag.public_send(
          tag_name,
          cell_payload[:content],
          **body_cell_attributes(column: column, row_index: row_index, column_index: column_index,
                                 cell_payload: cell_payload)
        )
      end

      def body_cell_attributes(column:, row_index:, column_index:, cell_payload:)
        column.body_cell_attributes(
          row_index: row_index + 1,
          column_index: column_index,
          active: cell_payload[:focus_on_cell],
          interactive: cell_payload[:interactive]
        )
      end
    end
  end
end
