# frozen_string_literal: true

require 'test_helper'

module Pathogen
  module Form
    class RadioButtonTest < ViewComponent::TestCase
      test 'renders radio input with control styling' do
        render_inline(Pathogen::Form::RadioButton.new(
                        attribute: :theme,
                        value: 'dark'
                      ))

        assert_selector 'input[type="radio"]'
        assert_selector 'input.size-5.rounded-full'
        assert_selector "input[class*='border-neutral-300']"
      end

      test 'renders with label and label styling' do
        render_inline(Pathogen::Form::RadioButton.new(
                        attribute: :theme,
                        value: 'dark',
                        label: 'Dark Theme'
                      ))

        assert_selector 'label.block.text-sm.font-semibold'
        assert_text 'Dark Theme'
      end

      test 'renders with help text' do
        render_inline(Pathogen::Form::RadioButton.new(
                        attribute: :theme,
                        value: 'dark',
                        label: 'Dark Theme',
                        help_text: 'A dark color scheme'
                      ))

        assert_selector 'span.block.text-sm.mt-1'
        assert_text 'A dark color scheme'
      end

      test 'renders container classes for labeled layout' do
        render_inline(Pathogen::Form::RadioButton.new(
                        attribute: :theme,
                        value: 'dark',
                        label: 'Dark Theme'
                      ))

        assert_selector 'div.flex.flex-col'
        assert_selector 'div.flex.items-center.gap-3'
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

      test 'emits Tailwind utilities on radio input' do
        render_inline(Pathogen::Form::RadioButton.new(
                        attribute: :theme,
                        value: 'dark',
                        label: 'Dark Theme'
                      ))

        assert_selector 'input.rounded-full'
        assert_selector 'input.size-5'
      end

      test 'emits design-contract focus outline classes on radio input' do
        render_inline(Pathogen::Form::RadioButton.new(
                        attribute: :theme,
                        value: 'dark'
                      ))

        assert_selector "input[class*='focus-visible:outline-black']"
        assert_selector "input[class*='dark:focus-visible:outline-white']"
      end

      test 'emits Tailwind utilities on label' do
        render_inline(Pathogen::Form::RadioButton.new(
                        attribute: :theme,
                        value: 'dark',
                        label: 'Dark Theme'
                      ))

        assert_selector 'label.text-sm.font-semibold'
      end
    end
  end
end
