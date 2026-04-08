# frozen_string_literal: true

module Pathogen
  module Typography
    # Constants for the Pathogen Typography System
    # Defines typography size classes, font family classes, line height classes,
    # and color variants — all Pathogen-namespaced.
    module Constants
      # Pathogen typography size class mapping (pixel sizes → class names)
      TYPOGRAPHY_SCALE = {
        12 => 'pathogen-typography--size-xs',   # Eyebrow text
        14 => 'pathogen-typography--size-sm',   # Supporting text
        16 => 'pathogen-typography--size-base', # Body text
        18 => 'pathogen-typography--size-lg',   # Callout text
        20 => 'pathogen-typography--size-xl',   # Lead paragraphs
        25 => 'pathogen-typography--size-2xl',  # H6 / Mobile H5
        31 => 'pathogen-typography--size-3xl',  # H5 / Mobile H4 / Desktop H1
        39 => 'pathogen-typography--size-4xl',  # H4 / Mobile H3 / Desktop H2
        49 => 'pathogen-typography--size-5xl'   # H3 / Mobile H2 / Desktop H1
      }.freeze

      # Font family classes
      FONT_FAMILIES = {
        ui: 'pathogen-typography--font-ui',
        mono: 'pathogen-typography--font-mono'
      }.freeze

      # Line height classes
      LINE_HEIGHTS = {
        heading: 'pathogen-typography--leading-heading',
        body: 'pathogen-typography--leading-body',
        relaxed: 'pathogen-typography--leading-relaxed'
      }.freeze

      # Letter spacing classes
      LETTER_SPACING = {
        tight: 'pathogen-typography--tracking-tight',
        normal: 'pathogen-typography--tracking-normal',
        wide: 'pathogen-typography--tracking-wide',
        wider: 'pathogen-typography--tracking-wider',
        widest: 'pathogen-typography--tracking-widest'
      }.freeze

      # Spacing classes for component groups (HeadingGroup, Section, etc.)
      SPACING_CLASSES = {
        compact: 'pathogen-typography--space-compact',
        default: 'pathogen-typography--space-default',
        spacious: 'pathogen-typography--space-spacious',
        section_compact: 'pathogen-typography--space-section-compact',
        section_default: 'pathogen-typography--space-section-default',
        section_spacious: 'pathogen-typography--space-section-spacious'
      }.freeze

      # Responsive size mappings for headings
      # Format: { level => { mobile: 'class', desktop: 'class' } }
      RESPONSIVE_SIZES = {
        1 => { mobile: 'pathogen-typography--size-3xl', desktop: 'pathogen-typography--size-5xl' },
        2 => { mobile: 'pathogen-typography--size-2xl', desktop: 'pathogen-typography--size-4xl' },
        3 => { mobile: 'pathogen-typography--size-xl', desktop: 'pathogen-typography--size-3xl' },
        4 => { mobile: 'pathogen-typography--size-lg', desktop: 'pathogen-typography--size-2xl' },
        5 => { mobile: 'pathogen-typography--size-base', desktop: 'pathogen-typography--size-xl' },
        6 => { mobile: 'pathogen-typography--size-sm', desktop: 'pathogen-typography--size-lg' }
      }.freeze

      # Responsive size mappings for text components
      TEXT_RESPONSIVE_SIZES = {
        text: { mobile: 'pathogen-typography--size-sm', desktop: 'pathogen-typography--size-base' },
        supporting: { mobile: 'pathogen-typography--size-xs', desktop: 'pathogen-typography--size-sm' },
        lead: { mobile: 'pathogen-typography--size-lg', desktop: 'pathogen-typography--size-xl' },
        callout: { mobile: 'pathogen-typography--size-base', desktop: 'pathogen-typography--size-lg' }
      }.freeze

      # Color variants for typography components
      COLOR_VARIANTS = {
        default: 'pathogen-typography--color-default',
        muted: 'pathogen-typography--color-muted',
        subdued: 'pathogen-typography--color-subdued',
        inverse: 'pathogen-typography--color-inverse'
      }.freeze

      # Typography presets for common UI patterns
      PRESETS = {
        article: {
          heading_level: 1,
          heading_variant: :default,
          heading_responsive: true,
          eyebrow_variant: :muted,
          metadata_variant: :muted,
          spacing: :default
        },
        card: {
          heading_level: 3,
          heading_variant: :default,
          heading_responsive: false,
          eyebrow_variant: :muted,
          metadata_variant: :muted,
          spacing: :compact
        },
        section: {
          heading_level: 2,
          heading_variant: :default,
          heading_responsive: true,
          metadata_variant: :muted,
          spacing: :default
        },
        dialog: {
          heading_level: 2,
          heading_variant: :default,
          heading_responsive: false,
          spacing: :compact
        },
        form_section: {
          heading_level: 3,
          heading_variant: :default,
          heading_responsive: false,
          metadata_variant: :muted,
          spacing: :compact
        }
      }.freeze
    end
  end
end
