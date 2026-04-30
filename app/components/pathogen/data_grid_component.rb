# frozen_string_literal: true

module Pathogen
  # DataGrid component for rendering accessible tabular data with sticky columns.
  class DataGridComponent < Pathogen::Component
    include DataGrid::InteractiveContent

    GRID_ROOT_CLASSES = %w[
      @[container-type:inline-size] isolate max-w-full rounded-lg border
      border-neutral-200 dark:border-neutral-700
      bg-white dark:bg-neutral-950
      text-neutral-900 dark:text-neutral-100 font-sans
    ].join(' ').freeze

    renders_one :empty_state
    renders_one :footer
    renders_one :live_region
    renders_one :metadata_warning

    renders_many :columns, lambda { |label, **system_arguments, &block|
      Pathogen::DataGrid::ColumnComponent.new(label: label, **system_arguments, &block)
    }
    DEFAULT_ARIA_LABEL = 'Data grid'
    attr_reader :rows

    # rubocop:disable Metrics/ParameterLists
    def initialize(rows:, caption: nil, sticky_columns: 0, fill_container: false, dense: false, **system_arguments)
      # rubocop:enable Metrics/ParameterLists
      @rows = rows
      @caption = caption
      @caption_id = @caption.present? ? self.class.generate_id(base_name: 'data-grid-caption') : nil
      @sticky_columns = sticky_columns
      @fill_container = fill_container
      @dense = dense
      @system_arguments = system_arguments
      @system_arguments[:data] ||= {}
      @system_arguments[:data][:pathogen_grid] = true
      @system_arguments[:class] = class_names(@system_arguments[:class], GRID_ROOT_CLASSES)
    end

    def caption? = @caption.present?

    def table_attributes
      attributes = {
        class: 'w-full border-collapse border-separate border-spacing-0 bg-[var(--pvc-data-grid-body-bg)] ' \
               'text-[var(--pvc-data-grid-text-color)] text-[length:var(--pvc-data-grid-font-size)] ' \
               'leading-[var(--pvc-data-grid-line-height)] whitespace-nowrap',
        role: 'grid',
        data: { 'pathogen--data-grid-target': 'grid' }
      }

      label_attributes = table_aria_attributes
      label_attributes[:rowcount] = @rows.size + 1
      label_attributes[:colcount] = columns.size
      attributes[:aria] = label_attributes
      attributes
    end

    def default_active_row_index = @rows.present? ? 1 : nil

    def body_cell_payload(column:, row:, column_index:, active:)
      rendered_value = column.render_value(row, column_index)

      return { content: rendered_value, focus_on_cell: active, interactive: true } if column.interactive?

      unless html_safe_with_interactive?(rendered_value)
        return { content: rendered_value, focus_on_cell: active, interactive: false }
      end

      fragment = Nokogiri::HTML::DocumentFragment.parse(rendered_value.to_s)
      interactive_nodes = fragment.css(DataGrid::InteractiveContent::INTERACTIVE_SELECTOR)

      return { content: rendered_value, focus_on_cell: active, interactive: false } if interactive_nodes.empty?

      interactive_nodes.each { |node| node['tabindex'] = '-1' }

      {
        content: safe_fragment_content(fragment),
        focus_on_cell: active,
        interactive: true
      }
    end

    def before_render
      apply_column_defaults!
      set_grid_data_flags!
      apply_data_grid_controller!
    end

    private

    def table_aria_attributes = @caption_id.present? ? { labelledby: @caption_id } : { label: DEFAULT_ARIA_LABEL }

    def set_grid_data_flags!
      @system_arguments[:data][:pathogen_grid_dense] = true if @dense
      @system_arguments[:data][:pathogen_grid_fill] = true if @fill_container
      @system_arguments[:data][:pathogen_grid_multi_sticky] = true if columns.many?(&:sticky)
    end

    def apply_column_defaults!
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

    def sticky_column?(column, index) = column.sticky.nil? ? index < @sticky_columns : column.sticky

    def apply_data_grid_controller!
      @system_arguments[:data] ||= {}
      existing = @system_arguments[:data][:controller] || @system_arguments[:data]['controller']
      @system_arguments[:data][:controller] = [existing, 'pathogen--data-grid'].compact.join(' ').split.uniq.join(' ')
    end
  end
end
