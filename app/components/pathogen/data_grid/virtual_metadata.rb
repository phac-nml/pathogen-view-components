# frozen_string_literal: true

module Pathogen
  module DataGrid
    # Computes virtual grid metadata attributes and ARIA rowcount from normalized pagination state.
    class VirtualMetadata
      def initialize(layout:, pagination:, rows_count:)
        @layout = layout.dup
        @pagination = pagination
        @rows_count = rows_count
      end

      def attributes
        base = @layout.dup
        return base unless pagination?

        base.merge(pagination_attributes)
      end

      def rowcount
        return @rows_count + 1 unless pagination?

        if cursor_mode?
          return @rows_count + 1 if @pagination.next_cursor.nil?

          return @pagination.total_count.nil? ? -1 : @pagination.total_count + 1
        end

        @pagination.total_count + 1
      end

      private

      def pagination?
        @pagination.present?
      end

      def cursor_mode?
        @pagination.mode == :cursor
      end

      def pagination_attributes
        {
          'data-pvc-data-grid-pagination-mode' => @pagination.mode,
          'data-pvc-data-grid-total-count' => @pagination.total_count,
          'data-pvc-data-grid-rows-url' => @pagination.rows_url,
          'data-pvc-data-grid-page-size' => @pagination.page_size,
          'data-pvc-data-grid-row-offset' => @pagination.row_offset,
          'data-pvc-data-grid-search-params' => @pagination.search_params,
          'data-pvc-data-grid-next-cursor' => @pagination.next_cursor,
          'data-pvc-data-grid-loaded-count' => @rows_count
        }.compact
      end
    end
  end
end
