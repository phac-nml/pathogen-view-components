# frozen_string_literal: true

module Pathogen
  # Shared soft-fill tone recipe: a tinted surface, a tone-tinted hairline
  # border, and a foreground that holds WCAG AA on that fill.
  #
  # Status text uses the +*-strong+ steps. Fill mix percentages are the strongest
  # tints that still keep 12px meta text at >= 4.5:1 against that fill in light
  # mode (success 12%, warning 8%). Base success and warning hues fail AA for
  # ordinary text even on white.
  module SoftToneStyles
    DEFAULT_TONE = :neutral
    TONE_OPTIONS = %i[neutral accent success warning danger].freeze

    SOFT_TONE_CLASSES = {
      neutral: %w[
        bg-[var(--pvc-color-surface-muted)]
        text-[var(--pvc-color-text)]
        border-[var(--pvc-color-border-strong)]
      ].join(' '),
      accent: %w[
        bg-[color-mix(in_oklab,var(--pvc-color-accent)_16%,var(--pvc-color-surface))]
        text-[var(--pvc-color-accent-strong)]
        border-[color-mix(in_oklab,var(--pvc-color-accent)_45%,var(--pvc-color-border))]
      ].join(' '),
      success: %w[
        bg-[color-mix(in_oklab,var(--pvc-color-success)_12%,var(--pvc-color-surface))]
        text-[var(--pvc-color-success-strong)]
        border-[color-mix(in_oklab,var(--pvc-color-success)_45%,var(--pvc-color-border))]
      ].join(' '),
      warning: %w[
        bg-[color-mix(in_oklab,var(--pvc-color-warning)_8%,var(--pvc-color-surface))]
        text-[var(--pvc-color-warning-strong)]
        border-[color-mix(in_oklab,var(--pvc-color-warning)_45%,var(--pvc-color-border))]
      ].join(' '),
      danger: %w[
        bg-[color-mix(in_oklab,var(--pvc-color-danger)_14%,var(--pvc-color-surface))]
        text-[var(--pvc-color-danger-strong)]
        border-[color-mix(in_oklab,var(--pvc-color-danger)_45%,var(--pvc-color-border))]
      ].join(' ')
    }.freeze

    def soft_tone_classes(tone)
      SOFT_TONE_CLASSES.fetch(tone, SOFT_TONE_CLASSES.fetch(DEFAULT_TONE))
    end
  end
end
