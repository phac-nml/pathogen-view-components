# frozen_string_literal: true

module Pathogen
  module DataGrid
    COLUMN_CELL_BASE = %w[
      box-border min-h-10 whitespace-nowrap align-middle font-normal
      border-b transition-colors
      text-(length:--pvc-data-grid-font-size)
      leading-(--pvc-data-grid-line-height)
      text-(--pvc-data-grid-text-color)
      border-(--pvc-data-grid-row-border)
      py-(--pvc-data-grid-cell-padding-y)
      px-(--pvc-data-grid-cell-padding-x)
      w-(--pvc-data-grid-col-width,auto)
      min-w-(--pvc-data-grid-col-width,auto)
    ].freeze

    COLUMN_HEADER_ROW = %w[
      sticky top-0 border-b border-(--pvc-data-grid-border-color)
      bg-(--pvc-data-grid-header-bg) text-left align-bottom
    ].freeze

    COLUMN_STICKY_TD = %w[
      sticky z-[2] shadow-[1px_0_0_var(--pvc-data-grid-border-color)]
      left-(--pvc-data-grid-sticky-left,0px)
    ].freeze

    COLUMN_STICKY_TH = %w[
      sticky shadow-[1px_0_0_var(--pvc-data-grid-border-color)]
      left-(--pvc-data-grid-sticky-left,0px)
      z-[calc(var(--pvc-data-grid-header-z)+1)]
    ].freeze

    COLUMN_ALIGN = {
      'center' => 'text-center',
      'right' => 'text-right',
      'left' => nil
    }.freeze

    # `id` is dropped so a column attribute never emits duplicate ids across every cell.
    COLUMN_OWNED_ATTRIBUTES = %i[
      id aria-colindex aria-sort data-sticky-cell data-pvc-data-grid-virtual-col-index
      data-pathogen--data-grid-target data-pathogen--data-grid-row-index
      data-pathogen--data-grid-column-index data-pathogen--data-grid-has-interactive
    ].freeze

    # Pathogen::DataGrid::ColumnComponent — Column component for Pathogen Data Grid
    class ColumnComponent < Pathogen::Component # rubocop:disable Metrics/ClassLength
      include Pathogen::StimulusDataMerge

      attr_accessor :sticky, :sticky_left
      attr_reader :label, :key, :width, :align

      # rubocop:disable Metrics/ParameterLists
      def initialize(label:, key: nil, width: nil, align: nil, sticky: nil, sticky_left: nil, header_content: nil,
                     interactive: false, renderer: nil, **system_arguments, &block)
        # rubocop:enable Metrics/ParameterLists
        @label = label
        @key = key
        @width = width
        @align = align
        @sticky = sticky
        @sticky_left = sticky_left
        @header_content = header_content
        @interactive = interactive
        @system_arguments = system_arguments.symbolize_keys
        @renderer = renderer || (block ? ->(row, index) { block.call(row, index) } : nil)
        precompute_cell_arguments!
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

      def render_value(row, index) = @renderer ? @renderer.call(row, index) : value_for(row, index)

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

      # Precomputes the cell-invariant attribute fragments once so per-cell rendering avoids
      # repeatedly filtering system arguments and transforming aria/data keys.
      def precompute_cell_arguments!
        @filtered_system_arguments = @system_arguments.except(*COLUMN_OWNED_ATTRIBUTES)
        @header_aria_attributes = build_cell_aria_attributes(header: true)
        @body_aria_attributes = build_cell_aria_attributes(header: false)
        @base_cell_data_attributes = build_base_cell_data_attributes
      end

      # rubocop:disable-next Metrics/ParameterLists
      def attributes_for(header:, row_index:, column_index:, aria_column_index:, active: false, interactive: false,
                         virtual_column_index: nil)
        attributes = @filtered_system_arguments.merge(
          class: class_names(*cell_classes(header:)),
          data: cell_data_attributes(row_index:, column_index:, interactive:),
          role: cell_role(header:),
          style: cell_styles,
          tabindex: cell_tabindex(header:, active:),
          aria: cell_aria_attributes(header:, aria_column_index:)
        )
        attributes['data-pvc-data-grid-virtual-col-index'] = virtual_column_index unless virtual_column_index.nil?
        attributes
      end

      def cell_aria_attributes(header:, aria_column_index:)
        base = header ? @header_aria_attributes : @body_aria_attributes
        return base if aria_column_index.nil?

        base.merge(colindex: aria_column_index)
      end

      # Builds the aria attributes shared by every cell of a given kind (header or body).
      def build_cell_aria_attributes(header:)
        attributes = (@system_arguments[:aria] || {}).symbolize_keys.except(:colindex)
        attributes[:sort] ||= @system_arguments[:'aria-sort'] if @system_arguments.key?(:'aria-sort')
        attributes.delete(:sort) unless header
        attributes.freeze
      end

      # rubocop:disable-next Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity
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

      def cell_data_attributes(row_index:, column_index:, interactive:)
        attributes = @base_cell_data_attributes.merge(
          'pathogen--data-grid-row-index': row_index,
          'pathogen--data-grid-column-index': column_index,
          'pathogen--data-grid-has-interactive': interactive
        )
        attributes[:sticky_cell] = true if @sticky
        attributes
      end

      # Builds the caller-supplied data attributes shared by every cell, normalizing keys to symbols once.
      def build_base_cell_data_attributes
        data_attributes = (@system_arguments[:data] || {}).transform_keys { |key| key.to_s.dasherize.to_sym }
                                                          .except(:'sticky-cell', :'pvc-data-grid-virtual-col-index')
        merge_stimulus_data!(data_attributes, :'pathogen--data-grid-target', 'cell')
        data_attributes.transform_keys(&:to_sym).freeze
      end

      def cell_role(header:) = header ? 'columnheader' : 'gridcell'

      def cell_styles
        styles = []
        styles << "#{@system_arguments[:style].to_s.delete_suffix(';')};" if @system_arguments[:style].present?
        styles << "--pvc-data-grid-col-width: #{@width};" if @width
        styles << "--pvc-data-grid-sticky-left: #{sticky_left_value};" if @sticky
        styles.join(' ')
      end

      def sticky_left_value
        @sticky_left.is_a?(Numeric) ? "#{@sticky_left}px" : @sticky_left
      end

      def cell_tabindex(header:, active:) = !header && active ? 0 : -1

      def value_for(row, index)
        return row[index] if row.is_a?(Array)
        return unless @key && row.is_a?(Hash)

        row.fetch(@key) { row[@key.to_s] }
      end
    end
  end
end
