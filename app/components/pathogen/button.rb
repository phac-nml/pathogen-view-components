# frozen_string_literal: true

require_relative '../../lib/pathogen/button_styles'

module Pathogen
  # Pathogen::Button — Tailwind-styled button (see also Pathogen::BaseButton).
  class Button < Pathogen::Component
    include Pathogen::ButtonSizes
    include Pathogen::ButtonStyles

    renders_one :leading_visual
    renders_one :trailing_visual

    # rubocop:disable Metrics/ParameterLists, Metrics/MethodLength
    def initialize(base_button_class: Pathogen::BaseButton, scheme: DEFAULT_SCHEME, tone: nil, emphasis: nil,
                   size: DEFAULT_SIZE, block: false, icon_only: false, text: nil, disabled: false,
                   aria_disabled: false, **system_arguments)
      raise ArgumentError, 'Cannot set both disabled and aria_disabled on a button' if disabled && aria_disabled

      @base_button_class = base_button_class
      @tone, @emphasis = resolve_tone_and_emphasis(scheme, tone, emphasis)
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

    private

    def resolve_tone_and_emphasis(scheme, tone, emphasis)
      if tone || emphasis
        [
          fetch_or_fallback(TONE_OPTIONS, tone, DEFAULT_TONE),
          fetch_or_fallback(EMPHASIS_OPTIONS, emphasis, DEFAULT_EMPHASIS)
        ]
      else
        SCHEME_PRESETS.fetch(fetch_or_fallback(SCHEME_OPTIONS, scheme, DEFAULT_SCHEME))
      end
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
