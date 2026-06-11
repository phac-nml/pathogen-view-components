# frozen_string_literal: true

module Pathogen
  # Semantic tone and emphasis class recipes for Pathogen::Button.
  module ButtonStyles
    TONE_OPTIONS = %i[neutral primary danger].freeze
    DEFAULT_TONE = :neutral

    EMPHASIS_OPTIONS = %i[outline solid ghost].freeze
    DEFAULT_EMPHASIS = :outline

    SCHEME_OPTIONS = %i[primary default danger].freeze
    DEFAULT_SCHEME = :default

    SCHEME_PRESETS = {
      default: %i[neutral outline],
      primary: %i[primary solid],
      danger: %i[danger outline]
    }.freeze

    BASE_CLASSES = %w[
      relative inline-flex items-center justify-center cursor-pointer select-none
      rounded-[var(--pvc-radius-action)] font-sans font-medium no-underline border
      transition-[color,background-color,border-color,box-shadow,opacity]
      duration-[var(--pvc-duration-fast)] ease-out
      focus-visible:outline focus-visible:outline-2
      focus-visible:outline-[var(--pvc-color-focus)] focus-visible:outline-offset-2
      focus-visible:z-10
      disabled:cursor-not-allowed disabled:opacity-60
      aria-disabled:cursor-not-allowed aria-disabled:opacity-60
    ].join(' ').freeze

    STYLE_CLASSES = {
      neutral: {
        outline: %w[
          text-[var(--pvc-color-text)] bg-[var(--pvc-color-surface)]
          border-[var(--pvc-color-border-strong)]
          enabled:hover:bg-[var(--pvc-color-surface-muted)]
          enabled:hover:border-[var(--pvc-color-text-muted)]
        ],
        solid: %w[
          text-[var(--pvc-color-surface)] bg-[var(--pvc-color-text)]
          border-[var(--pvc-color-text)]
          enabled:hover:bg-[var(--pvc-color-text-muted)] enabled:hover:border-[var(--pvc-color-text-muted)]
        ],
        ghost: %w[
          text-[var(--pvc-color-text)] bg-transparent border-transparent
          enabled:hover:bg-[var(--pvc-color-surface-muted)]
          enabled:hover:border-[var(--pvc-color-border)]
        ]
      },
      primary: {
        solid: %w[
          text-white bg-[var(--pvc-color-accent-strong)] border-[var(--pvc-color-accent-strong)]
          enabled:hover:bg-[var(--pvc-color-accent)] enabled:hover:border-[var(--pvc-color-accent)]
        ],
        outline: %w[
          text-[var(--pvc-color-accent-strong)] bg-[var(--pvc-color-surface)]
          border-[var(--pvc-color-accent)]
          enabled:hover:bg-[color-mix(in_oklab,var(--pvc-color-accent)_8%,var(--pvc-color-surface))]
        ],
        ghost: %w[
          text-[var(--pvc-color-accent-strong)] bg-transparent border-transparent
          enabled:hover:bg-[color-mix(in_oklab,var(--pvc-color-accent)_8%,transparent)]
        ]
      },
      danger: {
        outline: %w[
          text-[var(--pvc-color-danger)] bg-[var(--pvc-color-surface)]
          border-[color-mix(in_oklab,var(--pvc-color-danger)_45%,var(--pvc-color-border))]
          enabled:hover:bg-[color-mix(in_oklab,var(--pvc-color-danger)_8%,var(--pvc-color-surface))]
          enabled:hover:border-[var(--pvc-color-danger)]
        ],
        solid: %w[
          text-white bg-[var(--pvc-color-danger)] border-[var(--pvc-color-danger)]
          enabled:hover:opacity-90
        ],
        ghost: %w[
          text-[var(--pvc-color-danger)] bg-transparent border-transparent
          enabled:hover:bg-[color-mix(in_oklab,var(--pvc-color-danger)_8%,transparent)]
        ]
      }
    }.freeze

    def style_classes(tone, emphasis)
      STYLE_CLASSES
        .fetch(tone, STYLE_CLASSES[DEFAULT_TONE])
        .fetch(emphasis, STYLE_CLASSES[DEFAULT_TONE][DEFAULT_EMPHASIS])
        .join(' ')
    end
  end
end
