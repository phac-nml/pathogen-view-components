# frozen_string_literal: true

# Shared styling helpers for form controls
#
# Provides Tailwind class helpers used across form elements
# (checkboxes, radio buttons, etc.), ensuring consistent styling.
module Pathogen
  module Form
    # Shared styling helpers for form controls
    module FormStyles
      LABEL_CLASSES = %w[
        block font-sans text-sm font-semibold text-neutral-900 dark:text-neutral-100 cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
      ].join(' ').freeze

      HELP_TEXT_CLASSES = %w[
        block font-sans text-sm leading-[1.45] text-neutral-600 dark:text-neutral-400 mt-1
      ].join(' ').freeze

      CONTROL_BASE = %w[
        size-5 shrink-0 mt-0.5 cursor-pointer border-2 border-neutral-300 dark:border-neutral-600
        bg-white dark:bg-neutral-950 transition-[border-color,background-color]
        accent-primary-600 checked:border-primary-600
        enabled:hover:border-primary-600
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-black
        dark:focus-visible:outline-white
        focus-visible:outline-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed disabled:border-neutral-200 dark:disabled:border-neutral-700
        disabled:bg-neutral-50 dark:disabled:bg-neutral-900
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
