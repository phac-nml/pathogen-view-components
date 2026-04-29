# frozen_string_literal: true

module Pathogen
  # This module contains methods for generating and managing button sizes.
  module ButtonSizes
    # Default size for buttons
    DEFAULT_SIZE = :medium

    # Tailwind size utility fragments (Pathogen-owned)
    SIZE_MAPPINGS = {
      small: 'text-xs px-2.5 py-1.5',
      medium: 'text-sm px-3 py-2'
    }.freeze
    SIZE_OPTIONS = SIZE_MAPPINGS.keys
  end
end
