# frozen_string_literal: true

module Pathogen
  class TabsPreview < ViewComponent::Preview
    def default
      render Pathogen::Tabs.new(id: "preview-tabs", label: "Preview tabs") do |tabs|
        tabs.with_tab(id: "tab-1", label: "Overview", selected: true)
        tabs.with_tab(id: "tab-2", label: "Details")
        tabs.with_tab(id: "tab-3", label: "Settings")

        tabs.with_panel(id: "panel-1", tab_id: "tab-1") { "Overview content" }
        tabs.with_panel(id: "panel-2", tab_id: "tab-2") { "Details content" }
        tabs.with_panel(id: "panel-3", tab_id: "tab-3") { "Settings content" }
      end
    end

    def vertical
      render Pathogen::Tabs.new(id: "vertical-tabs", label: "Vertical tabs", orientation: :vertical) do |tabs|
        tabs.with_tab(id: "vtab-1", label: "Tab One", selected: true)
        tabs.with_tab(id: "vtab-2", label: "Tab Two")

        tabs.with_panel(id: "vpanel-1", tab_id: "vtab-1") { "First panel content" }
        tabs.with_panel(id: "vpanel-2", tab_id: "vtab-2") { "Second panel content" }
      end
    end
  end
end
