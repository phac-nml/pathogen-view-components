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

    ROOT_CLASSES = %w[
      max-w-full rounded-lg isolate [container-type:inline-size]
      border border-[var(--pvc-data-grid-border-color)]
      bg-[var(--pvc-data-grid-body-bg)]
      text-[var(--pvc-data-grid-text-color)]
    ].freeze

    FILL_CLASSES = %w[
      relative flex min-h-0 flex-[0_1_auto] flex-col
    ].freeze

    CAPTION_CLASSES = %w[
      py-[var(--pvc-data-grid-cell-padding-y)]
      px-[var(--pvc-data-grid-cell-padding-x)]
      text-[var(--pvc-data-grid-text-color)]
      font-semibold text-left
    ].freeze

    SCROLL_CONTAINER_CLASSES = %w[
      relative max-w-full overflow-auto rounded-[inherit]
      shadow-none transition-shadow duration-[160ms]
    ].freeze

    FILL_SCROLL_CLASSES = %w[
      min-h-0 flex-[0_1_auto]
    ].freeze

    TABLE_CLASSES = %w[
      w-full border-separate border-spacing-0
      bg-[var(--pvc-data-grid-body-bg)]
      text-[var(--pvc-data-grid-text-color)]
      text-[length:var(--pvc-data-grid-font-size)]
      leading-[var(--pvc-data-grid-line-height)]
      whitespace-nowrap
    ].freeze

    GRID_CLASSES = %w[
      w-full min-w-max
      bg-[var(--pvc-data-grid-body-bg)]
      text-[var(--pvc-data-grid-text-color)]
      text-[length:var(--pvc-data-grid-font-size)]
      leading-[var(--pvc-data-grid-line-height)]
      whitespace-nowrap
    ].freeze

    SCROLL_HINT_CLASSES = %w[
      hidden m-0 pt-1.5 px-[var(--pvc-data-grid-cell-padding-x)]
      text-[var(--pvc-data-grid-text-muted-color)] text-xs leading-[1.35]
    ].freeze

    KEYBOARD_HELP_CLASSES = %w[
      m-0 pt-1 px-[var(--pvc-data-grid-cell-padding-x)] pb-[var(--pvc-data-grid-cell-padding-y)]
      text-[var(--pvc-data-grid-text-muted-color)] text-xs leading-[1.35]
    ].freeze

    EMPTY_STATE_CLASSES = %w[
      py-[var(--pvc-data-grid-cell-padding-y)] px-[var(--pvc-data-grid-cell-padding-x)]
      text-[var(--pvc-data-grid-text-muted-color)]
    ].freeze

    EMPTY_STATE_TEXT_CLASSES = %w[
      m-0
    ].freeze

    ERROR_STATE_CLASSES = %w[
      my-[var(--pvc-data-grid-cell-padding-y)] mx-[var(--pvc-data-grid-cell-padding-x)]
      border rounded-md
      border-[color-mix(in_oklab,var(--color-red-500)_45%,var(--pvc-data-grid-border-color))]
      bg-[color-mix(in_oklab,var(--color-red-500)_12%,transparent)]
      py-3 px-4
    ].freeze

    ERROR_TITLE_CLASSES = %w[
      m-0 text-[var(--pvc-data-grid-text-color)] font-semibold leading-[1.35]
    ].freeze

    ERROR_MESSAGE_CLASSES = %w[
      mt-1 mb-0 text-[var(--pvc-data-grid-text-muted-color)] leading-[1.4]
    ].freeze

    renders_one :empty_state
    renders_one :error_state
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
    DEFAULT_EMPTY_STATE_MESSAGE = 'No rows found. Try adjusting filters or refreshing the data.'
    DEFAULT_ERROR_STATE_TITLE = 'Unable to load grid content'
    DEFAULT_ERROR_STATE_MESSAGE = 'Something went wrong while rendering this grid. Refresh or try again.'
    DEFAULT_SCROLL_HINT_MESSAGE = 'Scroll horizontally to view more columns.'
    DEFAULT_KEYBOARD_HELP_MESSAGE =
      'Keyboard: Arrow keys move cells; Enter or F2 enters controls; Escape returns to the grid.'
    DEFAULT_VIRTUAL_LOADING_MESSAGE = 'Loading rows…'
    DEFAULT_VIRTUAL_LOADED_MESSAGE = 'Rows loaded.'
    DEFAULT_VIRTUAL_ROW_HEIGHT = 40
    DEFAULT_VIRTUAL_ROW_OVERSCAN = 10
    DEFAULT_VIRTUAL_COLUMN_OVERSCAN = 2
    DEFAULT_VIRTUAL_COLUMN_WIDTH = 120
    attr_reader :rows, :keyboard_help_id

    # rubocop:disable Metrics/ParameterLists
    def initialize(rows:, caption: nil, sticky_columns: 0, fill_container: false, dense: false,
                   virtual: false, **system_arguments)
      # rubocop:enable Metrics/ParameterLists
      @rows = rows
      @caption = caption
      @caption_id = @caption.present? ? self.class.generate_id(base_name: 'data-grid-caption') : nil
      @sticky_columns = sticky_columns
      @fill_container = fill_container
      @dense = dense
      @virtual = virtual
      @system_arguments = system_arguments
      @system_arguments[:data] ||= {}
      @system_arguments[:data][:pathogen_grid] = true
      @keyboard_help_id = self.class.generate_id(base_name: 'data-grid-help')
      @system_arguments[:class] = class_names(@system_arguments[:class], 'pvc-data-grid', *ROOT_CLASSES)
    end

    def virtual? = @virtual

    def caption? = @caption.present?

    def table_attributes
      tag_name_class = @virtual ? 'pvc-data-grid__grid' : 'pvc-data-grid__table'
      utility_classes = @virtual ? GRID_CLASSES : TABLE_CLASSES
      attributes = {
        class: class_names(tag_name_class, *utility_classes),
        role: 'grid',
        data: { 'pathogen--data-grid-target': 'grid' }
      }
      attributes.merge!(virtual_metadata_attributes) if @virtual

      label_attributes = table_aria_attributes
      label_attributes[:rowcount] = @rows.size + 1 # +1 for header row
      label_attributes[:colcount] = columns.size
      attributes[:aria] = label_attributes
      attributes
    end

    def grid_template_columns_style
      columns.map { |col| col.width.presence || 'minmax(120px, 1fr)' }.join(' ')
    end

    def row_style
      "grid-template-columns: #{grid_template_columns_style};"
    end

    def virtual_pinned_column_entries
      columns.each_with_index.take(virtual_pinned_count)
    end

    def virtual_center_column_entries
      columns.each_with_index.drop(virtual_pinned_count)
    end

    def virtual_lane_row_style(column_entries)
      widths = column_entries.map { |column, _index| virtual_column_track_size(column) }
      return nil if widths.empty?

      "grid-template-columns: #{widths.join(' ')};"
    end

    def virtual_column_track_size(column)
      "#{virtual_column_width(column)}px"
    end

    def default_active_row_index = @rows.present? ? 1 : nil

    def default_empty_state
      tag.div(class: class_names('pvc-data-grid__empty-state', *EMPTY_STATE_CLASSES), role: 'status') do
        tag.p(
          default_empty_state_message,
          class: class_names('pvc-data-grid__empty-state-text', *EMPTY_STATE_TEXT_CLASSES)
        )
      end
    end

    def default_empty_state_message
      t('pathogen.data_grid.empty_state.default', default: DEFAULT_EMPTY_STATE_MESSAGE)
    end

    def default_error_state
      tag.div(class: 'pvc-data-grid__error-state-content') do
        tag.p(
          default_error_state_title,
          class: class_names('pvc-data-grid__error-state-title', *ERROR_TITLE_CLASSES)
        ) +
          tag.p(
            default_error_state_message,
            class: class_names('pvc-data-grid__error-state-message', *ERROR_MESSAGE_CLASSES),
            data: { 'pathogen--data-grid-target': 'errorMessage' }
          )
      end
    end

    def caption_classes
      class_names('pvc-data-grid__caption', *CAPTION_CLASSES)
    end

    def scroll_container_classes
      classes = ['pvc-data-grid__scroll', *SCROLL_CONTAINER_CLASSES]
      classes.concat(FILL_SCROLL_CLASSES) if @fill_container
      class_names(*classes)
    end

    def error_state_classes
      class_names('pvc-data-grid__error-state', *ERROR_STATE_CLASSES)
    end

    def scroll_hint_classes
      class_names('pvc-data-grid__scroll-hint', *SCROLL_HINT_CLASSES)
    end

    def keyboard_help_classes
      class_names('pvc-data-grid__keyboard-help', *KEYBOARD_HELP_CLASSES)
    end

    def default_error_state_title
      t('pathogen.data_grid.error_state.title', default: DEFAULT_ERROR_STATE_TITLE)
    end

    def default_error_state_message
      t('pathogen.data_grid.error_state.message', default: DEFAULT_ERROR_STATE_MESSAGE)
    end

    def scroll_hint_message
      t('pathogen.data_grid.scroll.hint', default: DEFAULT_SCROLL_HINT_MESSAGE)
    end

    def keyboard_help_text
      t('pathogen.data_grid.keyboard.help', default: DEFAULT_KEYBOARD_HELP_MESSAGE)
    end

    def virtual_loading_text
      t('pathogen.data_grid.virtual.loading', default: DEFAULT_VIRTUAL_LOADING_MESSAGE)
    end

    def virtual_loaded_text
      t('pathogen.data_grid.virtual.loaded', default: DEFAULT_VIRTUAL_LOADED_MESSAGE)
    end

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
      apply_virtual_class!
      apply_column_defaults!
      apply_responsive_sticky_class!
      apply_data_grid_controller!
    end

    private

    def table_aria_attributes
      attributes = @caption_id.present? ? { labelledby: @caption_id } : { label: DEFAULT_ARIA_LABEL }
      attributes[:describedby] = @keyboard_help_id if @rows.present?
      attributes
    end

    def apply_dense_class!
      append_component_class!('pvc-data-grid--dense') if @dense
    end

    def apply_virtual_class!
      append_component_class!('pvc-data-grid--virtual') if @virtual
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

    def apply_fill_container_class!
      return unless @fill_container

      append_component_class!('pvc-data-grid--fill', *FILL_CLASSES)
    end

    def sticky_column?(column, index) = column.sticky.nil? ? index < @sticky_columns : column.sticky

    def apply_responsive_sticky_class!
      append_component_class!('pvc-data-grid--multi-sticky') if columns.many?(&:sticky)
    end

    def apply_data_grid_controller!
      @system_arguments[:data] ||= {}
      existing = @system_arguments[:data][:controller] || @system_arguments[:data]['controller']
      @system_arguments[:data][:controller] = [existing, 'pathogen--data-grid'].compact.join(' ').split.uniq.join(' ')
    end

    def virtual_metadata_attributes
      {
        'data-pvc-data-grid-row-height': DEFAULT_VIRTUAL_ROW_HEIGHT,
        'data-pvc-data-grid-row-overscan': DEFAULT_VIRTUAL_ROW_OVERSCAN,
        'data-pvc-data-grid-column-overscan': DEFAULT_VIRTUAL_COLUMN_OVERSCAN,
        'data-pvc-data-grid-pinned-count': virtual_pinned_count,
        'data-pvc-data-grid-column-widths': virtual_column_widths
      }
    end

    def virtual_pinned_count
      columns.take_while(&:sticky).count
    end

    def virtual_column_widths
      columns.map { |column| virtual_column_width(column) }.join(',')
    end

    def virtual_column_width(column)
      column.width_px || DEFAULT_VIRTUAL_COLUMN_WIDTH
    end

    def append_component_class!(*component_classes)
      @system_arguments[:class] = class_names(@system_arguments[:class], *component_classes)
    end
  end
  # rubocop:enable Metrics/ClassLength
end
