# frozen_string_literal: true

require 'test_helper'

module Pathogen
  module Form
    # Test suite for Pathogen::Form::RadioButton component
    class RadioButtonTest < ViewComponent::TestCase
      test 'renders radio input with Pathogen control classes' do
        render_inline(Pathogen::Form::RadioButton.new(
                        attribute: :theme,
                        value: 'dark'
                      ))

        assert_selector 'input[type="radio"]'
        assert_selector 'input.pathogen-form__control'
        assert_selector 'input.pathogen-form__control--radio'
      end

      test 'renders with label and Pathogen label class' do
        render_inline(Pathogen::Form::RadioButton.new(
                        attribute: :theme,
                        value: 'dark',
                        label: 'Dark Theme'
                      ))

        assert_selector 'label.pathogen-form__label'
        assert_text 'Dark Theme'
      end

      test 'renders with help text and Pathogen help-text class' do
        render_inline(Pathogen::Form::RadioButton.new(
                        attribute: :theme,
                        value: 'dark',
                        label: 'Dark Theme',
                        help_text: 'A dark color scheme'
                      ))

        assert_selector 'span.pathogen-form__help-text'
        assert_text 'A dark color scheme'
      end

      test 'renders container classes for labeled layout' do
        render_inline(Pathogen::Form::RadioButton.new(
                        attribute: :theme,
                        value: 'dark',
                        label: 'Dark Theme'
                      ))

        assert_selector 'div.pathogen-form__radio-container'
        assert_selector 'div.pathogen-form__radio-input-container'
      end

      test 'input and label are associated via for attribute' do
        render_inline(Pathogen::Form::RadioButton.new(
                        attribute: :theme,
                        value: 'dark',
                        label: 'Dark Theme'
                      ))

        input = page.find('input[type="radio"]')
        label = page.find('label')
        assert_equal input[:id], label[:for]
      end

      test 'renders disabled radio button' do
        render_inline(Pathogen::Form::RadioButton.new(
                        attribute: :theme,
                        value: 'dark',
                        disabled: true
                      ))

        assert_selector 'input[type="radio"][disabled]'
      end

      test 'does not emit Tailwind utility classes on radio input' do
        render_inline(Pathogen::Form::RadioButton.new(
                        attribute: :theme,
                        value: 'dark',
                        label: 'Dark Theme'
                      ))

        tailwind_patterns = %w[rounded-full flex items-center gap-3 h-5 w-5 border-2 text-primary-600]
        tailwind_patterns.each do |cls|
          assert_no_selector "input[class*='#{cls}']"
        end
      end

      test 'does not emit Tailwind utility classes on label' do
        render_inline(Pathogen::Form::RadioButton.new(
                        attribute: :theme,
                        value: 'dark',
                        label: 'Dark Theme'
                      ))

        tailwind_patterns = %w[text-sm font-medium text-slate-900 cursor-pointer]
        tailwind_patterns.each do |cls|
          assert_no_selector "label[class*='#{cls}']"
        end
      end
    end
  end
end
