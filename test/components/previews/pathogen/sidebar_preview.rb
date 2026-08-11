# frozen_string_literal: true

module Pathogen
  class SidebarPreview < ViewComponent::Preview
    include Pathogen::ViewHelper

    # @!group Pathogen Sidebar

    # @label Overview
    # Expanded desktop shell with in-sidebar trigger and host mobile trigger
    def overview; end

    # @label Rail
    # Desktop rail mode restoration with label hiding
    def rail; end

    # @label Off-canvas
    # Small viewport drawer behaviour and overlay dismissal
    def offcanvas; end

    # @!endgroup
  end
end
