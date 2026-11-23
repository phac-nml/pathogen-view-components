# frozen_string_literal: true

# rubocop:disable Style/FormatStringToken -- I18n placeholders also form the controller's message contract.

module Pathogen
  module DataGrid
    # Persistent feedback and recovery controls outside the grid's busy region.
    class PaginationStatusComponent < Pathogen::Component
      STATUS_CLASSES = %w[
        flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--pvc-color-border)]
        px-[var(--pvc-data-grid-cell-padding-x)] py-2
        text-[length:var(--type-meta)] text-[var(--pvc-color-text-muted)]
      ].freeze

      MESSAGE_DEFAULTS = {
        loading_more: 'Loading more rows…',
        loaded: '%{count} rows loaded.',
        end: 'All %{count} rows loaded.',
        fetch_error: 'Unable to load more rows. Try again.',
        mismatch: 'These results have changed. Refresh the results to continue.',
        range: 'Rows %{start}–%{end} · %{count} loaded',
        range_total: 'Rows %{start}–%{end} of %{total}',
        retry: 'Retry',
        refresh: 'Refresh results'
      }.freeze

      def initialize(grid:)
        @grid = grid
      end

      def status_classes
        class_names('pvc-data-grid__pagination', *STATUS_CLASSES)
      end

      def initial_position
        count = @grid.rows.size
        if @grid.virtual_cursor_pagination? && !@grid.virtual_total_count.nil?
          total = @grid.virtual_next_cursor.nil? ? count : @grid.virtual_total_count
          return message(:range_total, start: count.zero? ? 0 : 1, end: count, total:)
        end

        key = @grid.virtual_cursor_pagination? && @grid.virtual_next_cursor.nil? ? :end : :loaded
        message(key, count:)
      end

      def status_data
        {
          'pathogen--data-grid-target': 'paginationStatus',
          loading_text: message(:loading_more),
          loaded_text: message(:loaded),
          end_text: message(:end),
          fetch_error_text: message(:fetch_error),
          mismatch_text: message(:mismatch),
          range_text: message(:range),
          range_total_text: message(:range_total)
        }
      end

      def message(key, **values)
        placeholders = { count: '%{count}', start: '%{start}', end: '%{end}', total: '%{total}' }
        t("pathogen.data_grid.virtual.pagination.#{key}", default: MESSAGE_DEFAULTS.fetch(key),
                                                          **placeholders.merge(values))
      end
    end
  end
end

# rubocop:enable Style/FormatStringToken
