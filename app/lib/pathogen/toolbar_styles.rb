# frozen_string_literal: true

module Pathogen
  # Semantic class recipes for Pathogen::Toolbar layout and surfaces.
  module ToolbarStyles
    TABLE_VARIANT = %w[
      w-full
    ].freeze

    CHIP_VARIANT = %w[
      inline-flex items-center gap-2 rounded-(--pvc-radius-action)
      border border-(--pvc-color-border) bg-(--pvc-color-surface-muted) px-1 py-1
    ].freeze

    SEPARATOR = 'mx-1 h-5 w-px shrink-0 bg-(--pvc-color-border-strong)'

    VARIANTS = {
      table: TABLE_VARIANT,
      chip: CHIP_VARIANT
    }.freeze

    DEFAULT_VARIANT = :table

    REFLOW_OPTIONS = %i[group alone].freeze

    DEFAULT_REFLOW = :group
  end
end
