# frozen_string_literal: true

module Pathogen
  # IconValidator handles parameter validation and normalization for Pathogen::Icon.
  class IconValidator
    COLORS = {
      default: 'text-[var(--pathogen-color-text-default)]',
      subdued: 'text-[var(--pathogen-color-text-muted)]',
      primary: 'text-[var(--pathogen-color-brand-600)]',
      success: 'text-[var(--pathogen-color-success-500)]',
      warning: 'text-[var(--pathogen-color-warning-500)]',
      danger: 'text-[var(--pathogen-color-danger-500)]',
      blue: 'text-[oklch(0.588_0.185_264.1)]',
      white: 'text-white'
    }.freeze

    SIZES = {
      sm: 'size-4',
      md: 'size-6',
      lg: 'size-8',
      xl: 'size-10'
    }.freeze

    class << self
      def validate_color(color)
        return nil if color.nil?
        return color if COLORS.key?(color)

        :default
      end

      def validate_size(size)
        return size if SIZES.key?(size)

        :md
      end

      def normalize_icon_name(name)
        raise ArgumentError, 'Icon name cannot be nil or blank' if name.blank?

        normalized = name.is_a?(String) ? name : name.to_s.tr('_', '-')

        validate_icon_name_format(normalized)
        normalized.downcase
      end

      private

      def validate_icon_name_format(normalized)
      end
    end
  end
end
