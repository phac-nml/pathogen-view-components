# frozen_string_literal: true

module Pathogen
  # Semantic tone and emphasis class recipes for Pathogen::Button.
  module ButtonStyles
    TONE_OPTIONS = %i[neutral primary danger].freeze
    DEFAULT_TONE = :neutral

    EMPHASIS_OPTIONS = %i[soft solid ghost].freeze
    DEFAULT_EMPHASIS = :soft

    BASE_CLASSES = %w[
      relative inline-flex items-center justify-center cursor-pointer select-none
      rounded-(--pvc-radius-action) font-sans font-medium no-underline border
      text-(length:--type-control) leading-5
      transition-[color,background-color,border-color] motion-reduce:transition-none
      duration-(--pvc-duration-fast) ease-out
      focus-visible:outline focus-visible:outline-2
      focus-visible:outline-(--pvc-color-focus) focus-visible:outline-offset-2
      focus-visible:z-10
      unavailable:cursor-not-allowed
      unavailable:text-(--pvc-color-text-muted)
      unavailable:bg-[color-mix(in_oklab,var(--pvc-color-text)_5%,transparent)]
      unavailable:border-transparent
      forced-colors:border-[ButtonText] forced-colors:unavailable:text-[GrayText]
      aria-pressed:bg-[color-mix(in_oklab,var(--pvc-color-accent)_12%,var(--pvc-color-surface))]
      aria-pressed:border-(--pvc-color-accent)
      aria-pressed:text-(--pvc-color-accent-strong)
    ].join(' ').freeze

    STYLE_CLASSES = {
      neutral: {
        soft: %w[
          text-(--pvc-color-text) border-transparent
          bg-[color-mix(in_oklab,var(--pvc-color-text)_8%,transparent)]
          interactive-hover:bg-[color-mix(in_oklab,var(--pvc-color-text)_14%,transparent)]
        ],
        solid: %w[
          text-(--pvc-color-surface) bg-(--pvc-color-text)
          border-(--pvc-color-text)
          interactive-hover:bg-(--pvc-color-text-muted) interactive-hover:border-(--pvc-color-text-muted)
        ],
        ghost: %w[
          text-(--pvc-color-text) bg-transparent border-transparent
          interactive-hover:bg-[color-mix(in_oklab,var(--pvc-color-text)_8%,transparent)]
        ]
      },
      primary: {
        solid: %w[
          text-white bg-(--pvc-color-accent-solid) border-(--pvc-color-accent-solid)
          interactive-hover:bg-(--pvc-color-accent-solid-hover)
          interactive-hover:border-(--pvc-color-accent-solid-hover)
        ],
        soft: %w[
          text-(--pvc-color-accent-strong) border-transparent
          bg-[color-mix(in_oklab,var(--pvc-color-accent)_10%,transparent)]
          interactive-hover:bg-[color-mix(in_oklab,var(--pvc-color-accent)_18%,transparent)]
        ],
        ghost: %w[
          text-(--pvc-color-accent-strong) bg-transparent border-transparent
          interactive-hover:bg-[color-mix(in_oklab,var(--pvc-color-accent)_8%,transparent)]
        ]
      },
      danger: {
        soft: %w[
          text-(--pvc-color-danger-strong) border-transparent
          bg-[color-mix(in_oklab,var(--pvc-color-danger)_8%,transparent)]
          interactive-hover:bg-[color-mix(in_oklab,var(--pvc-color-danger)_16%,transparent)]
        ],
        solid: %w[
          text-white bg-(--pvc-color-danger-solid) border-(--pvc-color-danger-solid)
          interactive-hover:bg-(--pvc-color-danger-solid-hover)
          interactive-hover:border-(--pvc-color-danger-solid-hover)
        ],
        ghost: %w[
          text-(--pvc-color-danger-strong) bg-transparent border-transparent
          interactive-hover:bg-[color-mix(in_oklab,var(--pvc-color-danger)_8%,transparent)]
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
