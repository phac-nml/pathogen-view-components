# frozen_string_literal: true

module Pathogen
  # This module contains methods for generating and managing button sizes.
  module ButtonSizes
    # Default size for buttons
    DEFAULT_SIZE = :medium

    # Compact and regular controls share geometry with tabs.
    SIZE_MAPPINGS = {
      small: 'px-3 py-1 min-h-(--pvc-control-size-small) min-w-(--pvc-control-size-small)',
      medium: 'px-4 py-2 min-h-(--pvc-control-size-medium) min-w-(--pvc-control-size-medium)'
    }.freeze

    # Icon-only button targets sized to match each text button tier.
    ICON_ONLY_SIZE_MAPPINGS = {
      small: 'aspect-square size-(--pvc-control-size-small) shrink-0 p-0 gap-0',
      medium: 'aspect-square size-(--pvc-control-size-medium) shrink-0 p-0 gap-0'
    }.freeze

    SIZE_OPTIONS = SIZE_MAPPINGS.keys
  end
end
