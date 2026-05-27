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
    end
  end
end
