# frozen_string_literal: true

module Pathogen
  # Pathogen::Button — Tailwind-styled button (see also Pathogen::BaseButton).
  class Button < Pathogen::Component
    include Pathogen::ButtonSizes
    include Pathogen::ButtonVisuals

    SCHEME_OPTIONS = %i[primary default slate danger].freeze
    DEFAULT_SCHEME = :default

    BASE_CLASSES = %w[
      relative inline-flex items-center justify-center cursor-pointer select-none
      rounded-md font-sans font-medium no-underline border border-transparent
      transition-[color,background-color,border-color,opacity]
      focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-600
      dark:focus-visible:outline-neutral-300
      focus-visible:outline-offset-2 focus-visible:z-10
      disabled:opacity-70 disabled:cursor-not-allowed
    ].join(' ').freeze

    SCHEME_CLASSES = {
      default: %w[
        text-neutral-900 bg-neutral-100 border-neutral-400
        dark:text-neutral-100 dark:bg-neutral-950 dark:border-neutral-500
        enabled:hover:bg-neutral-50 enabled:hover:border-neutral-500
        dark:enabled:hover:bg-neutral-900 dark:enabled:hover:border-neutral-400
      ].join(' ').freeze,
      primary: %w[
        text-white bg-primary-700 border-primary-700
        enabled:hover:bg-primary-600 enabled:hover:border-primary-600
      ].join(' ').freeze,
      slate: %w[
        text-white bg-neutral-500 border-neutral-500
        enabled:hover:bg-neutral-700 enabled:hover:border-neutral-700
      ].join(' ').freeze,
      danger: %w[
        text-red-600 bg-red-50 border-red-300
        dark:text-red-400 dark:bg-neutral-900 dark:border-red-500/40
        enabled:hover:text-white enabled:hover:bg-red-600
        enabled:hover:border-red-600 dark:enabled:hover:bg-red-600
      ].join(' ').freeze
    }.freeze

    # rubocop:disable Metrics/ParameterLists
    def initialize(base_button_class: Pathogen::BaseButton, scheme: DEFAULT_SCHEME, size: DEFAULT_SIZE, block: false,
                   disabled: false, **system_arguments)
      @base_button_class = base_button_class
      @scheme = scheme
      @size = size
      @block = block

      @system_arguments = system_arguments
      @system_arguments[:disabled] = disabled

      @id = @system_arguments[:id]

      @system_arguments[:classes] = class_names(
        BASE_CLASSES,
        SCHEME_CLASSES[fetch_or_fallback(SCHEME_OPTIONS, scheme, DEFAULT_SCHEME)],
        SIZE_MAPPINGS[fetch_or_fallback(SIZE_OPTIONS, size, DEFAULT_SIZE)],
        'flex w-full' => block
      )
    end
    # rubocop:enable Metrics/ParameterLists

    def before_render
      return unless leading_visual.present? || trailing_visual.present?

      @system_arguments[:classes] = class_names(
        @system_arguments[:classes],
        'gap-2'
      )
    end

    private

    def trimmed_content
      return if content.blank?

      trimmed_content = content.strip

      return trimmed_content unless content.html_safe?

      trimmed_content.html_safe # rubocop:disable Rails/OutputSafety
    end
  end
end
