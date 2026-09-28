# frozen_string_literal: true

require 'test_helper'

module Pathogen
  module Form
    class AccessibilityTest < ViewComponent::TestCase
      [RadioButton, Switch].each do |component_class|
        test "#{component_class} preserves caller ARIA attributes" do
          render_control(component_class,
                         aria: { label: 'Choice', invalid: true, errormessage: 'error', required: false })

          assert_selector 'input[aria-invalid="true"][aria-errormessage="error"][aria-required="false"]'
        end

        test "#{component_class} does not invent a description for controls" do
          render_control(component_class, aria: { label: 'Choice', controls: 'details' })

          assert_selector 'input[aria-controls="details"]'
          assert_no_selector 'input[aria-describedby]'
        end

        test "#{component_class} renders and associates help and error text without a visible label" do
          render_control(component_class, id: 'choice', help_text: 'Choose one',
                                          error_text: '<strong>Try again</strong>',
                                          aria: { label: 'Choice', describedby: 'external choice_help external' })

          input = page.find('input:not([type="hidden"])')
          assert_equal 'external choice_help choice_error', input['aria-describedby']
          assert_equal 'true', input['aria-invalid']
          assert_selector '#choice_help', text: 'Choose one'
          assert_selector '#choice_error', text: '<strong>Try again</strong>'
          assert_no_selector '#choice_error strong'
        end
      end

      test 'compact size controls the activation label without leaking onto the input' do
        [RadioButton, Switch].each do |component_class|
          render_control(component_class, label: 'Choice', size: :small)

          assert_selector 'label.min-h-6.min-w-6'
          assert_no_selector 'input[size]'
        end
      end

      private

      def render_control(component_class, **)
        render_inline(component_class.new(attribute: :choice, value: 'yes', **))
      end
    end
  end
end
