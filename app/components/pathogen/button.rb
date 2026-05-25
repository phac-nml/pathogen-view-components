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
      relative inline-flex min-h-11 min-w-11 items-center justify-center cursor-pointer select-none
      rounded-lg font-sans font-medium no-underline border
      transition-[color,background-color,border-color,opacity] duration-200 ease-in-out
      focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:z-10
      disabled:opacity-70 disabled:cursor-not-allowed
    ].join(' ').freeze

    SCHEME_CLASSES = {
      default: %w[
        text-neutral-900 bg-white border-neutral-300
        dark:text-neutral-100 dark:bg-neutral-800 dark:border-neutral-600
        enabled:hover:bg-neutral-50 enabled:hover:border-neutral-400
        dark:enabled:hover:bg-neutral-700 dark:enabled:hover:border-neutral-500
        focus-visible:outline-neutral-700 dark:focus-visible:outline-neutral-300
      ].join(' ').freeze,
      primary: %w[
        text-white bg-primary-700 border-primary-700 shadow-sm
        enabled:hover:bg-primary-600 enabled:hover:border-primary-600
        focus-visible:outline-primary-800 dark:focus-visible:outline-primary-400
      ].join(' ').freeze,
      danger: %w[
        text-red-600 bg-white border-red-300
        dark:text-red-400 dark:bg-neutral-900 dark:border-red-500/60
        enabled:hover:bg-red-50 enabled:hover:border-red-400 enabled:hover:text-red-700
        dark:enabled:hover:bg-red-950/30 dark:enabled:hover:border-red-500
        focus-visible:outline-red-600 dark:focus-visible:outline-red-400
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
