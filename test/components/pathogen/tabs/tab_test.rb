# frozen_string_literal: true

require 'test_helper'

module Pathogen
  class Tabs
    # Test suite for Pathogen::Tabs::Tab component
    class TabTest < ViewComponent::TestCase
      test 'renders controller-managed class metadata for horizontal tabs' do
        render_inline(Pathogen::Tabs::Tab.new(id: 'tab-overview', label: 'Overview'))

        assert_selector 'button#tab-overview[role="tab"][aria-selected="false"][tabindex="-1"]'
        assert_selector 'button.rounded-t-lg.border-transparent.text-slate-700'
        assert_selector 'button[data-pathogen-tabs-selected-classes*="border-primary-800"]'
        assert_selector 'button[data-pathogen-tabs-unselected-classes*="border-transparent"]'
      end

      test 'renders vertical selected state metadata' do
        render_inline(Pathogen::Tabs::Tab.new(
                        id: 'tab-dashboard',
                        label: 'Dashboard',
                        selected: true,
                        orientation: :vertical
                      ))

        assert_selector 'button#tab-dashboard[role="tab"][aria-selected="true"][tabindex="0"]'
        assert_selector 'button.rounded-l-lg.border-b-0.border-r-2.border-r-primary-800'
        assert_selector 'button[data-pathogen-tabs-selected-classes*="border-r-primary-800"]'
        assert_selector 'button[data-pathogen-tabs-unselected-classes*="border-r-transparent"]'
      end
    end
  end
end
