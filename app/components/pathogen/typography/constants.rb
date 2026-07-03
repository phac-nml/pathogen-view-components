# frozen_string_literal: true

module Pathogen
  module Typography
    # Constants for the Pathogen Typography System.
    #
    # Sizes are expressed as semantic role tokens (`--type-*`) consumed through
    # Tailwind arbitrary-length utilities so the components and the design-system
    # documentation share a single source of truth. See the Foundations and
    # Tokens design-system docs for the role-based scale.
    module Constants
      # Role-based type scale. Each entry maps a role to the Tailwind utility that
      # resolves the matching `--type-*` custom property.
      TYPE_SIZES = {
        meta: 'text-[length:var(--type-meta)]',       # 12px — hints, timestamps
        control: 'text-[length:var(--type-control)]', # 14px — labels, dense UI
        body: 'text-[length:var(--type-body)]',       # 16px — body copy
        callout: 'text-[length:var(--type-callout)]', # 18px — emphasised lead-ins
        section: 'text-[length:var(--type-section)]', # 20px — section titles
        title: 'text-[length:var(--type-title)]',     # 24px — sub-page headings
        page: 'text-[length:var(--type-page)]'        # 32px — page titles
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
        normal: 'tracking-normal'
      }.freeze

      SPACING_CLASSES = {
        compact: 'space-y-1',
        default: 'space-y-2',
        spacious: 'space-y-4',
        section_compact: 'space-y-2',
        section_default: 'space-y-4',
        section_spacious: 'space-y-6'
      }.freeze

      # Heading level → type-scale role. Each step is the smallest jump that still
      # reads as a clear change in hierarchy.
      HEADING_SIZE_ROLES = {
        1 => :page,
        2 => :title,
        3 => :section,
        4 => :callout,
        5 => :callout,
        6 => :body
      }.freeze

      # Heading level → font weight. Deliberate, restrained weight contrast:
      # extrabold is reserved for the single page title, bold marks the next
      # level, and everything below settles on semibold.
      HEADING_WEIGHTS = {
        1 => 'font-extrabold',
        2 => 'font-bold',
        3 => 'font-semibold',
        4 => 'font-semibold',
        5 => 'font-semibold',
        6 => 'font-semibold'
      }.freeze

      COLOR_VARIANTS = {
        default: 'text-[var(--pvc-color-text)]',
        muted: 'text-[var(--pvc-color-text-muted)]',
        subdued: 'text-[var(--pvc-color-text-muted)]/80',
        inverse: 'text-white'
      }.freeze

      PRESETS = {
        article: {
          heading_level: 1,
          heading_variant: :default,
          metadata_variant: :muted,
          spacing: :default
        },
        card: {
          heading_level: 3,
          heading_variant: :default,
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
