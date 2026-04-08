# frozen_string_literal: true

# Shared styling helpers for form controls
#
# Provides Pathogen class helpers used across form elements
# (checkboxes, radio buttons, etc.), ensuring consistent styling
# without Tailwind utility coupling.
module Pathogen
  module Form
    # Pathogen CSS class helpers for form components.
    module FormStyles
      # Label classes used across form controls
      #
      # @return [String] Space-separated Pathogen CSS classes
      def label_classes
        'pathogen-form__label'
      end

      # Help text classes used beneath form controls
      #
      # @return [String] Space-separated Pathogen CSS classes
      def help_text_classes
        'pathogen-form__help-text'
      end

      # Base classes for interactive form inputs (checkbox, radio, etc.)
      #
      # @return [Array<String>] Pathogen classes common to all controls
      def control_base_classes
        ['pathogen-form__control']
      end
    end
  end
end
