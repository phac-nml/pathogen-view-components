# frozen_string_literal: true

require 'test_helper'

module Pathogen
  class SidebarTest < ViewComponent::TestCase
    test 'provider renders controller wiring' do
      render_inline(Pathogen::Sidebar::Provider.new(id: 'lab-sidebar')) { 'Provider content' }

      assert_selector 'div.pathogen-sidebar-provider[data-controller~="pathogen--sidebar"]'
      assert_selector 'div[data-pathogen-sidebar-id="lab-sidebar"]'
      assert_selector 'div[data-pathogen--sidebar-storage-key-value="pathogen.sidebar.lab-sidebar.open"]'
      assert_no_selector '.pathogen-sidebar-overlay', visible: :all
      assert_no_selector '[data-pathogen--sidebar-target="liveRegion"]', visible: :all
      assert_selector 'div.pathogen-sidebar-provider', text: 'Provider content'
    end

    test 'provider seeds resting mode and an anti-flash script' do
      render_inline(Pathogen::Sidebar::Provider.new(id: 'lab-sidebar', open: false)) { 'Provider content' }

      assert_selector 'div.pathogen-sidebar-provider[data-pathogen-sidebar-mode="rail"]' \
                      '[data-pathogen-sidebar-open="false"]'
      assert_selector 'script', visible: :all, text: /data-pathogen-sidebar-mode/
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

    test 'sidebar renders a dialog container around the named nav landmark' do
      render_inline(Pathogen::Sidebar.new(id: 'lab-nav', label: 'Primary navigation')) { 'Nav content' }

      assert_selector 'dialog#lab-nav-dialog.pathogen-sidebar-dialog' \
                      '[data-pathogen--sidebar-target="dialog"]:not([open])', visible: :all
      assert_selector 'div#lab-nav-panel.pathogen-sidebar-panel[data-pathogen--sidebar-target="panel"]', visible: :all
      assert_selector 'div.pathogen-sidebar-panel > button.pathogen-sidebar-dialog__close[type="button"]', visible: :all
      selector = 'div.pathogen-sidebar-panel > nav#lab-nav.pathogen-sidebar' \
                 '[data-pathogen--sidebar-target="sidebar"]' \
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

    test 'trigger label is localized in French' do
      I18n.with_locale(:fr) do
        render_inline(Pathogen::Sidebar::Trigger.new)

        assert_selector 'button[aria-label="Ouvrir la barre latérale"][title="Ouvrir la barre latérale"]'
      end
    end

    test 'sidebar shell passes axe structural checks' do
      sidebar = render_inline(Pathogen::Sidebar.new(id: 'lab-sidebar', label: 'Primary navigation')) do
        '<a href="/runs">Runs</a>'.html_safe
      end.to_html
      inset = render_inline(Pathogen::Sidebar::Inset.new) { '<main>Run details</main>'.html_safe }.to_html
      provider = render_inline(Pathogen::Sidebar::Provider.new(id: 'lab-sidebar')) { 'Provider content' }.to_html
      shell = Nokogiri::HTML::DocumentFragment.parse(provider)
      shell.at_css('.pathogen-sidebar-provider').add_child(Nokogiri::HTML::DocumentFragment.parse(sidebar + inset))

      assert_axe_structural_accessible shell.to_html, context: 'sidebar shell'
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

    test 'group renders labelled section with list content' do
      render_inline(Pathogen::Sidebar::Group.new(id: 'ops-group', label: 'Operations')) do
        '<li>Item one</li><li>Item two</li>'.html_safe
      end

      assert_selector 'section#ops-group.pathogen-sidebar-group[aria-labelledby="ops-group-heading"]'
      assert_selector 'h2#ops-group-heading.pathogen-sidebar-group__heading[data-pathogen-sidebar-label="true"]',
                      text: 'Operations'
      assert_selector 'section#ops-group > ul.pathogen-sidebar-group__list[role="list"] li', count: 2
    end

    test 'group rejects simultaneous label and labelledby' do
      error = assert_raises(ArgumentError) do
        render_inline(Pathogen::Sidebar::Group.new(label: 'Operations', labelledby: 'host-heading')) { 'rows' }
      end

      assert_match(/either label: or labelledby:/, error.message)
    end

    test 'leaf item renders current-page link with optional visual tooltip in rail mode' do
      render_inline(Pathogen::Sidebar::Item.new(
                      id: 'samples-item',
                      label: 'Samples',
                      href: '/samples',
                      current: true,
                      tooltip: true
                    ))

      assert_selector 'li#samples-item.pathogen-sidebar-item'
      assert_selector 'a.pathogen-sidebar-item__action[href="/samples"][aria-current="page"]', text: 'Samples'
      assert_selector 'div.pathogen-sidebar-item__tooltip-root[data-controller="pathogen--tooltip"]', visible: :all
      assert_selector 'div.pathogen-sidebar-item__tooltip-root[data-pathogen--tooltip-disabled-value="true"]',
                      visible: :all
      assert_selector 'a[data-pathogen--tooltip-target="trigger"]'
      assert_selector 'div#samples-item-tooltip[role="tooltip"]', visible: :all
    end

    test 'parent item renders disclosure for expanded mode and a flyout trigger for rail mode' do
      render_inline(Pathogen::Sidebar::Item.new(id: 'settings-item', label: 'Settings', open: true, tooltip: true)) do
        '<li><a href="/settings/profile">Profile</a></li><li><a href="/settings/access">Access</a></li>'.html_safe
      end

      assert_selector 'li#settings-item.pathogen-sidebar-item.pathogen-sidebar-item--parent'
      assert_selector(
        'div.pathogen-sidebar-item__expanded .pathogen-disclosure[data-pathogen--disclosure-open-value="true"]'
      )
      assert_selector 'div#settings-item-disclosure-panel.pathogen-sidebar-item__expanded-panel', visible: :all
      assert_selector(
        'div#settings-item-disclosure-panel ul.pathogen-sidebar-item__children a[href="/settings/profile"]',
        visible: :all
      )
      assert_selector(
        'div#settings-item-disclosure-panel ul.pathogen-sidebar-item__children a[href="/settings/access"]',
        visible: :all
      )

      assert_selector 'button.pathogen-sidebar-item__rail-trigger[data-pathogen--sidebar-target="submenuTrigger"]' \
                      '[data-pathogen-sidebar-flyout-id="settings-item-flyout"]' \
                      '[aria-controls="settings-item-flyout"][aria-expanded="false"]'
      assert_selector 'div#settings-item-flyout.pathogen-sidebar-flyout[role="group"][hidden]', visible: :all
      assert_selector 'p#settings-item-flyout-heading.pathogen-sidebar-flyout__heading', text: 'Settings', visible: :all
      # The flyout list is populated client-side from the expanded panel, so it
      # ships empty and never duplicates child ids in the server-rendered markup.
      assert_selector 'div#settings-item-flyout ul.pathogen-sidebar-item__children', visible: :all
      assert_no_selector 'div#settings-item-flyout ul.pathogen-sidebar-item__children a', visible: :all
    end

    test 'item validates parent and leaf input combinations' do
      leaf_error = assert_raises(ArgumentError) do
        render_inline(Pathogen::Sidebar::Item.new(label: 'Samples'))
      end
      assert_match(/leaf rows require href:/, leaf_error.message)

      parent_error = assert_raises(ArgumentError) do
        render_inline(Pathogen::Sidebar::Item.new(label: 'Settings', href: '/settings')) { '<li>Child</li>'.html_safe }
      end
      assert_match(/parent rows cannot also set href:/, parent_error.message)
    end
  end
end
