# frozen_string_literal: true

module Pathogen
  # Pathogen::Button — Tailwind-styled button (see also Pathogen::BaseButton).
  class Button < Pathogen::Component
    include Pathogen::ButtonSizes

    renders_one :leading_visual
    renders_one :trailing_visual

    SCHEME_OPTIONS = %i[primary default danger].freeze
    DEFAULT_SCHEME = :default

    BASE_CLASSES = %w[
      relative inline-flex items-center justify-center cursor-pointer select-none
      rounded-lg font-sans font-medium no-underline border
      transition-[color,background-color,border-color,opacity] duration-200 ease-in-out
      focus-visible:outline focus-visible:outline-2 focus-visible:outline-black focus-visible:outline-offset-2
      focus-visible:z-10 dark:focus-visible:outline-white
      disabled:opacity-70 disabled:cursor-not-allowed
      aria-disabled:opacity-70 aria-disabled:cursor-not-allowed
    ].join(' ').freeze

    SCHEME_CLASSES = {
      default: %w[
        text-neutral-900 bg-white border-neutral-300
        dark:text-neutral-100 dark:bg-neutral-800 dark:border-neutral-600
        enabled:hover:bg-neutral-50 enabled:hover:border-neutral-400
        dark:enabled:hover:bg-neutral-700 dark:enabled:hover:border-neutral-500
      ].join(' ').freeze,
      primary: %w[
        text-white bg-primary-700 border-primary-700 shadow-sm
        enabled:hover:bg-primary-600 enabled:hover:border-primary-600
      ].join(' ').freeze,
      danger: %w[
        text-red-600 bg-white border-red-300
        dark:text-red-400 dark:bg-neutral-900 dark:border-red-500/60
        enabled:hover:bg-red-50 enabled:hover:border-red-400 enabled:hover:text-red-700
        dark:enabled:hover:bg-red-950/30 dark:enabled:hover:border-red-500
      ].join(' ').freeze
    }.freeze

    # rubocop:disable Metrics/ParameterLists, Metrics/MethodLength
    def initialize(base_button_class: Pathogen::BaseButton, scheme: DEFAULT_SCHEME, size: DEFAULT_SIZE, block: false,
                   icon_only: false, label: nil, disabled: false, aria_disabled: false, **system_arguments)
      raise ArgumentError, 'Cannot set both disabled and aria_disabled on a button' if disabled && aria_disabled

      @base_button_class = base_button_class
      @scheme = scheme
      @size = size
      @block = block
      @icon_only = icon_only
      @label = label

      @system_arguments = system_arguments
      @system_arguments[:disabled] = true if disabled
      @system_arguments[:'aria-disabled'] = 'true' if aria_disabled
      validate_icon_only_accessible_name! if @icon_only
      apply_icon_only_accessible_name! if @icon_only

      @id = @system_arguments[:id]

      @system_arguments[:classes] = class_names(
        BASE_CLASSES,
        SCHEME_CLASSES[fetch_or_fallback(SCHEME_OPTIONS, scheme, DEFAULT_SCHEME)],
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

      trimmed_content.presence || @label
    end

    private

    def validate_icon_only_accessible_name!
      return if accessible_name.present?

      raise ArgumentError,
            "Icon-only buttons require 'label', 'aria-label', 'aria: { label: ... }', " \
            "or 'aria: { labelledby: ... }'"
    end

    def validate_icon_only_content!
      return if leading_visual.present? || trailing_visual.present?

      raise ArgumentError, 'Icon-only buttons require icon content in leading_visual or trailing_visual'
    end

    def apply_icon_only_accessible_name!
      return if @label.blank?

      @system_arguments[:'aria-label'] ||= @label
    end

    def accessible_name
      aria = @system_arguments[:aria]
      @label.presence ||
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
