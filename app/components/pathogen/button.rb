# frozen_string_literal: true

require_relative '../../lib/pathogen/button_styles'

module Pathogen
  # Pathogen::Button — Tailwind-styled button (see also Pathogen::BaseButton).
  class Button < Pathogen::Component
    include Pathogen::ButtonSizes
    include Pathogen::ButtonStyles

    renders_one :leading_visual
    renders_one :trailing_visual

    # The tooltip that appears on mouse hover or keyboard focus over the button. (optional)
    #
    # The button itself must still expose an accessible name (visible text, `text:`,
    # `aria-label`, or `aria-labelledby`). Tooltip copy is supplementary for sighted users.
    #
    # Accessibility notes:
    # - A plain-text tooltip that repeats a reliably known plain-text name is rendered visual-only
    #   (no `aria-describedby`), so screen reader users hear the name once. Anything that adds detail
    #   or needs browser context is a description. This is inferred from the copy (see `describe:`).
    # - A native `disabled` button cannot receive hover or focus, so a tooltip on it is
    #   unreachable. Use `aria_disabled: true` when the control must stay focusable; attaching
    #   a tooltip to a `disabled` button raises `ArgumentError`.
    # - On touch devices the first tap reveals the tooltip (the button's own action fires on
    #   the second tap), mirroring the shared tooltip pattern.
    #
    # @param placement [Symbol] Physical position of the tooltip (:top, :bottom, :left, :right).
    #   These are physical, not logical, directions; in RTL layouts choose accordingly.
    # @param describe [Boolean] Whether the tooltip is a supplementary description linked via
    #   `aria-describedby`. When omitted, matching plain-text tooltip and name values stay
    #   visual-only; different values are associated as a description. Markup, encoded entities,
    #   and `aria-labelledby` require browser context, so they conservatively default to a
    #   description. Pass `describe:` explicitly to override. Reliable names are `text:`,
    #   `aria-label`, and plain visible text.
    # @param system_arguments [Hash] HTML attributes to be included in the tooltip root element
    renders_one :tooltip, lambda { |placement: :top, describe: nil, **system_arguments|
      # Only record the tooltip here; the association decision needs `content`, which is not
      # safe to read while slots are evaluated, so it is deferred to #associate_tooltip!.
      @tooltip_id = Pathogen::Tooltip.generate_id
      @tooltip_describe = describe
      @tooltip_text = system_arguments[:text]

      Pathogen::Tooltip.new(id: @tooltip_id, placement: placement, **system_arguments)
    }

    # rubocop:disable Metrics/ParameterLists, Metrics/MethodLength
    def initialize(base_button_class: Pathogen::BaseButton, tone: nil, emphasis: nil,
                   size: DEFAULT_SIZE, block: false, icon_only: false, text: nil, disabled: false,
                   aria_disabled: false, **system_arguments)
      raise ArgumentError, 'Cannot set both disabled and aria_disabled on a button' if disabled && aria_disabled

      @base_button_class = base_button_class
      @tone, @emphasis = resolve_tone_and_emphasis(tone, emphasis)
      @size = size
      @block = block
      @icon_only = icon_only
      @text = text

      @system_arguments = system_arguments
      @system_arguments[:disabled] = true if disabled
      @system_arguments[:'aria-disabled'] = 'true' if aria_disabled
      validate_icon_only_accessible_name! if @icon_only
      apply_icon_only_accessible_name! if @icon_only

      @id = @system_arguments[:id]

      @system_arguments[:classes] = class_names(
        BASE_CLASSES,
        style_classes(@tone, @emphasis),
        size_classes,
        'flex w-full' => block
      )
    end
    # rubocop:enable Metrics/ParameterLists, Metrics/MethodLength

    def before_render
      validate_tooltip_target!
      associate_tooltip!
      validate_icon_only_content! if @icon_only
      return unless leading_visual.present? || trailing_visual.present?
      return if @icon_only && button_text.blank?

      @system_arguments[:classes] = class_names(
        @system_arguments[:classes],
        'gap-2'
      )
    end

    def button_text
      return if @icon_only

      trimmed_content.presence || @text
    end

    # Association mode passed to the tooltip Stimulus controller ("describedby" or "none").
    # Set in before_render by #associate_tooltip!; nil when the button has no tooltip.
    attr_reader :tooltip_associate

    private

    # Reject the impossible combination early: a native `disabled` button receives no
    # hover or keyboard focus, so its tooltip can never be triggered. `aria_disabled`
    # keeps the control focusable and is the supported way to show a tooltip on an
    # unavailable action.
    def validate_tooltip_target!
      return unless tooltip?
      return unless @system_arguments[:disabled]

      raise ArgumentError,
            'Cannot attach a tooltip to a `disabled` button: a native disabled button ' \
            'cannot receive hover or keyboard focus, so the tooltip is unreachable. ' \
            'Use `aria_disabled: true` to keep the control focusable.'
    end

    # Decide how the tooltip relates to the button and wire the trigger onto @system_arguments.
    # Runs in before_render, where `content` is available for the inference.
    def associate_tooltip!
      return unless tooltip?

      tooltip # ensure the slot lambda has run (populates @tooltip_id / @tooltip_text / @tooltip_describe)
      describe = @tooltip_describe.nil? ? describe_tooltip?(@tooltip_text) : @tooltip_describe
      @tooltip_associate = describe ? 'describedby' : 'none'

      (@system_arguments[:data] ||= {})['pathogen--tooltip-target'] = 'trigger'
      return unless describe

      @system_arguments[:aria] ||= {}
      existing = @system_arguments[:aria][:describedby]
      @system_arguments[:aria][:describedby] = [existing, @tooltip_id].compact.join(' ')
    end

    def resolve_tone_and_emphasis(tone, emphasis)
      resolved_tone = tone.nil? ? DEFAULT_TONE : fetch_or_fallback(TONE_OPTIONS, tone, DEFAULT_TONE)
      resolved_emphasis = if emphasis.nil?
                            DEFAULT_EMPHASIS
                          else
                            fetch_or_fallback(EMPHASIS_OPTIONS, emphasis, DEFAULT_EMPHASIS)
                          end

      [resolved_tone, resolved_emphasis]
    end

    def validate_icon_only_accessible_name!
      return if accessible_name.present?

      raise ArgumentError,
            "Icon-only buttons require 'text', 'aria-label', 'aria: { label: ... }', " \
            "or 'aria: { labelledby: ... }'"
    end

    def validate_icon_only_content!
      return if leading_visual.present? || trailing_visual.present?

      raise ArgumentError, 'Icon-only buttons require icon content in leading_visual or trailing_visual'
    end

    def apply_icon_only_accessible_name!
      return if @text.blank?

      @system_arguments[:'aria-label'] ||= @text
    end

    def accessible_name
      aria = @system_arguments[:aria]
      @text.presence ||
        @system_arguments[:'aria-label'].presence ||
        (aria.is_a?(Hash) && (aria[:label] || aria['label'] || aria[:labelledby] || aria['labelledby']).presence)
    end

    def describe_tooltip?(tooltip_text)
      tooltip_describes?(tooltip_text, @system_arguments, button_text)
    end

    def size_classes
      size = fetch_or_fallback(SIZE_OPTIONS, @size, DEFAULT_SIZE)
      return ICON_ONLY_SIZE_MAPPINGS[size] if @icon_only

      SIZE_MAPPINGS[size]
    end

    def trimmed_content
      return if content.blank?

      trimmed_content = content.strip

      return trimmed_content unless content.html_safe?

      trimmed_content.html_safe # rubocop:disable Rails/OutputSafety
    end
  end
end
