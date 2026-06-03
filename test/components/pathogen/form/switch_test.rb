# frozen_string_literal: true

require 'test_helper'

module Pathogen
  module Form
    class SwitchTest < ViewComponent::TestCase
      test 'renders checkbox input with switch role and peer styling' do
        render_inline(Pathogen::Form::Switch.new(
                        attribute: :enabled,
                        label: 'Dark mode'
                      ))

        assert_selector 'input[type="checkbox"][role="switch"].peer.sr-only'
      end

      test 'renders visual track with pathogen-switch-track class' do
        render_inline(Pathogen::Form::Switch.new(
                        attribute: :enabled,
                        label: 'Dark mode'
                      ))

        assert_selector 'span.pathogen-switch-track.h-6.w-11'
      end

      test 'renders visible On and Off state text with aria-hidden' do
        render_inline(Pathogen::Form::Switch.new(
                        attribute: :enabled,
                        label: 'Dark mode'
                      ))

        assert_selector 'span[aria-hidden="true"]', text: 'Off'
        assert_selector 'span[aria-hidden="true"]', text: 'On'
        assert_selector '[data-switch-state="off"]', text: 'Off'
        assert_selector '[data-switch-state="on"]', text: 'On'
      end

      test 'hides state text when show_state_text is false' do
        render_inline(Pathogen::Form::Switch.new(
                        attribute: :enabled,
                        label: 'Dark mode',
                        show_state_text: false
                      ))

        assert_no_selector '[data-switch-state="off"]'
        assert_no_selector '[data-switch-state="on"]'
      end

      test 'renders separate name label associated via for attribute' do
        render_inline(Pathogen::Form::Switch.new(
                        attribute: :enabled,
                        label: 'Dark mode'
                      ))

        input = page.find('input[role="switch"]')
        name_label = page.all('label').find { |label| label.text == 'Dark mode' }
        assert_equal input[:id], name_label[:for]
      end

      test 'renders help text and includes it in aria-describedby' do
        render_inline(Pathogen::Form::Switch.new(
                        attribute: :enabled,
                        label: 'Dark mode',
                        help_text: 'Enable dark color scheme'
                      ))

        input = page.find('input[role="switch"]')
        assert_text 'Enable dark color scheme'
        assert_includes input['aria-describedby'], '_help'
      end

      test 'renders aria-labelledby when passed' do
        render_inline(Pathogen::Form::Switch.new(
                        attribute: :enabled,
                        aria: { labelledby: 'external-label' }
                      ))

        input = page.find('input[role="switch"]')
        assert_equal 'external-label', input['aria-labelledby']
      end

      test 'renders aria-describedby when passed' do
        render_inline(Pathogen::Form::Switch.new(
                        attribute: :enabled,
                        aria: { labelledby: 'external-label', describedby: 'external-description' }
                      ))

        input = page.find('input[role="switch"]')
        assert_equal 'external-description', input['aria-describedby']
      end

      test 'renders checked switch' do
        render_inline(Pathogen::Form::Switch.new(
                        attribute: :enabled,
                        label: 'Dark mode',
                        checked: true
                      ))

        assert_selector 'input[role="switch"][checked]'
      end

      test 'renders disabled switch with disabled visual hooks' do
        render_inline(Pathogen::Form::Switch.new(
                        attribute: :enabled,
                        label: 'Dark mode',
                        disabled: true
                      ))

        assert_selector 'input[role="switch"][disabled]'

        track_label = page.find('label', text: 'Off')
        assert_includes track_label[:class], 'peer-disabled:cursor-not-allowed'
        assert_includes track_label[:class], 'peer-disabled:[&_.pathogen-switch-track]:opacity-60'
      end

      test 'treats aria-disabled as native disabled' do
        render_inline(Pathogen::Form::Switch.new(
                        attribute: :enabled,
                        label: 'Dark mode',
                        'aria-disabled': 'true'
                      ))

        assert_selector 'input[role="switch"][disabled][aria-disabled="true"]'
      end

      test 'uses custom id without value suffix' do
        render_inline(Pathogen::Form::Switch.new(
                        attribute: :enabled,
                        id: 'custom-switch-id',
                        aria: { labelledby: 'external-label' }
                      ))

        assert_selector 'input#custom-switch-id[role="switch"]'
      end

      test 'auto-generates id without value suffix' do
        render_inline(Pathogen::Form::Switch.new(
                        attribute: :enabled,
                        label: 'Dark mode'
                      ))

        assert_selector 'input#enabled[role="switch"]'
      end

      test 'allows custom state text' do
        render_inline(Pathogen::Form::Switch.new(
                        attribute: :enabled,
                        label: 'Dark mode',
                        state_text: { on: 'Yes', off: 'No' }
                      ))

        assert_selector '[data-switch-state="off"]', text: 'No'
        assert_selector '[data-switch-state="on"]', text: 'Yes'
      end

      test 'requires accessible name when no label or aria provided' do
        assert_raises(ArgumentError) do
          render_inline(Pathogen::Form::Switch.new(attribute: :enabled))
        end
      end

      test 'renders with form builder' do
        template = ActionView::Base.new(ActionView::LookupContext.new([]), {}, nil)
        form = ActionView::Helpers::FormBuilder.new('user', nil, template, {})

        render_inline(Pathogen::Form::Switch.new(
                        form: form,
                        attribute: :enabled,
                        label: 'Notifications'
                      ))

        assert_selector 'input[name="user[enabled]"][role="switch"]'
        assert_selector 'input#user_enabled[role="switch"]'
      end

      test 'form builder switch uses bound object value when checked option is omitted' do
        user = Struct.new(:notifications).new(true)
        template = ActionView::Base.new(ActionView::LookupContext.new([]), {}, nil)
        form = ActionView::Helpers::FormBuilder.new('user', user, template, {})

        render_inline(Pathogen::Form::Switch.new(
                        form: form,
                        attribute: :notifications,
                        label: 'Notifications'
                      ))

        assert_selector 'input[name="user[notifications]"][role="switch"][checked]'
      end

      test 'pathogen form builder preserves omitted checked option' do
        template = ActionView::Base.new(ActionView::LookupContext.new([]), {}, nil)
        form = Pathogen::FormBuilders::PathogenFormBuilder.new('user', nil, template, {})

        component_options = form.send(:switch_component_options, :notifications, {
                                        label: 'Notifications',
                                        value: 'yes'
                                      })

        assert_not component_options.key?(:checked)
        assert_not component_options.key?(:checked_value)
        assert_equal 'yes', component_options[:value]
      end

      test 'pathogen form builder keeps explicit checked_value option' do
        template = ActionView::Base.new(ActionView::LookupContext.new([]), {}, nil)
        form = Pathogen::FormBuilders::PathogenFormBuilder.new('user', nil, template, {})

        component_options = form.send(:switch_component_options, :notifications, {
                                        label: 'Notifications',
                                        checked_value: 'custom'
                                      })

        assert_equal 'custom', component_options[:checked_value]
      end

      test 'track label follows checkbox for form builder hidden field' do
        template = ActionView::Base.new(ActionView::LookupContext.new([]), {}, nil)
        form = ActionView::Helpers::FormBuilder.new('user', nil, template, {})

        render_inline(Pathogen::Form::Switch.new(
                        form: form,
                        attribute: :enabled,
                        label: 'Notifications'
                      ))

        assert_selector 'input[type="hidden"][name="user[enabled]"]', visible: :hidden
        assert_selector 'input[type="checkbox"][role="switch"]'
        assert_selector 'label[for="user_enabled"] span.pathogen-switch-track'
      end
    end
  end
end
