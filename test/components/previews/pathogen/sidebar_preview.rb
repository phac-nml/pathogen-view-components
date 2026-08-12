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

    # @!endgroup
  end
end
