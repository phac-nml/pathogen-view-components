# frozen_string_literal: true

require 'test_helper'

module Pathogen
  module FormBuilders
    class PathogenFormBuilderTest < ActiveSupport::TestCase
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

        assert_includes html, 'focus-visible:outline-black'
        assert_includes html, 'dark:focus-visible:outline-white'
      end

      test 'checkbox tag styling uses design-contract focus outline classes' do
        view = ActionView::Base.empty
        view.extend(Pathogen::FormTagHelper)

        html = view.check_box_tag(:active)

        assert_includes html, 'focus-visible:outline-black'
        assert_includes html, 'dark:focus-visible:outline-white'
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
