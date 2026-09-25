# frozen_string_literal: true

module Pathogen
  module DataGrid
    # Validates and normalizes the virtual pagination contract used by DataGridComponent.
    class VirtualPaginationConfig
      Config = Data.define(:mode, :total_count, :rows_url, :page_size, :row_offset, :search_params,
                           :next_cursor, :refresh_url)

      class << self
        def build(config, default_page_size:)
          return nil if config.nil?

          values = values_for(config)
          mode = mode!(values)
          total_count = total_count!(values, optional: mode == :cursor)
          rows_url = rows_url!(values)
          page_size = positive_integer!(values, :page_size, default_page_size)
          row_offset = row_offset!(values)
          search_params = search_params!(values)
          next_cursor = cursor!(values, mode:, row_offset:)
          refresh_url = value(values, :refresh_url).presence

          Config.new(mode:, total_count:, rows_url:, page_size:, row_offset:, search_params:, next_cursor:,
                     refresh_url:)
        end

        private

        def values_for(config)
          values = config.respond_to?(:to_h) ? config.to_h : config
          return values if values.respond_to?(:key?)

          raise ArgumentError, 'virtual_pagination must be a hash-like object'
        end

        def mode!(values)
          mode = value(values, :mode, :offset).to_s
          return mode.to_sym if %w[offset cursor].include?(mode)

          raise ArgumentError, 'virtual_pagination mode must be offset or cursor'
        end

        def total_count!(values, optional: false)
          raw = value(values, :total_count)
          return if optional && raw.nil?

          total_count = Integer(raw.to_s, 10, exception: false)
          return total_count if total_count && !total_count.negative?

          raise ArgumentError, 'virtual_pagination requires a non-negative total_count'
        end

        def rows_url!(values)
          rows_url = value(values, :rows_url)
          raise ArgumentError, 'virtual_pagination requires rows_url' if rows_url.blank?

          rows_url
        end

        def positive_integer!(values, key, default = nil)
          parsed = value(values, key, default).to_i
          return parsed if parsed.positive?

          raise ArgumentError, "virtual_pagination requires a positive #{key}"
        end

        def row_offset!(values)
          row_offset = value(values, :row_offset, 0).to_i
          raise ArgumentError, 'virtual_pagination requires a non-negative row_offset' if row_offset.negative?

          row_offset
        end

        def cursor!(values, mode:, row_offset:)
          return unless mode == :cursor

          raise ArgumentError, 'cursor pagination requires row_offset to be zero' unless row_offset.zero?

          cursor = value(values, :next_cursor)
          return if cursor.nil?
          return cursor if cursor.is_a?(String) && cursor.present?

          raise ArgumentError, 'cursor pagination next_cursor must be a non-empty string or nil'
        end

        def search_params!(values)
          search_params = value(values, :search_params, {})
          return if search_params.blank?

          unless search_params.respond_to?(:to_h)
            raise ArgumentError, 'virtual_pagination search_params must be a hash-like object'
          end

          Rack::Utils.build_nested_query(search_params.to_h)
        end

        def value(values, key, default = nil)
          return values[key] if values.key?(key)
          return values[key.to_s] if values.key?(key.to_s)

          default
        end
      end
    end
  end
end
