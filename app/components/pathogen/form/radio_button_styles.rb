# frozen_string_literal: true

module Pathogen
  module Form
    # Styling module specifically for radio button components.
    module RadioButtonStyles
      include FormStyles

      # @param user_class [String, nil] additional user-provided classes
      # @return [String] space-separated Tailwind classes
      def radio_button_classes(user_class = nil)
        class_names(
          user_class,
          'rounded-full',
          *control_base_classes
        )
      end

      # @return [String] CSS classes for the main container
      def radio_button_container_classes
        'flex flex-col'
      end

      # @return [String] CSS classes for input/label container
      def radio_button_input_container_classes
        'flex items-center gap-3'
      end

      # @return [String] CSS classes for help text container
      def radio_button_help_container_classes
        'mt-1 ml-8'
      end
    end
  end
end
