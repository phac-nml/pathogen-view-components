# frozen_string_literal: true

module Pathogen
  module DataGrid
    # Shared rendering helpers for virtual and regular data grid states.
    class StateComponent < Pathogen::Component
      def initialize(grid:)
        @grid = grid
      end

      private

      # rubocop:disable Metrics/ParameterLists
      def header_cell_tag(tag_name:, column:, column_index:, aria_column_index: column_index + 1,
                          virtual_column_index: nil, scope: nil)
        attributes = column.header_cell_attributes(
          column_index: column_index,
          aria_column_index: aria_column_index,
          virtual_column_index: virtual_column_index
        )
        attributes = { scope: scope }.merge(attributes) if scope

        tag.public_send(tag_name, **attributes) do
          if column.default_header_label?
            tag.span(column.render_header, class: 'pathogen-data-grid__header-label')
          else
            column.render_header
          end
        end
      end

      def body_cell_tag(tag_name:, column:, row:, row_index:, column_index:, aria_column_index: column_index + 1,
                        virtual_column_index: nil)
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
                                 cell_payload: cell_payload, aria_column_index: aria_column_index,
                                 virtual_column_index: virtual_column_index)
        )
      end

      def body_cell_attributes(column:, row_index:, column_index:, cell_payload:, aria_column_index:,
                               virtual_column_index:)
        column.body_cell_attributes(
          row_index: row_index + 1,
          column_index: column_index,
          state: {
            active: cell_payload[:focus_on_cell],
            interactive: cell_payload[:interactive],
            aria_column_index: aria_column_index,
            virtual_column_index: virtual_column_index
          }
        )
      end
      # rubocop:enable Metrics/ParameterLists

      # ARIA row indices are 1-based and offset by 1 for the header row.
      def aria_row_index(row_index) = row_index + 2
    end
  end
end
