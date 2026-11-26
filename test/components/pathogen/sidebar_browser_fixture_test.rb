# frozen_string_literal: true

require 'test_helper'

module Pathogen
  # Keeps the markup used by the real-browser sidebar tests (test/browser) in
  # step with the components. Those tests cannot render Ruby, so this test
  # renders the fixture and fails when the committed copy has drifted.
  #
  # Refresh it with: UPDATE_BROWSER_FIXTURES=1 bin/test test/components/pathogen/sidebar_browser_fixture_test.rb
  class SidebarBrowserFixtureTest < ViewComponent::TestCase
    FIXTURE_PATH = File.expand_path('../../browser/fixtures/sidebar.html', __dir__)

    # Builds the shell inside a view context. Kept as small steps so each
    # mirrors one region of the sidebar.
    class Shell
      def initialize(view)
        @view = view
      end

      def to_html
        render(Pathogen::Sidebar::Provider.new(id: 'fixture', open: false, persistence: :none)) do
          join(sidebar, inset)
        end
      end

      private

      attr_reader :view

      delegate :render, :tag, to: :view

      def join(*parts)
        view.safe_join(parts)
      end

      def sidebar
        render(Pathogen::Sidebar.new(id: 'fixture-nav', label: 'Primary navigation')) do
          join(header, render(Pathogen::Sidebar::Content.new) { group })
        end
      end

      def header
        render(Pathogen::Sidebar::Header.new) do
          brand = Pathogen::Sidebar::Brand.new(label: 'Pathogen', href: '#home')
          brand.with_mark { tag.span('P') }
          join(render(brand), render(Pathogen::Sidebar::Trigger.new(id: 'rail-toggle')))
        end
      end

      def group
        render(Pathogen::Sidebar::Group.new(id: 'workflow', label: 'Laboratory workflow')) do
          join(
            item('dashboard', tooltip: true),
            render(Pathogen::Sidebar::Item.new(id: 'settings', label: 'Settings', open: true, tooltip: true)) do
              join(item('profile'), item('access', current: true), item('notifications'))
            end,
            item('reports', tooltip: true)
          )
        end
      end

      def item(id, **)
        render(Pathogen::Sidebar::Item.new(id: id, label: id.capitalize, href: "##{id}", **))
      end

      def inset
        render(Pathogen::Sidebar::Inset.new) do
          join(
            render(Pathogen::Sidebar::Trigger.new(id: 'host-toggle')),
            tag.main { tag.button('Run analysis', type: 'button', id: 'inset-action') }
          )
        end
      end
    end

    test 'browser fixture matches the rendered sidebar components' do
      html = "#{render_in_view_context { Shell.new(self).to_html }}\n"
      File.write(FIXTURE_PATH, html) if ENV['UPDATE_BROWSER_FIXTURES']

      assert_equal html, File.read(FIXTURE_PATH),
                   'test/browser/fixtures/sidebar.html is stale; rerun with UPDATE_BROWSER_FIXTURES=1'
    end
  end
end
