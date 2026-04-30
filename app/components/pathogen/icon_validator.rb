# frozen_string_literal: true

module Pathogen
  # IconValidator handles parameter validation and normalization for Pathogen::Icon.
  class IconValidator
    COLORS = {
      default: 'text-neutral-900 dark:text-neutral-100',
      subdued: 'text-neutral-600 dark:text-neutral-400',
      primary: 'text-primary-600 dark:text-primary-400',
      success: 'text-emerald-600 dark:text-emerald-400',
      warning: 'text-amber-600 dark:text-amber-400',
      danger: 'text-red-600 dark:text-red-400',
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
