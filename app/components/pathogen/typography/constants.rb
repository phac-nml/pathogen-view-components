# frozen_string_literal: true

module Pathogen
  module Typography
    # Constants for the Pathogen Typography System (Tailwind utility classes).
    module Constants
      TYPOGRAPHY_SCALE = {
        12 => 'text-xs',
        14 => 'text-sm',
        16 => 'text-base',
        18 => 'text-lg',
        20 => 'text-xl',
        25 => 'text-2xl',
        31 => 'text-3xl',
        39 => 'text-4xl',
        49 => 'text-5xl'
      }.freeze

      FONT_FAMILIES = {
        ui: 'font-sans',
        mono: 'font-mono'
      }.freeze

      LINE_HEIGHTS = {
        heading: 'leading-tight',
        body: 'leading-normal',
        relaxed: 'leading-relaxed'
      }.freeze

      LETTER_SPACING = {
        tight: '-tracking-tight',
        normal: 'tracking-normal',
        wide: 'tracking-wide',
        wider: 'tracking-wider',
        widest: 'tracking-widest'
      }.freeze

      SPACING_CLASSES = {
        compact: 'space-y-1',
        default: 'space-y-2',
        spacious: 'space-y-4',
        section_compact: 'space-y-2',
        section_default: 'space-y-4',
        section_spacious: 'space-y-6'
      }.freeze

      RESPONSIVE_SIZES = {
        1 => { mobile: 'text-3xl', desktop: 'text-5xl' },
        2 => { mobile: 'text-2xl', desktop: 'text-4xl' },
        3 => { mobile: 'text-xl', desktop: 'text-3xl' },
        4 => { mobile: 'text-lg', desktop: 'text-2xl' },
        5 => { mobile: 'text-base', desktop: 'text-xl' },
        6 => { mobile: 'text-sm', desktop: 'text-lg' }
      }.freeze

      COLOR_VARIANTS = {
        default: 'text-neutral-900 dark:text-neutral-100',
        muted: 'text-neutral-600 dark:text-neutral-400',
        subdued: 'text-neutral-600/80 dark:text-neutral-400/80',
        inverse: 'text-white'
      }.freeze

      PRESETS = {
        article: {
          heading_level: 1,
          heading_variant: :default,
          eyebrow_variant: :muted,
          metadata_variant: :muted,
          spacing: :default
        },
        card: {
          heading_level: 3,
          heading_variant: :default,
          eyebrow_variant: :muted,
          metadata_variant: :muted,
          spacing: :compact
        },
        section: {
          heading_level: 2,
          heading_variant: :default,
          metadata_variant: :muted,
          spacing: :default
        },
        dialog: {
          heading_level: 2,
          heading_variant: :default,
          spacing: :compact
        },
        form_section: {
          heading_level: 3,
          heading_variant: :default,
          metadata_variant: :muted,
          spacing: :compact
        }
      }.freeze
    end
  end
end
