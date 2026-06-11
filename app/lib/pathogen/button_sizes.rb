# frozen_string_literal: true

module Pathogen
  # This module contains methods for generating and managing button sizes.
  module ButtonSizes
    # Default size for buttons
    DEFAULT_SIZE = :medium

    # Text button size utilities. Small uses 24×24px minimum target (WCAG 2.5.8 AA).
    SIZE_MAPPINGS = {
      small: 'text-xs px-2 py-1 min-h-6 min-w-6',
      medium: 'text-sm px-3 py-2 min-h-11 min-w-11'
    }.freeze

    # Icon-only button targets sized to match each text button tier.
    ICON_ONLY_SIZE_MAPPINGS = {
      small: 'aspect-square h-6 w-6 max-h-6 max-w-6 p-0 gap-0',
      medium: 'aspect-square h-11 w-11 max-h-11 max-w-11 p-0 gap-0'
    }.freeze

    SIZE_OPTIONS = SIZE_MAPPINGS.keys
  end
end
