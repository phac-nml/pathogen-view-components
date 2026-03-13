# frozen_string_literal: true

module Pathogen
  module DataGrid
    # Normalizes and validates a virtual DataGrid dataset payload.
    # rubocop:disable Metrics/ModuleLength
    module VirtualDataset
      DEFAULT_COLUMN_WIDTH = 180
      VALID_MODES = %w[static synthetic].freeze
      VALID_KINDS = %w[text link button].freeze

      module_function

      def build(raw_payload)
        payload = normalize_hash(raw_payload)
        return nil unless payload.is_a?(Hash)

        mode = payload[:mode].to_s
        return nil unless VALID_MODES.include?(mode)

        columns = normalize_columns(payload[:columns])
        return nil if columns.empty?

        row_count = normalize_row_count(payload, mode)
        return nil unless row_count&.positive?

        dataset = {
          mode: mode,
          row_count: row_count,
          columns: columns
        }

        dataset[:rows] = normalize_rows(payload[:rows], row_count) if mode == 'static'
        dataset
      end

      def normalize_hash(value)
        case value
        when Hash
          value.each_with_object({}) do |(key, nested), normalized|
            normalized[normalize_key(key)] = normalize_hash(nested)
          end
        when Array
          value.map { |nested| normalize_hash(nested) }
        else
          value
        end
      end

      def normalize_key(key)
        key.to_s.underscore.to_sym
      end

      # rubocop:disable Metrics/AbcSize, Metrics/MethodLength
      def normalize_columns(value)
        return [] unless value.is_a?(Array)

        value.filter_map.with_index do |raw_column, index|
          column = normalize_hash(raw_column)
          next unless column.is_a?(Hash)

          id = column[:id].to_s.strip
          next if id.empty?

          label = column[:label].to_s.strip
          width = normalize_width(column[:width])
          kind = normalize_kind(column[:kind])
          sticky = truthy?(column[:sticky])
          interactive = truthy?(column[:interactive]) || interactive_kind?(kind)

          {
            id: id,
            label: label.presence || "Column #{index + 1}",
            width: width,
            sticky: sticky,
            interactive: interactive,
            kind: kind
          }
        end
      end
      # rubocop:enable Metrics/AbcSize, Metrics/MethodLength

      def normalize_rows(value, row_count)
        rows = value.is_a?(Array) ? value : []
        rows = rows.first(row_count)

        rows.map.with_index do |raw_row, index|
          row = normalize_hash(raw_row)
          cells = row.is_a?(Hash) && row[:cells].is_a?(Hash) ? row[:cells] : {}

          {
            id: row.is_a?(Hash) && row[:id].present? ? row[:id].to_s : "row-#{index + 1}",
            cells: normalize_cells(cells)
          }
        end
      end

      def normalize_cells(cells)
        cells.transform_keys(&:to_s)
      end

      def normalize_row_count(payload, mode)
        explicit_count = integer_or_nil(payload[:row_count])
        return explicit_count if explicit_count&.positive?

        return nil unless mode == 'static'

        rows = payload[:rows]
        rows.is_a?(Array) ? rows.size : nil
      end

      def normalize_width(value)
        numeric = integer_or_nil(value)
        return DEFAULT_COLUMN_WIDTH unless numeric&.positive?

        numeric
      end

      def normalize_kind(value)
        kind = value.to_s
        VALID_KINDS.include?(kind) ? kind : 'text'
      end

      def interactive_kind?(kind) = %w[link button].include?(kind)

      def integer_or_nil(value)
        return value if value.is_a?(Integer)
        return nil if value.blank?

        Integer(value, exception: false)
      end

      def truthy?(value)
        case value
        when true, 1, '1', 'true', 'TRUE' then true
        else false
        end
      end
    end
    # rubocop:enable Metrics/ModuleLength
  end
end
