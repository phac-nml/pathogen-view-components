# frozen_string_literal: true

require 'test_helper'

module Pathogen
  class FormHelperTest < ActiveSupport::TestCase
    test 'builds names, ids, and help ids for standalone fields' do
      helper = build_helper(attribute: :theme, value: 'dark')

      assert_equal 'theme', helper.input_name
      assert_equal 'theme_dark', helper.input_id
      assert_equal 'theme_dark_help', helper.help_text_id
      assert_equal 'theme_dark_help', helper.help_text_id
    end

    test 'builds names and ids from a form object' do
      form = ActionView::Helpers::FormBuilder.new('user', nil, ActionView::Base.empty, {})
      helper = build_helper(form:, attribute: :theme, value: 'dark')

      assert_equal 'user[theme]', helper.input_name
      assert_equal 'user_theme_dark', helper.input_id
    end

    test 'uses explicit input name and id overrides' do
      helper = build_helper(attribute: :theme, value: 'dark', input_name: 'preferences[theme]', id: 'theme-choice')

      assert_equal 'preferences[theme]', helper.input_name
      assert_equal 'theme-choice', helper.input_id
    end

    test 'builds enabled attributes with nested ARIA and help description' do
      helper = build_helper(attribute: :theme, value: 'dark')
      helper.extract_options!(
        class: 'custom-control',
        help_text: 'Choose a theme',
        onchange: 'updateTheme()',
        aria: { describedby: 'theme-hint' },
        data: { testid: 'theme-control' }
      )

      attributes = helper.form_attributes

      assert_equal 'custom-control', attributes[:class]
      assert_equal 0, attributes[:tabindex]
      assert_equal 'updateTheme()', attributes[:onchange]
      assert_equal false, attributes[:disabled]
      assert_equal 'false', attributes.dig(:aria, :disabled)
      assert_equal 'theme-hint theme_dark_help', attributes.dig(:aria, :describedby)
      assert_equal({ data: { testid: 'theme-control' } }, helper.html_options)
    end

    test 'builds disabled attributes and preserves supported state options' do
      helper = build_helper(attribute: :theme, value: 'dark')
      helper.extract_options!(
        checked: true,
        disabled: true,
        lang: 'en',
        role: 'radio',
        aria: { describedby: 'theme-hint', controls: 'theme-details' }
      )

      attributes = helper.form_attributes

      assert_equal true, attributes[:disabled]
      assert_equal(-1, attributes[:tabindex])
      assert_equal 'true', attributes.dig(:aria, :disabled)
      assert_equal 'theme-hint', attributes.dig(:aria, :describedby)
      assert_equal 'theme-hint', helper.aria_attributes[:describedby]
      assert_equal true, helper.checked
      assert_equal 'en', helper.lang
      assert_equal 'radio', helper.role
    end

    test 'removes unsupported top-level ARIA options' do
      helper = build_helper(attribute: :theme, value: 'dark')
      options = {
        'aria-label' => 'Wrong channel',
        'aria-labelledby' => 'wrong-label',
        'aria-live' => 'polite',
        aria_label: 'wrong-label',
        data: { testid: 'theme-control' }
      }

      helper.extract_options!(options)

      assert_equal({ data: { testid: 'theme-control' } }, helper.html_options)
      assert_empty helper.aria_attributes[:describedby].to_s
    end

    private

    def build_helper(attribute:, value:, form: nil, **)
      FormHelperHarness.new(form:, attribute:, value:, **)
    end

    class FormHelperHarness
      include FormHelper

      attr_reader :form, :attribute, :value, :html_options, :checked, :lang, :role

      def initialize(form:, attribute:, value:, **options)
        @form = form
        @attribute = attribute
        @value = value
        extract_options!(options)
      end

      def input_classes(user_class)
        user_class
      end
    end
  end
end
