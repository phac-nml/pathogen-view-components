# frozen_string_literal: true

module Pathogen
  # IconValidator handles parameter validation and normalization for Pathogen::Icon.
  #
  # This class encapsulates all validation logic for icon parameters including
  # color, size, and icon name validation with appropriate fallbacks and warnings.
  class IconValidator
    # Pathogen color class variants for icon color
    COLORS = {
      default: 'pathogen-icon--color-default',
      subdued: 'pathogen-icon--color-subdued',
      primary: 'pathogen-icon--color-primary',
      success: 'pathogen-icon--color-success',
      warning: 'pathogen-icon--color-warning',
      danger: 'pathogen-icon--color-danger',
      blue: 'pathogen-icon--color-blue',
      white: 'pathogen-icon--color-white'
    }.freeze

    # Pathogen size class variants for icon size
    SIZES = {
      sm: 'pathogen-icon--size-sm',
      md: 'pathogen-icon--size-md',
      lg: 'pathogen-icon--size-lg',
      xl: 'pathogen-icon--size-xl'
    }.freeze

    class << self
      # Validate and return a valid color or fallback to default
      #
      # @param color [Symbol] The color to validate
      # @return [Symbol] Valid color or :default fallback
      def validate_color(color)
        return nil if color.nil?
        return color if COLORS.key?(color)

        :default
      end

      # Validate and return a valid size or fallback to medium
      #
      # @param size [Symbol] The size to validate
      # @return [Symbol] Valid size or :md fallback
      def validate_size(size)
        return size if SIZES.key?(size)

        :md
      end

      # Normalize icon name to string format expected by rails_icons
      #
      # @param name [String, Symbol] The icon name to normalize
      # @return [String] Normalized icon name
      # @raise [ArgumentError] If name is nil or blank
      def normalize_icon_name(name)
        raise ArgumentError, 'Icon name cannot be nil or blank' if name.blank?

        normalized = name.is_a?(String) ? name : name.to_s.tr('_', '-')

        validate_icon_name_format(normalized)
        normalized.downcase
      end

      private

      # Validate icon name format for suspicious names
      #
      # @param normalized [String] The normalized icon name
      def validate_icon_name_format(normalized)
        # No-op: validation for suspicious icon names (length > 50 or invalid characters)
        # This method is intentionally empty but kept for potential future use
      end
    end
  end
end
