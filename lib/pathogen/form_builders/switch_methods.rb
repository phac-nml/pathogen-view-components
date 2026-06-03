# frozen_string_literal: true

module Pathogen
  module FormBuilders
    # Switch rendering methods for PathogenFormBuilder.
    module SwitchMethods
      # Renders a switch (checkbox role=switch) with Pathogen styling and accessibility.
      #
      # @param attribute_name [Symbol] The attribute name for the switch
      # @param options [Hash] Options for the switch (label, checked, disabled, aria, data, etc.)
      # @return [String] HTML for the switch
      def switch(attribute_name, options = {})
        options = add_test_selector(options)
        @template.render(Pathogen::Form::Switch.new(**switch_component_options(attribute_name, options)))
      end

      private

      def switch_component_options(attribute_name, options)
        component_options = {
          form: self,
          attribute: attribute_name,
          label: options.delete(:label),
          disabled: options.delete(:disabled) { false },
          show_state_text: options.delete(:show_state_text) { true },
          state_text: options.delete(:state_text),
          unchecked_value: options.delete(:unchecked_value) { '0' },
          id: options.delete(:id),
          class: options.delete(:class)
        }
        component_options[:checked_value] = options.delete(:checked_value) if options.key?(:checked_value)
        component_options[:checked] = options.delete(:checked) if options.key?(:checked)
        component_options.merge(options)
      end
    end
  end
end
