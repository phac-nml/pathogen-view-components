# frozen_string_literal: true

module Pathogen
  # Accessible disclosure: a button that shows or hides a related section.
  #
  # Follows the WAI-ARIA Authoring Practices disclosure pattern
  # (aria-expanded / aria-controls on a native button; panel uses the hidden attribute).
  #
  # @example Label and content
  #   <%= render Pathogen::Disclosure.new(id: "advanced", label: "Advanced options") do %>
  #     <p>Extra settings appear here.</p>
  #   <% end %>
  #
  # @example Open by default with a custom trigger
  #   <%= render Pathogen::Disclosure.new(
  #     id: "settings",
  #     open: true,
  #     aria_label: "Settings"
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
  class Disclosure < Pathogen::Component
    renders_one :trigger

    TRIGGER_CLASSES = %w[
      inline-flex w-full items-center justify-between gap-2
      rounded-[var(--pvc-radius-control)] px-3 py-2
      text-left text-sm font-semibold text-[color:var(--pvc-color-text)]
      bg-transparent
      hover:bg-[var(--pvc-color-surface-muted)]
      focus-visible:outline-2 focus-visible:outline-[var(--pvc-color-focus)] focus-visible:outline-offset-2
    ].join(' ').freeze

    PANEL_CLASSES = %w[
      px-3 pb-2 pt-1 text-sm text-[color:var(--pvc-color-text-muted)]
    ].join(' ').freeze

    ICON_CLASSES = %w[
      size-4 shrink-0 text-[color:var(--pvc-color-text-muted)] transition-transform duration-[var(--pvc-duration-fast)]
      motion-reduce:transition-none
      group-data-[state=open]:rotate-180
    ].join(' ').freeze

    CHEVRON_PATH =
      'M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 ' \
      '4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z'

    attr_reader :id, :label, :open

    # @param id [String, nil] root id; panel id is derived as "#{id}-panel"
    # @param label [String, nil] trigger text when no trigger slot is provided
    # @param aria_label [String, nil] required accessible name when using a custom trigger slot
    # @param open [Boolean] whether the panel starts open
    # @param system_arguments [Hash] HTML attributes for the root element
    def initialize(id: nil, label: nil, aria_label: nil, open: false, **system_arguments)
      @id = id.presence || self.class.generate_id(base_name: 'disclosure')
      @panel_id = "#{@id}-panel"
      @label = label
      @aria_label = aria_label
      @open = open
      @system_arguments = system_arguments
    end

    def before_render
      raise ArgumentError, 'Disclosure requires label: or a trigger slot' if @label.blank? && !trigger?
      raise ArgumentError, 'Disclosure with a trigger slot requires aria_label:' if trigger? && @aria_label.blank?
      raise ArgumentError, 'Disclosure requires a content block for the panel' unless content?
    end

    def call
      heading = trigger? ? trigger : @label

      tag.div(**root_attributes) do
        safe_join([
                    tag.button(**button_attributes) do
                      safe_join([
                                  tag.span(heading, class: 'min-w-0 flex-1'),
                                  chevron_html
                                ])
                    end,
                    tag.div(**panel_attributes) { content }
                  ])
      end
    end

    private

    def root_attributes
      {
        id: @id,
        class: class_names('group', @system_arguments[:class]),
        data: merge_root_data,
        **@system_arguments.except(:class, :data, :id)
      }.compact
    end

    def merge_root_data
      incoming = (@system_arguments[:data] || {}).deep_stringify_keys
      controllers = [incoming['controller'], 'pathogen--disclosure'].compact.join(' ').strip

      incoming.merge(
        'controller' => controllers,
        'pathogen--disclosure-open-value' => @open,
        'state' => @open ? 'open' : 'closed'
      )
    end

    def button_attributes
      aria_attributes = {
        expanded: @open,
        controls: @panel_id
      }
      aria_attributes[:label] = @aria_label if trigger?

      {
        type: 'button',
        class: TRIGGER_CLASSES,
        aria: aria_attributes,
        data: {
          'pathogen--disclosure-target': 'button',
          action: 'click->pathogen--disclosure#toggle'
        }
      }
    end

    def panel_attributes
      attributes = {
        id: @panel_id,
        class: PANEL_CLASSES,
        data: {
          'pathogen--disclosure-target': 'panel'
        }
      }
      attributes[:hidden] = true unless @open
      attributes
    end

    def chevron_html
      tag.span(
        class: ICON_CLASSES,
        aria: { hidden: true }
      ) do
        tag.svg(
          xmlns: 'http://www.w3.org/2000/svg',
          viewBox: '0 0 20 20',
          fill: 'currentColor',
          class: 'size-4',
          aria: { hidden: true }
        ) do
          tag.path('fill-rule': 'evenodd', 'clip-rule': 'evenodd', d: CHEVRON_PATH)
        end
      end
    end
  end
end
