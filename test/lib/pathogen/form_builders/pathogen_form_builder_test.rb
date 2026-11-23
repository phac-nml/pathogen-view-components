# frozen_string_literal: true

require 'test_helper'

module Pathogen
  module FormBuilders
    class PathogenFormBuilderTest < ActiveSupport::TestCase
      test 'radio button uses model selection unless explicitly overridden' do
        view = ActionView::Base.empty
        builder = PathogenFormBuilder.new('user', Struct.new(:theme).new('dark'), view, {})

        selected = Nokogiri::HTML.fragment(builder.radio_button(:theme, 'dark', label: 'Dark'))
        unselected = Nokogiri::HTML.fragment(builder.radio_button(:theme, 'light', label: 'Light'))
        overridden = Nokogiri::HTML.fragment(builder.radio_button(:theme, 'dark', checked: false))

        assert selected.at_css('input[checked]')
        assert_nil unselected.at_css('input[checked]')
        assert_nil overridden.at_css('input[checked]')
      end

      test 'radio button shares direct component naming and accessibility attributes' do
        view = ActionView::Base.empty
        builder = PathogenFormBuilder.new('user', nil, view, {})

        radio_options = {
          label: 'Dark',
          help_text: 'Use a dark theme',
          aria: { describedby: 'theme_hint' }
        }
        html = Nokogiri::HTML.fragment(builder.radio_button(:theme, 'dark', radio_options))
        input = html.at_css('input[type="radio"]')

        assert_equal 'user[theme]', input['name']
        assert_equal 'user_theme_dark', input['id']
        assert_equal 'theme_hint user_theme_dark_help', input['aria-describedby']
        assert html.at_css('#user_theme_dark_help')
      end

      test 'label styling uses semibold design-contract weight' do
        view = ActionView::Base.empty
        builder = PathogenFormBuilder.new(:sample, nil, view, {})

        html = builder.label(:name, 'Name')

        assert_includes html, 'font-semibold'
        assert_not_includes html, 'font-medium'
        assert_includes html, 'text-[var(--pvc-color-text)]'
        assert_not_includes html, 'text-slate-900'
      end

      test 'checkbox styling uses design-contract focus outline classes' do
        view = ActionView::Base.empty
        builder = PathogenFormBuilder.new(:sample, nil, view, {})

        html = builder.checkbox(:active)

        assert_includes html, 'focus-visible:outline-[var(--pvc-color-focus)]'
        assert_not_includes html, 'focus-visible:outline-black'
        assert_not_includes html, 'dark:focus-visible:outline-white'
      end

      test 'checkbox tag styling uses design-contract focus outline classes' do
        view = ActionView::Base.empty
        view.extend(Pathogen::FormTagHelper)

        html = view.check_box_tag(:active)

        assert_includes html, 'focus-visible:outline-[var(--pvc-color-focus)]'
        assert_not_includes html, 'focus-visible:outline-black'
        assert_not_includes html, 'dark:focus-visible:outline-white'
      end

      test 'checkbox tag preserves Rails attributes alongside Pathogen styling' do
        view = ActionView::Base.empty
        view.extend(Pathogen::FormTagHelper)

        html = view.check_box_tag(:active, 'yes', false,
                                  aria: { describedby: 'active-help' }, disabled: true)

        assert_includes html, 'name="active"'
        assert_includes html, 'id="active"'
        assert_includes html, 'aria-describedby="active-help"'
        assert_includes html, 'disabled'
        assert_includes html, 'focus-visible:outline-[var(--pvc-color-focus)]'
      end

      test 'submit renders a Pathogen button with type submit' do
        view = ActionView::Base.empty
        builder = PathogenFormBuilder.new(:sample, nil, view, {})

        html = builder.submit('Save changes', tone: :primary, emphasis: :solid)

        assert_includes html, 'type="submit"'
        assert_includes html, 'Save changes'
        assert_includes html, 'name="commit"'
        assert_includes html, 'bg-[var(--pvc-color-accent-solid)]'
      end

      test 'submit supports disabled state' do
        view = ActionView::Base.empty
        builder = PathogenFormBuilder.new(:sample, nil, view, {})

        html = builder.submit('Save', disabled: true)

        assert_includes html, 'disabled'
      end
    end
  end
end
