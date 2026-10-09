# frozen_string_literal: true

require 'test_helper'

module Pathogen
  module FormBuilders
    class PathogenFormBuilderTest < ActiveSupport::TestCase
      test 'field set tag applies the Pathogen form layout classes' do
        view = ActionView::Base.empty
        builder = PathogenFormBuilder.new(:sample, nil, view, {})

        html = builder.field_set_tag { 'Fields' }

        assert_includes html, 'class="grid grid-cols-1 gap-4"'
        assert_includes html, 'Fields'
      end

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

      test 'radio button forwards component options and nested ARIA attributes' do
        view = ActionView::Base.empty
        builder = PathogenFormBuilder.new(:sample, nil, view, {})

        html = builder.radio_button(
          :theme,
          'dark',
          label: 'Dark',
          disabled: true,
          required: true,
          lang: 'fr',
          class: 'custom-radio',
          aria: { describedby: 'theme-help' }
        )

        assert_includes html, 'disabled'
        assert_includes html, 'required'
        assert_includes html, 'custom-radio'
        assert_includes html, 'aria-describedby="theme-help'
      end

      test 'label styling uses semibold design-contract weight' do
        view = ActionView::Base.empty
        builder = PathogenFormBuilder.new(:sample, nil, view, {})

        html = builder.label(:name, 'Name')

        assert_includes html, 'font-semibold'
        assert_not_includes html, 'font-medium'
      end

      test 'checkbox styling uses design-contract focus outline classes' do
        view = ActionView::Base.empty
        builder = PathogenFormBuilder.new(:sample, nil, view, {})

        html = builder.checkbox(:active)

        assert_includes html, 'focus-visible:outline-[var(--pvc-color-focus)]'
        assert_not_includes html, 'focus-visible:outline-black'
        assert_not_includes html, 'dark:focus-visible:outline-white'
      end

      test 'checkbox accepts custom checked and unchecked values' do
        view = ActionView::Base.empty
        builder = PathogenFormBuilder.new(:sample, nil, view, {})

        html = builder.check_box(:active, {}, 'yes', 'no')

        assert_includes html, 'value="yes"'
        assert_includes html, 'value="no"'
      end

      test 'check_box aliases checkbox' do
        view = ActionView::Base.empty
        builder = PathogenFormBuilder.new(:sample, nil, view, {})

        html = builder.check_box(:active)

        assert_includes html, 'name="sample[active]"'
        assert_includes html, 'focus-visible:outline-[var(--pvc-color-focus)]'
      end

      test 'checkbox tag styling uses design-contract focus outline classes' do
        view = ActionView::Base.empty
        view.extend(Pathogen::FormTagHelper)

        html = view.check_box_tag(:active)

        assert_includes html, 'focus-visible:outline-[var(--pvc-color-focus)]'
        assert_not_includes html, 'focus-visible:outline-black'
        assert_not_includes html, 'dark:focus-visible:outline-white'
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

      test 'submit accepts options without an explicit value' do
        view = ActionView::Base.empty
        builder = PathogenFormBuilder.new(:sample, nil, view, {})

        html = builder.submit(disabled: true, data: { testid: 'submit' })

        assert_includes html, 'type="submit"'
        assert_includes html, 'name="commit"'
        assert_includes html, 'data-testid="submit"'
        assert_includes html, 'disabled'
      end

      test 'label adds a required indicator and removes the marker attribute' do
        view = ActionView::Base.empty
        builder = PathogenFormBuilder.new(:sample, nil, view, {})

        html = builder.label(:name, 'Name', data: { required: 'true' })

        assert_includes html, '<abbr'
        assert_includes html, 'class="req"'
        assert_not_includes html, 'data-required'
      end

      test 'label supports required block content' do
        view = ActionView::Base.empty
        builder = PathogenFormBuilder.new(:sample, nil, view, {})

        html = builder.label(:name) { 'Full name' }

        assert_includes html, 'Full name'
        assert_not_includes html, '<abbr'
      end

      test 'required label formatter appends an indicator to captured content' do
        view = ActionView::Base.empty
        builder = PathogenFormBuilder.new(:sample, nil, view, {})

        html = builder.send(:build_enhanced_label_content, :name, nil) { 'Full name' }

        assert_includes html, 'Full name'
        assert_includes html, '<abbr'
        assert_includes html, 'class="req"'
      end

      test 'label accepts options as the content argument' do
        view = ActionView::Base.empty
        builder = PathogenFormBuilder.new(:sample, nil, view, {})

        html = builder.label(:name, { 'data-required' => 'true' })

        assert_includes html, 'Name'
        assert_includes html, '<abbr'
      end

      test 'label uses the bound object human attribute name' do
        object_class = Class.new do
          def self.human_attribute_name(attribute)
            "Human #{attribute}"
          end
        end
        view = ActionView::Base.empty
        builder = PathogenFormBuilder.new(:sample, object_class.new, view, {})

        html = builder.label(:name, data: { required: 'true' })

        assert_includes html, 'Human name'
        assert_includes html, '<abbr'
      end

      test 'label falls back to the humanized attribute name' do
        view = ActionView::Base.empty
        builder = PathogenFormBuilder.new(:sample, nil, view, {})

        html = builder.label(:first_name, data: { required: 'true' })

        assert_includes html, 'First name'
        assert_includes html, '<abbr'
      end

      test 'label merges string custom classes' do
        view = ActionView::Base.empty
        builder = PathogenFormBuilder.new(:sample, nil, view, {})

        html = builder.label(:name, 'Name', class: 'custom-label')

        assert_includes html, 'custom-label'
        assert_includes html, 'font-semibold'
      end

      test 'label merges array custom classes' do
        view = ActionView::Base.empty
        builder = PathogenFormBuilder.new(:sample, nil, view, {})

        html = builder.label(:name, 'Name', class: %w[custom-label compact])

        assert_includes html, 'custom-label'
        assert_includes html, 'compact'
        assert_includes html, 'font-semibold'
      end

      test 'label leaves non-required fields unchanged' do
        view = ActionView::Base.empty
        builder = PathogenFormBuilder.new(:sample, nil, view, {})

        html = builder.label(:name, 'Name', 'data-required' => 'false')

        assert_includes html, 'Name'
        assert_not_includes html, '<abbr'
        assert_includes html, 'data-required="false"'
      end

      test 'switch forwards explicit state and input options' do
        view = ActionView::Base.empty
        builder = PathogenFormBuilder.new(:sample, nil, view, {})

        html = builder.switch(
          :enabled,
          label: 'Enabled',
          checked: true,
          checked_value: 'yes',
          unchecked_value: 'no',
          show_state_text: false,
          id: 'enabled-switch',
          class: 'custom-switch'
        )

        assert_includes html, 'id="enabled-switch"'
        assert_includes html, 'value="yes"'
        assert_includes html, 'checked'
        assert_includes html, 'custom-switch'
        assert_not_includes html, 'data-switch-state="on"'
      end
    end
  end
end
