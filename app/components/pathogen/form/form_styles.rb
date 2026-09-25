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
        block font-sans text-sm font-semibold text-(--pvc-color-text) cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
      ].join(' ').freeze

      HELP_TEXT_CLASSES = %w[
        block font-sans text-sm leading-[1.45] text-(--pvc-color-text-muted) mt-1
      ].join(' ').freeze

      CONTROL_BASE = %w[
        size-5 shrink-0 mt-0.5 cursor-pointer border-2 border-(--pvc-color-border-strong)
        bg-(--pvc-color-surface) transition-[border-color,background-color]
        accent-(--pvc-color-accent-solid) checked:border-(--pvc-color-accent-solid)
        enabled:hover:border-(--pvc-color-accent)
        focus-visible:outline focus-visible:outline-2
        focus-visible:outline-(--pvc-color-focus) focus-visible:outline-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed disabled:border-(--pvc-color-border)
        disabled:bg-(--pvc-color-surface-muted)
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
