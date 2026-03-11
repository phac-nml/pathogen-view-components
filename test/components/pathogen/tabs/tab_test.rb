# frozen_string_literal: true

require 'test_helper'

module Pathogen
  class Tabs
    class TabTest < ViewComponent::TestCase
      test 'renders state class metadata for controller updates' do
        render_inline(Pathogen::Tabs::Tab.new(
                        id: 'tab-overview',
                        label: 'Overview',
                        selected: true
                      ))

        assert_selector 'button#tab-overview[role="tab"][aria-selected="true"][tabindex="0"]'
        assert_selector 'button[data-pathogen--tabs-target="tab"]'
        assert_selector 'button[data-pathogen-tabs-selected-classes*="border-primary-800"]'
        assert_selector 'button[data-pathogen-tabs-unselected-classes*="border-transparent"]'
      end

      test 'renders vertical state class metadata' do
        render_inline(Pathogen::Tabs::Tab.new(
                        id: 'tab-analytics',
                        label: 'Analytics',
                        orientation: :vertical
                      ))

        assert_selector 'button[data-pathogen-tabs-selected-classes*="border-r-primary-800"]'
        assert_selector 'button[data-pathogen-tabs-unselected-classes*="border-r-transparent"]'
      end
    end
  end
end
