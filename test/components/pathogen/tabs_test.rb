# frozen_string_literal: true

require 'test_helper'

module Pathogen
  class TabsTest < ViewComponent::TestCase
    # rubocop:disable Metrics/BlockLength
    test 'renders Pathogen tabs class contract and ARIA wiring' do
      render_inline(Pathogen::Tabs.new(id: 'docs-tabs', label: 'Documentation tabs')) do |tabs|
        tabs.with_tab(id: 'tab-overview', label: 'Overview')
        tabs.with_tab(id: 'tab-api', label: 'API')

        tabs.with_panel(id: 'panel-overview', tab_id: 'tab-overview') { 'Overview content' }
        tabs.with_panel(id: 'panel-api', tab_id: 'tab-api') { 'API content' }
      end

      assert_selector 'div.pathogen-tabs.pathogen-tabs--horizontal'
      assert_selector 'nav#docs-tabs.pathogen-tabs__list[role="tablist"][aria-label="Documentation tabs"]'
      assert_selector(
        'button#tab-overview.pathogen-tabs__tab[role="tab"][aria-selected="true"][data-state="active"][tabindex="0"]'
      )
      assert_selector(
        'button#tab-api.pathogen-tabs__tab[role="tab"][aria-selected="false"][data-state="inactive"][tabindex="-1"]'
      )

      assert_selector(
        'div#panel-overview.pathogen-tabs__panel[role="tabpanel"]' \
        '[aria-labelledby="tab-overview"][aria-hidden="false"]' \
        '[data-state="active"][tabindex="0"]'
      )
      assert_no_selector 'div#panel-overview[hidden]'
      assert_selector(
        'div#panel-api.pathogen-tabs__panel[role="tabpanel"]' \
        '[aria-labelledby="tab-api"][aria-hidden="true"]' \
        '[data-state="inactive"][hidden][tabindex="0"]',
        visible: :all
      )
    end
    # rubocop:enable Metrics/BlockLength

    test 'uses default_index to set initial selected tab and panel in vertical orientation' do
      render_inline(Pathogen::Tabs.new(id: 'settings-tabs', label: 'Settings tabs', default_index: 1,
                                       orientation: :vertical)) do |tabs|
        tabs.with_tab(id: 'tab-general', label: 'General')
        tabs.with_tab(id: 'tab-security', label: 'Security')

        tabs.with_panel(id: 'panel-general', tab_id: 'tab-general') { 'General settings' }
        tabs.with_panel(id: 'panel-security', tab_id: 'tab-security') { 'Security settings' }
      end

      assert_selector 'div.pathogen-tabs.pathogen-tabs--vertical'
      assert_selector 'button#tab-general[aria-selected="false"][data-state="inactive"][tabindex="-1"]'
      assert_selector 'button#tab-security[aria-selected="true"][data-state="active"][tabindex="0"]'

      assert_selector 'div#panel-general[aria-hidden="true"][data-state="inactive"][hidden]', visible: :all
      assert_selector 'div#panel-security[aria-hidden="false"][data-state="active"]'
      assert_no_selector 'div#panel-security[hidden]'
    end

    test 'respects selected tab flag for initial server-rendered state' do
      render_inline(Pathogen::Tabs.new(id: 'selected-tabs', label: 'Selected tabs')) do |tabs|
        tabs.with_tab(id: 'tab-alpha', label: 'Alpha')
        tabs.with_tab(id: 'tab-beta', label: 'Beta', selected: true)

        tabs.with_panel(id: 'panel-alpha', tab_id: 'tab-alpha') { 'Alpha panel' }
        tabs.with_panel(id: 'panel-beta', tab_id: 'tab-beta') { 'Beta panel' }
      end

      assert_selector 'button#tab-alpha[aria-selected="false"][data-state="inactive"][tabindex="-1"]'
      assert_selector 'button#tab-beta[aria-selected="true"][data-state="active"][tabindex="0"]'
      assert_selector 'div#panel-alpha[aria-hidden="true"][data-state="inactive"][hidden]', visible: :all
      assert_selector 'div#panel-beta[aria-hidden="false"][data-state="active"]'
      assert_no_selector 'div#panel-beta[hidden]'
    end

    test 'keeps lazy panel wiring intact with Pathogen loading shell' do
      render_inline(Pathogen::Tabs.new(id: 'lazy-tabs', label: 'Lazy tabs')) do |tabs|
        tabs.with_tab(id: 'tab-current', label: 'Current')
        tabs.with_tab(id: 'tab-history', label: 'History')

        tabs.with_panel(id: 'panel-current', tab_id: 'tab-current') { 'Current content' }
        tabs.with_lazy_panel(
          id: 'panel-history',
          tab_id: 'tab-history',
          frame_id: 'history-frame',
          src_path: '/history',
          selected: false
        ) { 'History content' }
      end

      assert_selector 'div#panel-history.pathogen-tabs__panel[aria-hidden="true"][data-state="inactive"][hidden]',
                      visible: :all
      assert_selector 'turbo-frame#history-frame[src="/history"][loading="lazy"]', visible: :all
      assert_selector '.pathogen-tabs__skeleton', visible: :all
    end
  end
end
