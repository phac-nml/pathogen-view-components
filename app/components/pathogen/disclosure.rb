# frozen_string_literal: true

module Pathogen
  # Accessible disclosure: a button that shows or hides a related section.
  #
  # Follows the WAI-ARIA Authoring Practices disclosure pattern: a native button
  # with aria-expanded / aria-controls, and a panel toggled with the hidden
  # attribute. Stimulus keeps state in sync so screen readers announce
  # expanded/collapsed on activation (including VoiceOver), not only on focus.
  #
  # @example Label and content
  #   <%= render Pathogen::Disclosure.new(id: "advanced", label: "Advanced options") do %>
  #     <p>Extra settings appear here.</p>
  #   <% end %>
  #
  # @example Heading + custom trigger (visible text is the accessible name)
  #   <%= render Pathogen::Disclosure.new(
  #     id: "settings",
  #     open: true,
  #     heading_level: 3
  #   ) do |disclosure| %>
  #     <% disclosure.with_trigger do %>
  #       Settings <span>(current)</span>
  #     <% end %>
  #     <ul>
  #       <li><a href="/settings/general">General</a></li>
  #     </ul>
  #   <% end %>
  #
  # Custom trigger content must be non-interactive phrasing content. Do not
  # include links, buttons, inputs, or other interactive elements inside it.
  # Prefer visible trigger text as the accessible name. Use aria_label: only when
  # the trigger has no usable text, or when you must supply a richer name that
  # still includes the visible label (WCAG 2.5.3).
  class Disclosure < Pathogen::Component # rubocop:disable Metrics/ClassLength
    renders_one :trigger

    DEFAULT_SIZE = :medium
    SIZE_MAPPINGS = {
      small: 'text-xs px-2 py-1 min-h-6',
      medium: 'text-sm px-3 py-2 min-h-11'
    }.freeze
    SIZE_OPTIONS = SIZE_MAPPINGS.keys.freeze

    HEADING_LEVELS = (2..6)

    BASE_TRIGGER_CLASSES = %w[
      pathogen-disclosure__trigger
      inline-flex w-full cursor-pointer items-center justify-between gap-2
      rounded-[var(--pvc-radius-control)]
      text-left font-semibold text-[color:var(--pvc-color-text)]
      bg-transparent
      hover:bg-[var(--pvc-color-surface-muted)]
      focus-visible:outline focus-visible:outline-2
      focus-visible:outline-[var(--pvc-color-focus)] focus-visible:outline-offset-2
    ].join(' ').freeze

    PANEL_CLASSES = %w[
      pathogen-disclosure__panel
      px-3 pb-2 pt-1 text-sm text-[color:var(--pvc-color-text)]
    ].join(' ').freeze

    HEADING_CLASSES = %w[
      pathogen-disclosure__heading
      m-0
    ].join(' ').freeze

    LABEL_CLASSES = 'min-w-0 flex-1'

    INTERACTIVE_TRIGGER_PATTERN = /
      <\s*(?:a|button|input|select|textarea|details|summary|iframe|object|embed)\b
      | \brole\s*=\s*["']?(?:button|link|menuitem|option|switch|tab|textbox)
      | \btabindex\s*=\s*["']?(?!-1\b)
    /ix

    attr_reader :id, :label, :open, :size, :heading_level

    # @param id [String, nil] root id; panel id is derived as "#{id}-panel"
    # @param label [String, nil] trigger text when no trigger slot is provided
    # @param aria_label [String, nil] optional accessible name override (use sparingly)
    # @param open [Boolean] whether the panel starts open
    # @param size [Symbol] :medium (44px min) or :small (24px min)
    # @param heading_level [Integer, nil] wrap the trigger button in h2–h6 when set
    # @param trigger_arguments [Hash] HTML attributes merged onto the button
    # @param panel_arguments [Hash] HTML attributes merged onto the panel
    # @param system_arguments [Hash] HTML attributes for the root element
    def initialize( # rubocop:disable Metrics/ParameterLists
      id: nil,
      label: nil,
      aria_label: nil,
      open: false,
      size: DEFAULT_SIZE,
      heading_level: nil,
      trigger_arguments: {},
      panel_arguments: {},
      **system_arguments
    )
      @id = id.presence || self.class.generate_id(base_name: 'disclosure')
      @panel_id = "#{@id}-panel"
      @label_id = "#{@id}-label"
      @label = label
      @aria_label = aria_label
      @open = open
      @size = fetch_or_fallback(SIZE_OPTIONS, size, DEFAULT_SIZE)
      @heading_level = normalize_heading_level(heading_level)
      @trigger_arguments = trigger_arguments
      @panel_arguments = panel_arguments
      @system_arguments = system_arguments
    end

    def before_render
      raise ArgumentError, 'Disclosure requires label: or a trigger slot' if @label.blank? && !trigger?
      raise ArgumentError, 'Disclosure requires a content block for the panel' unless content?

      validate_trigger_non_interactive! if trigger?
      validate_accessible_name!
      validate_label_in_name!
    end

    def call
      tag.div(**root_attributes) do
        safe_join([trigger_node, tag.div(**panel_attributes) { content }])
      end
    end

    private

    def normalize_heading_level(level)
      return if level.nil?

      integer_level = Integer(level, exception: false)

      unless integer_level && HEADING_LEVELS.cover?(integer_level)
        raise ArgumentError, "Disclosure heading_level: must be #{HEADING_LEVELS.begin}–#{HEADING_LEVELS.end}"
      end

      integer_level
    end

    def root_attributes
      {
        id: @id,
        class: class_names('pathogen-disclosure', @system_arguments[:class]),
        data: merge_root_data,
        **@system_arguments.except(:class, :data, :id)
      }.compact
    end

    def merge_root_data
      incoming = (@system_arguments[:data] || {}).deep_stringify_keys
      controllers = [incoming['controller'], 'pathogen--disclosure'].compact.join(' ').strip

      incoming.merge(
        'controller' => controllers,
        'pathogen--disclosure-open-value' => @open
      )
    end

    def trigger_node
      button = tag.button(**button_attributes) { button_content }
      return button unless @heading_level

      content_tag(:"h#{@heading_level}", button, class: HEADING_CLASSES)
    end

    def button_attributes
      incoming = @trigger_arguments.deep_dup
      incoming_data = (incoming.delete(:data) || {}).deep_stringify_keys
      incoming_aria = (incoming.delete(:aria) || {}).deep_stringify_keys
      incoming_class = incoming.delete(:class)

      {
        type: 'button',
        class: class_names(BASE_TRIGGER_CLASSES, SIZE_MAPPINGS[@size], incoming_class),
        aria: merge_button_aria(incoming_aria),
        data: merge_button_data(incoming_data),
        **incoming
      }
    end

    def merge_button_aria(incoming_aria)
      aria = incoming_aria.merge(
        'expanded' => @open,
        'controls' => @panel_id
      )
      aria['label'] = @aria_label if @aria_label.present?
      aria
    end

    def merge_button_data(incoming_data)
      actions = [incoming_data['action'], 'click->pathogen--disclosure#toggle'].compact.join(' ').strip

      incoming_data.merge(
        'pathogen--disclosure-target' => 'button',
        'action' => actions
      )
    end

    def panel_attributes
      incoming = @panel_arguments.deep_dup
      incoming_data = (incoming.delete(:data) || {}).deep_stringify_keys
      incoming_class = incoming.delete(:class)

      attributes = {
        id: @panel_id,
        class: class_names(PANEL_CLASSES, incoming_class),
        data: incoming_data.merge(
          'pathogen--disclosure-target' => 'panel'
        ),
        **incoming.except(:id, :hidden)
      }
      attributes[:hidden] = true unless @open
      attributes
    end

    def button_content
      text = trigger? ? trigger : @label
      safe_join([
                  tag.span(text, id: @label_id, class: LABEL_CLASSES),
                  chevron_html
                ])
    end

    def chevron_html
      tag.span(class: 'pathogen-disclosure__icon', aria: { hidden: true })
    end

    def validate_trigger_non_interactive!
      html = trigger.to_s
      return unless html.match?(INTERACTIVE_TRIGGER_PATTERN)

      raise ArgumentError,
            'Disclosure trigger slot cannot contain interactive elements ' \
            '(links, buttons, inputs, or widgets with a widget role)'
    end

    def validate_accessible_name!
      return if @aria_label.present?
      return if accessible_trigger_text.present?

      raise ArgumentError,
            'Disclosure requires visible trigger text or aria_label: for the accessible name'
    end

    def validate_label_in_name!
      return if @aria_label.blank?

      visible = visible_trigger_text
      return if visible.blank?
      return if label_in_name?(visible, @aria_label)

      raise ArgumentError,
            'Disclosure aria_label: must include the visible trigger text (WCAG 2.5.3 Label in Name)'
    end

    def label_in_name?(visible, name)
      normalized_visible = visible.downcase
      normalized_name = name.downcase
      return true if normalized_name.include?(normalized_visible)

      tokens = normalized_visible.scan(/[[:alnum:]]+/)
      tokens.any? && tokens.all? { |token| normalized_name.include?(token) }
    end

    def accessible_trigger_text
      trigger_text(exclude_aria_hidden: true)
    end

    def visible_trigger_text
      trigger_text(exclude_aria_hidden: false)
    end

    def trigger_text(exclude_aria_hidden:)
      return normalize_trigger_text(@label.to_s) unless trigger?

      fragment = Nokogiri::HTML::DocumentFragment.parse(trigger.to_s)
      excluded_nodes = fragment.css('[hidden], script, style, template').to_a
      if exclude_aria_hidden
        excluded_nodes.concat(
          fragment.css('[aria-hidden]').select { |node| node['aria-hidden']&.casecmp?('true') }
        )
      end
      excluded_nodes.each(&:remove)

      normalize_trigger_text(fragment.text)
    end

    def normalize_trigger_text(text)
      text.gsub(/\s+/, ' ').strip
    end
  end
end
