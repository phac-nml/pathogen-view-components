# frozen_string_literal: true

require 'test_helper'

module Pathogen
  class SidebarTest < ViewComponent::TestCase
    test 'provider renders controller wiring with overlay and live region' do
      render_inline(Pathogen::Sidebar::Provider.new(id: 'lab-sidebar')) { 'Provider content' }

      assert_selector 'div.pathogen-sidebar-provider[data-controller~="pathogen--sidebar"]'
      assert_selector 'div[data-pathogen--sidebar-storage-key-value="pathogen.sidebar.lab-sidebar.open"]'
      assert_selector 'button.pathogen-sidebar-overlay[data-pathogen--sidebar-target="overlay"][tabindex="-1"]',
                      visible: :all
      assert_selector 'span.sr-only[data-pathogen--sidebar-target="liveRegion"]', visible: :all
      assert_selector 'div.pathogen-sidebar-provider', text: 'Provider content'
    end

    test 'provider allows breakpoint override via data attributes' do
      render_inline(
        Pathogen::Sidebar::Provider.new(
          id: 'lab-sidebar',
          data: { 'pathogen--sidebar-breakpoint-value' => '(min-width: 64rem)' }
        )
      ) { 'Provider content' }

      assert_selector 'div[data-pathogen--sidebar-breakpoint-value="(min-width: 64rem)"]'
    end

    test 'provider joins incoming style and css variables with semicolon delimiter' do
      render_inline(
        Pathogen::Sidebar::Provider.new(id: 'lab-sidebar', style: 'color:red')
      ) { 'Provider content' }

      assert_selector 'div[style*="color:red;--pathogen-sidebar-width:16rem"]'
    end

    test 'sidebar renders named nav landmark with target wiring' do
      render_inline(Pathogen::Sidebar.new(id: 'lab-nav', label: 'Primary navigation')) { 'Nav content' }

      selector = 'nav#lab-nav.pathogen-sidebar[data-pathogen--sidebar-target="sidebar"]' \
                 '[aria-label="Primary navigation"]'

      assert_selector selector, text: 'Nav content'
    end

    test 'sidebar requires accessible naming' do
      error = assert_raises(ArgumentError) do
        render_inline(Pathogen::Sidebar.new)
      end

      assert_match(/requires label: or labelledby:/, error.message)
    end

    test 'trigger renders toggle action and default label' do
      render_inline(Pathogen::Sidebar::Trigger.new)

      assert_selector 'button.pathogen-sidebar-trigger[type="button"][data-action~="click->pathogen--sidebar#toggle"]'
      assert_selector 'button[aria-label="Open sidebar"]'
      assert_selector 'span.pathogen-sidebar-trigger__icon[aria-hidden="true"]', visible: :all
    end

    test 'inset is a layout div target and does not force main landmark' do
      render_inline(Pathogen::Sidebar::Inset.new) do
        '<main id="host-main">Host page</main>'.html_safe
      end

      assert_selector 'div.pathogen-sidebar-inset main#host-main', text: 'Host page'
    end

    test 'layout primitives render with expected classes' do
      render_inline(Pathogen::Sidebar::Header.new) { 'Header' }
      assert_selector 'div.pathogen-sidebar-header', text: 'Header'

      render_inline(Pathogen::Sidebar::Content.new) { 'Content' }
      assert_selector 'div.pathogen-sidebar-content', text: 'Content'

      render_inline(Pathogen::Sidebar::Separator.new)
      assert_selector 'hr.pathogen-sidebar-separator', visible: :all

      render_inline(Pathogen::Sidebar::Footer.new) { 'Footer' }
      assert_selector 'div.pathogen-sidebar-footer', text: 'Footer'

      render_inline(Pathogen::Sidebar::Inset.new) { 'Inset' }
      assert_selector 'div.pathogen-sidebar-inset', text: 'Inset'
    end
  end
end
