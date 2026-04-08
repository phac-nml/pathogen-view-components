# frozen_string_literal: true

module Pathogen
  module Form
    # Styling module specifically for radio button components.
    #
    # Provides Pathogen CSS class names for radio button inputs,
    # labels, help text, and container elements.
    module RadioButtonStyles
      include FormStyles

      # Generates CSS classes for the radio button input element.
      #
      # @param user_class [String, nil] additional user-provided classes
      # @return [String] space-separated Pathogen CSS classes
      def radio_button_classes(user_class = nil)
        class_names(
          user_class,
          'pathogen-form__control--radio',
          *control_base_classes
        )
      end

      # Container classes for radio button layouts.
      #
      # @return [String] CSS classes for the main container
      def radio_button_container_classes
        'pathogen-form__radio-container'
      end

      # Container classes for radio button and label grouping.
      #
      # @return [String] CSS classes for input/label container
      def radio_button_input_container_classes
        'pathogen-form__radio-input-container'
      end

      # Container classes for help text and descriptions.
      #
      # @return [String] CSS classes for help text container
      def radio_button_help_container_classes
        'pathogen-form__radio-help-container'
      end
    end
  end
end
