# frozen_string_literal: true

# Shared styling helpers for form controls
#
# Provides Tailwind class helpers used across form elements
# (checkboxes, radio buttons, etc.), ensuring consistent styling.
module Pathogen
  module Form
    module FormStyles
      LABEL_CLASSES = %w[
        block font-sans text-sm font-medium text-[var(--pathogen-color-text-default)] cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
      ].join(' ').freeze

      HELP_TEXT_CLASSES = %w[
        block font-sans text-sm leading-[var(--pathogen-leading-normal)] text-[var(--pathogen-color-text-muted)] mt-1
      ].join(' ').freeze

      CONTROL_BASE = %w[
        size-5 shrink-0 mt-0.5 cursor-pointer border-2 border-[var(--pathogen-color-border-strong)]
        bg-[var(--pathogen-color-surface-default)] transition-[border-color,background-color]
        accent-[var(--pathogen-color-brand-600)] checked:border-[var(--pathogen-color-brand-600)]
        enabled:hover:border-[var(--pathogen-color-brand-600)]
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--pathogen-color-focus-ring)]
        focus-visible:outline-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed disabled:border-[var(--pathogen-color-border-default)]
        disabled:bg-[var(--pathogen-color-surface-subtle)]
      ].join(' ').freeze

      # @return [String] Space-separated Tailwind classes
      def label_classes
        LABEL_CLASSES
      end

      # @return [String] Space-separated Tailwind classes
      def help_text_classes
        HELP_TEXT_CLASSES
      end

      # @return [Array<String>] classes common to all controls
      def control_base_classes
        [CONTROL_BASE]
      end
    end
  end
end
