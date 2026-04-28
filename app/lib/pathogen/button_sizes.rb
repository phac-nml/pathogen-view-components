# frozen_string_literal: true

module Pathogen
  # This module contains methods for generating and managing button sizes.
  module ButtonSizes
    # Default size for buttons
    DEFAULT_SIZE = :medium

    # A hash of predefined button size class mappings (Pathogen-owned)
    SIZE_MAPPINGS = {
      small: 'pathogen-button--size-small',
      medium: 'pathogen-button--size-medium'
    }.freeze
    SIZE_OPTIONS = SIZE_MAPPINGS.keys
  end
end
