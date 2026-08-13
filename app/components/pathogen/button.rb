# frozen_string_literal: true

require_relative '../../lib/pathogen/button_styles'
require_relative '../../lib/pathogen/tooltip_trigger'

module Pathogen
  # Pathogen::Button — Tailwind-styled button (see also Pathogen::BaseButton).
  class Button < Pathogen::Component
    include Pathogen::ButtonSizes
    include Pathogen::ButtonStyles
    include Pathogen::TooltipTrigger

    renders_one :leading_visual
    renders_one :trailing_visual

    # The tooltip that appears on mouse hover or keyboard focus over the button. (optional)
    #
    # The button itself must still expose an accessible name (visible text, `text:`,
    # `aria-label`, or `aria-labelledby`). Tooltip copy is supplementary for sighted users.
    #
    # Accessibility notes:
    # - Tooltip copy is associated as a supplementary description by default (`describe: true`).
    #   Pass `describe: false` for icon-only rails where the tooltip repeats the control name and
    #   should stay visual-only.
    # - A native `disabled` button cannot receive hover or focus, so a tooltip on it is
    #   unreachable. Use `aria_disabled: true` when the control must stay focusable; attaching
    #   a tooltip to a `disabled` button raises `ArgumentError`.
    # - On touch devices the first tap reveals the tooltip (the button's own action fires on
    #   the second tap), mirroring the shared tooltip pattern.
    #
    # @param placement [Symbol] Physical position of the tooltip (:top, :bottom, :left, :right).
    #   These are physical, not logical, directions; in RTL layouts choose accordingly.
    # @param describe [Boolean] Whether the tooltip is a supplementary description linked via
    #   `aria-describedby` (`true`, default) or a visual-only affordance (`false`).
    # @param system_arguments [Hash] HTML attributes to be included in the tooltip root element
    renders_one :tooltip, lambda { |placement: :top, describe: true, **system_arguments|
      build_tooltip_slot(
        trigger_arguments: @system_arguments,
        placement: placement,
        describe: describe,
        **system_arguments
      )
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
      prime_tooltip_association
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

    # Whether tooltip content is associated to the trigger through aria-describedby.
    # Set when the tooltip slot is evaluated; nil when no tooltip is present.
    attr_reader :tooltip_describedby

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
