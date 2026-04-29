# frozen_string_literal: true

module Pathogen
  module DataGrid
    class ColumnComponent < Pathogen::Component
      CELL_BASE = %w[
        box-border min-h-10 whitespace-nowrap align-middle font-normal
        border-b bg-inherit bg-clip-padding transition-colors
        text-[length:var(--pathogen-data-grid-font-size)]
        leading-[var(--pathogen-data-grid-line-height)]
        text-[var(--pathogen-data-grid-text-color)]
        border-[var(--pathogen-data-grid-row-border)]
        py-[var(--pathogen-data-grid-cell-padding-y)]
        px-[var(--pathogen-data-grid-cell-padding-x)]
        w-[var(--pathogen-data-grid-col-width,auto)]
        min-w-[var(--pathogen-data-grid-col-width,auto)]
      ].freeze

      HEADER_ROW = %w[
        sticky top-0 border-b border-[var(--pathogen-data-grid-border-color)]
        bg-[var(--pathogen-data-grid-header-bg)] text-left align-bottom
      ].freeze

      STICKY_TD = %w[
        sticky z-[2] bg-inherit shadow-[1px_0_0_var(--pathogen-data-grid-border-color)]
        left-[var(--pathogen-data-grid-sticky-left,0px)]
      ].freeze

      STICKY_TH = %w[
        bg-inherit shadow-[1px_0_0_var(--pathogen-data-grid-border-color)]
        left-[var(--pathogen-data-grid-sticky-left,0px)]
        z-[calc(var(--pathogen-data-grid-header-z)+1)]
      ].freeze

      ALIGN = {
        'center' => 'text-center',
        'right' => 'text-right',
        'left' => nil
      }.freeze

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

      def header_cell_attributes(column_index:)
        attributes_for(header: true, row_index: 0, column_index: column_index)
      end

      def body_cell_attributes(row_index:, column_index:, active: false, interactive: false)
        attributes_for(
          header: false,
          row_index: row_index,
          column_index: column_index,
          active: active,
          interactive: interactive
        )
      end

      def render_value(row, index)
        return @block.call(row, index) if @block

        value_for(row, index)
      end

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

      def attributes_for(header:, row_index:, column_index:, active: false, interactive: false)
        {
          class: class_names(*cell_classes(header:)),
          data: cell_data_attributes(row_index:, column_index:, interactive:),
          role: cell_role(header:),
          style: cell_styles,
          tabindex: cell_tabindex(header:, active:)
        }
      end

      def cell_classes(header:)
        parts = [*CELL_BASE, @system_arguments[:class]]
        if header
          parts.concat(HEADER_ROW)
          parts << 'z-[3]' unless @sticky
          parts.concat(STICKY_TH) if @sticky
        elsif @sticky
          parts.concat(STICKY_TD)
        end
        parts << ALIGN[@align.to_s] if @align && ALIGN[@align.to_s]
        class_names(*parts.compact)
      end

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
        styles << "--pathogen-data-grid-col-width: #{@width};" if @width
        styles << "--pathogen-data-grid-sticky-left: #{sticky_left_value};" if @sticky
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
