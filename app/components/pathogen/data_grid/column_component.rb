# frozen_string_literal: true

module Pathogen
  module DataGrid
    COLUMN_CELL_BASE = %w[
      box-border min-h-10 whitespace-nowrap align-middle font-normal
      border-b bg-clip-padding transition-colors
      text-[length:var(--pvc-data-grid-font-size)]
      leading-[var(--pvc-data-grid-line-height)]
      text-[var(--pvc-data-grid-text-color)]
      border-[var(--pvc-data-grid-row-border)]
      py-[var(--pvc-data-grid-cell-padding-y)]
      px-[var(--pvc-data-grid-cell-padding-x)]
      w-[var(--pvc-data-grid-col-width,auto)]
      min-w-[var(--pvc-data-grid-col-width,auto)]
    ].freeze

    COLUMN_HEADER_ROW = %w[
      sticky top-0 border-b border-[var(--pvc-data-grid-border-color)]
      bg-[var(--pvc-data-grid-header-bg)] text-left align-bottom
    ].freeze

    COLUMN_STICKY_TD = %w[
      sticky z-[2] shadow-[1px_0_0_var(--pvc-data-grid-border-color)]
      left-[var(--pvc-data-grid-sticky-left,0px)]
    ].freeze

    COLUMN_STICKY_TH = %w[
      sticky shadow-[1px_0_0_var(--pvc-data-grid-border-color)]
      left-[var(--pvc-data-grid-sticky-left,0px)]
      z-[calc(var(--pvc-data-grid-header-z)+1)]
    ].freeze

    COLUMN_ALIGN = {
      'center' => 'text-center',
      'right' => 'text-right',
      'left' => nil
    }.freeze

    # Pathogen::DataGrid::ColumnComponent — Column component for Pathogen Data Grid
    class ColumnComponent < Pathogen::Component
      attr_accessor :sticky, :sticky_left
      attr_reader :label, :key, :width, :align

      # rubocop:disable Metrics/ParameterLists
      def initialize(label:, key: nil, width: nil, align: nil, sticky: nil, sticky_left: nil, header_content: nil,
                     interactive: false, **system_arguments, &block)
        # rubocop:enable Metrics/ParameterLists
        @label = label
        @key = key
        @width = width
        @align = align
        @sticky = sticky
        @sticky_left = sticky_left
        @header_content = header_content
        @interactive = interactive
        @system_arguments = system_arguments
        @block = block
      end

      def interactive? = @interactive

      def header_cell_attributes(column_index:, aria_column_index: column_index + 1, virtual_column_index: nil)
        attributes_for(
          header: true,
          row_index: 0,
          column_index: column_index,
          aria_column_index: aria_column_index,
          virtual_column_index: virtual_column_index
        )
      end

      def body_cell_attributes(row_index:, column_index:, state: {})
        attributes_for(
          header: false,
          row_index: row_index,
          column_index: column_index,
          active: state.fetch(:active, false),
          interactive: state.fetch(:interactive, false),
          aria_column_index: state.fetch(:aria_column_index, column_index + 1),
          virtual_column_index: state.fetch(:virtual_column_index, nil)
        )
      end

      def render_value(row, index) = @block ? @block.call(row, index) : value_for(row, index)

      def render_header
        return @header_content.call if @header_content.respond_to?(:call)
        return @header_content if @header_content.present?

        @label
      end

      def default_header_label? = @header_content.blank?

      def normalize_width!
        return if @width.blank?
        return @width = "#{@width}px" if @width.is_a?(Numeric)

        @width
      end

      def width_px
        match = @width.to_s.strip.match(/\A(\d+(?:\.\d+)?)px\z/)
        return unless match

        match[1].to_f
      end

      private

      # rubocop:disable Metrics/ParameterLists
      def attributes_for(header:, row_index:, column_index:, aria_column_index:, active: false, interactive: false,
                         virtual_column_index: nil)
        attributes = {
          class: class_names(*cell_classes(header:)),
          data: cell_data_attributes(row_index:, column_index:, interactive:),
          role: cell_role(header:),
          style: cell_styles,
          tabindex: cell_tabindex(header:, active:)
        }
        attributes[:aria] = { colindex: aria_column_index } unless aria_column_index.nil?
        attributes['data-pvc-data-grid-virtual-col-index'] = virtual_column_index unless virtual_column_index.nil?
        attributes
      end
      # rubocop:enable Metrics/ParameterLists

      # rubocop:disable Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity
      def cell_classes(header:)
        parts = [*COLUMN_CELL_BASE, 'pvc-data-grid__cell', @system_arguments[:class]]
        if header
          parts.concat(COLUMN_HEADER_ROW)
          parts << 'pvc-data-grid__cell--header'
          parts << 'z-[3]' unless @sticky
          parts.concat(COLUMN_STICKY_TH) if @sticky
        else
          parts << 'pvc-data-grid__cell--body'
          parts.concat(COLUMN_STICKY_TD) if @sticky
        end
        parts << 'pvc-data-grid__cell--sticky' if @sticky
        parts << "pvc-data-grid__cell--align-#{@align}" if @align && %w[left center right].include?(@align.to_s)
        parts << COLUMN_ALIGN[@align.to_s] if @align && COLUMN_ALIGN[@align.to_s]
        class_names(*parts.compact)
      end
      # rubocop:enable Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity

      def cell_data_attributes(row_index:, column_index:, interactive:)
        data_attributes = @system_arguments[:data]&.dup || {}
        existing_targets = data_attributes.delete(:'pathogen--data-grid-target') ||
                           data_attributes.delete('pathogen--data-grid-target')
        merged_targets = [existing_targets, 'cell'].compact.join(' ').split.uniq.join(' ')

        out = data_attributes.merge(
          'pathogen--data-grid-target': merged_targets,
          'pathogen--data-grid-row-index': row_index,
          'pathogen--data-grid-column-index': column_index,
          'pathogen--data-grid-has-interactive': interactive
        )
        out[:sticky_cell] = true if @sticky
        out
      end

      def cell_role(header:) = header ? 'columnheader' : 'gridcell'

      def cell_styles
        styles = []
        styles << "--pvc-data-grid-col-width: #{@width};" if @width
        styles << "--pvc-data-grid-sticky-left: #{sticky_left_value};" if @sticky
        styles.join(' ')
      end

      def sticky_left_value
        @sticky_left.is_a?(Numeric) ? "#{@sticky_left}px" : @sticky_left
      end

      def cell_tabindex(header:, active:)
        return -1 if header

        active ? 0 : -1
      end

      def value_for(row, index)
        return row[index] if row.is_a?(Array)
        return row[@key] if @key && row.is_a?(Hash) && row.key?(@key)

        row[@key.to_s] if @key && row.is_a?(Hash)
      end
    end
  end
end
