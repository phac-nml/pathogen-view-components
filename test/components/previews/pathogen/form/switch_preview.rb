# frozen_string_literal: true

module Pathogen
  module Form
    class SwitchPreview < ViewComponent::Preview
      include Pathogen::ViewHelper

      # @!group Basic Examples

      # @label Default Switch
      def default
        pathogen_switch(
          attribute: :enabled,
          id: 'switch-preview-default',
          label: 'Dark mode'
        )
      end

      # @label Switch with Help Text
      def with_help_text
        pathogen_switch(
          attribute: :enabled,
          id: 'switch-preview-with-help-text',
          label: 'Dark mode',
          help_text: 'Use a dark color scheme for better readability in low light.'
        )
      end

      # @!endgroup

      # @!group States

      # @label Checked State
      def checked
        pathogen_switch(
          attribute: :enabled,
          id: 'switch-preview-checked',
          label: 'Dark mode',
          checked: true
        )
      end

      # @label Disabled State
      def disabled
        pathogen_switch(
          attribute: :enabled,
          id: 'switch-preview-disabled',
          label: 'Dark mode',
          disabled: true
        )
      end

      # @label Without State Text
      def without_state_text
        pathogen_switch(
          attribute: :enabled,
          id: 'switch-preview-without-state-text',
          label: 'Dark mode',
          show_state_text: false
        )
      end

      # @label Custom State Text
      def custom_state_text
        pathogen_switch(
          attribute: :notifications,
          id: 'switch-preview-custom-state-text',
          label: 'Email notifications',
          state_text: { on: 'Enabled', off: 'Disabled' }
        )
      end

      # @!endgroup

      # @!group Form Integration

      # @label With Form Builder
      def with_form_builder
        render_with_template(
          template: 'pathogen/form/switch_preview/form_builder',
          locals: {
            form: mock_form_builder
          }
        )
      end

      # @label Fieldset Group
      def fieldset_group
        render_with_template(
          template: 'pathogen/form/switch_preview/fieldset_group',
          locals: {
            form: mock_form_builder
          }
        )
      end

      # @label External Label Pattern
      def external_label
        render_with_template(
          template: 'pathogen/form/switch_preview/external_label',
          locals: {
            form: mock_form_builder
          }
        )
      end

      # @!endgroup

      private

      def mock_form_builder
        template = ActionView::Base.new(ActionView::LookupContext.new([]), {}, nil)
        ActionView::Helpers::FormBuilder.new(
          'user',
          nil,
          template,
          {}
        )
      end
    end
  end
end
