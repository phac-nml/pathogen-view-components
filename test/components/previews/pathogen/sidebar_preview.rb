# frozen_string_literal: true

module Pathogen
  class SidebarPreview < ViewComponent::Preview
    include Pathogen::ViewHelper

    # @!group Pathogen Sidebar

    # @label Overview
    # Desktop shell (expanded by default; trigger collapses to icon rail)
    def overview; end

    # @label Off-canvas
    # Small viewport drawer behaviour and overlay dismissal
    def offcanvas; end

    # @label Groups and rail flyout
    # Nested groups in expanded mode and flyout navigation in rail mode
    def groups_and_rail_flyout; end

    # @!endgroup
  end
end
