# frozen_string_literal: true

module Pathogen
  # DataGrid component for rendering accessible tabular data with sticky columns.
  #
  # == Public API
  #
  # @param rows [Array<Hash, Array, Object>] The data rows to render.
  # @param caption [String, nil] Optional visual caption rendered above the table.
  #   When present, the table uses `aria-labelledby` to associate the caption.
  # @param sticky_columns [Integer] Number of leading columns to treat as sticky
  #   by default. Individual columns can override with `sticky: true/false`.
  # @param fill_container [Boolean] When true, enables flex/min-height behavior
  #   so the grid can fill and scroll within a constrained parent container.
  # @param virtual [Boolean] Enables client-side virtualization mode.
  # @param virtual_dataset [Hash, nil] JSON-like dataset contract used in virtual mode.
  # @param virtual_row_height [Integer] Fixed virtual row height in pixels.
  # @param virtual_overscan_rows [Integer] Number of extra rows rendered above/below viewport.
  # @param virtual_overscan_columns [Integer] Number of extra columns rendered left/right of viewport.
  # @param system_arguments [Hash] Additional HTML attributes for the outer wrapper.
  #
  # @example Basic usage
  #   <%= render Pathogen::DataGridComponent.new(rows: @rows, caption: "Samples") do |grid| %>
  #     <% grid.with_column("ID", key: :id, width: 120) %>
  #     <% grid.with_column("Name", key: :name, width: 240) %>
  #   <% end %>
  #
  # @example Custom cell rendering
  #   <%= render Pathogen::DataGridComponent.new(rows: @rows) do |grid| %>
  #     <% grid.with_column("Name") { |row| tag.strong(row[:name]) } %>
  #   <% end %>
  #
  # CSS dependency: pathogen/pathogen.css
  # rubocop:disable Metrics/ClassLength
  class DataGridComponent < Pathogen::Component
    include DataGrid::InteractiveContent

    renders_one :empty_state
    renders_one :footer
    renders_one :live_region
    renders_one :metadata_warning

    # Renders an individual column definition for the grid.
    #
    # @param label [String] Column header label.
    # @param key [Symbol, String, nil] Hash key lookup when no block is provided.
    # @param width [Numeric, String, nil] Column width (numeric values become "px").
    # @param align [Symbol, String, nil] Alignment class suffix (e.g. :left, :center, :right).
    # @param sticky [Boolean, nil] Explicitly enable/disable sticky behavior for this column.
    # @param sticky_left [Numeric, String, nil] Left offset
    #   (numeric values become "px"; strings allow CSS units);
    #   can enable sticky without width.
    # @param header_content [String, Proc, nil] Custom header content to replace the label.
    # @param system_arguments [Hash] Additional HTML attributes for the cell.
    # @yieldparam row [Hash, Array, Object] Row data for the current cell.
    # @yieldparam index [Integer] Column index.
    # @return [Pathogen::DataGrid::ColumnComponent]
    renders_many :columns, lambda { |label, **system_arguments, &block|
      Pathogen::DataGrid::ColumnComponent.new(label: label, **system_arguments, &block)
    }
    DEFAULT_ARIA_LABEL = 'Data grid'
    attr_reader :rows

    # rubocop:disable Metrics/ParameterLists
    def initialize(
      rows:,
      caption: nil,
      sticky_columns: 0,
      fill_container: false,
      dense: false,
      virtual: false,
      virtual_dataset: nil,
      virtual_row_height: 44,
      virtual_overscan_rows: 8,
      virtual_overscan_columns: 4,
      **system_arguments
    )
      # rubocop:enable Metrics/ParameterLists
      @rows = rows
      @caption = caption
      @caption_id = @caption.present? ? self.class.generate_id(base_name: 'data-grid-caption') : nil
      @sticky_columns = sticky_columns
      @fill_container = fill_container
      @dense = dense
      @virtual_requested = virtual
      @virtual_dataset_input = virtual_dataset
      @virtual_row_height = virtual_row_height
      @virtual_overscan_rows = virtual_overscan_rows
      @virtual_overscan_columns = virtual_overscan_columns
      @system_arguments = system_arguments
      @system_arguments[:class] = class_names(@system_arguments[:class], 'pathogen-data-grid')
    end

    def caption? = @caption.present?
    def virtual? = @virtual_requested && virtual_dataset.present?

    def virtual_dataset
      @virtual_dataset ||= DataGrid::VirtualDataset.build(@virtual_dataset_input)
    end

    def table_attributes
      attributes = {
        class: 'pathogen-data-grid__table',
        role: 'grid',
        data: { 'pathogen--data-grid-target': 'grid' }
      }

      label_attributes = table_aria_attributes
      label_attributes[:rowcount] = row_count + 1 # +1 for header row
      label_attributes[:colcount] = column_count
      attributes[:aria] = label_attributes
      attributes
    end

    def default_active_row_index = row_count.positive? ? 1 : nil

    def row_count = virtual? ? virtual_dataset[:row_count] : @rows.size

    def column_count = virtual? ? virtual_dataset[:columns].size : columns.size

    def body_cell_payload(column:, row:, column_index:, active:)
      rendered_value = column.render_value(row, column_index)

      # Declarative opt-in: consumer signals the cell contains interactive elements.
      # The cell itself owns tabindex="0" as the roving tabindex entry point; the
      # controller transfers focus to interactive descendants on Enter/F2 (widget mode).
      return { content: rendered_value, focus_on_cell: active, interactive: true } if column.interactive?

      # Only invoke Nokogiri when the value is already html_safe (i.e. produced by a
      # view helper or content_tag) AND plausibly contains an interactive tag.
      # Plain strings are never html_safe, so they take the fast path here, which also
      # prevents treating raw user input as HTML (XSS guard).
      unless html_safe_with_interactive?(rendered_value)
        return { content: rendered_value, focus_on_cell: active, interactive: false }
      end

      fragment = Nokogiri::HTML::DocumentFragment.parse(rendered_value.to_s)
      interactive_nodes = fragment.css(DataGrid::InteractiveContent::INTERACTIVE_SELECTOR)

      return { content: rendered_value, focus_on_cell: active, interactive: false } if interactive_nodes.empty?

      # All interactive elements start at tabindex="-1"; the controller enters widget
      # mode on Enter/F2 and transfers tabindex="0" to the first interactive element.
      interactive_nodes.each { |node| node['tabindex'] = '-1' }

      {
        content: safe_fragment_content(fragment),
        focus_on_cell: active,
        interactive: true
      }
    end

    def before_render
      apply_fill_container_class!
      apply_dense_class!
      apply_column_defaults!
      apply_responsive_sticky_class!
      apply_data_grid_controller!
    end

    private

    def table_aria_attributes = @caption_id.present? ? { labelledby: @caption_id } : { label: DEFAULT_ARIA_LABEL }

    def apply_dense_class!
      append_component_class!('pathogen-data-grid--dense') if @dense
    end

    # rubocop:disable Metrics/CyclomaticComplexity
    def apply_column_defaults!
      return if virtual?

      sticky_offset = 0

      columns.each_with_index do |column, index|
        column.normalize_width!

        next unless sticky_column?(column, index)

        if column.width_px.nil? && column.sticky_left.nil?
          column.sticky = false
          next
        end

        column.sticky = true
        column.sticky_left ||= sticky_offset
        sticky_offset += column.width_px if column.width_px
      end
    end
    # rubocop:enable Metrics/CyclomaticComplexity

    def apply_fill_container_class!
      append_component_class!('pathogen-data-grid--fill') if @fill_container
    end

    def sticky_column?(column, index) = column.sticky.nil? ? index < @sticky_columns : column.sticky

    def apply_responsive_sticky_class!
      sticky_count = if virtual?
                       virtual_dataset[:columns].count { |column| column[:sticky] }
                     else
                       columns.count(&:sticky)
                     end

      append_component_class!('pathogen-data-grid--multi-sticky') if sticky_count > 1
    end

    # rubocop:disable Metrics/AbcSize
    def apply_data_grid_controller!
      @system_arguments[:data] ||= {}
      existing = @system_arguments[:data][:controller] || @system_arguments[:data]['controller']
      @system_arguments[:data][:controller] = [existing, 'pathogen--data-grid'].compact.join(' ').split.uniq.join(' ')

      return unless virtual?

      @system_arguments[:data][:'pathogen--data-grid-virtual-value'] = true
      @system_arguments[:data][:'pathogen--data-grid-virtual-dataset-value'] = virtual_dataset.to_json
      @system_arguments[:data][:'pathogen--data-grid-virtual-row-height-value'] = @virtual_row_height
      @system_arguments[:data][:'pathogen--data-grid-virtual-overscan-rows-value'] = @virtual_overscan_rows
      @system_arguments[:data][:'pathogen--data-grid-virtual-overscan-columns-value'] = @virtual_overscan_columns
    end
    # rubocop:enable Metrics/AbcSize

    def append_component_class!(component_class)
      @system_arguments[:class] = class_names(@system_arguments[:class], component_class)
    end
  end
  # rubocop:enable Metrics/ClassLength
end
