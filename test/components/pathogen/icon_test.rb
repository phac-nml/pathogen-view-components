# frozen_string_literal: true

require 'test_helper'

module Pathogen
  class IconTest < ViewComponent::TestCase
    test 'button visuals expose size mapping classes' do
      assert_equal 'size-4', Pathogen::ButtonVisuals::ICON_SIZE_MAPPINGS[:small]
      assert_equal 'size-6', Pathogen::ButtonVisuals::ICON_SIZE_MAPPINGS[:medium]
    end
  end
end
